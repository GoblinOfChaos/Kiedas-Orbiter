#!/usr/bin/env python3
"""
warframe_mem_log.py - reads Warframe's EE.log content directly out of its
process memory instead of tailing the file on disk.

Why: EE.log lines are written to disk with real, sometimes highly variable
lag (confirmed live 2026-07-21 - Jacob timed a 16-second gap between
visually being on the relic-picker screen and our EE.log-tailing code ever
seeing the trigger line, despite our own reaction to a line, once written,
being near-instant). Warframe keeps recent log output in an in-memory ring
buffer before it's ever flushed to the file, so reading that buffer
directly sidesteps the disk-write lag entirely.

Ported from glowseeker/cephalon-kronos's memory_scan.rs/mem_reader.rs
(open source, actively maintained, this exact technique already proven
there) rather than reverse-engineered from scratch - same algorithm:
1. Enumerate the process's readable anonymous memory regions (/proc/pid/maps).
2. Scan them in overlapping chunks, scoring each chunk by how many lines
   look like genuine EE.log lines (starts with a digit, contains a known
   category tag like "Sys [Info]: ").
3. Remember the highest-scoring address as the ring buffer's location,
   and cache it to disk so future launches skip the scan.
4. Each poll, re-read that fixed region and diff against what's already
   been seen via a hash set (NOT a simple byte-offset diff - the buffer is
   circular, so new content doesn't necessarily start where old content
   left off; only line-level hash dedup handles wraparound correctly).

Linux only for now (reads /proc/<pid>/mem directly). Windows would need a
ReadProcessMemory-based equivalent - not implemented here since it can't be
tested without a Windows machine; falls back to returning None so callers
can fall back to file-tailing instead.
"""
import json
import sys
import queue
import threading
import time
from pathlib import Path

from paths import DATA_DIR

IS_LINUX = sys.platform.startswith("linux")

OFFSET_CACHE_FILE = DATA_DIR / "warframe-mem-log-offset.json"

CHUNK = 65536
OVERLAP = 256
MAX_READ_SIZE = 1024 * 1024
MIN_LOG_SCORE = 3

_LOG_TAGS = (b"EE [Info]: ", b"Sys [Info]: ", b"Script [Info]: ", b"Net [Info]: ", b"Game [Info]: ")


def _ee_log_score(buf: bytes) -> int:
    score = 0
    for line in buf.split(b"\n"):
        if len(line) <= 12 or not line[:1].isdigit():
            continue
        if any(tag in line for tag in _LOG_TAGS):
            score += 1
    return score


def _readable_anonymous_regions(pid: int):
    """Candidate memory regions that could hold the log ring buffer -
    readable, and either anonymous (no backing file) or writable (rules
    out read-only mapped files like shared libraries)."""
    regions = []
    try:
        with open(f"/proc/{pid}/maps", "r", errors="ignore") as f:
            for line in f:
                parts = line.split()
                if len(parts) < 5:
                    continue
                addr_range, perms = parts[0], parts[1]
                path = parts[5] if len(parts) > 5 else ""
                if not perms.startswith("r"):
                    continue
                is_anon = not path or path.startswith("[")
                is_writable = "w" in perms
                if not is_anon and not is_writable:
                    continue
                start_s, end_s = addr_range.split("-")
                regions.append((int(start_s, 16), int(end_s, 16)))
    except OSError:
        return None
    return regions


def _load_cache():
    try:
        d = json.loads(OFFSET_CACHE_FILE.read_text())
        return int(d["va"]), int(d["size"])
    except Exception:
        return None


def _save_cache(va: int, size: int):
    try:
        OFFSET_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        OFFSET_CACHE_FILE.write_text(json.dumps({"va": va, "size": size}))
    except OSError:
        pass


def read_at(pid: int, va: int, size: int) -> bytes:
    with open(f"/proc/{pid}/mem", "rb") as f:
        f.seek(va)
        return f.read(size)


def validate_buffer(buf: bytes) -> bool:
    return _ee_log_score(buf) >= MIN_LOG_SCORE


_TIMEOUT = object()


