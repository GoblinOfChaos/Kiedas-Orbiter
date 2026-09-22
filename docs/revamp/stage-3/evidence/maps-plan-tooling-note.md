# Stage 3K plan tooling note

An initial read-only exploratory command embedded a short Python analysis block in the shell instead of writing it to disk first. Its over-escaped regular expression failed before producing a result. A later broad read-only `find` also encountered permission-denied scratch directories while locating map assets.

Neither command changed app source, evidence or build output. The analysis was replaced by the absolute-path, precondition-checked `.preview-work/stage3-maps/prepare-plan.py` script. The permanent plan facts come only from that successful script and its recorded source hashes.
