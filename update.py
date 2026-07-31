#!/usr/bin/env python3
"""Compatibility entrypoint for the canonical quick data updater."""

from update_manager import main


if __name__ == "__main__":
    raise SystemExit(main(["quick"]))
