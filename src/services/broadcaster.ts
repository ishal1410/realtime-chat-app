import { WebSocketServer, WebSocket } from 'ws';

let _wss: WebSocketServer | null = null;

/** Call once after the WS server is created. */
export function initBroadcaster(wss: WebSocketServer): void {
  _wss = wss;
}

/** Broadcast a JSON payload to every connected client. */
export function broadcast(data: object): void {
  if (!_wss) return;
  const payload = JSON.stringify(data);
  _wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
