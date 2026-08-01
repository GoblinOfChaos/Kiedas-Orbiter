# EE.log Memory-Scan Watcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace file-watching (`log_watcher()`, `src/bin/main.rs:1205`) with direct process-memory reading of Warframe's EE.log ring buffer as the primary source for both reward and Riven trigger events — matching Cephalon Kronos's proven approach, verified by reading Kronos's actual current source (`log_scanner.rs`, `memory_scan.rs`, `mem_reader.rs` from `glowseeker/cephalon-kronos`, not guessed). This is the item deferred in `TODO.md` on 2026-07-28, now taken on because it's the most likely real fix for the confirmed ~10 second Riven trigger delay (see that `TODO.md` entry for the full connection to AlecaFrame's Overwolf-based approach).

**Architecture:** A new module reads the EE.log ring buffer directly out of Warframe's own process memory instead of tailing the file Warframe writes to disk — the game writes to this in-memory buffer immediately, then flushes to disk on its own schedule, so reading memory directly closes whatever gap exists between "the game knows this happened" and "our file-tail sees it." Ported faithfully from Kronos's three files:

- **PID discovery** (`get_warframe_pid`): scans `/proc` (Linux) or a process snapshot (Windows) for a process named/commanded "Warframe", preferring the actual game binary over the launcher.
- **Ring-buffer discovery** (`discover_ring_buffer`): the buffer's address isn't fixed - on first run (or whenever the cached address stops validating), it walks the process's readable/anonymous memory regions, scores each chunk by how many recognizable EE.log-formatted lines it contains, and keeps the highest-scoring location. This is cached to disk so subsequent launches skip straight to a known-good address.
- **Ring-buffer reading** (`read_ring_buffer`): a single fixed-size read (`pread`/`ReadProcessMemory`) at the discovered address, every poll cycle.
- **Circular-buffer-safe parsing**: because it's a *ring* buffer, byte-position diffing is unreliable (new content can overwrite at a different offset than expected, and Kronos's own commit history shows they hit exactly this bug before fixing it). Every cycle re-parses *all* lines currently in the buffer and skips ones already seen via a hash set, clearing that set periodically so memory doesn't grow unbounded. The very first full-buffer read is treated as a noisy backlog dump and doesn't fire any events - only lines that are new *after* that baseline read are treated as real.

**This is the first plan in the OCR/detection-reliability series that touches the primary trigger path for the whole app** (both reward and Riven detection depend on it), so the single most important design constraint is: **automatic, silent fallback to the existing file-based `log_watcher()` if memory access fails for any reason** (permission denied, macOS unsupported, discovery never finds a valid buffer, Warframe not running under a debuggable configuration). The proven file-tail approach is never removed - it becomes the fallback, not dead code.

**Tech Stack:** Rust, stdlib only (`std::fs`, `std::os::unix::fs::FileExt::read_at` on Linux, raw `OpenProcess`/`ReadProcessMemory`/`VirtualQueryEx` FFI on Windows matching the existing pattern already used elsewhere in this file for Windows-specific code, e.g. `take_screenshot()`'s Windows branch). No new Cargo dependency - matches Kronos's own implementation, which also uses no extra crate for this.

## Global Constraints

- Work on a dedicated branch (e.g. `plan/ee-log-memory-scan`), not `main`. Once all tasks are complete and validated, open a pull request via GitKraken (`pull_request_create`) targeting `main` for Jacob to review, rather than committing directly to `main`.
- **The existing `log_watcher()` function must not be deleted or functionally changed.** It becomes the fallback path, used automatically whenever the new memory-based watcher can't establish a validated read. This is non-negotiable given how critical and historically fragile this exact code path has been (see `TODO.md`'s extensive Riven/reward trigger diagnostic history).
- The new memory-based watcher must send events through the *exact same* channels as `log_watcher()` does today (`event_sender: mpsc::Sender<CaptureRequest>`, `riven_sender: mpsc::Sender<RivenLogEvent>`) and must classify lines using the *existing* `is_reward_ready_line()` and `riven_log_event()` functions, unchanged - this plan changes *how lines are obtained*, not what counts as a trigger.
- Do not modify `riven_screen_watcher()`, `run_detection()`, or anything downstream of the event channels - this plan is scoped entirely to how EE.log content reaches those channels.
- Implement both Linux and Windows (the project supports both - see the Windows VM test setup already used for this project). macOS is out of scope (Kronos's own macOS branch for this feature is a `pgrep` shell-out, not memory reading, and this project doesn't currently target macOS at all).
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: `src/mem_log.rs` — PID discovery, ring-buffer discovery, and reading primitives

