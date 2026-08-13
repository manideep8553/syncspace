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
import type { PresenceUser } from '../types/models';

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
  joinDocument: (docId: string) => void;
  sendCursor: (x: number, y: number) => void;
  sendTyping: (isTyping: boolean) => void;
  notifyDocumentUpdated: () => void;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const joinedDocRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      setPeers([]);
      setCursors({});
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

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('presence:list', onPresenceList);
    s.on('presence:joined', onPresenceJoined);
    s.on('presence:left', onPresenceLeft);
    s.on('presence:update', onPresenceUpdate);
    s.on('cursor:move', onCursorMove);

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
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- `user` object identity stable across renders

  const joinDocument = useCallback((docId: string) => {
    joinedDocRef.current = docId;
    socket?.emit('doc:join', docId);
  }, [socket]);

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

  const value = useMemo(
    () => ({
      socket,
      connected,
      peers,
      cursors,
      joinDocument,
      sendCursor,
      sendTyping,
      notifyDocumentUpdated,
    }),
    [socket, connected, peers, cursors, joinDocument, sendCursor, sendTyping, notifyDocumentUpdated]
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