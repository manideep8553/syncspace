import { useEffect, useState } from 'react';
import * as Y from 'yjs';

/**
 * Mirrors a Y.Array of Y.Maps into a plain-typed React array. Components that
 * consume this re-render whenever any nested value changes.
 */
export function useYArray<T>(yarray: Y.Array<Y.Map<unknown>>): T[] {
  const [items, setItems] = useState<T[]>(() => toPlainArray<T>(yarray));

  useEffect(() => {
    const observer = () => setItems(toPlainArray<T>(yarray));
    yarray.observeDeep(observer);
    observer();
    return () => yarray.unobserveDeep(observer);
  }, [yarray]);

  return items;
}

/** Mirrors a single key of a Y.Map into React state. */
export function useYMapValue<T>(ymap: Y.Map<unknown>, key: string): T | undefined {
  const [value, setValue] = useState<T | undefined>(() => ymap.get(key) as T | undefined);

  useEffect(() => {
    const observer = () => setValue(ymap.get(key) as T | undefined);
    ymap.observe(observer);
    observer();
    return () => ymap.unobserve(observer);
  }, [ymap, key]);

  return value;
}

function toPlainArray<T>(yarray: Y.Array<Y.Map<unknown>>): T[] {
  return yarray.toArray().map((map) => map.toJSON() as T);
}