import { useEffect, useState } from 'react';
import { CreateWorkspaceModal } from '../components/workspace/CreateWorkspaceModal';
import { WorkspaceCard } from '../components/workspace/WorkspaceCard';
import { DocumentCard } from '../components/documents/DocumentCard';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { documentService } from '../services/document.service';
import { workspaceService } from '../services/workspace.service';
import type { DocumentSummary, WorkspaceSummary } from '../types/models';

export function HomePage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    const [workspaceList, documentList] = await Promise.all([
      workspaceService.list(),
      documentService.list(),
    ]);
    setWorkspaces(workspaceList);
    setDocuments(documentList);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading your workspaces..." />;

  return (
    <div className="app-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name.split(' ')[0]}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Pick up where your team left off.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          + New workspace
        </Button>
      </div>

      {documents.length > 0 && (
        <>
          <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 12px' }}>
            Recent documents
          </h2>
          <div className="grid">
            {documents.slice(0, 6).map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        </>
      )}

      <h2 className="muted" style={{ fontSize: 15, fontWeight: 700, margin: '28px 0 12px' }}>
        Workspaces
      </h2>
      {workspaces.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No workspaces yet</p>
          <p>Create a workspace to invite teammates and start collaborating.</p>
          <Button
            variant="primary"
            className="mt-2"
            onClick={() => setShowCreate(true)}
          >
            Create your first workspace
          </Button>
        </div>
      ) : (
        <div className="grid-2">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
          <button
            className="card"
            style={{
              borderStyle: 'dashed',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 600,
            }}
            onClick={() => setShowCreate(true)}
          >
            + New workspace
          </button>
        </div>
      )}

      <CreateWorkspaceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => void refresh()}
      />
    </div>
  );
}