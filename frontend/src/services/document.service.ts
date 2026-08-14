import { api } from '../lib/http';
import type { DocumentDetail, DocumentSummary, DocumentType } from '../types/models';

export interface CreateDocumentInput {
  workspaceId: string;
  title?: string;
  type: DocumentType;
}

export const documentService = {
  list: () => api.get<DocumentSummary[]>('/documents'),
  create: (input: CreateDocumentInput) => api.post<DocumentDetail>('/documents', input),
  get: (documentId: string) => api.get<DocumentDetail>(`/documents/${documentId}`),
  updateTitle: (documentId: string, title: string) =>
    api.patch<DocumentSummary>(`/documents/${documentId}`, { title }),
  remove: (documentId: string) => api.delete<void>(`/documents/${documentId}`),
};

export function documentTypeLabel(type: DocumentType): string {
  return type === 'CODE' ? 'Code' : 'Whiteboard';
}
