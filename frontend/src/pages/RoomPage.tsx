import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { useSocket } from '../context/SocketContext';
import { getApiErrorMessage } from '../lib/http';
import { roomService } from '../services/room.service';
import type { RoomSummary } from '../types/models';

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RoomPage() {
  const { roomId = '' } = useParams();
  const { connected, sendRoomMessage, broadcastRoomEvent } = useSocket();
  const { members, messages, broadcasts } = useRoomSocket(roomId || undefined);

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    roomService
      .get(roomId)
      .then(setRoom)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [roomId]);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    sendRoomMessage(roomId, text.trim());
    setText('');
  };

  if (loading) return <Spinner label="Loading room..." />;

  if (error || !room) {
    return (
      <div className="app-content">
        <div className="error-banner" style={{ marginTop: 24 }}>
          {error ?? 'Room not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="app-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{room.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Invite code{' '}
            <strong style={{ letterSpacing: 1.5, color: 'var(--accent)' }}>{room.code}</strong> ·{' '}
            {room.memberCount} member{room.memberCount === 1 ? '' : 's'}
            {connected ? ' · Live' : ' · Reconnecting…'}
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'stretch' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="muted" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
            Online now ({members.length + 1})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map((member) => (
              <div key={member.userId} className="flex items-center gap-2">
                <Avatar name={member.name} size="sm" />
                <span style={{ fontSize: 14 }}>{member.name}</span>
                <span
                  className="muted"
                  style={{ fontSize: 12, marginLeft: 'auto', color: 'var(--accent)' }}
                >
                  ●
                </span>
              </div>
            ))}
            {members.length === 0 && (
              <p className="faint" style={{ margin: 0, fontSize: 13 }}>
                Just you for now. Invite teammates with the room code.
              </p>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <h2 className="muted" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>
              Live activity
            </h2>
            <div
              className="faint"
              style={{
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              {broadcasts.length === 0 && <span>No broadcasts yet.</span>}
              {broadcasts.map((event, index) => (
                <span key={index}>
                  {formatTime(event.at)} · {event.user.name} fired &quot;{event.event}&quot;
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="default"
              className="mt-2"
              onClick={() => broadcastRoomEvent(roomId, 'ping')}
            >
              Ping room
            </Button>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}>
          <h2 className="muted" style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>
            Messages
          </h2>
          <div
            className="faint"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              overflowY: 'auto',
              marginBottom: 12,
              minHeight: 200,
            }}
          >
            {messages.length === 0 && (
              <span style={{ fontSize: 13 }}>No messages yet. Say hello to the room.</span>
            )}
            {messages.map((message, index) => (
              <div key={index}>
                <div className="flex items-center gap-2">
                  <Avatar name={message.user.name} size="sm" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{message.user.name}</span>
                  <span className="faint" style={{ fontSize: 11, marginLeft: 'auto' }}>
                    {formatTime(message.at)}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <input
              className="input"
              placeholder="Type a message…"
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={!text.trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
