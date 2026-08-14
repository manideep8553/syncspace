import type { Request, Response } from 'express';
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listRooms,
  type CreateRoomInput,
} from '../services/room.service.js';

export async function list(req: Request, res: Response) {
  const data = await listRooms(req.userId);
  res.json({ success: true, data });
}

export async function get(req: Request, res: Response) {
  const { roomId } = req.validated.params as unknown as { roomId: string };
  const data = await getRoom(roomId, req.userId);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const input = req.validated.body as unknown as CreateRoomInput;
  const data = await createRoom(input.name, req.userId);
  res.status(201).json({ success: true, data });
}

export async function join(req: Request, res: Response) {
  const { code } = req.validated.params as unknown as { code: string };
  const data = await joinRoom(code, req.userId);
  res.json({ success: true, data });
}

export async function leave(req: Request, res: Response) {
  const { roomId } = req.validated.params as unknown as { roomId: string };
  await leaveRoom(roomId, req.userId);
  res.status(204).end();
}
