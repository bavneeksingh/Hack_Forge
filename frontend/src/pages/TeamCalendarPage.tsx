import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import type { TeamCalendarDto, TeamCalendarEntry } from '../types';

export default function TeamCalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const lastDay = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const startDay = isCurrentMonth ? today.getDate() : 1;
  const days = Array.from({ length: lastDay - startDay + 1 }, (_, i) => startDay + i);

  const from = isCurrentMonth
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  // Default selected date to today if in current month/year, else the 1st
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const initialSelected = isCurrentMonth ? todayStr : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const [selectedDate, setSelectedDate] = useState<string>(initialSelected);

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['team-calendar', from, to],
    queryFn: () => api.get<TeamCalendarDto>('/leaves/team-calendar', { params: { from, to } }).then((r) => r.data),
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Teammates map
  const byEmployee = new Map<string, TeamCalendarEntry[]>();

  calendar?.entries.forEach((e) => {
    const arr = byEmployee.get(e.employeeName) || [];
    arr.push(e);
    byEmployee.set(e.employeeName, arr);
  });

  const canGoPrev = !isCurrentMonth && !(year < today.getFullYear() || (year === today.getFullYear() && month <= today.getMonth()));

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setSelectedDate(todayStr);
  };

  // Helper to get day analysis
  const getDayInfo = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const holiday = calendar?.holidays?.find((h) => h.date === dateStr);
    const awayEntries = calendar?.entries.filter(
      (e) => dateStr >= e.startDate && dateStr <= e.endDate
    ) || [];

    const awayCount = awayEntries.length;
    const teamSize = calendar?.teamSize || 1;
    const threshold = calendar?.conflictThreshold || 0.4;

    // Only flag conflict when there are actually people away AND prospective absence exceeds threshold.
    let isConflict = false;
    let isModerate = false;
    let awayPct = 0;

    if (!isWeekend && !holiday) {
      if (awayCount > 0) {
        if (teamSize > 1) {
          // If 1 or more teammates are away, check if current user taking leave exceeds capacity
          const prospectiveAwayPct = (awayCount + 1) / teamSize;
          awayPct = awayCount / teamSize;
          isConflict = prospectiveAwayPct >= threshold;
          isModerate = !isConflict;
        } else {
          awayPct = 1.0;
          isModerate = true;
        }
      } else {
        // Zero teammates away -> full capacity, 100% available, never a conflict
        awayPct = 0;
        isConflict = false;
        isModerate = false;
      }
    }

    const isAvailable = !isWeekend && !holiday && awayCount === 0;

    return {
      dateStr,
      dayNumber: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      fullDateName: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      isWeekend,
      holiday,
      awayEntries,
      awayCount,
      isConflict,
      isModerate,
      isAvailable,
      awayPct: Math.round(awayPct * 100),
    };
  };

  const activeDay = getDayInfo(selectedDate || from);

  // Status badge colors
  const statusColors: Record<string, string> = {
    APPROVED: '#10b981',
    PENDING_MANAGER: '#f59e0b',
    PENDING_HR: '#f59e0b',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>▦</span> Team Calendar & Leave Availability
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Check team presence, public holidays, and live conflict forecast before submitting your leave.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={goToToday} style={{ border: '1px solid var(--color-border)' }}>
            Today
          </button>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.25rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={prevMonth}
              disabled={!canGoPrev}
              style={{ padding: '0.25rem 0.5rem', opacity: canGoPrev ? 1 : 0.35, cursor: canGoPrev ? 'pointer' : 'not-allowed' }}
              title={canGoPrev ? 'Previous month' : 'Cannot view past months'}
            >
              ◂
            </button>
            <span style={{ fontWeight: 700, minWidth: '150px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--color-text)' }}>
              {monthNames[month]} {year}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth} style={{ padding: '0.25rem 0.5rem' }}>▸</button>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/apply?startDate=${selectedDate}&endDate=${selectedDate}`)}
          >
            ✦ Apply for Leave
          </button>
        </div>
      </div>

      {/* Interactive Day Inspector & Availability Forecast Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          background: activeDay.isConflict
            ? 'rgba(239, 68, 68, 0.08)'
            : activeDay.holiday
            ? 'rgba(139, 92, 246, 0.08)'
            : activeDay.isWeekend
            ? 'var(--color-surface-2)'
            : 'rgba(16, 185, 129, 0.08)',
          border: activeDay.isConflict
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : activeDay.holiday
            ? '1px solid rgba(139, 92, 246, 0.4)'
            : activeDay.isWeekend
            ? '1px solid var(--color-border)'
            : '1px solid rgba(16, 185, 129, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {activeDay.fullDateName}
              </span>

              {/* Status Pill */}
              {activeDay.holiday && (
                <span style={{ background: '#8b5cf6', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  🏖️ Public Holiday
                </span>
              )}
              {activeDay.isWeekend && (
                <span style={{ background: '#64748b', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  ☕ Weekend
                </span>
              )}
              {!activeDay.isWeekend && !activeDay.holiday && (
                activeDay.isConflict ? (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                    ⚠ Overlap Conflict ({activeDay.awayPct}% Team Away)
                  </span>
                ) : activeDay.isModerate ? (
                  <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                    ⚡ Moderate Absence ({activeDay.awayEntries.length} Away)
                  </span>
                ) : (
                  <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                    ✓ 100% Team Available
                  </span>
                )
              )}
            </div>

            {/* Verdict Explanation */}
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {activeDay.holiday ? (
                <>
                  Official holiday for <strong>{activeDay.holiday.name}</strong>. No working days are deducted from your balance.
                </>
              ) : activeDay.isWeekend ? (
                <>Saturday/Sunday — Regular company weekend rest day.</>
              ) : activeDay.isConflict ? (
                <>
                  <strong style={{ color: '#ef4444' }}>Can you take leave?</strong> Yes, but an <strong>overlap conflict</strong> will be flagged to your manager because {activeDay.awayEntries.map((e) => e.employeeName).join(' and ')} {activeDay.awayEntries.length > 1 ? 'are' : 'is'} already taking leave.
                </>
              ) : activeDay.isModerate ? (
                <>
                  <strong style={{ color: '#f59e0b' }}>Can you take leave?</strong> Yes. {activeDay.awayEntries[0]?.employeeName} is on leave, but team capacity remains within the allowed 40% threshold.
                </>
              ) : (
                <>
                  <strong style={{ color: '#10b981' }}>Can you take leave?</strong> Yes! Great day to apply. Full team is available with zero conflicts expected.
                </>
              )}
            </p>

            {/* Teammates away details */}
            {activeDay.awayEntries.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Teammates Away:</span>
                {activeDay.awayEntries.map((e) => (
                  <span
                    key={e.leaveRequestId}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[e.status] || '#10b981' }}></span>
                    <strong>{e.employeeName}</strong> ({e.leaveType} • {e.status})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Apply Button */}
          {!activeDay.isWeekend && !activeDay.holiday && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/apply?startDate=${activeDay.dateStr}&endDate=${activeDay.dateStr}`)}
              style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
            >
              ✦ Apply for {activeDay.dateStr}
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="card" style={{ padding: '1.25rem', overflowX: 'auto', marginBottom: '2rem' }}>
        {/* Availability Legend Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Schedule & Availability Matrix
          </h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span> Moderate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> High Conflict
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></span> Public Holiday
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }}></span> Weekend
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `150px repeat(${days.length}, minmax(36px, 1fr))`,
              gap: '2px',
              fontSize: '0.75rem',
            }}
          >
            {/* 1. Header Day Number Row */}
            <div style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>Date</div>
            {days.map((d) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayInfo = getDayInfo(dateStr);
              const isSelected = selectedDate === dateStr;
              return (
                <div
                  key={d}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    padding: '0.35rem 0.15rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-primary)' : dayInfo.isWeekend ? 'rgba(100, 116, 139, 0.08)' : 'transparent',
                    color: isSelected ? '#fff' : dayInfo.isWeekend ? 'var(--color-text-muted)' : 'var(--color-text)',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  title={dayInfo.holiday ? dayInfo.holiday.name : dateStr}
                >
                  <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>{dayInfo.dayName.slice(0, 2)}</div>
                  <div style={{ fontSize: '0.8125rem' }}>{d}</div>
                </div>
              );
            })}

            {/* 2. "Can I Take Leave?" Status Row */}
            <div style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
              <span>Availability</span>
            </div>
            {days.map((d) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const info = getDayInfo(dateStr);
              const isSelected = selectedDate === dateStr;

              let bg = 'rgba(16, 185, 129, 0.2)';
              let color = '#10b981';
              let icon = '✓';
              let tip = '100% Available — Great day for leave';

              if (info.holiday) {
                bg = 'rgba(139, 92, 246, 0.25)';
                color = '#8b5cf6';
                icon = '🏖️';
                tip = `Holiday: ${info.holiday.name}`;
              } else if (info.isWeekend) {
                bg = 'rgba(100, 116, 139, 0.1)';
                color = '#94a3b8';
                icon = '•';
                tip = 'Weekend';
              } else if (info.isConflict) {
                bg = 'rgba(239, 68, 68, 0.3)';
                color = '#ef4444';
                icon = '⚠';
                tip = `High Conflict: ${info.awayCount} teammate(s) away`;
              } else if (info.isModerate) {
                bg = 'rgba(245, 158, 11, 0.25)';
                color = '#f59e0b';
                icon = '!';
                tip = `1 teammate away`;
              }

              return (
                <div
                  key={`status-${d}`}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    background: bg,
                    color: color,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                  title={`${dateStr}: ${tip}`}
                >
                  {icon}
                </div>
              );
            })}

            {/* Divider */}
            <div style={{ gridColumn: `1 / -1`, height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }}></div>

            {/* 3. Team Member Rows */}
            {[...byEmployee.entries()].map(([name, entries]) => (
              <div key={name} style={{ display: 'contents' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  title={name}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0)}
                  </span>
                  <span>{name}</span>
                </div>

                {days.map((d) => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const date = new Date(year, month, d);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const entry = entries.find((e) => dateStr >= e.startDate && dateStr <= e.endDate);
                  const holiday = calendar?.holidays?.find((h) => h.date === dateStr);

                  return (
                    <div
                      key={`${name}-${d}`}
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        height: '32px',
                        background: entry
                          ? entry.status === 'APPROVED'
                            ? 'rgba(16, 185, 129, 0.4)'
                            : 'rgba(245, 158, 11, 0.4)'
                          : holiday
                          ? 'rgba(139, 92, 246, 0.08)'
                          : isWeekend
                          ? 'rgba(100, 116, 139, 0.05)'
                          : isSelected
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'transparent',
                        borderRadius: '4px',
                        margin: '1px 0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: entry?.status === 'APPROVED' ? '#047857' : entry ? '#b45309' : 'inherit',
                        borderLeft: entry && dateStr === entry.startDate ? `3px solid ${statusColors[entry.status]}` : 'none',
                        outline: isSelected ? '1px solid rgba(99, 102, 241, 0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={
                        entry
                          ? `${name}: ${entry.leaveType} (${entry.status}) from ${entry.startDate} to ${entry.endDate}`
                          : holiday
                          ? `Holiday: ${holiday.name}`
                          : `${name} working on ${dateStr}`
                      }
                    >
                      {entry && dateStr === entry.startDate && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                          {entry.leaveType.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public Holidays & Long Weekend Planner in Current Month */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏖️</span> Public Holidays in {monthNames[month]} {year}
          </h3>
          {calendar?.holidays && calendar.holidays.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {calendar.holidays.map((h) => (
                <div
                  key={h.date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{h.name}</span>
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{h.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
              No public holidays scheduled in {monthNames[month]}.
            </p>
          )}
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💡</span> Pro-Tip for Applying
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Click on any day with a green checkmark (<strong>✓</strong>) to pre-populate your leave request with zero conflicts.
            Avoid overlapping days marked with a red warning (<strong>⚠</strong>) to ensure fast, hassle-free manager approval.
          </p>
        </div>
      </div>
    </div>
  );
}
