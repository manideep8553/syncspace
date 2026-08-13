import { useMemo } from 'react';
import type { RoomKind } from '../types/models';
import { getCollaborativeInstance } from '../lib/yjs';
import { getToken } from '../lib/http';

/**
 * React binding for a shared Y.Doc. The underlying document and websocket
 * provider are session-scoped singletons (see lib/yjs.ts).
 */
export function useCollaborativeDoc(docId: string, kind: RoomKind) {
  return useMemo(() => getCollaborativeInstance(docId, kind), [docId, kind]);
}

/** Returns the current auth token or refreshes awareness user fields with it. */
export function currentTokenOrEmpty(): string {
  return getToken() ?? '';
}