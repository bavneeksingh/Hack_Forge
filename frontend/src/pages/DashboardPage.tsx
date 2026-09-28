import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto, BalanceDto, WorkationDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = user?.role === 'MANAGER' || user?.role === 'HR';
  const isHr = user?.role === 'HR';

  const { data: leaves } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get<LeaveRequestDto[]>('/leaves/mine').then((r) => r.data),
  });

  const { data: balances } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get<BalanceDto[]>('/balance/me').then((r) => r.data),
  });

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

  const { data: pendingNomads } = useQuery({
    queryKey: ['workations-pending'],
    queryFn: () => api.get<WorkationDto[]>('/workations/pending').then((r) => r.data),
    enabled: isManager,
    refetchInterval: 10000,
  });

  const { data: activeWorkation } = useQuery({
    queryKey: ['active-workation'],
    queryFn: () => api.get('/workations/active').then((r) => r.data).catch(() => null),
  });

  const { data: teamWorkations } = useQuery({
    queryKey: ['team-workations'],
    queryFn: () => api.get('/workations/team').then((r) => r.data).catch(() => []),
  });

  const pending = leaves?.filter((l) => l.status.includes('PENDING')).length || 0;
  const approved = leaves?.filter((l) => l.status === 'APPROVED').length || 0;
  const totalUsed = balances?.reduce((sum, b) => sum + b.used, 0) || 0;
  const teamApprovalCount = (isHr ? (hrPending?.length || 0) : (managerPending?.length || 0)) + (pendingNomads?.length || 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Welcome back, <strong style={{ color: 'var(--color-text)' }}>{user?.name}</strong> ({user?.role})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/nomad')} style={{ border: '1px solid var(--color-border)' }}>
            🌴 Nomad Mode
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/apply')}>
            ✦ Apply for Leave
          </button>
        </div>
      </div>

      {/* Active Nomad Status Banner */}
      {activeWorkation && (
        <div
          className="card animate-fade-in"
          style={{
            marginBottom: '1.75rem',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(130, 209, 157, 0.15) 0%, rgba(59, 107, 122, 0.08) 100%)',
            border: '1px solid rgba(130, 209, 157, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>{activeWorkation.statusIcon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                You are currently on Nomad Leave ({activeWorkation.city}, {activeWorkation.country})
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                ⏱️ <strong>Time Gap:</strong> {activeWorkation.timeGapDescription || `${activeWorkation.timeDiffHours >= 0 ? `+${activeWorkation.timeDiffHours}h` : `${activeWorkation.timeDiffHours}h`} vs Base`} • 🏢 <strong>Base HQ (IST):</strong> {activeWorkation.teamDatesDisplay || activeWorkation.startDate}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/nomad')} style={{ border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
            Manage Nomad Trip →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '2rem' }}>
        {isManager && (
          <div
            className="stat-card"
            style={{
              border: teamApprovalCount > 0 ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
              background: teamApprovalCount > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-surface-2)',
              cursor: 'pointer',
            }}
            onClick={() => navigate(isHr ? '/hr-queue' : '/approvals')}
          >
            <div
              className="stat-value"
              style={{ color: teamApprovalCount > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}
            >
              {teamApprovalCount}
            </div>
            <div className="stat-label">
              ⚡ {isHr ? 'HR Queue Pending' : 'Awaiting Your Approval'}
            </div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">My Pending Requests</div>
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

      {/* Manager / HR Team Pending Approvals Section */}
      {isManager && ((managerPending && managerPending.length > 0) || (pendingNomads && pendingNomads.length > 0)) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-warning)', fontSize: '1.25rem' }}>⚡</span>
              Action Required: Team Approvals ({((managerPending?.length || 0) + (pendingNomads?.length || 0))})
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(isHr ? '/hr-queue' : '/approvals')}>
              Go to Approvals Page →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* 🌴 Pending Nomad Mode Requests */}
            {pendingNomads?.map((w) => (
              <div
                key={`dash-nomad-${w.id}`}
                className="card animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(130, 209, 157, 0.4)',
                  background: 'linear-gradient(135deg, rgba(130, 209, 157, 0.08) 0%, var(--color-surface) 100%)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{w.statusIcon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                        {w.userName}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        🌴 Nomad Mode ({w.city}, {w.country})
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                    {w.approvalStatus === 'PENDING_HR' ? 'STAGE 2: AWAITING HR' : 'STAGE 1: AWAITING MGR'}
                  </span>
                </div>

                {/* Dual Dates & Time Gap display */}
                <div style={{ padding: '0.625rem', background: 'var(--color-surface-2)', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div>🌐 <strong>Destination Leave:</strong> <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{w.localDatesDisplay || `${w.startDate} → ${w.endDate} (${w.city} Time)`}</span></div>
                  <div>🏢 <strong>Base Country (IST):</strong> <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{w.teamDatesDisplay || `${w.startDate} → ${w.endDate} (Base HQ IST)`}</span></div>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>⏱️ <strong>Time Gap:</strong> {w.timeGapDescription || `${w.timeDiffHours >= 0 ? `+${w.timeDiffHours}h` : `${w.timeDiffHours}h`} vs Base HQ`}</div>
                </div>

                {w.statusMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    "{w.statusMessage}"
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(isHr ? '/hr-queue' : '/approvals')}
                    style={{ flex: 1 }}
                  >
                    ✓ Review & Approve
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate('/nomad')}
                  >
                    Nomad Hub
                  </button>
                </div>
              </div>
            ))}

            {/* 📋 Pending Leave Requests */}
            {managerPending?.map((p) => (
              <div
                key={`dash-leave-${p.id}`}
                className="card animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                      {p.requester.name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: '0.125rem' }}>
                      {p.type} • {p.workingDays} working day{p.workingDays > 1 ? 's' : ''}
                    </div>
                  </div>
                  <StatusBadge status={p.status} escalated={p.escalated} conflictFlagged={p.conflictFlagged} />
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  📅 {p.startDate} → {p.endDate}
                </div>

                {p.reason && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    "{p.reason}"
                  </div>
                )}

                {p.conflictFlagged && (
                  <div style={{ padding: '0.375rem 0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '0.6875rem', color: '#f87171', marginBottom: '0.75rem' }}>
                    ⚠ Conflict: Teammate overlap detected
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(isHr ? '/hr-queue' : '/approvals')}
                    style={{ flex: 1 }}
                  >
                    ✓ Review in Approvals
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/requests/${p.id}`)}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Balance cards */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>My Leave Balance</h3>
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
            <div style={{ marginTop: '0.75rem', height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: 'var(--gradient-primary)',
                  width: `${b.entitled > 0 ? ((b.used + b.pending) / b.entitled) * 100 : 0}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Team Nomad & Timezone Radar */}
      {teamWorkations && teamWorkations.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🌴</span> Team Nomad Radar ({teamWorkations.length} Remote Workations)
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/nomad')}>
              Nomad Hub →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {teamWorkations.map((w: any) => (
              <div
                key={w.id}
                className="card animate-fade-in"
                style={{
                  border: w.isCurrentlyActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: w.isCurrentlyActive ? 'rgba(130, 209, 157, 0.06)' : 'var(--color-surface-2)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{w.statusIcon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                        {w.userName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                        {w.city}, {w.country}
                      </div>
                    </div>
                  </div>
                  {w.isCurrentlyActive ? (
                    <span className="badge badge-approved" style={{ fontSize: '0.6875rem' }}>
                      ● Active Now
                    </span>
                  ) : (
                    <span className="badge badge-pending" style={{ fontSize: '0.6875rem' }}>
                      📅 Scheduled
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  🌐 <strong>Destination Leave:</strong> {w.localDatesDisplay || `${w.startDate} → ${w.endDate} (${w.city})`}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  🏢 <strong>Base HQ Period:</strong> {w.teamDatesDisplay || `${w.startDate} → ${w.endDate} (IST)`}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-success)', marginTop: '0.2rem', fontWeight: 600 }}>
                  ⏱️ {w.timeGapDescription || `${w.timeDiffHours >= 0 ? `+${w.timeDiffHours}h` : `${w.timeDiffHours}h`} vs Base`}
                </div>

                {w.statusMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    "{w.statusMessage}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent requests */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>My Recent Requests</h3>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.slice(0, 5).map((l) => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--color-text)', fontWeight: 500 }}>{l.type}</td>
                  <td>{l.startDate} → {l.endDate}</td>
                  <td>{l.workingDays}</td>
                  <td><StatusBadge status={l.status} escalated={l.escalated} conflictFlagged={l.conflictFlagged} /></td>
                  <td>{l.currentAssignee?.name || '—'}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/requests/${l.id}`)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No personal leave requests submitted yet.</p>
        </div>
      )}
    </div>
  );
}
