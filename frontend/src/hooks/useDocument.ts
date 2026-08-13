import { useCallback, useEffect, useState } from 'react';
import { documentService } from '../services/document.service';
import type { DocumentDetail } from '../types/models';

interface UseDocumentResult {
  document: DocumentDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDocument(documentId: string | undefined): UseDocumentResult {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await documentService.get(documentId);
      setDocument(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { document, loading, error, refresh };
}