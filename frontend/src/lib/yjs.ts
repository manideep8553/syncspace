import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getSocket } from './socket';
import { getToken } from './http';
import type { RoomKind } from '../types/models';

export interface CollaborativeInstance {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

const instances = new Map<string, CollaborativeInstance>();

function buildWsBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/yjs`;
}

/**
 * Returns a shared (session-scoped) Y.Doc + WebsocketProvider for a room.
 * Documents are kept alive for the whole session so that navigating between
 * pages never loses unsynced CRDT state.
 */
export function getCollaborativeInstance(docId: string, kind: RoomKind): CollaborativeInstance {
  const key = `${kind}:${docId}`;
  const existing = instances.get(key);
  if (existing) return existing;

  const docName = `${kind}-${docId}`;
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(buildWsBaseUrl(), docName, doc, {
    params: { token: getToken() ?? '' },
    connect: true,
  });

  const instance: CollaborativeInstance = { doc, provider };
  instances.set(key, instance);

  // Set up Socket.IO sync for Yjs updates (using existing authenticated socket)
  setupYdocSocketSync(doc, docName);

  return instance;
}

/**
 * Sets up Socket.IO event listeners to synchronize Yjs document updates.
 * Listens for 'ydoc:update' events from the backend and applies them
 * to the Y.Doc using CRDT-aware applyUpdate.
 */
function setupYdocSocketSync(doc: Y.Doc, docName: string): void {
  const socket = getSocket();
  if (!socket) return;

  const parsed = docName.split('-');
  const roomDocId = parsed[1];

  if (!roomDocId) return;

  // Listen for Yjs update broadcasts from backend via Socket.IO
  socket.on('ydoc:update', (payload: { docId: string; update: Uint8Array }) => {
    if (payload.docId === roomDocId) {
      try {
        Y.applyUpdate(doc, payload.update as Uint8Array);
      } catch (error) {
        console.error('[yjs] failed to apply Socket.IO update:', error);
      }
    }
  });
}

export function disconnectAllCollaborativeInstances(): void {
  for (const instance of instances.values()) {
    instance.provider.destroy();
    instance.doc.destroy();
  }
  instances.clear();
}
