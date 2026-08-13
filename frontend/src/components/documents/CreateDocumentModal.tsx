import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../../services/document.service';
import type { DocumentType } from '../../types/models';
import { getApiErrorMessage } from '../../lib/http';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface CreateDocumentModalProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateDocumentModal({ workspaceId, open, onClose, onCreated }: CreateDocumentModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('CODE');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await documentService.create({ workspaceId, title, type });
      onCreated();
      onClose();
      navigate(created.type === 'CODE' ? `/doc/${created.id}` : `/board/${created.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New document" subtitle="Create a collaborative document in this workspace.">
      <form onSubmit={handleSubmit} className="form-stack">
        {error && <div className="error-banner">{error}</div>}
        <Input
          label="Title"
          name="title"
          placeholder="e.g. API design, Team brainstorm..."
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <span className="label">Type</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={type === 'CODE' ? 'tool-btn active' : 'tool-btn'}
              style={{ flex: 1 }}
              onClick={() => setType('CODE')}
            >
              {'</>'} Code
            </button>
            <button
              type="button"
              className={type === 'WHITEBOARD' ? 'tool-btn active' : 'tool-btn'}
              style={{ flex: 1 }}
              onClick={() => setType('WHITEBOARD')}
            >
              ▭ Whiteboard
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}