import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { workspaceService } from '../../services/workspace.service';
import type { WorkspaceSummary } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { cn, userColor } from '../../utils/helpers';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    workspaceService
      .list()
      .then((list) => {
        if (!cancelled) setWorkspaces(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/favicon.svg" alt="SyncSpace logo" className="sidebar-logo" />
        SyncSpace
      </div>

      <div className="sidebar-section">Navigation</div>
      <div className="sidebar-list">
        <NavLink
          to="/"
          end
          className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
        >
          <span>Home</span>
        </NavLink>

        <div className="sidebar-section" style={{ paddingTop: 18 }}>Workspaces</div>
        {workspaces.length === 0 && (
          <p className="faint" style={{ padding: '4px 12px', fontSize: 13 }}>
            No workspaces yet.
          </p>
        )}
        {workspaces.map((workspace) => (
          <NavLink
            key={workspace.id}
            to={`/w/${workspace.id}`}
            className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
            title={workspace.name}
          >
            <span style={{ color: userColor(workspace.id), fontWeight: 700 }}>#</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.name}
            </span>
          </NavLink>
        ))}
      </div>

      {user && (
        <div className="sidebar-footer">
          <Avatar name={user.name} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
            <div className="faint" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}