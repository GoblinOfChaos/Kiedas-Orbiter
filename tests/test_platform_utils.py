from platform_utils import _matches_pattern


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
