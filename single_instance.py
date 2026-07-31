"""Single-main-window guard with activation IPC for tray-hidden instances."""

import hashlib

from PySide6.QtCore import QObject, Signal
from PySide6.QtNetwork import QLocalServer, QLocalSocket

from paths import DATA_DIR


def _server_name():
    identity = hashlib.sha256(str(DATA_DIR).encode()).hexdigest()[:16]
    return f"kiedas-orbiter-{identity}"


class SingleInstance(QObject):
    activate_requested = Signal()

    def __init__(self, name=None, parent=None):
        super().__init__(parent)
        self.name = name or _server_name()
        self._server = QLocalServer(self)
        self._server.newConnection.connect(self._accept_connections)
        self._connections = set()

    def acquire(self):
        """Return True for the primary process; notify and return False otherwise."""
        if self._server.listen(self.name):
            return True

        socket = QLocalSocket()
        socket.connectToServer(self.name)
        if socket.waitForConnected(500):
            socket.write(b"show\n")
            socket.flush()
            socket.waitForBytesWritten(500)
            socket.disconnectFromServer()
            return False

        # Unix local-server names can survive an unclean process exit. Only
        # remove the endpoint after connection failure proves it is stale.
        QLocalServer.removeServer(self.name)
        if self._server.listen(self.name):
            return True
        raise RuntimeError(f"could not create single-instance server {self.name!r}")

    def _accept_connections(self):
        while self._server.hasPendingConnections():
            socket = self._server.nextPendingConnection()
            self._connections.add(socket)
            socket.readyRead.connect(lambda s=socket: self._read_command(s))
            socket.disconnected.connect(lambda s=socket: self._drop_connection(s))
            if socket.bytesAvailable():
                self._read_command(socket)

    def _read_command(self, socket):
        if b"show" in bytes(socket.readAll()).lower():
            self.activate_requested.emit()

    def _drop_connection(self, socket):
        # QLocalServer/Qt owns pending sockets and may destroy the C++ object
        # as part of disconnect handling before this Python slot runs. Only
        # release our strong reference; calling deleteLater() here can attempt
        # to delete an already-destroyed Shiboken wrapper.
        self._connections.discard(socket)
