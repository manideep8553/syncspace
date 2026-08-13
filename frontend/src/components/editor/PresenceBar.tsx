import { Avatar } from '../ui/Avatar';
import { useSocket } from '../../context/SocketContext';

export function PresenceBar() {
  const { connected, peers } = useSocket();

  return (
    <div className="presence-bar">
      <span className={`online-dot ${connected ? 'on' : 'off'}`} />
      <span className="faint" style={{ fontSize: 12 }}>
        {connected ? 'Live' : 'Offline'}
      </span>
      {peers.length > 0 && (
        <div className="avatar-stack" title={peers.map((peer) => peer.name).join(', ')}>
          {peers.map((peer) => (
            <Avatar key={peer.userId} name={peer.name} color={peer.color} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}