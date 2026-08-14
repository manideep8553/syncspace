import { Link } from 'react-router-dom';
import type { WorkspaceSummary } from '../../types/models';
import { timeAgo } from '../../utils/helpers';
import { Avatar } from '../ui/Avatar';

interface WorkspaceCardProps {
  workspace: WorkspaceSummary;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <Link to={`/w/${workspace.id}`} className="card card-hover" style={{ display: 'block' }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: 'var(--accent)',
            display: 'inline-block',
          }}
        />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{workspace.name}</h3>
      </div>
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
        {timeAgo(workspace.updatedAt)} · {workspace.owner.name}
      </p>
      <div className="flex items-center gap-2">
        <Avatar name={workspace.owner.name} size="sm" />
      </div>
    </Link>
  );
}
