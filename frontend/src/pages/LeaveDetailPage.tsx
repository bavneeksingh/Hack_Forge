import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../toast';
import { useAuth } from '../auth';

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: leave, isLoading, isError, error } = useQuery({
    queryKey: ['leave-detail', id],
    queryFn: () => api.get<LeaveRequestDto>(`/leaves/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/leaves/${id}/cancel`),
    onSuccess: () => {
      toast.success('Leave request has been cancelled');
      queryClient.invalidateQueries({ queryKey: ['leave-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel leave request');
    },
  });

  const canCancel =
    leave &&
    ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'].includes(leave.status) &&
    (user?.role === 'HR' || leave.requester.id === user?.id);

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
        <div className="skeleton" style={{ height: '350px' }}></div>
      </div>
    );
  }

  if (isError || !leave) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
          ← Back
        </button>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>Leave Request Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            {(error as any)?.response?.data?.message || 'The requested leave details could not be loaded.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/requests')}>
            Go to My Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px' }}>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                Leave Request #{leave.id}
              </h1>
              <StatusBadge
                status={leave.status}
                escalated={leave.escalated}
                conflictFlagged={leave.conflictFlagged}
              />
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Submitted by <strong style={{ color: 'var(--color-text)' }}>{leave.requester.name}</strong>
            </p>
          </div>
        </div>

        {canCancel && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm('Are you sure you want to cancel this leave request?')) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Key Info Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Request Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Leave Type</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                {leave.type}
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Working Days</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-success)' }}>
                {leave.workingDays} day{leave.workingDays > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Date Range</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text)' }}>
              {leave.startDate} → {leave.endDate}
            </div>
          </div>

          {leave.reason && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Reason</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                "{leave.reason}"
              </div>
            </div>
          )}
        </div>

        {/* Current Assignee / Status Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Current Routing</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current Assignee</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.25rem' }}>
              {leave.currentAssignee ? leave.currentAssignee.name : '— Completed / Resolved —'}
            </div>
          </div>

          {leave.dueAt && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Approval Deadline</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-warning)', fontWeight: 500, marginTop: '0.25rem' }}>
                {new Date(leave.dueAt).toLocaleString()}
              </div>
            </div>
          )}

          {leave.escalated && (
            <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-secondary)', fontSize: '0.8125rem' }}>
                Escalated Request
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Escalated from approver: {leave.escalatedFrom || 'Original Manager'}
              </div>
            </div>
          )}

          {leave.conflictFlagged && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.8125rem' }}>
                Team Conflict Flagged
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                {leave.conflictDetails && leave.conflictDetails.length > 0 ? (
                  leave.conflictDetails.map((c, i) => (
                    <div key={i}>
                      {c.date}: {Math.round(c.pct * 100)}% away {c.awayNames.length > 0 && `(${c.awayNames.join(', ')})`}
                    </div>
                  ))
                ) : (
                  'Overlaps with team conflict threshold.'
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval History Timeline */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Approval & Audit Timeline</h3>
        {leave.history && leave.history.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '1rem' }}>
            <div
              style={{
                position: 'absolute',
                left: '6px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: 'var(--color-border)',
              }}
            />
            {leave.history.map((h, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: '1.25rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.5rem',
                    top: '4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background:
                      h.action.includes('APPROVE')
                        ? 'var(--color-success)'
                        : h.action.includes('REJECT')
                        ? 'var(--color-danger)'
                        : h.action === 'SUBMIT'
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.875rem' }}>
                    {h.action.replace(/_/g, ' ')}
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      {' by '}
                      {h.actor?.name || 'System'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(h.at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                  Stage: {h.stage}
                </div>
                {h.comment && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      marginTop: '0.25rem',
                    }}
                  >
                    "{h.comment}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No history entries recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
