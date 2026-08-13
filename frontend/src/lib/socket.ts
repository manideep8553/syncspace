import { io, type Socket } from 'socket.io-client';
import { getToken } from './http';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io({
    auth: { token: getToken() ?? '' },
    autoConnect: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}