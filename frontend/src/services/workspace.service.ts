import { api } from '../lib/http';
import type {
  MemberRole,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSummary,
} from '../types/models';

export const workspaceService = {
  list: () => api.get<WorkspaceSummary[]>('/workspaces'),
  create: (name: string) => api.post<WorkspaceSummary>('/workspaces', { name }),
  get: (workspaceId: string) => api.get<WorkspaceDetail>(`/workspaces/${workspaceId}`),
  remove: (workspaceId: string) => api.delete<void>(`/workspaces/${workspaceId}`),
  addMember: (workspaceId: string, email: string, role: 'EDITOR' | 'VIEWER' = 'EDITOR') =>
    api.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, { email, role }),
  updateMemberRole: (workspaceId: string, memberId: string, role: MemberRole) =>
    api.patch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, { role }),
  removeMember: (workspaceId: string, memberId: string) =>
    api.delete<void>(`/workspaces/${workspaceId}/members/${memberId}`),
};
