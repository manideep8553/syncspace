import type { Request, Response } from 'express';
import {
  getMe,
  loginUser,
  registerUser,
  type LoginInput,
  type RegisterInput,
} from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
  const input = req.validated.body as unknown as RegisterInput;
  const data = await registerUser(input);
  res.status(201).json({ success: true, data });
}

export async function login(req: Request, res: Response) {
  const input = req.validated.body as unknown as LoginInput;
  const data = await loginUser(input);
  res.json({ success: true, data });
}

export async function me(req: Request, res: Response) {
  const data = await getMe(req.userId);
  res.json({ success: true, data });
}
