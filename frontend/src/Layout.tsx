import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

const navItems = {
  EMPLOYEE: [
    { path: '/', label: 'Dashboard', icon: '◈' },
    { path: '/apply', label: 'Apply for Leave', icon: '✦' },
    { path: '/requests', label: 'My Requests', icon: '☰' },
    { path: '/balance', label: 'My Balance', icon: '◎' },
  ],
  MANAGER: [
    { path: '/', label: 'Dashboard', icon: '◈' },
    { path: '/apply', label: 'Apply for Leave', icon: '✦' },
    { path: '/requests', label: 'My Requests', icon: '☰' },
    { path: '/balance', label: 'My Balance', icon: '◎' },
    { path: '/approvals', label: 'Approvals', icon: '✓' },
    { path: '/team-calendar', label: 'Team Calendar', icon: '▦' },
  ],
  HR: [
    { path: '/', label: 'Dashboard', icon: '◈' },
    { path: '/apply', label: 'Apply for Leave', icon: '✦' },
    { path: '/requests', label: 'My Requests', icon: '☰' },
    { path: '/balance', label: 'My Balance', icon: '◎' },
    { path: '/hr-queue', label: 'HR Queue', icon: '⚑' },
    { path: '/all-balances', label: 'All Balances', icon: '◎' },
    { path: '/policies', label: 'Policies', icon: '⚙' },
    { path: '/audit', label: 'Audit Log', icon: '▤' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItems[user?.role || 'EMPLOYEE'];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--color-surface-2)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
            }}
          >
            ✦ LeaveFlow
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Leave Management System
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                margin: '0.125rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              })}
            >
              <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--color-border)',
            marginTop: 'auto',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            {user?.role} • {user?.teamName || 'No team'}
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
