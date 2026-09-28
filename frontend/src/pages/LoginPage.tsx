import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useToast } from '../toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      if (!err.response) {
        toast.error('Network Error: The backend server might still be starting up.');
      } else {
        toast.error(err.response?.data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { email: 'charlie@company.com', label: 'Charlie (Employee)', role: 'EMPLOYEE' },
    { email: 'alice.manager@company.com', label: 'Alice (Manager)', role: 'MANAGER' },
    { email: 'hr.helen@company.com', label: 'Helen (HR)', role: 'HR' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gradient-surface)',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
            }}
          >
            ✦ LeaveFlow
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Sign in to your leave management account
          </p>
        </div>

        {/* Login form */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo users */}
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Quick Demo Login
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {demoUsers.map((u) => (
              <button
                key={u.email}
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEmail(u.email);
                  setPassword('password123');
                }}
                style={{ fontSize: '0.8125rem' }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
