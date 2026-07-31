import uuid

from PySide6.QtWidgets import QApplication

from single_instance import SingleInstance


def test_second_instance_notifies_primary():
    app = QApplication.instance() or QApplication([])
    name = f"kiedas-orbiter-test-{uuid.uuid4().hex}"
    primary = SingleInstance(name)
    secondary = SingleInstance(name)
    activations = []
    primary.activate_requested.connect(lambda: activations.append(True))

    assert primary.acquire()
    assert not secondary.acquire()
    for _ in range(20):
        app.processEvents()
        if activations:
            break
    assert activations == [True]
    # Drain disconnect/destruction signals too; cleanup must not attempt to
    # delete a QLocalSocket that Qt has already destroyed.
    for _ in range(5):
        app.processEvents()
