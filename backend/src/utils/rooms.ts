export type RoomKind = 'code' | 'whiteboard';

export interface ParsedRoom {
  kind: RoomKind;
  docId: string;
}

export function buildRoomName(docId: string, kind: RoomKind): string {
  return `${kind}-${docId}`;
}

export function parseRoomName(roomName: string): ParsedRoom | null {
  const match = /^(code|whiteboard)-(.+)$/.exec(roomName);
  if (!match) return null;
  return { kind: match[1] as RoomKind, docId: match[2] };
}