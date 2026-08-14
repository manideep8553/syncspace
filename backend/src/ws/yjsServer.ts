import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { parseRoomName } from '../utils/rooms.js';
import { configureDocumentPersistence } from './persistence.js';

const YJS_PATH = '/yjs/';

type AuthorizedWebSocket = WebSocket & { docName?: string };

/**
 * Attaches the Yjs CRDT websocket endpoint (`/yjs/<kind>-<docId>`) to the same
 * HTTP server as Express and Socket.IO. Each connection is authenticated and
 * authorized against the requesting user's workspace membership before the
 * Yjs sync protocol handshake (`setupWSConnection`) takes over.
 */
export function attachYjsServer(server: http.Server): void {
  configureDocumentPersistence();

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost:4000');
    if (!url.pathname.startsWith(YJS_PATH)) {
      // Not ours — Socket.IO is registered on the same server and will handle
      // `/socket.io` upgrades. Do not touch the socket.
      return;
    }

    const docName = decodeURIComponent(url.pathname.slice(YJS_PATH.length));
    const token = url.searchParams.get('token') ?? '';

    if (!docName) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    verifyRoomAccess(docName, token)
      .then((allowed) => {
        if (!allowed) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          (ws as AuthorizedWebSocket).docName = docName;
          wss.emit('connection', ws, req);
        });
      })
      .catch(() => {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      });
  });

  wss.on('connection', (ws, req) => {
    const docName = (ws as AuthorizedWebSocket).docName;
    if (!docName) {
      ws.close();
      return;
    }
    setupWSConnection(ws, req, { docName });
  });
}

async function verifyRoomAccess(docName: string, token: string): Promise<boolean> {
  const parsed = parseRoomName(docName);
  if (!parsed || !token) return false;

  try {
    const payload = verifyAccessToken(token);

    const document = await prisma.document.findUnique({
      where: { id: parsed.docId },
      select: { id: true, type: true, workspaceId: true },
    });
    if (!document) return false;

    const expectedRoom =
      document.type === 'CODE' ? `code-${document.id}` : `whiteboard-${document.id}`;
    if (expectedRoom !== docName) return false;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: document.workspaceId, userId: payload.userId },
      },
    });

    return membership !== null;
  } catch {
    return false;
  }
}