**Files:**
- Create: `src/mem_log.rs`
- Modify: `src/bin/main.rs` (add `mod mem_log;` near the top, alongside other module-level items) — actually this crate's binary-only structure means this should be added to `src/lib.rs` if one exists and is shared, or directly as a module of the `orbiter` binary; confirm which before adding.

**Interfaces:**
- Produces:
  ```rust
  pub struct MemOffsets {
      pub buffer_va: u64,
      pub buffer_size: usize,
  }

  pub fn get_warframe_pid() -> Option<u32>;
  pub fn discover_ring_buffer(pid: u32) -> Option<(u64, usize)>;
  pub fn read_ring_buffer(pid: u32, offsets: &MemOffsets, buf: &mut Vec<u8>) -> Result<(), &'static str>;
  pub fn validate_buffer(buf: &[u8]) -> bool;
  pub fn load_offset_cache(cache_path: &std::path::Path) -> Option<MemOffsets>;
  pub fn save_offset_cache(cache_path: &std::path::Path, offsets: &MemOffsets);
  ```

- [ ] **Step 1: Confirm where to add the new module**

```bash
ls /var/home/jedwards/wfinfo-ng/src/*.rs
grep -n "^mod \|^pub mod " /var/home/jedwards/wfinfo-ng/src/lib.rs 2>/dev/null
```

If `src/lib.rs` exists and other modules like `ocr` are declared there (`pub mod ocr;`), add `pub mod mem_log;` there too, matching that pattern, and import via `wfinfo::mem_log::...` in `main.rs` the same way `wfinfo::ocr::...` is imported. If there is no `lib.rs` and `ocr`/`utils` are instead declared directly in `main.rs` or another binary-local way, add `mod mem_log;` there instead and match whatever pattern those modules already use. Report back if the module structure doesn't match either expectation.

- [ ] **Step 2: Implement PID discovery**

