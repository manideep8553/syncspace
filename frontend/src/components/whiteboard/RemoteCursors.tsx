import { Group, Arrow, Circle, Layer, Text as KonvaText } from 'react-konva';
import type { RemoteCursor } from '../../context/SocketContext';

export interface ScreenTransform {
  zoom: number;
  panX: number;
  panY: number;
}

interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  transform: ScreenTransform;
}

export function RemoteCursors({ cursors, transform }: RemoteCursorsProps) {
  return (
    <Layer listening={false}>
      {cursors.map((cursor) => {
        const x = cursor.x * transform.zoom + transform.panX;
        const y = cursor.y * transform.zoom + transform.panY;
        return (
          <Group key={cursor.user.userId}>
            <Arrow
              points={[x - 8, y + 14, x, y + 6]}
              stroke={cursor.user.color}
              fill={cursor.user.color}
              strokeWidth={2}
              pointerLength={10}
              pointerWidth={8}
            />
            <Circle x={x} y={y} radius={5} fill={cursor.user.color} stroke="#fff" strokeWidth={1.5} />
            <KonvaText
              text={cursor.user.name}
              x={x + 6}
              y={y + 18}
              fontSize={12}
              fontStyle="bold"
              fill="#fff"
              padding={4}
              cornerRadius={4}
              background={cursor.user.color ?? '#6366f1'}
            />
          </Group>
        );
      })}
    </Layer>
  );
}