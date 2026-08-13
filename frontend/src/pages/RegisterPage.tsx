import { Navigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">One workspace for your team's code and ideation.</p>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}