import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../toast';

export default function ApprovalsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const { data: pending, isLoading } = useQuery({
    queryKey: ['manager-pending'],
    queryFn: () => api.get<LeaveRequestDto[]>('/manager/pending').then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/manager/leaves/${id}/approve`, { comment: 'Approved' }),
    onSuccess: () => {
      toast.success('Leave approved');
      queryClient.invalidateQueries({ queryKey: ['manager-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/manager/leaves/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Leave rejected');
      setRejectId(null);
      setRejectComment('');
      queryClient.invalidateQueries({ queryKey: ['manager-pending'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton" style={{ height: '400px' }}></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        {pending && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{pending.length} pending</span>}
      </div>

      {pending && pending.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pending.map((l, idx) => (
            <div key={l.id} className="card animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
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
                  <button className="btn btn-success btn-sm" onClick={() => approveMutation.mutate(l.id)}
                    disabled={approveMutation.isPending}>✓ Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setRejectId(l.id)}>✗ Reject</button>
                </div>
              </div>
              {l.reason && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>"{l.reason}"</div>}

              {l.conflictFlagged && l.conflictDetails.length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171' }}>
                  ⚠ Conflict: {l.conflictDetails.map((d) => `${d.date} (${Math.round(d.pct * 100)}%)`).join(', ')}
                </div>
              )}

              {l.escalated && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                  ⚡ Escalated from {l.escalatedFrom}
                </div>
              )}

              {/* Reject modal inline */}
              {rejectId === l.id && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                  <label>Rejection Comment (required)</label>
                  <textarea className="input" value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Explain the reason for rejection..." style={{ marginBottom: '0.75rem' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => rejectMutation.mutate({ id: l.id, comment: rejectComment })}
                      disabled={!rejectComment.trim() || rejectMutation.isPending}>Confirm Reject</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setRejectId(null); setRejectComment(''); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>🎉 No pending approvals — all caught up!</p>
        </div>
      )}
    </div>
  );
}
