import { api } from '../lib/http';
import type { User } from '../types/models';

export interface AuthResult {
  user: User;
  token: string;
}

export const authService = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResult>('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
};