import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { PolicyDto } from '../types';
import { useToast } from '../toast';
import { useState } from 'react';

export default function PoliciesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => api.get<PolicyDto[]>('/hr/policies').then((r) => r.data),
  });

  const [editing, setEditing] = useState<number | null>(null);
  const [threshold, setThreshold] = useState('');
  const [timeout, setTimeout] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ teamId, data }: { teamId: number; data: Partial<PolicyDto> }) =>
      api.put(`/hr/policies/${teamId}`, data),
    onSuccess: () => {
      toast.success('Policy updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const startEdit = (p: PolicyDto) => {
    setEditing(p.teamId);
    setThreshold(String(p.conflictThreshold));
    setTimeout(String(p.escalationTimeoutHours));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Policies</h1>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: '200px' }}></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {policies?.map((p) => (
            <div key={p.teamId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ color: 'var(--color-text)' }}>{p.teamName}</h3>
                {editing !== p.teamId && (
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>⚙ Edit</button>
                )}
              </div>

              {editing === p.teamId ? (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Conflict Threshold (%)</label>
                    <input className="input" type="number" step="0.01" min="0" max="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>0.40 = 40% of team away triggers warning</span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Escalation Timeout (hours)</label>
                    <input className="input" type="number" min="1" value={timeout} onChange={(e) => setTimeout(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm"
                      onClick={() => updateMutation.mutate({ teamId: p.teamId, data: { conflictThreshold: Number(threshold), escalationTimeoutHours: Number(timeout), teamId: p.teamId, teamName: p.teamName } })}>
                      Save
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{Math.round(p.conflictThreshold * 100)}%</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Conflict Threshold</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>{p.escalationTimeoutHours}h</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Escalation Timeout</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
