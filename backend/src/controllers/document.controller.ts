import type { Request, Response } from 'express';
import {
  createDocument,
  deleteDocument,
  getDocumentForUser,
  listDocumentsForUser,
  updateDocumentTitle,
  type CreateDocumentInput,
} from '../services/document.service.js';

export async function list(req: Request, res: Response) {
  const data = await listDocumentsForUser(req.userId);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const input = req.validated.body as unknown as CreateDocumentInput;
  const data = await createDocument(input, req.userId);
  res.status(201).json({ success: true, data });
}

export async function get(req: Request, res: Response) {
  const data = await getDocumentForUser(String(req.params.documentId), req.userId);
  res.json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const body = req.validated.body as unknown as { title: string };
  const data = await updateDocumentTitle(String(req.params.documentId), body.title, req.userId);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  await deleteDocument(String(req.params.documentId), req.userId);
  res.status(204).end();
}
