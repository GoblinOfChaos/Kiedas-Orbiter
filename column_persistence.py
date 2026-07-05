"""Shared helper so table/tree column widths survive app restarts.

Widths are saved to column_widths.json, keyed by a caller-chosen name so
multiple tables in the same file (or across files) don't collide.
"""
import json
from pathlib import Path

_STORE_PATH = Path(__file__).parent / "column_widths.json"


def _load_store():
    try:
        return json.loads(_STORE_PATH.read_text())
    except Exception:
        return {}


def _save_store(store):
    try:
        _STORE_PATH.write_text(json.dumps(store, indent=2))
    except Exception:
        pass


MAX_AUTO_WIDTH = 420   # never let auto-size blow out a column beyond this


def auto_size_columns(view):
    """Resize every column to fit its content (call after populating the table).
    Caps each column at MAX_AUTO_WIDTH to prevent a single long value
    from blowing out the layout."""
    try:
        if hasattr(view, 'horizontalHeader'):
            header = view.horizontalHeader()
            for col in range(header.count()):
                view.resizeColumnToContents(col)
                if view.columnWidth(col) > MAX_AUTO_WIDTH:
                    view.setColumnWidth(col, MAX_AUTO_WIDTH)
            try:
                view.resizeRowsToContents()
            except Exception:
                pass
        else:
            hdr = view.header()
            for col in range(hdr.count()):
                view.resizeColumnToContents(col)
                if view.columnWidth(col) > MAX_AUTO_WIDTH:
                    view.setColumnWidth(col, MAX_AUTO_WIDTH)
    except Exception:
        pass


def apply_saved_widths(view, key, defaults):
    """Auto-size columns to content first, then apply saved widths (or defaults).

    Priority: saved user adjustment > default > auto-size.
    This means columns start at a sensible size but the user's manual
    adjustments always win on subsequent launches.
    """
    # First auto-size so nothing is clipped
    auto_size_columns(view)

    saved = _load_store().get(key, {})
    for col, default in enumerate(defaults):
        if str(col) in saved:
            # User has explicitly set this column before — honour it
            view.setColumnWidth(col, saved[str(col)])
        else:
            # No saved value: use whichever is larger — auto-sized or default
            current = view.columnWidth(col)
            view.setColumnWidth(col, max(current, default))


def align_columns(table, left_cols=(0,)):
    """Left-align specified columns, center-align all others.
    Call after populating a QTableWidget.
    left_cols: tuple of column indices to left-align (default: col 0 only)."""
    from PySide6.QtCore import Qt
    try:
        for row in range(table.rowCount()):
            for col in range(table.columnCount()):
                item = table.item(row, col)
                if item is not None:
                    if col in left_cols:
                        item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                    else:
                        item.setTextAlignment(Qt.AlignCenter)
    except Exception:
        pass


def remember_widths(view, key):
    """Persist column widths for `key` whenever the user resizes a column."""
    header = view.horizontalHeader() if hasattr(view, 'horizontalHeader') else view.header()

    def _on_resize(index, old_size, new_size):
        store = _load_store()
        store.setdefault(key, {})[str(index)] = new_size
        _save_store(store)

    header.sectionResized.connect(_on_resize)
