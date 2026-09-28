import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { ApprovalHistoryDto } from '../types';

export default function AuditLogPage() {
  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get<ApprovalHistoryDto[]>('/hr/audit').then((r) => r.data),
  });

  const actionColors: Record<string, string> = {
    SUBMIT: 'var(--color-primary-light)',
    MANAGER_APPROVE: 'var(--color-success)',
    MANAGER_REJECT: 'var(--color-danger)',
    HR_APPROVE: 'var(--color-success)',
    HR_REJECT: 'var(--color-danger)',
    CANCEL: 'var(--color-text-muted)',
    ESCALATE: 'var(--color-secondary)',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        {audit && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{audit.length} entries</span>}
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: '400px' }}></div>
      ) : audit && audit.length > 0 ? (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '5px', top: '8px', bottom: '8px', width: '2px', background: 'var(--color-border)' }} />

            {audit.map((h, idx) => (
              <div key={idx} className="animate-fade-in" style={{
                position: 'relative', paddingBottom: '1.25rem', animationDelay: `${idx * 0.03}s`,
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: '-1.5rem', top: '6px', width: '12px', height: '12px',
                  borderRadius: '50%', background: actionColors[h.action] || 'var(--color-text-muted)',
                  boxShadow: `0 0 8px ${actionColors[h.action] || 'transparent'}`,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: actionColors[h.action] || 'var(--color-text)', fontSize: '0.875rem' }}>
                      {h.action.replace('_', ' ')}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}> by {h.actor.name}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                      Stage: {h.stage}
                    </div>
                    {h.comment && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        "{h.comment}"
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(h.at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state"><p>No audit entries yet.</p></div>
      )}
    </div>
  );
}
