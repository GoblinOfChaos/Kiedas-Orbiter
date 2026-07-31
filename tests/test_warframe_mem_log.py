import threading
import time

import warframe_mem_log


def test_bounded_worker_does_not_spawn_or_queue_after_timeout():
    worker = warframe_mem_log._BoundedWorker()
    release = threading.Event()
    calls = []

    def blocked():
        calls.append(1)
        release.wait(1)
        return "late"

    assert worker.run(blocked, 0.01) is warframe_mem_log._TIMEOUT
    assert worker.run(blocked, 0.01) is warframe_mem_log._TIMEOUT
    assert len(calls) == 1
    release.set()
    time.sleep(0.01)
    assert worker.run(lambda: "fresh", 0.1) == "fresh"


def test_seen_compaction_does_not_replay_current_buffer():
    reader = warframe_mem_log.MemLogReader()
    reader.SEEN_RESET_THRESHOLD = 2
    reader._first_read_done = True
    snapshot = b"1.000 Sys [Info]: first\n2.000 Sys [Info]: second\n"

    assert reader._new_lines_from_buffer(snapshot) == [
        "1.000 Sys [Info]: first",
        "2.000 Sys [Info]: second",
    ]
    assert reader._new_lines_from_buffer(snapshot) == []
    newer = snapshot + b"3.000 Sys [Info]: third\n"
    assert reader._new_lines_from_buffer(newer) == ["3.000 Sys [Info]: third"]
