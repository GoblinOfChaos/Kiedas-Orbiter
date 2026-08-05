import os
import subprocess
import sys

from platform_utils import _matches_pattern, reap_zombie_children


def test_exact_match():
    assert _matches_pattern("./orbiter", "./orbiter")


def test_trailing_path_segment_matches():
    assert _matches_pattern("/home/jedwards/wfinfo-ng/target/release/orbiter", "target/release/orbiter")
    assert _matches_pattern("/home/jedwards/wfinfo-ng/overlay_gtk.py", "/overlay_gtk.py")


def test_pattern_in_the_middle_of_unrelated_text_does_not_match():
    # Live bug found 2026-08-03: a diagnostic `python -c "..."` one-liner
    # whose own inline script text happened to mention "target/release/orbiter"
    # got counted as a running orbiter process, since the whole -c script is
    # a single cmdline argument and the pattern appeared in its middle, not
    # at the end.
    text = (
        "python -c \"\nfrom platform_utils import find_processes\n"
        "for pattern in ['target/release/orbiter', './orbiter']:\n"
        "    pass\n\""
    )
    assert not _matches_pattern(text, "target/release/orbiter")
    assert not _matches_pattern(text, "./orbiter")


def test_unrelated_process_does_not_match():
    assert not _matches_pattern("vim", "target/release/orbiter")
    assert not _matches_pattern("/home/jedwards/notes/orbiter-todo.txt", "orbiter")


def test_distinct_overlay_variants_do_not_cross_match():
    # overlay.py (legacy Qt overlay) and overlay_gtk.py (current GTK
    # overlay) must stay distinguishable - a match for one must not also
    # match a process actually running the other.
    assert _matches_pattern("/home/jedwards/wfinfo-ng/overlay.py", "/overlay.py")
    assert not _matches_pattern("/home/jedwards/wfinfo-ng/overlay_gtk.py", "/overlay.py")


def test_reap_zombie_children_cleans_up_an_exited_child():
    # Live bug found 2026-08-04: a crashed-then-auto-restarted detector
    # left the old crashed process as a permanent zombie in Task Manager
    # (visible as a second "orbiter" entry) - nothing had ever called
    # wait() on it. subprocess.Popen without wait()/poll() leaves exactly
    # this kind of zombie behind once the child exits. Deliberately never
    # calls proc.wait()/proc.poll() here - either would reap it itself
    # (via an internal waitpid) before reap_zombie_children() gets a
    # chance to, defeating the point of this test.
    import time

    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    for _ in range(50):  # up to ~2.5s for the child to actually exit
        if os.waitid(os.P_PID, proc.pid, os.WEXITED | os.WNOWAIT) is not None:
            break
        time.sleep(0.05)
    reaped = reap_zombie_children()
    assert reaped >= 1


def test_reap_zombie_children_is_a_safe_noop_with_nothing_to_reap():
    # Calling this frequently (every reconcile tick) must never raise,
    # even when there's genuinely nothing to clean up.
    reap_zombie_children()
    assert reap_zombie_children() == 0
