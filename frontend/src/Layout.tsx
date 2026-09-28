import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth';
import api from './api';
import type { LeaveRequestDto } from './types';

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

  const isManager = user?.role === 'MANAGER' || user?.role === 'HR';
  const isHr = user?.role === 'HR';

  const { data: managerPending } = useQuery({
    queryKey: ['manager-pending'],
    queryFn: () => api.get<LeaveRequestDto[]>('/manager/pending').then((r) => r.data),
    enabled: isManager,
    refetchInterval: 10000,
  });

  const { data: hrPending } = useQuery({
    queryKey: ['hr-pending', 'ALL'],
    queryFn: () => api.get<LeaveRequestDto[]>('/hr/pending', { params: { filter: 'ALL' } }).then((r) => r.data),
    enabled: isHr,
    refetchInterval: 10000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBadgeCount = (path: string) => {
    if (path === '/approvals' && managerPending && managerPending.length > 0) {
      return managerPending.length;
    }
    if (path === '/hr-queue' && hrPending && hrPending.length > 0) {
      return hrPending.length;
    }
    return 0;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: '#FFFFFF',
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
              color: 'var(--color-text)',
              letterSpacing: '-0.03em',
            }}
          >
            <span style={{ color: 'var(--color-primary)' }}>✦</span> LeaveFlow
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
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
                gap: '0.85rem',
                padding: '0.85rem 1.25rem',
                margin: '0.25rem 0',
                borderRadius: '99px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              })}
            >
              <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
>>>>>>> e35262da7ca89f841dee48b666c098266f87b02c
        </nav>

        {/* User info */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: '1px solid var(--color-border)',
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--color-primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1.1rem'
            }}>
              {user?.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', border: '1px solid var(--color-border)' }}>
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
