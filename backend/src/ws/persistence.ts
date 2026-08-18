import * as Y from 'yjs';
import { setContentInitializor } from 'y-websocket/bin/utils';
import { prisma } from '../db.js';
import { decodeBytes, encodeBytes } from '../utils/base64.js';
import { parseRoomName } from '../utils/rooms.js';
import { ioServer } from './socketServer.js';

const SAVE_DEBOUNCE_MS = 1500;

interface PendingSave {
  timer: NodeJS.Timeout;
  ydoc: Y.Doc;
}

const pendingSaves = new Map<string, PendingSave>;

/**
 * Initializes the Yjs persistence pipeline.
 *
 * `setContentInitializor` runs exactly once whenever a document is created in
 * the shared y-websocket room registry. We use it to (1) hydrate the CRDT from
 * the latest state stored in PostgreSQL and (2) attach an observer that
 * debounce-persists every subsequent change back to the database.
 * Additionally, we broadcast Yjs updates via Socket.IO so that all connected
 * clients can synchronize their state.
 */
export function configureDocumentPersistence(): void {
  setContentInitializor(async (ydoc) => {
    const roomName = ydoc.name;
    await hydrateFromDatabase(roomName, ydoc);
    ydoc.on('update', () => scheduleSave(roomName, ydoc));
  });
}

function scheduleSave(roomName: string, ydoc: Y.Doc): void {
  const parsed = parseRoomName(roomName);
  if (!parsed) return;

  const io = ioServer;
  if (io) {
    const update = Y.encodeStateAsUpdate(ydoc);
    io.to(`room:${parsed.docId}`).emit('ydoc:update', {
      docId: parsed.docId,
      update,
    });
  }

  const existing = pendingSaves.get(roomName);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    pendingSaves.delete(roomName);
    void persistRoom(roomName, ydoc);
  }, SAVE_DEBOUNCE_MS);

  pendingSaves.set(roomName, { timer, ydoc });
}

async function hydrateFromDatabase(roomName: string, ydoc: Y.Doc): Promise<void> {
  try {
    const parsed = parseRoomName(roomName);
    if (!parsed) return;

    const document = await prisma.document.findUnique({
      where: { id: parsed.docId },
      select: { content: true },
    });

    if (document?.content) {
      Y.applyUpdate(ydoc, decodeBytes(document.content));
    }
  } catch (error) {
    console.error(`[yjs] failed to hydrate room "${roomName}":`, error);
  }
}

async function persistRoom(roomName: string, ydoc: Y.Doc): Promise<void> {
  try {
    const parsed = parseRoomName(roomName);
    if (!parsed) return;

    const update = Y.encodeStateAsUpdate(ydoc);
    await prisma.document.update({
      where: { id: parsed.docId },
      data: { content: encodeBytes(update) },
    });
  } catch (error) {
    console.error(`[yjs] failed to persist room "${roomName}":`, error);
  }
}

/** Flushes any pending writes. Called during graceful shutdown. */
export async function flushPendingPersists(): Promise<void> {
  const entries = Array.from(pendingSaves.entries());
  pendingSaves.clear();

  const writes = entries.map(async ([roomName, pending]) => {
    clearTimeout(pending.timer);
    await persistRoom(roomName, pending.ydoc);
  });

  await Promise.allSettled(writes);
}