import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import { useSocket } from '../../context/SocketContext';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import type { BoardTool, ShapeType } from '../../types/whiteboard';
import { createDefaultShape, isDrawTool, newShapeId, DEFAULT_STROKE } from '../../types/whiteboard';
import { RemoteCursors, type ScreenTransform } from './RemoteCursors';
import { ShapeView } from './ShapeView';
import { WhiteboardToolbar } from './WhiteboardToolbar';

type StageRef = ComponentRef<typeof Stage>;
type GroupRef = ComponentRef<typeof Group>;
type TransformerRef = ComponentRef<typeof Transformer>;

interface DrawingState {
  id: string;
  type: Exclude<ShapeType, 'text'>;
  startX: number;
  startY: number;
  points?: number[];
}

export function Whiteboard({ docId }: { docId: string }) {
  const { shapes, background, addShape, updateShape, removeShape, clearShapes, setBackground } =
    useWhiteboard(docId);
  const { cursors, sendCursor } = useSocket();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<StageRef | null>(null);
  const transformerRef = useRef<TransformerRef | null>(null);
  const groupRefs = useRef<Record<string, GroupRef | null>>({});

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ScreenTransform>({ zoom: 1, panX: 0, panY: 0 });
  const transformRef = useRef<ScreenTransform>({ zoom: 1, panX: 0, panY: 0 });
  const [tool, setTool] = useState<BoardTool>('select');
  const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE);
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const drawingRef = useRef<DrawingState | null>(null);
  const isPanningRef = useRef(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const lastCursorSentRef = useRef(0);

  const updateTransform = useCallback((next: ScreenTransform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  // Observe container size so the canvas fills its parent.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keep dragging consistent when the shapes list changes length.
  useEffect(() => {
    const transformer = transformerRef.current;
    const group = selectedId ? groupRefs.current[selectedId] : null;
    transformer?.nodes(group ? [group] : []);
    if (selectedId && !group) setSelectedId(null);
  }, [selectedId, shapes]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedId) {
          event.preventDefault();
          removeShape(selectedId);
          setSelectedId(null);
        }
      } else if (event.key === 'Escape') {
        setSelectedId(null);
        setEditingShapeId(null);
      } else if (event.key === 'v') {
        setTool('select');
      } else if (event.key === 'p') {
        setTool('pan');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeShape]);

  const getPointerWorld = useCallback((stage: StageRef) => {
    const pointer = stage?.getPointerPosition();
    const t = transformRef.current;
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - t.panX) / t.zoom,
      y: (pointer.y - t.panY) / t.zoom,
    };
  }, []);

  const handleMouseDown = (event: { target: unknown }) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (tool === 'pan') {
      isPanningRef.current = true;
      panLastRef.current = pointer;
      return;
    }

    if (tool === 'select') {
      if (event.target === stage) setSelectedId(null);
      return;
    }

    const world = getPointerWorld(stage);

    if (tool === 'text') {
      const id = newShapeId();
      addShape({ ...createDefaultShape('text', world.x, world.y, strokeColor, fillColor, strokeWidth), text: '' });
      setEditingShapeId(id);
      setEditingText('');
      return;
    }

    const id = newShapeId();
    addShape(createDefaultShape(tool, world.x, world.y, strokeColor, fillColor, strokeWidth));
    drawingRef.current = {
      id,
      type: tool as Exclude<ShapeType, 'text'>,
      startX: world.x,
      startY: world.y,
      points: tool === 'pen' ? [world.x, world.y] : undefined,
    };
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isPanningRef.current && tool === 'pan') {
      const pointer = stage.getPointerPosition();
      const last = panLastRef.current;
      if (!pointer || !last) return;
      const t = transformRef.current;
      updateTransform({
        zoom: t.zoom,
        panX: t.panX + (pointer.x - last.x),
        panY: t.panY + (pointer.y - last.y),
      });
      panLastRef.current = pointer;
      return;
    }

    const world = getPointerWorld(stage);
    const drawing = drawingRef.current;
    if (drawing) {
      const patch: Record<string, number | number[]> = {};
      if (drawing.type === 'rect') {
        patch.x = Math.min(drawing.startX, world.x);
        patch.y = Math.min(drawing.startY, world.y);
        patch.width = Math.abs(world.x - drawing.startX);
        patch.height = Math.abs(world.y - drawing.startY);
      } else if (drawing.type === 'ellipse') {
        patch.x = (drawing.startX + world.x) / 2;
        patch.y = (drawing.startY + world.y) / 2;
        patch.radiusX = Math.abs(world.x - drawing.startX) / 2;
        patch.radiusY = Math.abs(world.y - drawing.startY) / 2;
      } else if (drawing.type === 'line' || drawing.type === 'arrow') {
        patch.points = [drawing.startX, drawing.startY, world.x, world.y];
      } else if (drawing.type === 'pen') {
        const points = drawing.points ?? [];
        points.push(world.x, world.y);
        drawing.points = points;
        patch.points = [...points];
      }
      updateShape(drawing.id, patch);
    }

    const now = performance.now();
    if (now - lastCursorSentRef.current > 40 && tool !== 'pan') {
      lastCursorSentRef.current = now;
      sendCursor(world.x, world.y);
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    panLastRef.current = null;

    const stage = stageRef.current;
    const drawing = drawingRef.current;
    if (!drawing) return;

    drawingRef.current = null;
    if (!stage) return;

    const world = getPointerWorld(stage);
    let degenerate = false;
    if (drawing.type === 'rect') {
      degenerate = Math.abs(world.x - drawing.startX) < 5 && Math.abs(world.y - drawing.startY) < 5;
    } else if (drawing.type === 'ellipse') {
      degenerate = Math.abs(world.x - drawing.startX) < 5 && Math.abs(world.y - drawing.startY) < 5;
    } else if (drawing.type === 'line' || drawing.type === 'arrow') {
      const dx = world.x - drawing.startX;
      const dy = world.y - drawing.startY;
      degenerate = Math.hypot(dx, dy) < 6;
    } else if (drawing.type === 'pen') {
      degenerate = (drawing.points ?? []).length < 4;
    }

    if (degenerate) {
      removeShape(drawing.id);
    } else {
      setSelectedId(drawing.id);
    }
  };

  const handleWheel = (event: { evt: WheelEvent }) => {
    const stage = stageRef.current;
    if (!stage) return;
    event.evt.preventDefault();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const t = transformRef.current;
    const nextZoom = Math.min(4, Math.max(0.2, t.zoom * (event.evt.deltaY > 0 ? 0.92 : 1 / 0.92)));
    const worldX = (pointer.x - t.panX) / t.zoom;
    const worldY = (pointer.y - t.panY) / t.zoom;
    updateTransform({
      zoom: nextZoom,
      panX: pointer.x - worldX * nextZoom,
      panY: pointer.y - worldY * nextZoom,
    });
  };

  const handleTransformEnd = (id: string) => {
    const node = groupRefs.current[id];
    const shape = shapes.find((entry) => entry.id === id);
    if (!node || !shape) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const patch: Record<string, number | number[]> = {
      x: node.x(),
      y: node.y(),
      rotation: ((node.rotation() % 360) + 360) % 360,
    };

    if (shape.type === 'rect') {
      patch.width = Math.max(1, (shape.width ?? 0) * scaleX);
      patch.height = Math.max(1, (shape.height ?? 0) * scaleY);
    } else if (shape.type === 'ellipse') {
      patch.radiusX = Math.max(1, (shape.radiusX ?? 0) * scaleX);
      patch.radiusY = Math.max(1, (shape.radiusY ?? 0) * scaleY);
    } else if (shape.type === 'text') {
      patch.fontSize = Math.max(6, Math.round((shape.fontSize ?? 24) * scaleY));
    } else if (shape.points && shape.points.length > 0) {
      const pts = shape.points;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const scaled: number[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        scaled.push(cx + (pts[i] - cx) * scaleX, cy + (pts[i + 1] - cy) * scaleY);
      }
      patch.points = scaled;
    }

    updateShape(id, patch);
  };

  const commitText = () => {
    if (!editingShapeId) return;
    if (editingText.trim()) {
      updateShape(editingShapeId, { text: editingText });
    } else {
      removeShape(editingShapeId);
    }
    setEditingShapeId(null);
  };

  const handleClear = () => {
    if (window.confirm('Clear the entire whiteboard?')) {
      clearShapes();
      setSelectedId(null);
    }
  };

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `syncspace-${docId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const editingShape = useMemo(
    () => shapes.find((shape) => shape.id === editingShapeId) ?? null,
    [shapes, editingShapeId]
  );

  const remoteCursorList = useMemo(() => Object.values(cursors), [cursors]);

  const grid = useMemo(() => {
    if (transform.zoom < 0.6) return [];
    const step = 40;
    const t = transformRef.current;
    const worldLeft = -t.panX / t.zoom;
    const worldTop = -t.panY / t.zoom;
    const worldRight = worldLeft + size.width / t.zoom;
    const worldBottom = worldTop + size.height / t.zoom;
    const lines: number[] = [];
    for (let x = Math.floor(worldLeft / step) * step; x <= worldRight; x += step) {
      lines.push(x, worldTop, x, worldBottom);
    }
    for (let y = Math.floor(worldTop / step) * step; y <= worldBottom; y += step) {
      lines.push(worldLeft, y, worldRight, y);
    }
    return lines;
  }, [size, transform.zoom]);

  const stageStyle = useMemo(() => ({ backgroundColor: background, cursor: tool === 'pan' ? 'grab' : 'default' }), [background, tool]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={transform.zoom}
          scaleY={transform.zoom}
          x={transform.panX}
          y={transform.panY}
          style={stageStyle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <Layer listening={false}>
            <Rect
              width={size.width / transform.zoom}
              height={size.height / transform.zoom}
              fill={background}
            />
            {grid.length > 0 && (
              <Line points={grid} stroke="#e2e8f0" strokeWidth={1} listening={false} />
            )}
          </Layer>
          <Layer>
            {shapes.map((shape) => (
              <ShapeView
                key={shape.id}
                shape={shape}
                tool={tool}
                selected={selectedId === shape.id}
                onSelect={setSelectedId}
                onEditText={(id) => {
                  setEditingShapeId(id);
                  setEditingText(shape.text ?? '');
                }}
                onChange={updateShape}
                registerRef={(id, node) => {
                  groupRefs.current[id] = node;
                }}
              />
            ))}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              flipEnabled={false}
              borderStroke="#6366f1"
              anchorStroke="#6366f1"
              anchorFill="#6366f1"
              anchorSize={8}
              boundBoxFunc={(oldBox, newBox) =>
                Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox
              }
              onTransformEnd={() => selectedId && handleTransformEnd(selectedId)}
            />
          </Layer>
          <RemoteCursors cursors={remoteCursorList} transform={transform} />
        </Stage>
      </div>

      {editingShape && editingShape.type === 'text' && (
        <textarea
          className="whiteboard-textarea"
          value={editingText}
          autoFocus
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            } else if (e.key === 'Escape') {
              setEditingShapeId(null);
            }
          }}
          style={{
            left: editingShape.x * transform.zoom + transform.panX,
            top: editingShape.y * transform.zoom + transform.panY,
            fontSize: (editingShape.fontSize ?? 24) * transform.zoom,
            color: editingShape.fill ?? '#0f172a',
            fontStyle: editingShape.italic ? 'italic' : 'normal',
            fontWeight: editingShape.fontWeight ?? 'normal',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          maxWidth: 'calc(100% - 24px)',
          overflowX: 'auto',
        }}
      >
        <WhiteboardToolbar
          tool={tool}
          onToolChange={(next) => {
            setTool(next);
            if (!isDrawTool(next)) setSelectedId(null);
          }}
          strokeColor={strokeColor}
          onStrokeColor={setStrokeColor}
          fillColor={fillColor}
          onFillColor={setFillColor}
          strokeWidth={strokeWidth}
          onStrokeWidth={setStrokeWidth}
          background={background}
          onBackground={setBackground}
          zoom={transform.zoom}
          onZoomIn={() =>
            updateTransform({ ...transformRef.current, zoom: Math.min(4, transformRef.current.zoom * 1.2) })
          }
          onZoomOut={() =>
            updateTransform({ ...transformRef.current, zoom: Math.max(0.2, transformRef.current.zoom / 1.2) })
          }
          onClear={handleClear}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}