import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { useAuth } from '../hooks/useAuth';
import type { PresenceUser, RoomBroadcastEvent, RoomMessage } from '../types/models';

export interface RemoteCursor {
  user: PresenceUser;
  x: number;
  y: number;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  peers: PresenceUser[];
  cursors: Record<string, RemoteCursor>;
  roomMembers: Record<string, PresenceUser[]>;
  roomMessages: Record<string, RoomMessage[]>;
  roomBroadcasts: Record<string, RoomBroadcastEvent[]>;
  joinDocument: (docId: string) => void;
  sendCursor: (x: number, y: number) => void;
  sendTyping: (isTyping: boolean) => void;
  notifyDocumentUpdated: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendRoomMessage: (roomId: string, text: string) => void;
  broadcastRoomEvent: (roomId: string, event: string, data?: unknown) => void;
  clearRoomActivity: () => void;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [roomMembers, setRoomMembers] = useState<Record<string, PresenceUser[]>>({});
  const [roomMessages, setRoomMessages] = useState<Record<string, RoomMessage[]>>({});
  const [roomBroadcasts, setRoomBroadcasts] = useState<Record<string, RoomBroadcastEvent[]>>({});
  const joinedDocRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      setPeers([]);
      setCursors({});
      setRoomMembers({});
      setRoomMessages({});
      setRoomBroadcasts({});
      joinedDocRef.current = null;
      return;
    }

    const s = connectSocket();
    setSocket(s);
    setConnected(s.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setPeers([]);
      setCursors({});
      setRoomMembers({});
      setRoomMessages({});
      setRoomBroadcasts({});
    };
    const onPresenceList = (list: PresenceUser[]) => {
      setPeers(list.filter((presence) => presence.userId !== user.id));
    };
    const onPresenceJoined = (presence: PresenceUser) => {
      if (presence.userId === user.id) return;
      setPeers((prev) =>
        prev.some((peer) => peer.userId === presence.userId) ? prev : [...prev, presence]
      );
    };
    const onPresenceLeft = (presence: PresenceUser) => {
      setPeers((prev) => prev.filter((peer) => peer.userId !== presence.userId));
      setCursors((prev) => {
        const { [presence.userId]: _removed, ...rest } = prev;
        return rest;
      });
    };
    const onPresenceUpdate = (presence: PresenceUser) => {
      setPeers((prev) => prev.map((peer) => (peer.userId === presence.userId ? presence : peer)));
    };
    const onCursorMove = (cursor: RemoteCursor) => {
      if (cursor.user.userId === user.id) return;
      setCursors((prev) => ({ ...prev, [cursor.user.userId]: cursor }));
    };
    const onRoomMembers = ({ roomId, members }: { roomId: string; members: PresenceUser[] }) => {
      setRoomMembers((prev) => ({
        ...prev,
        [roomId]: members.filter((member) => member.userId !== user.id),
      }));
    };
    const onRoomMemberJoined = ({
      roomId,
      user: member,
    }: {
      roomId: string;
      user: PresenceUser;
    }) => {
      if (member.userId === user.id) return;
      setRoomMembers((prev) => {
        const current = prev[roomId] ?? [];
        return {
          ...prev,
          [roomId]: current.some((m) => m.userId === member.userId)
            ? current
            : [...current, member],
        };
      });
    };
    const onRoomMemberLeft = ({ roomId, user: member }: { roomId: string; user: PresenceUser }) => {
      setRoomMembers((prev) => {
        const current = prev[roomId] ?? [];
        return { ...prev, [roomId]: current.filter((m) => m.userId !== member.userId) };
      });
    };
    const onRoomMessage = (message: RoomMessage) => {
      setRoomMessages((prev) => ({
        ...prev,
        [message.roomId]: [...(prev[message.roomId] ?? []), message].slice(-100),
      }));
    };
    const onRoomBroadcast = (event: RoomBroadcastEvent) => {
      setRoomBroadcasts((prev) => ({
        ...prev,
        [event.roomId]: [...(prev[event.roomId] ?? []), event].slice(-50),
      }));
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('presence:list', onPresenceList);
    s.on('presence:joined', onPresenceJoined);
    s.on('presence:left', onPresenceLeft);
    s.on('presence:update', onPresenceUpdate);
    s.on('cursor:move', onCursorMove);
    s.on('room:members', onRoomMembers);
    s.on('room:member_joined', onRoomMemberJoined);
    s.on('room:member_left', onRoomMemberLeft);
    s.on('room:message', onRoomMessage);
    s.on('room:broadcast', onRoomBroadcast);

    // Re-join the document if the socket ever reconnects mid-session.
    if (joinedDocRef.current) {
      s.emit('doc:join', joinedDocRef.current);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('presence:list', onPresenceList);
      s.off('presence:joined', onPresenceJoined);
      s.off('presence:left', onPresenceLeft);
      s.off('presence:update', onPresenceUpdate);
      s.off('cursor:move', onCursorMove);
      s.off('room:members', onRoomMembers);
      s.off('room:member_joined', onRoomMemberJoined);
      s.off('room:member_left', onRoomMemberLeft);
      s.off('room:message', onRoomMessage);
      s.off('room:broadcast', onRoomBroadcast);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- `user` object identity stable across renders

  const joinDocument = useCallback(
    (docId: string) => {
      joinedDocRef.current = docId;
      socket?.emit('doc:join', docId);
    },
    [socket]
  );

  const sendCursor = useCallback(
    (x: number, y: number) => {
      socket?.emit('cursor:move', { x, y });
    },
    [socket]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit('typing', isTyping);
    },
    [socket]
  );

  const notifyDocumentUpdated = useCallback(() => {
    socket?.emit('doc:updated');
  }, [socket]);

  const joinRoom = useCallback(
    (roomId: string) => {
      socket?.emit('room:join', roomId);
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      socket?.emit('room:leave', roomId);
    },
    [socket]
  );

  const sendRoomMessage = useCallback(
    (roomId: string, text: string) => {
      socket?.emit('room:message', { roomId, text });
    },
    [socket]
  );

  const broadcastRoomEvent = useCallback(
    (roomId: string, event: string, data?: unknown) => {
      socket?.emit('room:broadcast', { roomId, event, data });
    },
    [socket]
  );

  const clearRoomActivity = useCallback(() => {
    setRoomMembers({});
    setRoomMessages({});
    setRoomBroadcasts({});
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      peers,
      cursors,
      roomMembers,
      roomMessages,
      roomBroadcasts,
      joinDocument,
      sendCursor,
      sendTyping,
      notifyDocumentUpdated,
      joinRoom,
      leaveRoom,
      sendRoomMessage,
      broadcastRoomEvent,
      clearRoomActivity,
    }),
    [
      socket,
      connected,
      peers,
      cursors,
      roomMembers,
      roomMessages,
      roomBroadcasts,
      joinDocument,
      sendCursor,
      sendTyping,
      notifyDocumentUpdated,
      joinRoom,
      leaveRoom,
      sendRoomMessage,
      broadcastRoomEvent,
      clearRoomActivity,
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
