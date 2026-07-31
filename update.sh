#!/usr/bin/env sh
# Compatibility entrypoint; update_manager.py owns fetching and safe commits.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$SCRIPT_DIR/.venv/bin/python" "$SCRIPT_DIR/update_manager.py" quick