```rust
//! Reads Warframe's EE.log ring buffer directly out of the game process's
//! memory instead of tailing the file on disk. Ported from Cephalon
//! Kronos's proven approach (glowseeker/cephalon-kronos, log_scanner.rs /
//! memory_scan.rs / mem_reader.rs) - the game writes to this in-memory
//! buffer immediately and flushes to disk on its own schedule, so reading
//! memory directly closes whatever gap file-tailing has relative to it.
//! See the TODO.md entry dated 2026-07-30 for why this was taken on: it's
//! the likely real fix for the confirmed ~10s Riven trigger delay.

use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct MemOffsets {
    pub buffer_va: u64,
    pub buffer_size: usize,
}

struct PidCache {
    pid: u32,
    found_at: Instant,
}

static PID_CACHE: Mutex<Option<PidCache>> = Mutex::new(None);
const PID_CACHE_TTL: Duration = Duration::from_secs(5);

/// Returns the PID of the running Warframe game process (not the launcher),
/// if any. Cached briefly to avoid re-scanning every poll cycle.
pub fn get_warframe_pid() -> Option<u32> {
    if let Ok(cache) = PID_CACHE.lock() {
        if let Some(c) = cache.as_ref() {
            if c.found_at.elapsed() < PID_CACHE_TTL {
                return Some(c.pid);
            }
        }
    }
    let found = get_warframe_pid_uncached();
    if let (Ok(mut cache), Some(pid)) = (PID_CACHE.lock(), found) {
        *cache = Some(PidCache { pid, found_at: Instant::now() });
    }
    found
}

#[cfg(target_os = "linux")]
fn get_warframe_pid_uncached() -> Option<u32> {
    // Collect all matching PIDs, preferring the actual game binary (which
    // typically has ".x64" in its name under Proton/Wine) over the
    // launcher - both contain "Warframe" in their name, but only the game
    // process has the EE.log ring buffer.
    let mut candidates: Vec<(u32, bool)> = Vec::new();
    let Ok(entries) = fs::read_dir("/proc") else { return None };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let pid_str = name.to_string_lossy();
        if !pid_str.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let Ok(pid) = pid_str.parse::<u32>() else { continue };
        let comm_path = Path::new("/proc").join(&name).join("comm");
        if let Ok(comm) = fs::read_to_string(&comm_path) {
            if comm.contains("Warframe") || comm.contains("warframe") {
                let is_game = comm.contains(".x64") || comm.contains(".X64");
                candidates.push((pid, is_game));
                continue;
            }
        }
        let cmd_path = Path::new("/proc").join(&name).join("cmdline");
        if let Ok(cmd) = fs::read_to_string(&cmd_path) {
            if cmd.contains("Warframe") || cmd.contains("warframe") {
                let is_game = cmd.contains(".x64") || cmd.contains(".X64");
                candidates.push((pid, is_game));
            }
        }
    }
    candidates.sort_by(|a, b| b.1.cmp(&a.1));
    candidates.into_iter().next().map(|(pid, _)| pid)
}

#[cfg(target_os = "windows")]
fn get_warframe_pid_uncached() -> Option<u32> {
    type HANDLE = *mut std::ffi::c_void;
    type DWORD = u32;
    type BOOL = i32;
    type WCHAR = u16;

    const TH32CS_SNAPPROCESS: DWORD = 0x00000002;
    const INVALID_HANDLE_VALUE: isize = -1;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct PROCESSENTRY32W {
        dwSize: DWORD,
        cntUsage: DWORD,
        th32ProcessID: DWORD,
        th32DefaultHeapID: *mut std::ffi::c_void,
        th32ModuleID: DWORD,
        cntThreads: DWORD,
        th32ParentProcessID: DWORD,
        pcPriClassBase: i32,
        dwFlags: DWORD,
        szExeFile: [WCHAR; 260],
    }

    extern "system" {
        fn CreateToolhelp32Snapshot(dwFlags: DWORD, th32ProcessID: DWORD) -> HANDLE;
        fn Process32FirstW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
        fn Process32NextW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot.is_null() || snapshot as isize == INVALID_HANDLE_VALUE {
            return None;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as DWORD;

        let mut candidates: Vec<(u32, bool)> = Vec::new();
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let name = String::from_utf16_lossy(
                    &entry.szExeFile[..entry
                        .szExeFile
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(entry.szExeFile.len())],
                );
                if name.to_lowercase().contains("warframe") {
                    let is_game = name.to_lowercase().contains(".x64");
                    candidates.push((entry.th32ProcessID, is_game));
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
        candidates.sort_by(|a, b| b.1.cmp(&a.1));
        candidates.into_iter().next().map(|(pid, _)| pid)
    }
}
```

- [ ] **Step 3: Implement readable-region enumeration and ring-buffer discovery**

