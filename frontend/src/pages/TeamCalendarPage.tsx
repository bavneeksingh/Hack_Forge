import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import type { TeamCalendarDto, TeamCalendarEntry } from '../types';

export default function TeamCalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const { data: calendar } = useQuery({
    queryKey: ['team-calendar', from, to],
    queryFn: () => api.get<TeamCalendarDto>('/manager/team-calendar', { params: { from, to } }).then((r) => r.data),
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Group entries by employee
  const byEmployee = new Map<string, TeamCalendarEntry[]>();
  calendar?.entries.forEach((e) => {
    const arr = byEmployee.get(e.employeeName) || [];
    arr.push(e);
    byEmployee.set(e.employeeName, arr);
  });

  const statusColors: Record<string, string> = {
    APPROVED: 'rgba(16, 185, 129, 0.3)',
    PENDING_MANAGER: 'rgba(245, 158, 11, 0.3)',
    PENDING_HR: 'rgba(245, 158, 11, 0.2)',
  };

  // Generate days array
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Team Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◂</button>
          <span style={{ fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▸</button>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${lastDay}, 1fr)`, gap: '1px', fontSize: '0.6875rem' }}>
          {/* Header row */}
          <div style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Employee</div>
          {days.map((d) => {
            const date = new Date(year, month, d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <div key={d} style={{
                padding: '0.25rem', textAlign: 'center', fontWeight: 600,
                color: isWeekend ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                opacity: isWeekend ? 0.5 : 1,
              }}>
                {d}
              </div>
            );
          })}

          {/* Employee rows */}
          {[...byEmployee.entries()].map(([name, entries]) => (
            <>
              <div key={name} style={{ padding: '0.5rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </div>
              {days.map((d) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const date = new Date(year, month, d);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const entry = entries.find((e) => dateStr >= e.startDate && dateStr <= e.endDate);
                return (
                  <div
                    key={d}
                    style={{
                      height: '28px',
                      background: entry ? (statusColors[entry.status] || 'rgba(100,116,139,0.2)') : isWeekend ? 'rgba(100,116,139,0.05)' : 'transparent',
                      borderRadius: '3px',
                      transition: 'background 0.2s ease',
                    }}
                    title={entry ? `${entry.leaveType} (${entry.status})` : ''}
                  />
                );
              })}
            </>
          ))}
        </div>

        {byEmployee.size === 0 && (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>No team leave entries for this month.</p>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16,185,129,0.3)' }}></span> Approved
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245,158,11,0.3)' }}></span> Pending
          </span>
        </div>
      </div>
    </div>
  );
}
