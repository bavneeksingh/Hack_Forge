import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto, WorkationDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../toast';

export default function ApprovalsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALL' | 'LEAVES' | 'NOMAD'>('ALL');
  
  // Leave Rejection state
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [rejectLeaveComment, setRejectLeaveComment] = useState('');

  // Nomad Rejection state
  const [rejectNomadId, setRejectNomadId] = useState<number | null>(null);
  const [rejectNomadComment, setRejectNomadComment] = useState('');

  const { data: pendingLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['manager-pending'],
    queryFn: () => api.get<LeaveRequestDto[]>('/manager/pending').then((r) => r.data),
  });

  const { data: pendingNomads, isLoading: loadingNomads } = useQuery({
    queryKey: ['workations-pending'],
    queryFn: () => api.get<WorkationDto[]>('/workations/pending').then((r) => r.data),
  });

  // Leave mutations
  const approveLeaveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/manager/leaves/${id}/approve`, { comment: 'Approved' }),
    onSuccess: () => {
      toast.success('Leave approved successfully');
      queryClient.invalidateQueries({ queryKey: ['manager-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Approval failed'),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/manager/leaves/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Leave rejected');
      setRejectLeaveId(null);
      setRejectLeaveComment('');
      queryClient.invalidateQueries({ queryKey: ['manager-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Rejection failed'),
  });

  // Nomad mutations
  const approveNomadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/workations/${id}/approve`, { comment: 'Manager Approved' }),
    onSuccess: () => {
      toast.success('Nomad request approved and forwarded to HR for final sign-off!');
      queryClient.invalidateQueries({ queryKey: ['workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Nomad approval failed'),
  });

  const rejectNomadMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/workations/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Nomad mode request rejected');
      setRejectNomadId(null);
      setRejectNomadComment('');
      queryClient.invalidateQueries({ queryKey: ['workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Nomad rejection failed'),
  });

  const leavesCount = pendingLeaves?.length || 0;
  const nomadsCount = pendingNomads?.length || 0;
  const totalCount = leavesCount + nomadsCount;

  if (loadingLeaves || loadingNomads) {
    return <div className="skeleton" style={{ height: '400px' }}></div>;
  }

  const showLeaves = activeTab === 'ALL' || activeTab === 'LEAVES';
  const showNomads = activeTab === 'ALL' || activeTab === 'NOMAD';

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Review pending PTO leaves and Nomad Mode (Workation) timezone requests from your team
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--color-surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Pending ({totalCount})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'LEAVES' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('LEAVES')}
          >
            📋 Leaves ({leavesCount})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'NOMAD' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('NOMAD')}
          >
            🌴 Nomad Mode ({nomadsCount})
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🎉 All Caught Up!</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            There are no pending PTO leaves or Nomad Mode requests requiring your approval.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 🌴 Nomad Mode Requests Section */}
          {showNomads && pendingNomads && pendingNomads.length > 0 && (
            <div>
              {activeTab === 'ALL' && (
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🌴 Nomad Mode / Workation Requests ({pendingNomads.length})
                </h3>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingNomads.map((w, idx) => (
                  <div
                    key={`nomad-${w.id}`}
                    className="card animate-fade-in"
                    style={{
                      animationDelay: `${idx * 0.08}s`,
                      border: '1px solid rgba(130, 209, 157, 0.4)',
                      background: 'linear-gradient(135deg, rgba(130, 209, 157, 0.06) 0%, rgba(26, 32, 44, 0.4) 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{ fontSize: '2rem' }}>{w.statusIcon}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>{w.userName}</span>
                            <span className="badge badge-warning" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                              STAGE 1 OF 2: AWAITING MANAGER
                            </span>
                            <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                              0 PTO DEDUCTION (WORKATION)
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div>📍 <strong>{w.city}, {w.country}</strong></div>
                            <div>🗓️ <strong>Destination Dates:</strong> <span style={{ color: 'var(--color-primary-light)' }}>{w.localDatesDisplay || `${w.startDate} → ${w.endDate} (${w.city} Time)`}</span></div>
                            <div>🗓️ <strong>Team HQ Dates:</strong> <span style={{ color: 'var(--color-accent)' }}>{w.teamDatesDisplay || `${w.startDate} → ${w.endDate} (Team HQ IST)`}</span></div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => approveNomadMutation.mutate(w.id)}
                          disabled={approveNomadMutation.isPending}
                        >
                          ✓ Forward to HR (Approve)
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setRejectNomadId(w.id)}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>

                    {/* Nomad Leave Window vs Base Country Calendar Period */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        background: 'var(--color-surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          🌐 Destination Leave Period ({w.city})
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {w.localDatesDisplay || `${w.startDate} → ${w.endDate}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Timezone: {w.timezone} (Full Day Leave)
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          🏢 Base Team HQ Calendar Period (IST)
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {w.teamDatesDisplay || `${w.startDate} → ${w.endDate} (Base HQ IST)`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Asia/Kolkata (UTC+5:30)
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          ⏱️ Time Gap Calculation
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-success)' }}>
                          {w.timeDiffHours >= 0 ? `+${w.timeDiffHours} hrs ahead` : `${w.timeDiffHours} hrs behind`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {w.timeGapDescription || 'Calculated vs Base HQ IST'}
                        </div>
                      </div>
                    </div>

                    {w.statusMessage && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '0.25rem 0.5rem' }}>
                        💬 Note: "{w.statusMessage}"
                      </div>
                    )}

                    {/* Reject nomad comment inline */}
                    {rejectNomadId === w.id && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                          Rejection Reason for Nomad Request
                        </label>
                        <textarea
                          className="input"
                          value={rejectNomadComment}
                          onChange={(e) => setRejectNomadComment(e.target.value)}
                          placeholder="Explain why this nomad/workation request cannot be accommodated..."
                          style={{ marginBottom: '0.75rem', width: '100%', minHeight: '60px' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => rejectNomadMutation.mutate({ id: w.id, comment: rejectNomadComment })}
                            disabled={rejectNomadMutation.isPending}
                          >
                            Confirm Reject
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setRejectNomadId(null); setRejectNomadComment(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📋 Regular Leave Requests Section */}
          {showLeaves && pendingLeaves && pendingLeaves.length > 0 && (
            <div>
              {activeTab === 'ALL' && (
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📋 PTO Leave Requests ({pendingLeaves.length})
                </h3>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingLeaves.map((l, idx) => (
                  <div key={`leave-${l.id}`} className="card animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{l.requester.name}</span>
                          <StatusBadge status={l.status} escalated={l.escalated} conflictFlagged={l.conflictFlagged} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {l.type} • {l.startDate} → {l.endDate} • {l.workingDays} day{l.workingDays > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => approveLeaveMutation.mutate(l.id)}
                          disabled={approveLeaveMutation.isPending}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setRejectLeaveId(l.id)}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>

                    {l.reason && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        "{l.reason}"
                      </div>
                    )}

                    {l.conflictFlagged && l.conflictDetails.length > 0 && (
                      <div style={{ marginTop: '0.5rem', padding: '0.625rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171' }}>
                        ⚠ Conflict: {l.conflictDetails.map((d) => `${d.date} (${Math.round(d.pct * 100)}%)`).join(', ')}
                      </div>
                    )}

                    {l.escalated && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                        ⚡ Escalated from {l.escalatedFrom}
                      </div>
                    )}

                    {/* Reject modal inline */}
                    {rejectLeaveId === l.id && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                          Rejection Comment (required)
                        </label>
                        <textarea
                          className="input"
                          value={rejectLeaveComment}
                          onChange={(e) => setRejectLeaveComment(e.target.value)}
                          placeholder="Explain the reason for rejection..."
                          style={{ marginBottom: '0.75rem', width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => rejectLeaveMutation.mutate({ id: l.id, comment: rejectLeaveComment })}
                            disabled={!rejectLeaveComment.trim() || rejectLeaveMutation.isPending}
                          >
                            Confirm Reject
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setRejectLeaveId(null); setRejectLeaveComment(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
