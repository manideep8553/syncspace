export type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'pen' | 'text';
export type BoardTool = 'select' | 'pan' | ShapeType;

export interface BoardShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radiusX?: number;
  radiusY?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  italic?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
}

export const STROKE_COLORS = ['#0f172a', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'];
export const FILL_COLORS = [
  'transparent',
  'rgba(99,102,241,0.15)',
  'rgba(239,68,68,0.2)',
  'rgba(245,158,11,0.2)',
  'rgba(16,185,129,0.2)',
  'rgba(14,165,233,0.2)',
  'rgba(139,92,246,0.2)',
];
export const STROKE_WIDTHS = [1, 2, 3, 5, 8];
export const DEFAULT_STROKE = '#0f172a';

export function newShapeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultShape(type: ShapeType, x: number, y: number, stroke: string, fill: string, strokeWidth: number): BoardShape {
  const base = { id: newShapeId(), type, x, y, rotation: 0, stroke, fill, strokeWidth };
  switch (type) {
    case 'rect':
      return { ...base, width: 0, height: 0 };
    case 'ellipse':
      return { ...base, radiusX: 0, radiusY: 0 };
    case 'line':
      return { ...base, points: [x, y, x, y] };
    case 'arrow':
      return { ...base, points: [x, y, x, y] };
    case 'pen':
      return { ...base, points: [x, y], fill: 'transparent' };
    case 'text':
      return { ...base, text: '', fontSize: 24, fontWeight: 'normal', italic: false, fill };
    default:
      return base;
  }
}

export function isDrawTool(tool: BoardTool): boolean {
  return tool !== 'select' && tool !== 'pan';
}