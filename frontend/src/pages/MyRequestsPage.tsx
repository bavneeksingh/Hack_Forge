import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { LeaveRequestDto } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../toast';

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get<LeaveRequestDto[]>('/leaves/mine').then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/leaves/${id}/cancel`),
    onSuccess: () => {
      toast.success('Leave request cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    },
  });

  const canCancel = (status: string) =>
    ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'].includes(status);

  if (isLoading) {
    return <div className="skeleton" style={{ height: '400px' }}></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Requests</h1>
      </div>

      {leaves && leaves.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l, idx) => (
                <tr key={l.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <td style={{ color: 'var(--color-text-muted)' }}>#{l.id}</td>
                  <td style={{ color: 'var(--color-text)', fontWeight: 500 }}>{l.type}</td>
                  <td>{l.startDate} → {l.endDate}</td>
                  <td>{l.workingDays}</td>
                  <td><StatusBadge status={l.status} escalated={l.escalated} conflictFlagged={l.conflictFlagged} /></td>
                  <td>{l.currentAssignee?.name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/requests/${l.id}`)}
                      >
                        Details
                      </button>
                      {canCancel(l.status) && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (confirm('Cancel this leave request?')) cancelMutation.mutate(l.id);
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>You haven't submitted any leave requests yet.</p>
        </div>
      )}
    </div>
  );
}
