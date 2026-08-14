import { Group, Rect, Ellipse, Line, Arrow, Text as KonvaText } from 'react-konva';
import type { ComponentRef } from 'react';
import type { BoardShape, BoardTool } from '../../types/whiteboard';

interface ShapeViewProps {
  shape: BoardShape;
  tool: BoardTool;
  selected: boolean;
  onSelect: (id: string) => void;
  onEditText: (id: string) => void;
  onChange: (id: string, patch: Partial<BoardShape>) => void;
  registerRef: (id: string, node: ComponentRef<typeof Group> | null) => void;
}

export function ShapeView({
  shape,
  tool,
  selected,
  onSelect,
  onEditText,
  onChange,
  registerRef,
}: ShapeViewProps) {
  const strokeWidth = shape.strokeWidth ?? 2;
  const stroke = shape.stroke ?? '#0f172a';
  const isSelectable = tool === 'select';

  const handleClick = (event: { cancelBubble: boolean }) => {
    event.cancelBubble = true;
    if (tool === 'select') onSelect(shape.id);
  };

  const handleDblClick = (event: { cancelBubble: boolean }) => {
    event.cancelBubble = true;
    if (shape.type === 'text') onEditText(shape.id);
  };

  return (
    <Group
      ref={(node) => registerRef(shape.id, node)}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation ?? 0}
      draggable={isSelectable}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onDragMove={(event) => {
        onChange(shape.id, { x: event.target.x(), y: event.target.y() });
      }}
    >
      {shape.type === 'rect' && (
        <Rect
          width={shape.width ?? 0}
          height={shape.height ?? 0}
          cornerRadius={2}
          fill={shape.fill ?? 'transparent'}
          stroke={stroke}
          strokeWidth={strokeWidth}
          shadowEnabled={selected}
          shadowColor="#6366f1"
          shadowBlur={6}
          shadowOpacity={0.5}
        />
      )}
      {shape.type === 'ellipse' && (
        <Ellipse
          radiusX={shape.radiusX ?? 0}
          radiusY={shape.radiusY ?? 0}
          fill={shape.fill ?? 'transparent'}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {shape.type === 'line' && (
        <Line
          points={shape.points ?? []}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {shape.type === 'arrow' && (
        <Arrow
          points={shape.points ?? []}
          stroke={stroke}
          fill={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          pointerLength={12}
          pointerWidth={12}
        />
      )}
      {shape.type === 'pen' && (
        <Line
          points={shape.points ?? []}
          stroke={stroke}
          strokeWidth={strokeWidth}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
          closed={false}
        />
      )}
      {shape.type === 'text' && (
        <KonvaText
          text={shape.text ?? ''}
          fontSize={shape.fontSize ?? 24}
          fill={shape.fill ?? '#0f172a'}
          fontStyle={`${shape.italic ? 'italic ' : ''}${shape.fontWeight ?? 'normal'}`.trim()}
          fontFamily="Inter, system-ui, sans-serif"
          listening={false}
        />
      )}
    </Group>
  );
}
