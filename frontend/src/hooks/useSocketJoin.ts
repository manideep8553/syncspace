import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/** Joins the Socket.IO presence/document room when a document id is available. */
export function useSocketJoin(documentId: string | undefined) {
  const { socket, joinDocument } = useSocket();

  useEffect(() => {
    if (documentId && socket) {
      joinDocument(documentId);
    }
  }, [documentId, socket, joinDocument]);
}
