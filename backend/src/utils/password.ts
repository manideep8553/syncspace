import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, digest: string): Promise<boolean> {
  return compare(plain, digest);
}