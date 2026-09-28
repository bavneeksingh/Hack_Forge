import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto, WorkationDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../toast';

export default function HrQueuePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  
  // Leave rejection state
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [rejectLeaveComment, setRejectLeaveComment] = useState('');

  // Nomad rejection state
  const [rejectNomadId, setRejectNomadId] = useState<number | null>(null);
  const [rejectNomadComment, setRejectNomadComment] = useState('');

  const { data: pendingLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['hr-pending', filter],
    queryFn: () => api.get<LeaveRequestDto[]>('/hr/pending', { params: { filter } }).then((r) => r.data),
  });

  const { data: pendingNomads, isLoading: loadingNomads } = useQuery({
    queryKey: ['hr-workations-pending'],
    queryFn: () => api.get<WorkationDto[]>('/workations/pending').then((r) => r.data),
  });

  const approveLeaveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/hr/leaves/${id}/approve`, { comment: 'HR Approved' }),
    onSuccess: () => {
      toast.success('Leave approved (final)');
      queryClient.invalidateQueries({ queryKey: ['hr-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/hr/leaves/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Leave rejected');
      setRejectLeaveId(null);
      setRejectLeaveComment('');
      queryClient.invalidateQueries({ queryKey: ['hr-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const approveNomadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/workations/${id}/approve`, { comment: 'HR Approved' }),
    onSuccess: () => {
      toast.success('Nomad mode approved (final)');
      queryClient.invalidateQueries({ queryKey: ['hr-workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const rejectNomadMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/workations/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Nomad mode rejected');
      setRejectNomadId(null);
      setRejectNomadComment('');
      queryClient.invalidateQueries({ queryKey: ['hr-workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const filters = ['ALL', 'NOMAD', 'FLAGGED', 'ESCALATED'];

  if (loadingLeaves || loadingNomads) {
    return <div className="skeleton" style={{ height: '400px' }}></div>;
  }

  const showNomads = (filter === 'ALL' || filter === 'NOMAD') && pendingNomads && pendingNomads.length > 0;
  const showLeaves = filter !== 'NOMAD';

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">HR Queue</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Company-wide review for PTO leaves, conflicts, escalations, and Nomad Mode workations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {filters.map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'NOMAD' ? `🌴 NOMAD (${pendingNomads?.length || 0})` : f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* 🌴 Nomad Requests in HR Queue */}
        {showNomads && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌴 Company Nomad Mode Requests ({pendingNomads.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingNomads.map((w, idx) => (
                <div
                  key={`hr-nomad-${w.id}`}
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
                            {w.approvalStatus === 'PENDING_HR' ? 'STAGE 2 OF 2: AWAITING HR SIGN-OFF' : 'HR DIRECT REVIEW'}
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
                        ✓ HR Final Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setRejectNomadId(w.id)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>

                  {/* Manager Review Status */}
                  {w.managerApprovedByName && (
                    <div style={{ padding: '0.4rem 0.625rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', fontSize: '0.75rem', color: '#10b981', marginBottom: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      ✓ <strong>Stage 1 Manager Sign-off:</strong> Approved by {w.managerApprovedByName} {w.managerApprovalComment ? `("${w.managerApprovalComment}")` : ''}
                    </div>
                  )}

                  {/* Dual Dates & Time Gap Card */}
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

                  {rejectNomadId === w.id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                        Rejection Reason for Nomad Request
                      </label>
                      <textarea
                        className="input"
                        value={rejectNomadComment}
                        onChange={(e) => setRejectNomadComment(e.target.value)}
                        placeholder="Explain HR rejection reason..."
                        style={{ marginBottom: '0.75rem', width: '100%' }}
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

        {/* 📋 Regular Leaves in HR Queue */}
        {showLeaves && (
          <div>
            {pendingLeaves && pendingLeaves.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingLeaves.map((l, idx) => (
                  <div key={`hr-leave-${l.id}`} className="card animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{l.requester.name}</span>
                          <StatusBadge status={l.status} escalated={l.escalated} conflictFlagged={l.conflictFlagged} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {l.type} • {l.startDate} → {l.endDate} • {l.workingDays} days
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-success btn-sm" onClick={() => approveLeaveMutation.mutate(l.id)}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectLeaveId(l.id)}>✗ Reject</button>
                      </div>
                    </div>

                    {l.reason && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>"{l.reason}"</div>}

                    {/* History timeline */}
                    {l.history.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Approval Timeline</div>
                        {l.history.map((h, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '0.125rem 0' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{new Date(h.at).toLocaleString()}</span>
                            {' • '}{h.actor.name} → <span style={{ fontWeight: 600 }}>{h.action}</span>
                            {h.comment && <span style={{ fontStyle: 'italic' }}> — "{h.comment}"</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {rejectLeaveId === l.id && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                        <label>Rejection Comment (required)</label>
                        <textarea className="input" value={rejectLeaveComment} onChange={(e) => setRejectLeaveComment(e.target.value)} placeholder="Explain..." style={{ marginBottom: '0.75rem' }} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectLeaveMutation.mutate({ id: l.id, comment: rejectLeaveComment })} disabled={!rejectLeaveComment.trim()}>Confirm Reject</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectLeaveId(null); setRejectLeaveComment(''); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>No leave requests in this view.</p></div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
