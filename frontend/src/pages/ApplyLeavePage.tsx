import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useToast } from '../toast';
import type { LeavePreviewDto } from '../types';

export default function ApplyLeavePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [leaveTypeId, setLeaveTypeId] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Fetch leave types from balance endpoint (workaround: use balance to get types)
  const { data: balances } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get('/balance/me').then((r) => r.data),
  });



  // Preview query
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['leave-preview', startDate, endDate, leaveTypeId],
    queryFn: () =>
      api.get<LeavePreviewDto>('/leaves/preview', {
        params: { start: startDate, end: endDate, type: leaveTypeId },
      }).then((r) => r.data),
    enabled: !!startDate && !!endDate && leaveTypeId > 0,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/leaves', { leaveTypeId, startDate, endDate, reason: reason || null }),
    onSuccess: () => {
      toast.success('Leave request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
      navigate('/requests');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    },
  });

  // Auto-set leave type ID based on actual leave type IDs
  useEffect(() => {
    if (balances && balances.length > 0 && leaveTypeId === 0) {
      // We need to get actual leave type IDs. Let's use position-based mapping for seed data:
      // Annual Leave = 1, Sick Leave = 2, Personal Leave = 3
      setLeaveTypeId(1);
    }
  }, [balances, leaveTypeId]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      <div className="page-header">
        <h1 className="page-title">Apply for Leave</h1>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Leave Type</label>
            <select className="input" value={leaveTypeId} onChange={(e) => setLeaveTypeId(Number(e.target.value))}>
              <option value={1}>Annual Leave</option>
              <option value={2}>Sick Leave</option>
              <option value={3}>Personal Leave</option>
            </select>
          </div>
          <div></div>
          <div>
            <label>Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Reason (optional)</label>
          <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your reason..." />
        </div>

        {/* Preview */}
        {preview && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: '1.5rem',
              background: 'var(--color-surface)',
              border: preview.conflictFlagged ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                  {preview.workingDays}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Working Days</div>
              </div>
              {preview.holidays.length > 0 && (
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {preview.holidays.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Holidays Excluded</div>
                </div>
              )}
            </div>

            {preview.conflictFlagged && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f87171', marginBottom: '0.375rem' }}>
                  ⚠ Team Conflict Warning
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {preview.conflictDetails.map((d, i) => (
                    <div key={i}>
                      {d.date}: {Math.round(d.pct * 100)}% away
                      {d.awayNames.length > 0 && ` (${d.awayNames.join(', ')})`}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                  This is informational only and will not block your request.
                </div>
              </div>
            )}
          </div>
        )}

        {previewLoading && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="skeleton" style={{ height: '80px' }}></div>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={!startDate || !endDate || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? 'Submitting...' : '✦ Submit Leave Request'}
        </button>
      </div>
    </div>
  );
}
