import { useEffect, useState, type FormEvent } from 'react';
import { CreateRoomModal } from '../components/room/CreateRoomModal';
import { RoomCard } from '../components/room/RoomCard';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { getApiErrorMessage } from '../lib/http';
import { roomService } from '../services/room.service';
import type { RoomSummary } from '../types/models';

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);

  const refresh = async () => {
    const list = await roomService.list();
    setRooms(list);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const joinByCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError(null);
    setJoining(true);
    try {
      await roomService.join(joinCode);
      setJoinCode('');
      await refresh();
    } catch (err) {
      setJoinError(getApiErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  const join = async (room: RoomSummary) => {
    setBusyRoomId(room.id);
    try {
      await roomService.join(room.code);
      await refresh();
    } finally {
      setBusyRoomId(null);
    }
  };

  const leave = async (room: RoomSummary) => {
    setBusyRoomId(room.id);
    try {
      await roomService.leave(room.id);
      await refresh();
    } finally {
      setBusyRoomId(null);
    }
  };

  const mine = rooms.filter((room) => room.isMember);
  const others = rooms.filter((room) => !room.isMember);

  if (loading) return <Spinner label="Loading rooms..." />;

  return (
    <div className="app-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="muted" style={{ margin: 0 }}>
            Join a room to collaborate, or create your own and share its code.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          + New room
        </Button>
      </div>

      <form
        onSubmit={joinByCode}
        className="card"
        style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8 }}
      >
        <div style={{ flex: 1, maxWidth: 320 }}>
          <label className="label" htmlFor="join-code">
            Join with an invite code
          </label>
          <input
            id="join-code"
            className="input"
            placeholder="e.g. QX9F2A"
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit" variant="default" loading={joining}>
          Join room
        </Button>
        {joinError && <span className="error-text" style={{ fontSize: 13 }}>{joinError}</span>}
      </form>

      {rooms.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <p className="empty-title">No rooms yet</p>
          <p>Create the first room to start collaborating.</p>
          <Button variant="primary" className="mt-2" onClick={() => setShowCreate(true)}>
            Create your first room
          </Button>
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 12px' }}>
                Your rooms
              </h2>
              <div className="grid-2">
                {mine.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={join} onLeave={leave} busy={busyRoomId === room.id} />
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 12px' }}>
                Available rooms
              </h2>
              <div className="grid-2">
                {others.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={join} onLeave={leave} busy={busyRoomId === room.id} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <CreateRoomModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => void refresh()}
      />
    </div>
  );
}
