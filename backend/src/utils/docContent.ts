import * as Y from 'yjs';
import { encodeBytes } from './base64.js';

export const DEFAULT_CODE_SNIPPET = [
  '// Welcome to SyncSpace!',
  '// This code is edited collaboratively in real time with Yjs (CRDT).',
  '',
  'interface SyncSpaceUser {',
  '  name: string;',
  '  online: boolean;',
  '}',
  '',
  'const users: SyncSpaceUser[] = [];',
  '',
  'function greet(user: SyncSpaceUser): string {',
  '  return `Hello, ${user.name}!`;',
  '}',
  '',
  'users.push({ name: "team", online: true });',
  'console.log(greet(users[0]));',
  '',
].join('\n');

type ShapeFields = Record<string, unknown>;

function createShape(id: string, type: string, fields: ShapeFields): Y.Map<unknown> {
  const shape = new Y.Map<unknown>();
  shape.set('id', id);
  shape.set('type', type);
  for (const [key, value] of Object.entries(fields)) {
    shape.set(key, value);
  }
  return shape;
}

export function buildCodeDocContent(): string {
  const doc = new Y.Doc();
  doc.getText('monaco').insert(0, DEFAULT_CODE_SNIPPET);
  doc.getMap('meta').set('language', 'typescript');
  return encodeBytes(Y.encodeStateAsUpdate(doc));
}

export function buildWhiteboardDocContent(): string {
  const doc = new Y.Doc();
  const shapes = doc.getArray('shapes');
  shapes.push([
    createShape('welcome-rect', 'rect', {
      x: 80,
      y: 100,
      width: 320,
      height: 150,
      fill: 'rgba(99,102,241,0.12)',
      stroke: '#4f46e5',
      strokeWidth: 3,
      rotation: 0,
    }),
    createShape('welcome-text', 'text', {
      x: 105,
      y: 135,
      text: 'Welcome to SyncSpace!',
      fontSize: 30,
      fill: '#1e293b',
      fontWeight: 'bold',
      rotation: 0,
    }),
    createShape('welcome-subtext', 'text', {
      x: 105,
      y: 185,
      text: 'Draw anything together in real time.',
      fontSize: 18,
      fill: '#475569',
      italic: true,
      rotation: 0,
    }),
    createShape('welcome-arrow', 'arrow', {
      points: [430, 150, 540, 220],
      fill: '#0f172a',
      stroke: '#0f172a',
      strokeWidth: 3,
      rotation: 0,
    }),
  ]);
  doc.getMap('meta').set('background', '#ffffff');
  return encodeBytes(Y.encodeStateAsUpdate(doc));
}