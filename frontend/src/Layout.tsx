import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth';
import api from './api';
import type { LeaveRequestDto } from './types';

// Clean SVG icons for enterprise navigation
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Apply: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Requests: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Balance: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Approvals: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Workload: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Queue: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Policies: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Audit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Calculator: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="16" y1="18" x2="16" y2="18.01" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
    </svg>
  ),
};

const navItems = {
  EMPLOYEE: [
    { path: '/', label: 'Dashboard', Icon: Icons.Dashboard },
    { path: '/apply', label: 'Apply for Leave', Icon: Icons.Apply },
    { path: '/requests', label: 'My Requests', Icon: Icons.Requests },
    { path: '/balance', label: 'My Balance', Icon: Icons.Balance },
    { path: '/team-calendar', label: 'Team Calendar', Icon: Icons.Calendar },
  ],
  MANAGER: [
    { path: '/', label: 'Dashboard', Icon: Icons.Dashboard },
    { path: '/apply', label: 'Apply for Leave', Icon: Icons.Apply },
    { path: '/requests', label: 'My Requests', Icon: Icons.Requests },
    { path: '/balance', label: 'My Balance', Icon: Icons.Balance },
    { path: '/calculator', label: 'Adjust Member Balances', Icon: Icons.Calculator },
    { path: '/approvals', label: 'Approvals', Icon: Icons.Approvals },
    { path: '/workload', label: 'Workload Planner', Icon: Icons.Workload },
    { path: '/team-calendar', label: 'Team Calendar', Icon: Icons.Calendar },
  ],
  HR: [
    { path: '/', label: 'Dashboard', Icon: Icons.Dashboard },
    { path: '/apply', label: 'Apply for Leave', Icon: Icons.Apply },
    { path: '/requests', label: 'My Requests', Icon: Icons.Requests },
    { path: '/balance', label: 'My Balance', Icon: Icons.Balance },
    { path: '/team-calendar', label: 'Team Calendar', Icon: Icons.Calendar },
    { path: '/hr-queue', label: 'HR Queue', Icon: Icons.Queue },
    { path: '/all-balances', label: 'All Balances', Icon: Icons.Balance },
    { path: '/calculator', label: 'Adjust Member Balances', Icon: Icons.Calculator },
    { path: '/policies', label: 'Policies', Icon: Icons.Policies },
    { path: '/audit', label: 'Audit Log', Icon: Icons.Audit },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleKey = (user?.role as keyof typeof navItems) || 'EMPLOYEE';
  const items = navItems[roleKey] || navItems.EMPLOYEE;

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
            LeaveFlow
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
            Leave Management System
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 0.75rem' }}>
          {items.map((item) => {
            const badgeCount = getBadgeCount(item.path);
            const Icon = item.Icon;
            return (
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
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                  <Icon />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    style={{
                      background: 'var(--color-warning)',
                      color: '#0f172a',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
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
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {user?.name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', border: '1px solid var(--color-border)' }}
          >
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