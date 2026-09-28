import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { BalanceDto } from '../types';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

interface EmployeeGroup {
  employeeId: number;
  employeeName: string;
  year: number;
  balances: Record<string, BalanceDto>;
  types: string[];
}

export default function AllBalancesPage() {
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Record<number, string>>({});
  const [globalType, setGlobalType] = useState<string>('Annual Leave');

  const { data: balances, isLoading } = useQuery({
    queryKey: ['all-balances'],
    queryFn: () => api.get<BalanceDto[]>('/hr/balances').then((r) => r.data),
  });

  // Group balances by employee so each employee appears exactly once
  const groupedEmployees = useMemo<EmployeeGroup[]>(() => {
    if (!balances) return [];
    const map = new Map<number, EmployeeGroup>();

    for (const b of balances) {
      let group = map.get(b.employeeId);
      if (!group) {
        group = {
          employeeId: b.employeeId,
          employeeName: b.employeeName,
          year: b.year,
          balances: {},
          types: [],
        };
        map.set(b.employeeId, group);
      }
      group.balances[b.leaveType] = b;
      if (!group.types.includes(b.leaveType)) {
        group.types.push(b.leaveType);
      }
    }

    return Array.from(map.values());
  }, [balances]);

  // Extract all distinct leave types across the company
  const allLeaveTypes = useMemo<string[]>(() => {
    const set = new Set<string>();
    groupedEmployees.forEach((emp) => emp.types.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [groupedEmployees]);

  const handleRowTypeChange = (employeeId: number, type: string) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [employeeId]: type,
    }));
  };

  const handleGlobalTypeChange = (type: string) => {
    setGlobalType(type);
    const updated: Record<number, string> = {};
    groupedEmployees.forEach((e) => {
      if (e.types.includes(type)) {
        updated[e.employeeId] = type;
      }
    });
    setSelectedTypes(updated);
  };

  const filtered = useMemo(() => {
    return groupedEmployees.filter((emp) =>
      emp.employeeName.toLowerCase().includes(search.toLowerCase())
    );
  }, [groupedEmployees, search]);

  // Totals for top statistics based on currently selected leave types
  const totals = useMemo(() => {
    let entitled = 0;
    let used = 0;
    let pending = 0;
    let available = 0;

    filtered.forEach((emp) => {
      const currentType =
        selectedTypes[emp.employeeId] ||
        (emp.types.includes(globalType) ? globalType : emp.types[0]);
      const bal = emp.balances[currentType];
      if (bal) {
        entitled += bal.entitled;
        used += bal.used;
        pending += bal.pending;
        available += bal.available;
      }
    });

    return { entitled, used, pending, available };
  }, [filtered, selectedTypes, globalType]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">All Balances</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Overview of employee leave allowances, utilized days, and remaining balances.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Global Leave Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Quick View:</span>
            <select
              className="input"
              value={globalType}
              onChange={(e) => handleGlobalTypeChange(e.target.value)}
              style={{
                width: 'auto',
                padding: '0.45rem 2.25rem 0.45rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '10px',
                background: '#FFFFFF',
              }}
            >
              {allLeaveTypes.map((t) => (
                <option key={t} value={t}>
                  {t} (All)
                </option>
              ))}
            </select>
          </div>

          <input
            className="input"
            style={{ width: '240px', padding: '0.45rem 1rem', fontSize: '0.8125rem', borderRadius: '10px' }}
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem', background: 'var(--color-surface-2)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Employees
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.25rem' }}>
            {filtered.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', background: 'var(--color-surface-2)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Entitled Days
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '0.25rem' }}>
            {totals.entitled}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', background: 'var(--color-surface-2)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Used Days
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
            {totals.used}
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', background: 'var(--color-surface-2)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Available Days
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
            {totals.available}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: '400px' }}></div>
      ) : (
        <div className="table-container card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: '1.5rem' }}>Employee</th>
                <th style={{ minWidth: '180px' }}>Leave Type</th>
                <th>Year</th>
                <th>Entitled</th>
                <th>Used</th>
                <th>Pending</th>
                <th>Available</th>
                <th style={{ minWidth: '130px' }}>Usage Progress</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => {
                const currentType =
                  selectedTypes[emp.employeeId] ||
                  (emp.types.includes(globalType) ? globalType : emp.types[0] || 'Annual Leave');
                const b = emp.balances[currentType] || emp.balances[emp.types[0]];

                if (!b) return null;

                const usedPct = b.entitled > 0 ? Math.min(100, Math.round(((b.used + b.pending) / b.entitled) * 100)) : 0;

                return (
                  <tr key={emp.employeeId} className="animate-fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                    {/* Employee cell with Avatar */}
                    <td style={{ paddingLeft: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: getAvatarColor(emp.employeeName),
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(emp.employeeName)}
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '0.9rem' }}>
                            {emp.employeeName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            ID: #{emp.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type Dropdown */}
                    <td>
                      <select
                        className="input"
                        value={currentType}
                        onChange={(e) => handleRowTypeChange(emp.employeeId, e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '170px',
                          padding: '0.35rem 2rem 0.35rem 0.65rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        {emp.types.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Year */}
                    <td style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{b.year}</td>

                    {/* Entitled */}
                    <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{b.entitled}</td>

                    {/* Used */}
                    <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{b.used}</td>

                    {/* Pending */}
                    <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{b.pending}</td>

                    {/* Available */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          background: b.available > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: b.available > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {b.available}
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: 'var(--color-border)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              borderRadius: '3px',
                              background: b.available > 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                              width: `${usedPct}%`,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, minWidth: '30px' }}>
                          {usedPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>No employees found matching "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
