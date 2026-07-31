#!/usr/bin/env sh
# Compatibility entrypoint for the canonical full updater.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$SCRIPT_DIR/.venv/bin/python" "$SCRIPT_DIR/update_manager.py" all
