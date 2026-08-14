import { z } from 'zod';
import { prisma } from '../db.js';
import { ApiError } from '../utils/ApiError.js';
import { buildCodeDocContent, buildWhiteboardDocContent } from '../utils/docContent.js';

export const createDocumentSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  title: z.string().trim().max(200).optional(),
  type: z.enum(['CODE', 'WHITEBOARD']).default('CODE'),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export async function listDocumentsForUser(userId: string) {
  return prisma.document.findMany({
    where: { workspace: { members: { some: { userId } } } },
    include: {
      workspace: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
}

export async function createDocument(input: CreateDocumentInput, ownerId: string) {
  await assertWorkspaceAccess(input.workspaceId, ownerId);

  const content = input.type === 'WHITEBOARD' ? buildWhiteboardDocContent() : buildCodeDocContent();

  return prisma.document.create({
    data: {
      title: input.title,
      type: input.type,
      content,
      workspaceId: input.workspaceId,
      ownerId,
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      workspace: { select: { id: true, name: true } },
    },
  });
}

export async function getDocumentForUser(documentId: string, userId: string) {
  await assertDocumentAccess(documentId, userId);

  return prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      workspace: { select: { id: true, name: true, ownerId: true } },
      owner: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

export async function updateDocumentTitle(documentId: string, title: string, userId: string) {
  await assertDocumentAccess(documentId, userId);
  return prisma.document.update({ where: { id: documentId }, data: { title } });
}

export async function deleteDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true, workspaceId: true },
  });
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  const canDelete =
    document.ownerId === userId ||
    (
      await prisma.workspace.findUnique({
        where: { id: document.workspaceId },
        select: { ownerId: true },
      })
    )?.ownerId === userId;

  if (!canDelete) {
    throw new ApiError(403, 'Only the document owner or workspace owner can delete this document');
  }

  await prisma.document.delete({ where: { id: documentId } });
}

async function assertDocumentAccess(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { workspaceId: true },
  });
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }
  await assertWorkspaceAccess(document.workspaceId, userId);
}

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
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
}
