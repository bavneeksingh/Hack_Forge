import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { BalanceDto } from '../types';
import { useState } from 'react';

export default function AllBalancesPage() {
  const [search, setSearch] = useState('');

  const { data: balances, isLoading } = useQuery({
    queryKey: ['all-balances'],
    queryFn: () => api.get<BalanceDto[]>('/hr/balances').then((r) => r.data),
  });

  const filtered = balances?.filter((b) =>
    b.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    b.leaveType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">All Balances</h1>
        <input className="input" style={{ width: '260px' }} placeholder="Search by name or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: '400px' }}></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Year</th>
                <th>Entitled</th>
                <th>Used</th>
                <th>Pending</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((b, idx) => (
                <tr key={b.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td style={{ color: 'var(--color-text)', fontWeight: 500 }}>{b.employeeName}</td>
                  <td>{b.leaveType}</td>
                  <td>{b.year}</td>
                  <td>{b.entitled}</td>
                  <td style={{ color: 'var(--color-warning)' }}>{b.used}</td>
                  <td style={{ color: 'var(--color-accent)' }}>{b.pending}</td>
                  <td style={{ color: b.available > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{b.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
