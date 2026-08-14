import { useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../../lib/http';
import { roomService } from '../../services/room.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRoomModal({ open, onClose, onCreated }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await roomService.create(name);
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
    <Modal
      open={open}
      onClose={onClose}
      title="New room"
      subtitle="Create a room and share its invite code so teammates can join and collaborate."
    >
      <form onSubmit={handleSubmit} className="form-stack">
        {error && <div className="error-banner">{error}</div>}
        <Input
          label="Room name"
          name="name"
          placeholder="e.g. Design sync"
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
            Create room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
