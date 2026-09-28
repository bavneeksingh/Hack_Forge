import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto, BalanceDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: leaves } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get<LeaveRequestDto[]>('/leaves/mine').then((r) => r.data),
  });

  const { data: balances } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get<BalanceDto[]>('/balance/me').then((r) => r.data),
  });

  const pending = leaves?.filter((l) => l.status.includes('PENDING')).length || 0;
  const approved = leaves?.filter((l) => l.status === 'APPROVED').length || 0;
  const totalUsed = balances?.reduce((sum, b) => sum + b.used, 0) || 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate('/apply')}>
          ✦ Apply for Leave
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{approved}</div>
          <div className="stat-label">Approved This Year</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalUsed}</div>
          <div className="stat-label">Days Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{balances?.reduce((sum, b) => sum + b.available, 0) || 0}</div>
          <div className="stat-label">Days Available</div>
        </div>
      </div>

      {/* Balance cards */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Leave Balance</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {balances?.map((b) => (
          <div key={b.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--color-text)' }}>{b.leaveType}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{b.year}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{b.entitled}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Entitled</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>{b.used}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Used</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent)' }}>{b.pending}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{b.available}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Available</div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: '0.75rem', height: '4px', borderRadius: '2px', background: 'var(--color-surface)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  background: 'var(--gradient-primary)',
                  width: `${b.entitled > 0 ? ((b.used + b.pending) / b.entitled) * 100 : 0}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Recent Requests</h3>
      {leaves && leaves.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {leaves.slice(0, 5).map((l) => (
                <tr key={l.id} onClick={() => navigate(`/requests/${l.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--color-text)', fontWeight: 500 }}>{l.type}</td>
                  <td>{l.startDate} → {l.endDate}</td>
                  <td>{l.workingDays}</td>
                  <td><StatusBadge status={l.status} escalated={l.escalated} conflictFlagged={l.conflictFlagged} /></td>
                  <td>{l.currentAssignee?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No leave requests yet. Click "Apply for Leave" to get started.</p>
        </div>
      )}
    </div>
  );
}