class _BoundedWorker:
    """One reusable worker; a stuck syscall cannot create more threads/tasks."""

    def __init__(self):
        self._results = queue.Queue(maxsize=1)
        self._active = False

    def run(self, fn, timeout):
        if self._active:
            try:
                # Discard the stale result of a call that previously timed out.
                self._results.get_nowait()
            except queue.Empty:
                return _TIMEOUT
            self._active = False

        def target():
            try:
                self._results.put((True, fn()))
            except Exception as error:
                self._results.put((False, error))

        # Daemon is deliberate: a permanently blocked kernel read must not
        # prevent application shutdown. _active prevents another live worker
        # from being created until this one has actually returned.
        threading.Thread(
            target=target, name="warframe-mem-log", daemon=True
        ).start()
        self._active = True
        try:
            ok, value = self._results.get(timeout=timeout)
        except queue.Empty:
            return _TIMEOUT
        self._active = False
        if not ok:
            raise value
        return value


def _run_with_timeout(fn, timeout, worker):
    """Runs fn() on a bounded worker, waiting at most `timeout` seconds.

    Added 2026-07-21: confirmed live that discover_ring_buffer's own
    internal time-budget check (time.monotonic() between reads) wasn't
    enough - a *single* read of some memory region apparently blocked at
    the OS level for 40+ seconds with no further progress at all, which no
    amount of checking the clock between syscalls can catch, since the
    check never gets a chance to run while blocked inside one.

    A timed-out syscall cannot be killed safely, so the single worker remains
    occupied and subsequent calls return _TIMEOUT without spawning or queueing
    anything else. If it eventually completes, its stale result is discarded
    and that same worker is reused.

    Returns the result of fn(), re-raises any exception fn() itself
    raised (if it completed in time), or returns _TIMEOUT.
    """
    return worker.run(fn, timeout)


DISCOVERY_TIME_BUDGET_SECONDS = 4.0


def discover_ring_buffer(pid: int):
    """Full scan for the log ring buffer's address - slower (walks all
    readable anonymous memory), only needed once per Warframe process
    (result gets cached). Returns (va, size) or None.

    Bounded by DISCOVERY_TIME_BUDGET_SECONDS - confirmed live 2026-07-21
    that this watcher hung completely (no further log output at all) after
    working correctly for a few minutes. Root cause: this is a Python port
    of cephalon-kronos's native Rust scan, and Warframe's actual memory
    footprint (likely several GB, many regions) makes a full walk far
    slower here than in the original Rust implementation - if the cached
    address ever needs re-validating, a full rescan could block this
    function, and therefore the entire watcher loop, for an unbounded
    time. Bailing out after a fixed budget converts "stuck forever" into
    "this cycle didn't find it, try again next poll" - the caller already
    treats a None return as "not available yet" and falls back to
    file-tailing, so an incomplete scan is safe, just less effective."""
    if not IS_LINUX:
        return None
    regions = _readable_anonymous_regions(pid)
    if not regions:
        return None

    best_score = 0
    best_va = 0
    best_end = 0
    stride = CHUNK - OVERLAP
    deadline = time.monotonic() + DISCOVERY_TIME_BUDGET_SECONDS

    # Deliberately not catching OSError around this open() - a
    # PermissionError here (most likely cause: /proc/<pid>/mem needs
    # ptrace access this process may not have for an unrelated process)
    # should propagate up to the caller so it can be logged, rather than
    # being silently swallowed into an indistinguishable "no candidate
    # found" result.
    with open(f"/proc/{pid}/mem", "rb") as f:
        for start, end in regions:
            if time.monotonic() >= deadline:
                break
            total = end - start
            offset = 0
            while offset < total:
                if time.monotonic() >= deadline:
                    break
                want = min(total - offset, CHUNK)
                try:
                    f.seek(start + offset)
                    buf = f.read(want)
                except OSError:
                    break
                if not buf:
                    break
                score = _ee_log_score(buf)
                if score > best_score:
                    best_score = score
                    best_va = start + offset
                    best_end = end
                if len(buf) < CHUNK:
                    break
                offset += stride

    if best_score < MIN_LOG_SCORE:
        return None
    read_size = min(best_end - best_va, MAX_READ_SIZE)
    return best_va, read_size


def _fnv1a(s: str) -> int:
    h = 0xcbf29ce484222325
    for b in s.encode("utf-8", errors="ignore"):
        h ^= b
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return h


