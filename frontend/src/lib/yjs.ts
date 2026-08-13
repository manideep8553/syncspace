import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
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
  return instance;
}

export function disconnectAllCollaborativeInstances(): void {
  for (const instance of instances.values()) {
    instance.provider.destroy();
    instance.doc.destroy();
  }
  instances.clear();
}