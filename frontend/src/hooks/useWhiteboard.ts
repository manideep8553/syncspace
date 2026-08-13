import { useCallback } from 'react';
import * as Y from 'yjs';
import { useCollaborativeDoc } from './useCollaborativeDoc';
import { useYArray, useYMapValue } from './useYjs';
import type { BoardShape } from '../types/whiteboard';

export interface WhiteboardApi {
  shapes: BoardShape[];
  background: string;
  addShape: (shape: BoardShape) => void;
  updateShape: (id: string, patch: Partial<BoardShape>) => void;
  removeShape: (id: string) => void;
  clearShapes: () => void;
  setBackground: (color: string) => void;
  doc: Y.Doc;
}

export function useWhiteboard(docId: string): WhiteboardApi {
  const { doc } = useCollaborativeDoc(docId, 'whiteboard');
  const shapesArray = doc.getArray<Y.Map<unknown>>('shapes');
  const meta = doc.getMap('meta');

  const shapes = useYArray<BoardShape>(shapesArray);
  const background = useYMapValue<string>(meta, 'background') ?? '#ffffff';

  const addShape = useCallback(
    (shape: BoardShape) => {
      const map = new Y.Map<unknown>();
      for (const [key, value] of Object.entries(shape)) {
        map.set(key, value);
      }
      shapesArray.push([map]);
    },
    [shapesArray]
  );

  const updateShape = useCallback(
    (id: string, patch: Partial<BoardShape>) => {
      const index = shapesArray.toArray().findIndex((shape) => shape.get('id') === id);
      if (index < 0) return;
      const map = shapesArray.get(index);
      for (const [key, value] of Object.entries(patch)) {
        map.set(key, value);
      }
    },
    [shapesArray]
  );

  const removeShape = useCallback(
    (id: string) => {
      const index = shapesArray.toArray().findIndex((shape) => shape.get('id') === id);
      if (index < 0) return;
      shapesArray.delete(index, 1);
    },
    [shapesArray]
  );

  const clearShapes = useCallback(() => {
    shapesArray.delete(0, shapesArray.length);
  }, [shapesArray]);

  const setBackground = useCallback(
    (color: string) => {
      meta.set('background', color);
    },
    [meta]
  );

  return { shapes, background, addShape, updateShape, removeShape, clearShapes, setBackground, doc };
}