```rust
struct MemRegion {
    start: u64,
    end: u64,
}

#[cfg(target_os = "linux")]
fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    let maps = fs::read_to_string(format!("/proc/{pid}/maps")).ok()?;
    let mut regions = Vec::new();
    for line in maps.lines() {
        let mut cols = line.split_whitespace();
        let range = cols.next()?;
        let perms = cols.next()?;
        if !perms.starts_with('r') {
            continue;
        }
        let _ = (cols.next(), cols.next(), cols.next());
        let path = cols.next().unwrap_or("");
        let is_anon = path.is_empty() || path.starts_with('[');
        let is_writable = perms.contains('w');
        if !is_anon && !is_writable {
            continue;
        }
        let (s, e) = range.split_once('-')?;
        let start = u64::from_str_radix(s, 16).ok()?;
        let end = u64::from_str_radix(e, 16).ok()?;
        regions.push(MemRegion { start, end });
    }
    Some(regions)
}

#[cfg(target_os = "windows")]
fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;
    type LPCVOID = *const std::ffi::c_void;
    type SizeT = usize;

    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;
    const PROCESS_VM_READ: DWORD = 0x0010;
    const MEM_COMMIT: DWORD = 0x1000;
    const PAGE_READONLY: DWORD = 0x02;
    const PAGE_READWRITE: DWORD = 0x04;
    const PAGE_EXECUTE_READ: DWORD = 0x20;
    const PAGE_EXECUTE_READWRITE: DWORD = 0x40;

    #[repr(C)]
    struct MEMORY_BASIC_INFORMATION {
        base_address: LPCVOID,
        allocation_base: LPCVOID,
        allocation_protect: DWORD,
        region_size: SizeT,
        state: DWORD,
        protect: DWORD,
        type_: DWORD,
    }

    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn VirtualQueryEx(
            hProcess: HANDLE,
            lpAddress: LPCVOID,
            lpBuffer: *mut MEMORY_BASIC_INFORMATION,
            dwLength: SizeT,
        ) -> SizeT;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
        if handle.is_null() {
            return None;
        }
        let mut regions = Vec::new();
        let mut addr: u64 = 0;
        loop {
            let mut info: MEMORY_BASIC_INFORMATION = std::mem::zeroed();
            let written = VirtualQueryEx(
                handle,
                addr as LPCVOID,
                &mut info,
                std::mem::size_of::<MEMORY_BASIC_INFORMATION>(),
            );
            if written == 0 {
                break;
            }
            let readable = matches!(
                info.protect,
                PAGE_READONLY | PAGE_READWRITE | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE
            );
            if info.state == MEM_COMMIT && readable {
                let start = info.base_address as u64;
                let end = start + info.region_size as u64;
                regions.push(MemRegion { start, end });
            }
            let next = info.base_address as u64 + info.region_size as u64;
            if next <= addr {
                break;
            }
            addr = next;
        }
        CloseHandle(handle);
        Some(regions)
    }
}

fn ee_log_score(buf: &[u8]) -> usize {
    buf.split(|&b| b == b'\n')
        .filter(|l| l.len() > 12 && l[0].is_ascii_digit())
        .filter(|l| {
            let s = std::str::from_utf8(l).unwrap_or("");
            s.contains("EE [Info]: ")
                || s.contains("Sys [Info]: ")
                || s.contains("Script [Info]: ")
                || s.contains("Net [Info]: ")
                || s.contains("Game [Info]: ")
        })
        .count()
}

/// One-shot discovery: scan all readable/anonymous regions for EE.log ring
/// buffer content. Returns the VA + size of the best-scoring candidate.
/// buffer_size is capped at 1MB - real ring buffer allocations are
/// typically 128KB-512KB, and this cap matters: if the read window ends up
/// smaller than the actual ring buffer, log lines written outside it stay
/// invisible until the write cursor wraps around, producing exactly the
/// "hella delayed" symptom Kronos's own code comments describe hitting
/// before they widened this.
pub fn discover_ring_buffer(pid: u32) -> Option<(u64, usize)> {
    const MIN_LOG_SCORE: usize = 3;
    const CHUNK: u64 = 65536;
    const SCORE_OVERLAP: u64 = 256;
    const MAX_READ_SIZE: usize = 1024 * 1024;

    let regions = readable_anonymous_regions(pid)?;
    let mem_path = mem_read_handle_path(pid);
    let mut best_score = 0usize;
    let mut best_va = 0u64;
    let mut best_end = 0u64;
    let mut buf = vec![0u8; CHUNK as usize];
    let stride = CHUNK - SCORE_OVERLAP;

    for region in &regions {
        let total = region.end.saturating_sub(region.start);
        let mut offset = 0u64;
        while offset < total {
            let want = (total - offset).min(CHUNK) as usize;
            if read_process_memory_raw(&mem_path, pid, region.start + offset, &mut buf[..want])
                .is_err()
            {
                break;
            }
            let score = ee_log_score(&buf[..want]);
            if score > best_score {
                best_score = score;
                best_va = region.start + offset;
                best_end = region.end;
            }
            if want < CHUNK as usize {
                break;
            }
            offset += stride;
        }
    }

    if best_score < MIN_LOG_SCORE {
        return None;
    }
    let read_size = best_end.saturating_sub(best_va).min(MAX_READ_SIZE as u64) as usize;
    Some((best_va, read_size))
}
```

