import { useState, type FormEvent } from 'react';
import { workspaceService } from '../../services/workspace.service';
import { getApiErrorMessage } from '../../lib/http';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWorkspaceModal({ open, onClose, onCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await workspaceService.create(name);
      setName('');
      onCreated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New workspace" subtitle="A workspace groups your collaborative documents and teammates.">
      <form onSubmit={handleSubmit} className="form-stack">
        {error && <div className="error-banner">{error}</div>}
        <Input
          label="Workspace name"
          name="name"
          placeholder="e.g. Product Team"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}