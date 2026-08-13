import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
    if (!user) {
      throw new ApiError(401, 'The authenticated user no longer exists');
    }
    req.userId = payload.userId;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token'));
  }
}