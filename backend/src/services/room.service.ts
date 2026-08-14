import { Prisma, type Room } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

export const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(120),
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Invite code is too short')
    .max(20, 'Invite code is too long')
    .transform((value) => value.toUpperCase()),
});

export const roomIdSchema = z.object({
  roomId: z.string().cuid('Invalid room id'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const roomSummaryInclude = {
  owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.RoomInclude;

function generateRoomCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < bytes.length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findRoomSummary(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: { select: { userId: true, role: true }, where: { userId } },
      _count: { select: { members: true } },
    },
  });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }
  return toRoomSummary(room);
}

function toRoomSummary(
  room: Room & {
    owner: { id: string; name: string; email: string; avatarUrl: string | null };
    members: Array<{ userId: string; role: string }>;
    _count: { members: number };
  }
) {
  const { _count, members, ...rest } = room;
  const membership = members[0] ?? null;
  return {
    ...rest,
    memberCount: _count.members,
    isMember: membership !== null,
    role: membership ? membership.role : null,
  };
}

export async function listRooms(userId: string) {
  const rooms = await prisma.room.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: { select: { userId: true, role: true }, where: { userId } },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return rooms.map(toRoomSummary);
}

export async function createRoom(name: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    let room: Room | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        room = await tx.room.create({
          data: { name, code: generateRoomCode(), ownerId },
          include: roomSummaryInclude,
        });
        break;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    if (!room) {
      throw new ApiError(500, 'Could not generate a unique room code. Please try again.');
    }

    await tx.roomMember.create({
      data: { roomId: room.id, userId: ownerId, role: 'OWNER' },
    });

    return {
      ...room,
      memberCount: 1,
      isMember: true,
      role: 'OWNER' as const,
    };
  });
}

export async function getRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: { select: { userId: true, role: true }, where: { userId } },
      _count: { select: { members: true } },
    },
  });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }
  const summary = toRoomSummary(room);
  if (!summary.isMember) {
    throw new ApiError(403, 'You are not a member of this room');
  }
  return summary;
}

export async function joinRoom(code: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    throw new ApiError(404, 'Room not found. Check the invite code and try again.');
  }

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
  });
  if (!existing) {
    await prisma.roomMember.create({
      data: { roomId: room.id, userId, role: 'EDITOR' },
    });
  }

  return findRoomSummary(room.id, userId);
}

export async function leaveRoom(roomId: string, userId: string) {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership) {
    throw new ApiError(404, 'You are not a member of this room');
  }
  await prisma.roomMember.delete({ where: { id: membership.id } });
}
