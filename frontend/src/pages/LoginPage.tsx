import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { user, initializing } = useAuth();
  if (!initializing && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="SyncSpace logo" className="sidebar-logo" />
          SyncSpace
        </div>
        <div className="card" style={{ padding: 26 }}>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue collaborating in real time.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}