class MemLogReader:
    """Call poll() repeatedly (e.g. every 250ms-1s) - returns a list of
    newly-seen log lines since the last call, or None if the reader isn't
    hooked yet (no Warframe process, or discovery hasn't succeeded yet -
    caller should fall back to file-tailing in that case)."""

    SEEN_RESET_THRESHOLD = 16_384

    def __init__(self):
        self._va = None
        self._size = None
        self._seen: set[int] = set()
        self._seen_count = 0
        self._first_read_done = False
        self._worker = _BoundedWorker()
        # Set whenever a read/discovery attempt fails, so a caller can log
        # *why* memory-reading isn't working (most likely cause on Linux:
        # /proc/<pid>/mem needs ptrace permissions this process may not
        # have for an unrelated process - same class of restriction seen
        # elsewhere needing `sudo` for /proc/<pid>/environ) instead of it
        # just silently never hooking with no visibility into why.
        self.last_error = None
        self._last_buf_hash = None
        self.buffer_changed_last_poll = None
        cached = _load_cache()
        if cached:
            self._va, self._size = cached

    # Wall-clock hard limits enforced via _run_with_timeout - see that
    # function's docstring for why this exists (a single blocking read can
    # apparently stall at the OS level well past any in-loop time-budget
    # check). READ_TIMEOUT is generous for what should normally be a
    # near-instant single read; DISCOVER_TIMEOUT is a bit above
    # discover_ring_buffer's own internal budget, just covering overhead.
    READ_TIMEOUT_SECONDS = 2.0
    DISCOVER_TIMEOUT_SECONDS = 6.0

    def _discover(self, pid: int) -> bool:
        try:
            found = _run_with_timeout(
                lambda: discover_ring_buffer(pid),
                self.DISCOVER_TIMEOUT_SECONDS,
                self._worker,
            )
        except OSError as e:
            self.last_error = f"discovery failed: {e}"
            return False
        if found is _TIMEOUT:
            self.last_error = f"discovery timed out after {self.DISCOVER_TIMEOUT_SECONDS}s"
            return False
        if not found:
            self.last_error = "discovery found no candidate (ring buffer not located)"
            return False
        self._va, self._size = found
        _save_cache(self._va, self._size)
        self.last_error = None
        return True

    def _read(self, pid: int):
        """Returns bytes, or None on timeout/error (self.last_error set)."""
        try:
            buf = _run_with_timeout(
                lambda: read_at(pid, self._va, self._size),
                self.READ_TIMEOUT_SECONDS,
                self._worker,
            )
        except OSError as e:
            self.last_error = f"read failed: {e}"
            return None
        if buf is _TIMEOUT:
            self.last_error = f"read timed out after {self.READ_TIMEOUT_SECONDS}s (memory read stalled)"
            return None
        return buf

    def poll(self, pid: int):
        if not IS_LINUX:
            return None
        if self._va is not None:
            buf = self._read(pid)
            if buf is None:
                self._va = None
            elif not validate_buffer(buf):
                self._va = None
                buf = None
        else:
            buf = None

        if buf is None:
            if not self._discover(pid):
                return None
            buf = self._read(pid)
            if buf is None:
                self._va = None
                return None
            if not validate_buffer(buf):
                self._va = None
                return None

        # Diagnostic (added 2026-07-21): distinguishes "the buffer content
        # itself never changes" (would mean we're locked onto a stale,
        # no-longer-live copy that merely still *looks* like valid EE.log
        # text) from "content changes but every line still hashes as
        # already-seen" (would point at a dedup bug instead). Exposed as a
        # public attribute rather than logged directly here so the caller
        # controls how often to report it.
        buf_hash = _fnv1a(buf.decode("utf-8", errors="ignore"))
        self.buffer_changed_last_poll = (buf_hash != self._last_buf_hash)
        self._last_buf_hash = buf_hash

        return self._new_lines_from_buffer(buf)

    def _new_lines_from_buffer(self, buf: bytes):
        text = buf.decode("utf-8", errors="ignore")
        new_lines = []
        current_hashes = set()
        for line in text.split("\n"):
            line = line.strip(" \t\r\0")
            if not line or not line[0].isdigit():
                continue
            h = _fnv1a(line)
            current_hashes.add(h)
            if h in self._seen:
                continue
            self._seen.add(h)
            self._seen_count += 1
            # The buffer's initial contents are historical, not new events -
            # skip everything on the very first successful read so stale
            # content already sitting in the ring buffer at hook-up time
            # doesn't fire triggers meant only for genuinely new lines.
            if not self._first_read_done:
                continue
            new_lines.append(line)
        self._first_read_done = True
        if self._seen_count >= self.SEEN_RESET_THRESHOLD:
            # Bound memory without forgetting the snapshot that is still in
            # the ring buffer. Newly observed lines from this poll have already
            # been reported; the same snapshot will not replay next time.
            self._seen = current_hashes
            self._seen_count = len(current_hashes)
        return new_lines
