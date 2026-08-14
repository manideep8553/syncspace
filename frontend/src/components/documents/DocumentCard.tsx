import { Link } from 'react-router-dom';
import type { DocumentSummary } from '../../types/models';
import { documentTypeLabel } from '../../services/document.service';
import { timeAgo } from '../../utils/helpers';

interface DocumentCardProps {
  document: DocumentSummary;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const target = document.type === 'CODE' ? `/doc/${document.id}` : `/board/${document.id}`;
  const isCode = document.type === 'CODE';

  return (
    <Link to={target} className="card card-hover" style={{ display: 'block' }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            fontSize: 20,
            lineHeight: 1,
            color: isCode ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {isCode ? '</>' : '▭'}
        </span>
        <span className="badge">{documentTypeLabel(document.type)}</span>
        {!isCode && <span className="badge badge-green">Whiteboard</span>}
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {document.title}
      </h3>
      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
        Updated {timeAgo(document.updatedAt)} · {document.owner.name}
      </p>
    </Link>
  );
}
