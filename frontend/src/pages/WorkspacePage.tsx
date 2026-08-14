import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreateDocumentModal } from '../components/documents/CreateDocumentModal';
import { DocumentCard } from '../components/documents/DocumentCard';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { getApiErrorMessage } from '../lib/http';
import { workspaceService } from '../services/workspace.service';
import type { WorkspaceDetail } from '../types/models';

export function WorkspacePage() {
  const { workspaceId = '' } = useParams();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await workspaceService.get(workspaceId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [workspaceId]);

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setInviteError(null);
    setInviting(true);
    try {
      await workspaceService.addMember(workspaceId, inviteEmail);
      setInviteEmail('');
      await refresh();
      setShowInvite(false);
    } catch (err) {
      setInviteError(getApiErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await workspaceService.removeMember(workspaceId, memberId);
      await refresh();
    } catch {
      // ignore
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      await workspaceService.remove(workspaceId);
      window.location.assign('/');
    } catch {
      // ignore
    }
  };

  if (loading && !workspace) return <Spinner label="Loading workspace..." />;

  if (error || !workspace) {
    return (
      <div className="app-content">
        <div className="error-banner">{error ?? 'Workspace not found'}</div>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const isOwner = workspace.role === 'OWNER';

  return (
    <div className="app-content">
      <div className="page-header">
        <div>
          <Link to="/" className="faint" style={{ fontSize: 13 }}>
            ← All workspaces
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {workspace.name}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {workspace.documentCount} documents · {workspace.members.length} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button variant="ghost" onClick={() => setShowConfirmDelete(true)}>
              Delete workspace
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowCreateDoc(true)}>
            + New document
          </Button>
        </div>
      </div>

      <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 12px' }}>
        Documents
      </h2>
      {workspace.documents.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No documents yet</p>
          <p>Create your first code document or whiteboard.</p>
        </div>
      ) : (
        <div className="grid">
          {workspace.documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}

      <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 12px' }}>
        Teammates
      </h2>
      <div className="panel">
        {workspace.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center"
            style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}
          >
            <Avatar name={member.user.name} size="sm" color={undefined} />
            <div style={{ flex: 1, marginLeft: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{member.user.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {member.user.email}
              </div>
            </div>
            <span className={`badge ${member.role === 'OWNER' ? 'badge-green' : ''}`}>
              {member.role}
            </span>
            {isOwner && member.role !== 'OWNER' && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                style={{ marginLeft: 8 }}
                onClick={() => handleRemoveMember(member.id)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        {isOwner && (
          <div style={{ padding: '10px 14px' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
              + Invite teammate
            </Button>
          </div>
        )}
      </div>

      <CreateDocumentModal
        workspaceId={workspace.id}
        open={showCreateDoc}
        onClose={() => setShowCreateDoc(false)}
        onCreated={() => void refresh()}
      />

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite a teammate"
        subtitle="Add someone by their SyncSpace account email."
      >
        <form onSubmit={handleInvite} className="form-stack">
          {inviteError && <div className="error-banner">{inviteError}</div>}
          <label className="label" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            className="input"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@example.com"
          />
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={inviting}>
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Delete workspace?"
        subtitle="This permanently deletes the workspace and all of its documents."
      >
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setShowConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteWorkspace}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
