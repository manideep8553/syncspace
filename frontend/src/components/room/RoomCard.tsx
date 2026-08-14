import { useState } from 'react';
import type { RoomSummary } from '../../types/models';
import { timeAgo } from '../../utils/helpers';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface RoomCardProps {
  room: RoomSummary;
  onJoin: (room: RoomSummary) => void;
  onLeave: (room: RoomSummary) => void;
  busy?: boolean;
}

export function RoomCard({ room, onJoin, onLeave, busy }: RoomCardProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center gap-2">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: 'var(--accent)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.name}
        </h3>
      </div>

      <button
        type="button"
        className="code-chip"
        title="Click to copy invite code"
        onClick={copyCode}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: 'var(--accent)',
          cursor: 'pointer',
        }}
      >
        {room.code}
        <span className="faint" style={{ fontSize: 11, letterSpacing: 0, fontWeight: 500 }}>
          {copied ? 'copied!' : 'copy'}
        </span>
      </button>

      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {room.memberCount} member{room.memberCount === 1 ? '' : 's'} · created {timeAgo(room.createdAt)}
      </p>

      <div className="flex items-center gap-2" style={{ marginTop: 'auto' }}>
        <Avatar name={room.owner.name} size="sm" />
        <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.owner.name}
          {room.role && room.isMember && <span> · {room.role.toLowerCase()}</span>}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {room.isMember ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onLeave(room)}>
              Leave
            </Button>
          ) : (
            <Button size="sm" variant="primary" disabled={busy} onClick={() => onJoin(room)}>
              Join
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
