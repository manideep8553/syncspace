import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ApiError } from '../utils/ApiError.js';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(120),
});

export const addMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
});

export const memberRoleSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;

const workspaceSummaryInclude = {
  owner: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.WorkspaceInclude;

export async function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    include: workspaceSummaryInclude,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createWorkspace(name: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, ownerId },
      include: workspaceSummaryInclude,
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: 'OWNER' },
    });
    return workspace;
  });
}

export async function getWorkspaceForUser(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
      documents: { orderBy: { updatedAt: 'desc' as const } },
      _count: { select: { documents: true } },
    },
  });

  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!membership) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }

  const { _count, ...rest } = workspace;
  return { ...rest, documentCount: _count.documents, role: membership.role };
}

export async function addMemberToWorkspace(
  workspaceId: string,
  input: AddMemberInput,
  requesterId: string
) {
  await assertCanManage(workspaceId, requesterId);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError(404, `No SyncSpace account found for ${input.email}`);
  }

  const member = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    update: { role: input.role },
    create: { workspaceId, userId: user.id, role: input.role },
  });

  return prisma.workspaceMember.findUniqueOrThrow({
    where: { id: member.id },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}

export async function updateMemberRole(workspaceId: string, memberId: string, role: 'EDITOR' | 'VIEWER', requesterId: string) {
  await assertCanManage(workspaceId, requesterId);

  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, 'Member not found');
  }
  if (member.role === 'OWNER') {
    throw new ApiError(400, 'The role of the workspace owner cannot be changed');
  }

  return prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}

export async function removeMemberFromWorkspace(workspaceId: string, memberId: string, requesterId: string) {
  await assertCanManage(workspaceId, requesterId);

  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) {
    throw new ApiError(404, 'Member not found');
  }
  if (member.role === 'OWNER') {
    throw new ApiError(400, 'The workspace owner cannot be removed');
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
}

export async function deleteWorkspace(workspaceId: string, requesterId: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!workspace) {
    throw new ApiError(404, 'Workspace not found');
  }
  if (workspace.ownerId !== requesterId) {
    throw new ApiError(403, 'Only the workspace owner can delete this workspace');
  }
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

async function assertCanManage(workspaceId: string, requesterId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: requesterId } },
  });
  if (!member) {
    throw new ApiError(403, 'You do not have access to this workspace');
  }
  if (member.role !== 'OWNER') {
    throw new ApiError(403, 'Only the workspace owner can perform this action');
  }
}