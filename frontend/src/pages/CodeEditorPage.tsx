import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodeEditor } from '../components/editor/CodeEditor';
import { PresenceBar } from '../components/editor/PresenceBar';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useDocument } from '../hooks/useDocument';
import { useSocketJoin } from '../hooks/useSocketJoin';
import { getApiErrorMessage } from '../lib/http';
import { documentService } from '../services/document.service';
import { useSocket } from '../context/SocketContext';

export function CodeEditorPage() {
  const { documentId = '' } = useParams();
  const { user } = useAuth();
  const { notifyDocumentUpdated } = useSocket();
  const { document, loading, error } = useDocument(documentId);
  const [title, setTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useSocketJoin(documentId);

  useEffect(() => {
    if (document && document.type !== 'CODE') {
      window.location.assign(`/board/${document.id}`);
    }
  }, [document]);

  useEffect(() => {
    if (document) setTitle(document.title);
  }, [document]);

  const saveTitle = useDebouncedCallback((next: string) => {
    documentService
      .updateTitle(documentId, next)
      .then(() => notifyDocumentUpdated())
      .catch(() => undefined);
  }, 900);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard permission errors
    }
  };

  const handleDelete = async () => {
    try {
      await documentService.remove(documentId);
      window.location.assign('/');
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Opening code document..." />;

  if (error || !document) {
    return (
      <div className="auth-page">
        <div style={{ width: 420 }}>
          <div className="error-banner">{error ?? 'Document not found'}</div>
          <Link to="/" className="btn btn-ghost" style={{ display: 'inline-flex' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === document.owner.id || user?.id === document.workspace.ownerId;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
      }}
    >
      <div className="topbar">
        <Link to={`/w/${document.workspace.id}`} className="btn btn-ghost btn-sm">
          ← {document.workspace.name}
        </Link>
        <input
          className="topbar-title-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveTitle(e.target.value);
          }}
          aria-label="Document title"
        />
        <div className="divider-v" />
        <PresenceBar />
        <div className="spacer" />
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Share'}
        </Button>
        {isOwner && (
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      <CodeEditor docId={document.id} />

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete document?"
        subtitle="The code in this document will be permanently removed."
      >
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}