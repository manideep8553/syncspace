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
        socket.to(`doc:${docId}`).emit('typing', { user: data.presence, isTyping: Boolean(isTyping) });
      }
    });

    socket.on('doc:updated', () => {
      const docId = data.docId;
      if (docId && data.presence) {
        socket.to(`doc:${docId}`).emit('doc:updated', { docId, user: data.presence });
      }
    });

    socket.on('disconnect', () => {
      const docId = data.docId;
      if (docId && data.presence) {
        socket.to(`doc:${docId}`).emit('presence:left', data.presence);
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