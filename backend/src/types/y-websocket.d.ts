declare module 'y-websocket/bin/utils' {
  import type { IncomingMessage } from 'node:http';
  import type { WebSocket } from 'ws';
  import type * as Y from 'yjs';

  export interface WSSharedDoc extends Y.Doc {
    name: string;
    /** Maps each connected WebSocket to the set of awareness client ids it controls. */
    conns: Map<WebSocket, Set<number>>;
    awareness: import('y-protocols/awareness').Awareness;
  }

  export const docs: Map<string, WSSharedDoc>;

  export function getYDoc(docName: string, gc?: boolean): WSSharedDoc;

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    opts?: { docName?: string; gc?: boolean }
  ): void;

  export function setContentInitializor(fn: (ydoc: WSSharedDoc) => Promise<void>): void;

  export function setPersistence(
    persistence: {
      provider: unknown;
      bindState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
      writeState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
    } | null
  ): void;

  export function getPersistence(): {
    provider: unknown;
    bindState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
    writeState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
  } | null;
}
