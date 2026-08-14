import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { RoomBroadcastEvent, RoomMessage } from '../types/models';

/** Joins a Socket.IO room for presence + broadcasting when a room id is available, and leaves on unmount. */
export function useRoomSocket(roomId: string | undefined) {
  const { socket, joinRoom, leaveRoom, roomMembers, roomMessages, roomBroadcasts } = useSocket();

  useEffect(() => {
    if (!roomId || !socket) return;

    joinRoom(roomId);
    const onConnect = () => joinRoom(roomId);
    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
      leaveRoom(roomId);
    };
  }, [roomId, socket, joinRoom, leaveRoom]);

  return {
    members: roomId ? (roomMembers[roomId] ?? []) : [],
    messages: roomId ? (roomMessages[roomId] ?? []) : [],
    broadcasts: roomId ? (roomBroadcasts[roomId] ?? []) : [],
  };
}

export type { RoomMessage, RoomBroadcastEvent };
