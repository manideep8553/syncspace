import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, margin: '0 0 8px' }}>404</h1>
        <p className="muted">This page drifted off the canvas.</p>
        <Link to="/">
          <button className="btn btn-primary" style={{ marginTop: 16 }}>Back to SyncSpace</button>
        </Link>
      </div>
    </div>
  );
}