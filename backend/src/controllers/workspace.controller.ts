import type { Request, Response } from 'express';
import {
  addMemberToWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceForUser,
  listWorkspacesForUser,
  removeMemberFromWorkspace,
  updateMemberRole,
  type AddMemberInput,
  type CreateWorkspaceInput,
} from '../services/workspace.service.js';

export async function list(req: Request, res: Response) {
  const data = await listWorkspacesForUser(req.userId);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const input = req.validated.body as unknown as CreateWorkspaceInput;
  const data = await createWorkspace(input.name, req.userId);
  res.status(201).json({ success: true, data });
}

export async function get(req: Request, res: Response) {
  const data = await getWorkspaceForUser(String(req.params.workspaceId), req.userId);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  await deleteWorkspace(String(req.params.workspaceId), req.userId);
  res.status(204).end();
}

export async function addMember(req: Request, res: Response) {
  const input = req.validated.body as unknown as AddMemberInput;
  const data = await addMemberToWorkspace(String(req.params.workspaceId), input, req.userId);
  res.status(201).json({ success: true, data });
}

export async function updateRole(req: Request, res: Response) {
  const body = req.validated.body as unknown as { role: 'EDITOR' | 'VIEWER' };
  const data = await updateMemberRole(
    String(req.params.workspaceId),
    String(req.params.memberId),
    body.role,
    req.userId
  );
  res.json({ success: true, data });
}

export async function removeMember(req: Request, res: Response) {
  await removeMemberFromWorkspace(String(req.params.workspaceId), String(req.params.memberId), req.userId);
  res.status(204).end();
}