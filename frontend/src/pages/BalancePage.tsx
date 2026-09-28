import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { BalanceDto } from '../types';

export default function BalancePage() {
  const { data: balances, isLoading } = useQuery({
    queryKey: ['my-balance'],
    queryFn: () => api.get<BalanceDto[]>('/balance/me').then((r) => r.data),
  });

  if (isLoading) return <div className="skeleton" style={{ height: '300px' }}></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Balance</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {balances?.map((b, idx) => (
          <div
            key={b.id}
            className="card animate-fade-in"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'var(--color-text)' }}>{b.leaveType}</h3>
              <span className="badge badge-approved">{b.year}</span>
            </div>

            {/* Circular-style display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {b.available}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Available</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  {b.entitled}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Entitled</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Used: <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{b.used}</span>
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Pending: <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{b.pending}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '0.75rem', height: '6px', borderRadius: '3px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                background: b.available > 0 ? 'var(--gradient-primary)' : 'var(--color-danger)',
                width: `${b.entitled > 0 ? ((b.used + b.pending) / b.entitled) * 100 : 0}%`,
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
