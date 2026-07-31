from PySide6.QtWidgets import QApplication


def test_import_tabs():
    """Simple import/instantiation smoke test for tab modules."""
    app = QApplication.instance() or QApplication([])
    import RIVEN_GRADER_TAB as rgt

    tab1 = rgt.RivenGraderTab()

    assert tab1 is not None
    assert tab1._owned.columnCount() == 5
    assert tab1._detail.columnCount() == 2

    import INVENTORY_TAB as invt
    import FOUNDRY_TAB as ft
    import RELIC_PLANNER_TAB as rpt
    import MARKET_TAB as mt
    import MOD_COLLECTION_TAB as mmt
    import STATUS_TAB as st

    tab2 = invt.InventoryTab()
    tab3 = ft.FoundryTab()
    tab4 = rpt.RelicPlannerTab()
    tab5 = mt.MarketTab()
    tab6 = mmt.ModCollectionTab()
    tab7 = st.StatusTab()

    assert tab2._table.rowCount() == len(tab2._owned)
    assert tab3._table.rowCount() == len(tab3._eqmt)
    assert tab4._table.columnCount() == 6
    assert tab5._table.rowCount() > 0
    assert tab6._table.rowCount() > 0

    # Status tab: the periodic status refresh is active and the current
    # settings/tools page instantiated successfully.
    assert tab7.refresh_timer.isActive()

    # Mod Collection now populates in queued chunks. Drain those callbacks
    # before checking its cells instead of assuming synchronous population.
    for _ in range(20):
        if tab6._table.item(tab6._table.rowCount() - 1, 0) is not None:
            break
        app.processEvents()
    assert tab6._table.item(tab6._table.rowCount() - 1, 0) is not None

    # Verify no None cells in any row across table tabs
    for tab in [tab2, tab5, tab6]:
        for r in range(min(10, tab._table.rowCount())):
            for c in range(tab._table.columnCount()):
                assert tab._table.item(r, c) is not None, \
                    f"{tab.__class__.__name__} row {r} col {c} is None"

    app.quit()
