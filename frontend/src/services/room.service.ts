import { api } from '../lib/http';
import type { RoomSummary } from '../types/models';

export const roomService = {
  list: () => api.get<RoomSummary[]>('/rooms'),
  create: (name: string) => api.post<RoomSummary>('/rooms', { name }),
  join: (code: string) => api.post<RoomSummary>(`/rooms/${encodeURIComponent(code)}/join`),
  leave: (roomId: string) => api.delete<void>(`/rooms/${roomId}/leave`),
};
