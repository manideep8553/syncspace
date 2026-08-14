import type { BoardTool } from '../../types/whiteboard';
import { FILL_COLORS, STROKE_COLORS, STROKE_WIDTHS } from '../../types/whiteboard';
import { cn } from '../../utils/helpers';

interface WhiteboardToolbarProps {
  tool: BoardTool;
  onToolChange: (tool: BoardTool) => void;
  strokeColor: string;
  onStrokeColor: (color: string) => void;
  fillColor: string;
  onFillColor: (color: string) => void;
  strokeWidth: number;
  onStrokeWidth: (width: number) => void;
  background: string;
  onBackground: (color: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClear: () => void;
  onExport: () => void;
}

const TOOLS: Array<{ id: BoardTool; label: string }> = [
  { id: 'select', label: 'Sel' },
  { id: 'pan', label: 'Pan' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Oval' },
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'pen', label: 'Pen' },
  { id: 'text', label: 'Text' },
];

export function WhiteboardToolbar({
  tool,
  onToolChange,
  strokeColor,
  onStrokeColor,
  fillColor,
  onFillColor,
  strokeWidth,
  onStrokeWidth,
  background,
  onBackground,
  zoom,
  onZoomIn,
  onZoomOut,
  onClear,
  onExport,
}: WhiteboardToolbarProps) {
  return (
    <div className="toolbar">
      {TOOLS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={cn('tool-btn', tool === entry.id && 'active')}
          onClick={() => onToolChange(entry.id)}
          title={entry.label}
        >
          {entry.label}
        </button>
      ))}

      <span className="tool-sep" />

      <span title="Stroke color">
        {STROKE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={cn('color-swatch', strokeColor === color && 'active')}
            style={{ backgroundColor: color }}
            onClick={() => onStrokeColor(color)}
            aria-label={`Stroke ${color}`}
          />
        ))}
      </span>

      <span className="tool-sep" />

      <select
        className="input"
        value={strokeWidth}
        onChange={(e) => onStrokeWidth(Number(e.target.value))}
        style={{ width: 64, fontSize: 12, padding: '4px 6px', cursor: 'pointer' }}
        aria-label="Stroke width"
      >
        {STROKE_WIDTHS.map((width) => (
          <option key={width} value={width}>
            {width}px
          </option>
        ))}
      </select>

      <span className="tool-sep" />

      <span title="Fill color">
        {FILL_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={cn('color-swatch', fillColor === color && 'active')}
            style={{
              backgroundColor:
                color === 'transparent'
                  ? 'repeating-conic-gradient(#888 0% 25%, #fff 0% 50%) 50% / 8px 8px'
                  : color,
            }}
            onClick={() => onFillColor(color)}
            aria-label={`Fill ${color}`}
          />
        ))}
      </span>

      <span className="tool-sep" />

      <span title="Canvas background">
        {['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#ede9fe'].map((color) => (
          <button
            key={color}
            type="button"
            className={cn('color-swatch', background === color && 'active')}
            style={{ backgroundColor: color }}
            onClick={() => onBackground(color)}
            aria-label={`Background ${color}`}
          />
        ))}
      </span>

      <span className="tool-sep" />

      <button type="button" className="tool-btn" onClick={onZoomOut} aria-label="Zoom out">
        -
      </button>
      <span className="faint" style={{ fontSize: 11, minWidth: 40, textAlign: 'center' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" className="tool-btn" onClick={onZoomIn} aria-label="Zoom in">
        +
      </button>

      <span className="tool-sep" />

      <button type="button" className="tool-btn" onClick={onClear} title="Clear canvas">
        Clear
      </button>
      <button type="button" className="tool-btn" onClick={onExport} title="Export as PNG">
        Export
      </button>
    </div>
  );
}
