export type DocumentType = 'CODE' | 'WHITEBOARD';
export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type RoomKind = 'code' | 'whiteboard';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface User extends PublicUser {
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
  owner: PublicUser;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: MemberRole;
  user: PublicUser;
}

export interface DocumentSummary {
  id: string;
  title: string;
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
  owner: PublicUser;
  workspace: { id: string; name: string };
}

export interface DocumentDetail {
  id: string;
  title: string;
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
  workspace: { id: string; name: string; ownerId: string };
  owner: PublicUser;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  role: MemberRole;
  members: WorkspaceMember[];
  documents: DocumentSummary[];
  documentCount: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  code: string;
  owner: PublicUser;
  memberCount: number;
  isMember: boolean;
  role: MemberRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; details?: unknown };
}