Note: `mem_read_handle_path`/`read_process_memory_raw` are small helpers Step 4 defines - `discover_ring_buffer` and `read_ring_buffer` both need the same underlying raw-read primitive, so implement that primitive first in Step 4 and have both call it (this differs slightly from Kronos's own structure, which duplicates the read logic in two places - consolidating it here is a reasonable simplification, not a deviation in behavior).

- [ ] **Step 4: Implement the raw memory-read primitive, buffer reading, validation, and offset caching**

```rust
#[cfg(target_os = "linux")]
fn mem_read_handle_path(pid: u32) -> String {
    format!("/proc/{pid}/mem")
}

#[cfg(target_os = "linux")]
fn read_process_memory_raw(mem_path: &str, _pid: u32, va: u64, buf: &mut [u8]) -> Result<(), &'static str> {
    use std::os::unix::fs::FileExt;
    let f = fs::File::open(mem_path).map_err(|_| "open_mem_failed")?;
    f.read_at(buf, va).map_err(|_| "read_failed")?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn mem_read_handle_path(_pid: u32) -> String {
    String::new() // unused on Windows - ReadProcessMemory takes a HANDLE, not a path
}

#[cfg(target_os = "windows")]
fn read_process_memory_raw(_mem_path: &str, pid: u32, va: u64, buf: &mut [u8]) -> Result<(), &'static str> {
    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;
    type LPCVOID = *const std::ffi::c_void;
    type LPVOID = *mut std::ffi::c_void;
    type SizeT = usize;
    type LpsizeT = *mut usize;

    const PROCESS_VM_READ: DWORD = 0x0010;
    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;

    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn ReadProcessMemory(
            hProcess: HANDLE,
            lpBaseAddress: LPCVOID,
            lpBuffer: LPVOID,
            nSize: SizeT,
            lpNumberOfBytesRead: LpsizeT,
        ) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, 0, pid);
        if handle.is_null() {
            return Err("open_mem_failed");
        }
        let mut read: usize = 0;
        let ok = ReadProcessMemory(
            handle,
            va as LPCVOID,
            buf.as_mut_ptr() as LPVOID,
            buf.len(),
            &mut read,
        );
        CloseHandle(handle);
        if ok == 0 || read != buf.len() {
            return Err("read_failed");
        }
        Ok(())
    }
}

/// Read the EE.log ring buffer at the configured VA.
pub fn read_ring_buffer(pid: u32, off: &MemOffsets, scratch: &mut Vec<u8>) -> Result<(), &'static str> {
    scratch.resize(off.buffer_size, 0);
    let path = mem_read_handle_path(pid);
    read_process_memory_raw(&path, pid, off.buffer_va, scratch)
}

/// Sanity check: does this buffer actually look like EE.log content?
pub fn validate_buffer(buf: &[u8]) -> bool {
    ee_log_score(buf) >= 3
}

pub fn load_offset_cache(cache_path: &Path) -> Option<MemOffsets> {
    let s = fs::read_to_string(cache_path).ok()?;
    let mut parts = s.trim().split(',');
    let buffer_va = u64::from_str_radix(parts.next()?.trim_start_matches("0x"), 16).ok()?;
    let buffer_size = parts.next()?.parse().ok()?;
    Some(MemOffsets { buffer_va, buffer_size })
}

pub fn save_offset_cache(cache_path: &Path, offsets: &MemOffsets) {
    if let Some(parent) = cache_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(cache_path, format!("{:#x},{}", offsets.buffer_va, offsets.buffer_size));
}
```

(Using a simple `"0xVA,SIZE"` text format rather than JSON to avoid adding a dependency just for this cache file - `serde`/`serde_json` are already project dependencies, so if preferred, JSON via those is equally acceptable; either is fine, but stay consistent with whichever is chosen throughout this module.)

- [ ] **Step 5: Build**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo build --release --bin orbiter 2>&1 | tail -60
```

Expected: builds clean on Linux. Windows-specific code paths (`#[cfg(target_os = "windows")]`) will not be exercised by this build - flag clearly in the PR description that Windows compilation itself still needs verification on the Windows VM per the project's existing test setup, since this sandbox is Linux-only.

- [ ] **Step 6: Unit tests for the pure logic (scoring, no real process needed)**

Add to `src/mem_log.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ee_log_score_counts_recognizable_lines() {
        let buf = b"123.456 Sys [Info]: something happened\n\
                     789.012 Script [Info]: another line\n\
                     garbage garbage garbage\n\
                     345.678 Game [Info]: a third real line\n";
        assert_eq!(ee_log_score(buf), 3);
    }

    #[test]
    fn ee_log_score_ignores_non_digit_prefixed_lines() {
        let buf = b"not a real log line Sys [Info]: fake\n";
        assert_eq!(ee_log_score(buf), 0);
    }

    #[test]
    fn validate_buffer_requires_minimum_score() {
        let good = b"1.0 Sys [Info]: a\n2.0 Sys [Info]: b\n3.0 Sys [Info]: c\n";
        let bad = b"1.0 Sys [Info]: only one real line\n";
        assert!(validate_buffer(good));
        assert!(!validate_buffer(bad));
    }

    #[test]
    fn offset_cache_round_trips() {
        let dir = std::env::temp_dir().join(format!("mem_log_test_{}", std::process::id()));
        let path = dir.join("offset_cache.txt");
        let offsets = MemOffsets { buffer_va: 0x7f00_1234_5678, buffer_size: 131072 };
        save_offset_cache(&path, &offsets);
        let loaded = load_offset_cache(&path).expect("cache should load");
        assert_eq!(loaded.buffer_va, offsets.buffer_va);
        assert_eq!(loaded.buffer_size, offsets.buffer_size);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
```

- [ ] **Step 7: Run the new tests**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter mem_log:: -- --nocapture
```

Expected: 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git checkout -b plan/ee-log-memory-scan
git add src/mem_log.rs src/lib.rs  # or src/bin/main.rs, whichever Step 1 determined
git commit -m "Add EE.log memory-scan primitives: PID discovery, ring-buffer discovery, read/validate"
```

---

### Task 2: `memory_log_watcher()` with automatic fallback to the existing file watcher

**Files:**
- Modify: `src/bin/main.rs` (add near `log_watcher()`, around line 1205; modify the call site around line 1515)

**Interfaces:**
- Produces: `fn memory_log_watcher(event_sender: mpsc::Sender<CaptureRequest>, riven_sender: mpsc::Sender<RivenLogEvent>) -> bool` — spawns the watcher thread and returns `true` if it successfully validated a memory read (i.e. is actually running), `false` if it couldn't (caller should fall back to `log_watcher()`).
- Consumes: `mem_log::{get_warframe_pid, discover_ring_buffer, read_ring_buffer, validate_buffer, load_offset_cache, save_offset_cache, MemOffsets}`, existing `is_reward_ready_line()`, `riven_log_event()`, `data_dir()`.

- [ ] **Step 1: Confirm the exact current call site and `data_dir()` signature**

```bash
grep -n "fn data_dir\|log_watcher(log_path" -A 3 /var/home/jedwards/wfinfo-ng/src/bin/main.rs
```

- [ ] **Step 2: Add `memory_log_watcher()`**

```rust
/// Same trigger classification as log_watcher(), but reads EE.log directly
/// out of Warframe's process memory instead of tailing the file on disk.
/// Returns true if a validated memory read was established and the watcher
/// thread is now running; false if memory-based reading isn't usable right
/// now (caller must fall back to the file-based log_watcher() in that case
/// - this function never silently leaves both trigger paths inactive).
fn memory_log_watcher(
    event_sender: mpsc::Sender<CaptureRequest>,
    riven_sender: mpsc::Sender<RivenLogEvent>,
) -> bool {
    let Some(pid) = mem_log::get_warframe_pid() else {
        info!("Memory-based EE.log watcher: Warframe process not found, falling back to file watch");
        return false;
    };

    let cache_path = data_dir().join("memory_offset_cache.txt");
    let mut offsets = mem_log::load_offset_cache(&cache_path);
    let mut raw = Vec::new();

    let validated = match &offsets {
        Some(o) => match mem_log::read_ring_buffer(pid, o, &mut raw) {
            Ok(()) => mem_log::validate_buffer(&raw),
            Err(_) => false,
        },
        None => false,
    };

    if !validated {
        match mem_log::discover_ring_buffer(pid) {
            Some((va, size)) => {
                let found = mem_log::MemOffsets { buffer_va: va, buffer_size: size };
                match mem_log::read_ring_buffer(pid, &found, &mut raw) {
                    Ok(()) if mem_log::validate_buffer(&raw) => {
                        mem_log::save_offset_cache(&cache_path, &found);
                        offsets = Some(found);
                    }
                    _ => {
                        info!("Memory-based EE.log watcher: discovered buffer failed validation, falling back to file watch");
                        return false;
                    }
                }
            }
            None => {
                info!("Memory-based EE.log watcher: could not discover ring buffer, falling back to file watch");
                return false;
            }
        }
    }

    let Some(offsets) = offsets else { return false };
    info!(
        "Memory-based EE.log watcher active (VA {:#x}, {} bytes)",
        offsets.buffer_va, offsets.buffer_size
    );

    thread::spawn(move || {
        let mut prev_len = 0usize;
        let mut seen: std::collections::HashSet<u64> = std::collections::HashSet::new();
        let mut seen_count = 0usize;
        const SEEN_RESET_THRESHOLD: usize = 16_384;
        let mut current_pid = pid;
        let mut current_offsets = offsets;
        let mut first_cycle = true;

        loop {
            if let Err(_) = mem_log::read_ring_buffer(current_pid, &current_offsets, &mut raw) {
                // Process likely gone or PID reused - try to rediscover.
                thread::sleep(Duration::from_millis(500));
                match mem_log::get_warframe_pid() {
                    Some(new_pid) => {
                        current_pid = new_pid;
                        if let Some((va, size)) = mem_log::discover_ring_buffer(current_pid) {
                            current_offsets = mem_log::MemOffsets { buffer_va: va, buffer_size: size };
                            mem_log::save_offset_cache(&cache_path, &current_offsets);
                        }
                    }
                    None => {
                        thread::sleep(Duration::from_secs(2));
                    }
                }
                continue;
            }

            let text = String::from_utf8_lossy(&raw);
            let mut riven_events = Vec::new();
            let mut reward_screen_detected = false;

            for line in text.split('\n') {
                let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                if line.is_empty() || !line.starts_with(|c: char| c.is_ascii_digit()) {
                    continue;
                }
                let mut hasher = std::collections::hash_map::DefaultHasher::new();
                std::hash::Hash::hash(&line, &mut hasher);
                let hash = std::hash::Hasher::finish(&hasher);
                if !seen.insert(hash) {
                    continue;
                }
                seen_count += 1;
                if seen_count >= SEEN_RESET_THRESHOLD {
                    seen.clear();
                    seen_count = 0;
                }

                // First full-buffer read is a backlog dump, not new activity -
                // classify lines to warm the hash set, but don't fire events.
                if first_cycle {
                    continue;
                }

                if is_reward_ready_line(line) {
                    reward_screen_detected = true;
                }
                if let Some(event) = riven_log_event(line) {
                    riven_events.push(event);
                }
            }

            first_cycle = false;
            prev_len = raw.len();
            let _ = prev_len;

            for event in riven_events {
                info!("Riven EE.log lifecycle event (memory): {event:?}");
                if riven_sender.send(event).is_err() {
                    error!("Riven event receiver dropped - stopping memory log watcher thread");
                    return;
                }
            }
            if reward_screen_detected {
                info!("Reward-ready event detected (memory); starting adaptive capture");
                if event_sender.send(CaptureRequest::Automatic).is_err() {
                    error!("Event receiver dropped - stopping memory log watcher thread");
                    return;
                }
            }

            thread::sleep(Duration::from_millis(150));
        }
    });

    true
}
```

- [ ] **Step 3: Wire the fallback at the existing call site**

Find (around line 1515):

```rust
    log_watcher(log_path, event_sender.clone(), riven_sender);
```

Replace with:

```rust
    if !memory_log_watcher(event_sender.clone(), riven_sender.clone()) {
        info!("Falling back to file-based EE.log watcher");
        log_watcher(log_path, event_sender.clone(), riven_sender);
    }
```

Note: this requires `riven_sender` to be cloneable at this call site (it should already be an `mpsc::Sender`, which is `Clone`) - if the existing code consumes `riven_sender` by value in a way that prevents this, adjust only the minimal amount needed (e.g. clone it into a local binding beforehand) and report back if this requires touching anything beyond this one call site.

- [ ] **Step 4: Build**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo build --release --bin orbiter 2>&1 | tail -60
```

- [ ] **Step 5: Run the existing Riven/reward test suite to confirm nothing downstream broke**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

Expected: identical pass count to before this task - this task doesn't touch `detect_riven_screen()`, `riven_signatures_match()`, or any of the tested logic, only how lines reach the same channels those tests already exercise indirectly.

- [ ] **Step 6: Commit**

```bash
git add src/bin/main.rs
git commit -m "Add memory-based EE.log watcher with automatic fallback to file watch"
```

---

### Task 3: Live verification (cannot be automated - requires a real Warframe process)

**This task has no automated steps.** Memory-reading another process's address space fundamentally requires that process to actually exist and be running - there is no way to unit-test `get_warframe_pid()`/`discover_ring_buffer()`/`read_ring_buffer()` against a real Warframe process in an automated sandbox. This must be verified live.

- [ ] **Step 1: Launch Orbiter normally with Warframe running, and check the log for which watcher activated**

```bash
grep -i "memory-based EE.log watcher\|Falling back to file-based" /path/to/data_dir/orbiter.log | tail -5
```

Expected: either `Memory-based EE.log watcher active (VA 0x..., N bytes)` (success) or `Falling back to file-based EE.log watcher` (fallback engaged - not a failure of this plan, but worth reporting *why* it fell back, since the log lines above it explain the specific reason).

- [ ] **Step 2: If memory-based watching activated, do a real Riven reroll and time it**

Same test Jacob already did for the anchor-rescue plan: enter a Riven reroll screen with a stopwatch running, and see whether the overlay now appears meaningfully faster than the previously-measured ~10 seconds. This is the actual test of whether this plan achieved its goal - report the real measured time, not an assumption that switching mechanisms alone fixed it.

- [ ] **Step 3: Confirm a normal reward detection (Defense/Fissure mission) still works**

The reward trigger path shares this same watcher - a live mission reward screen should still trigger the overlay normally, same as before this plan.

- [ ] **Step 4: Push and open a PR**

```bash
git push -u origin plan/ee-log-memory-scan
```

Then open a PR via GitKraken (`pull_request_create`) targeting `main`, with the live verification results from Steps 1-3 in the description (which watcher activated, the measured Riven trigger timing, reward detection still working) - this is a live-behavior change to the app's most critical detection path, so the PR description needs real evidence, not just "tests pass."

---

## Self-Review Notes

- **Spec coverage**: implements the full deferred `TODO.md` item (memory-scan EE.log reading, dynamic ring-buffer discovery, circular-buffer-safe hash-dedup parsing) using the real algorithm verified directly from Kronos's current source, not a reinvention. Explicitly preserves the existing file-based watcher as a mandatory fallback rather than replacing it outright, given how critical and historically fragile this exact trigger path has been throughout this project's history.
- **No placeholders**: every function in Task 1 and Task 2 is a complete, real implementation ported from verified working code, not a stub.
- **Type consistency**: `memory_log_watcher()`'s signature and channel usage in Task 2 match `log_watcher()`'s exactly, so the fallback wiring in Task 2 Step 3 is a like-for-like swap. `mem_log`'s public functions (`get_warframe_pid`, `discover_ring_buffer`, `read_ring_buffer`, `validate_buffer`, `load_offset_cache`, `save_offset_cache`, `MemOffsets`) are used with matching signatures in both Task 1's own tests and Task 2's watcher.
- **Honesty about limitations**: Task 3 is explicit that live verification cannot be automated or faked - this plan's actual success (did it fix the delay?) can only be confirmed by a real timed test, not by tests passing.
- **Risk**: this is the highest-risk plan in the series so far (reads another process's memory, touches the primary trigger for both reward and Riven detection). The fallback-on-any-failure design is the safety mechanism; Jacob should specifically watch for the "Falling back to file-based EE.log watcher" log line during initial testing to see whether memory-based reading is even activating on his system before judging whether the timing actually improved.
