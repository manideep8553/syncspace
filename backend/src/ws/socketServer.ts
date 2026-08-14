import type http from 'node:http';
import { Server as IOServer } from 'socket.io';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { verifyAccessToken } from '../utils/jwt.js';

export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

interface SocketData {
  userId: string;
  presence?: PresenceUser;
  docId?: string;
  roomIds: Set<string>;
}

export interface RoomMessage {
  roomId: string;
  user: PresenceUser;
  text: string;
  at: number;
}

export interface RoomBroadcastEvent {
  roomId: string;
  event: string;
  data: unknown;
  user: PresenceUser;
  at: number;
}

const avatarColors = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}

export function attachSocketServer(server: http.Server): IOServer {
  const io = new IOServer(server, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        throw new Error('No token provided');
      }
      const payload = verifyAccessToken(token);
      (socket.data as SocketData).userId = payload.userId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const data = socket.data as SocketData;
    data.roomIds = new Set<string>();
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const presence: PresenceUser = {
      userId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      color: colorForUser(user.id),
    };
    data.presence = presence;

    socket.on('doc:join', async (docId: string, ack?: (ok: boolean) => void) => {
      const document = await prisma.document.findUnique({
        where: { id: docId },
        select: { workspaceId: true },
      });
      if (!document) {
        ack?.(false);
        return;
      }
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: document.workspaceId, userId: data.userId } },
      });
      if (!membership) {
        ack?.(false);
        return;
      }

      data.docId = docId;
      await socket.join(`doc:${docId}`);
      ack?.(true);

      socket.emit('presence:list', await getPeers(io, docId));
      socket.to(`doc:${docId}`).emit('presence:joined', presence);
    });

    socket.on('presence:update', (patch: Partial<PresenceUser>) => {
      Object.assign(data.presence ?? {}, patch);
      const docId = data.docId;
      if (docId && data.presence) {
        socket.to(`doc:${docId}`).emit('presence:update', data.presence);
      }
    });

    socket.on('cursor:move', (payload: { x: number; y: number }) => {
      const docId = data.docId;
      if (docId && data.presence) {
        socket.to(`doc:${docId}`).emit('cursor:move', {
          user: data.presence,
          x: payload.x ?? 0,
          y: payload.y ?? 0,
        });
      }
    });

    socket.on('typing', (isTyping: boolean) => {
      const docId = data.docId;
      if (docId && data.presence) {
        socket
          .to(`doc:${docId}`)
          .emit('typing', { user: data.presence, isTyping: Boolean(isTyping) });
      }
    });

    socket.on('doc:updated', () => {
      const docId = data.docId;
      if (docId && data.presence) {
        socket.to(`doc:${docId}`).emit('doc:updated', { docId, user: data.presence });
      }
    });

    socket.on('room:join', async (roomId: string, ack?: (ok: boolean) => void) => {
      if (typeof roomId !== 'string' || !roomId) {
        ack?.(false);
        return;
      }
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: data.userId } },
      });
      if (!membership) {
        ack?.(false);
        return;
      }

      data.roomIds.add(roomId);
      await socket.join(`room:${roomId}`);
      ack?.(true);

      socket.emit('room:members', { roomId, members: await getRoomMembers(io, roomId) });
      socket.to(`room:${roomId}`).emit('room:member_joined', { roomId, user: data.presence });
    });

    socket.on('room:leave', async (roomId: string, ack?: (ok: boolean) => void) => {
      if (typeof roomId !== 'string' || !roomId) {
        ack?.(false);
        return;
      }
      data.roomIds.delete(roomId);
      await socket.leave(`room:${roomId}`);
      ack?.(true);
      socket.to(`room:${roomId}`).emit('room:member_left', { roomId, user: data.presence });
    });

    socket.on('room:message', (payload: { roomId?: string; text?: unknown }) => {
      const roomId = payload?.roomId;
      const text = payload?.text;
      if (
        typeof roomId !== 'string' ||
        !data.roomIds.has(roomId) ||
        typeof text !== 'string' ||
        text.trim().length === 0
      ) {
        return;
      }
      const message: RoomMessage = {
        roomId,
        user: data.presence!,
        text: text.slice(0, 4000),
        at: Date.now(),
      };
      io.to(`room:${roomId}`).emit('room:message', message);
    });

    socket.on('room:broadcast', (payload: { roomId?: string; event?: string; data?: unknown }) => {
      const roomId = payload?.roomId;
      if (typeof roomId !== 'string' || !data.roomIds.has(roomId)) {
        return;
      }
      const event: RoomBroadcastEvent = {
        roomId,
        event:
          typeof payload?.event === 'string' && payload.event.length > 0 ? payload.event : 'event',
        data: payload?.data ?? null,
        user: data.presence!,
        at: Date.now(),
      };
      io.to(`room:${roomId}`).emit('room:broadcast', event);
    });

    socket.on('disconnect', () => {
      const docId = data.docId;
      if (data.presence) {
        if (docId) {
          socket.to(`doc:${docId}`).emit('presence:left', data.presence);
        }
        for (const roomId of data.roomIds) {
          io.to(`room:${roomId}`).emit('room:member_left', { roomId, user: data.presence });
        }
      }
    });
  });

  return io;
}

async function getPeers(io: IOServer, docId: string): Promise<PresenceUser[]> {
  const sockets = await io.in(`doc:${docId}`).fetchSockets();
  return sockets
    .map((socket) => (socket.data as SocketData).presence)
    .filter((presence): presence is PresenceUser => presence !== undefined);
}

async function getRoomMembers(io: IOServer, roomId: string): Promise<PresenceUser[]> {
  const sockets = await io.in(`room:${roomId}`).fetchSockets();
  return sockets
    .map((socket) => (socket.data as SocketData).presence)
    .filter((presence): presence is PresenceUser => presence !== undefined);
}
