from collections import defaultdict

from fastapi import WebSocket


class TrackingWebSocketManager:
    def __init__(self):
        self._bus_connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, bus_id: int):
        await websocket.accept()
        self._bus_connections[bus_id].add(websocket)

    def disconnect(self, websocket: WebSocket, bus_id: int):
        if bus_id in self._bus_connections:
            self._bus_connections[bus_id].discard(websocket)
            if not self._bus_connections[bus_id]:
                self._bus_connections.pop(bus_id, None)

    async def broadcast_bus(self, bus_id: int, payload: dict):
        for conn in list(self._bus_connections.get(bus_id, [])):
            await conn.send_json(payload)


ws_manager = TrackingWebSocketManager()

