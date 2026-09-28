import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import type { TeamCalendarDto, TeamCalendarEntry } from '../types';

/* ── Helpers ──────────────────────────────────────────────────── */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

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

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  APPROVED: { bg: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', label: 'Approved', dot: '#22c55e' },
  PENDING_MANAGER: { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706', label: 'Pending', dot: '#f59e0b' },
  PENDING_HR: { bg: 'rgba(245, 158, 11, 0.15)', color: '#d97706', label: 'Pending HR', dot: '#f59e0b' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', label: 'Rejected', dot: '#ef4444' },
  CANCELLED: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', label: 'Cancelled', dot: '#94a3b8' },
};

/* ── Component ────────────────────────────────────────────────── */
export default function TeamCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
  const lastDay = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const startDay = isCurrentMonth ? today.getDate() : 1;
  const days = Array.from({ length: lastDay - startDay + 1 }, (_, i) => startDay + i);

  const from = isCurrentMonth ? fmtDate(year, month, today.getDate()) : fmtDate(year, month, 1);
  const to = fmtDate(year, month, lastDay);
  const initialSelected = isCurrentMonth ? todayStr : fmtDate(year, month, 1);
  const [selectedDate, setSelectedDate] = useState<string>(initialSelected);

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['team-calendar', from, to],
    queryFn: () => api.get<TeamCalendarDto>('/leaves/team-calendar', { params: { from, to } }).then((r) => r.data),
  });

  const canGoPrev = !isCurrentMonth && !(year < today.getFullYear() || (year === today.getFullYear() && month <= today.getMonth()));
  const prevMonth = () => { if (!canGoPrev) return; if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const goToToday = () => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDate(todayStr); };

  const byEmployee = useMemo(() => {
    const map = new Map<string, TeamCalendarEntry[]>();
    calendar?.entries.forEach((e) => {
      const arr = map.get(e.employeeName) || [];
      arr.push(e);
      map.set(e.employeeName, arr);
    });
    return map;
  }, [calendar]);

  const getDayInfo = (ds: string) => {
    const d = new Date(ds + 'T00:00:00');
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const holiday = calendar?.holidays?.find((h) => h.date === ds);
    const awayEntries = calendar?.entries.filter((e) => ds >= e.startDate && ds <= e.endDate) || [];
    const awayCount = awayEntries.length;
    const teamSize = calendar?.teamSize || 1;
    const dayWorkload = calendar?.workloads?.find((w) => ds >= w.startDate && ds <= w.endDate);
    const threshold = dayWorkload?.threshold || calendar?.conflictThreshold || 0.4;
    let isConflict = false, isModerate = false, awayPct = 0;
    if (!isWeekend && !holiday && awayCount > 0) {
      if (teamSize > 1) {
        awayPct = awayCount / teamSize;
        isConflict = (awayCount + 1) / teamSize >= threshold;
        isModerate = !isConflict;
      } else { awayPct = 1.0; isModerate = true; }
    }
    return {
      dateStr: ds, dayNumber: d.getDate(), dayName: WEEKDAY_SHORT[d.getDay()],
      fullDateName: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      isWeekend, holiday, awayEntries, awayCount, isConflict, isModerate,
      isAvailable: !isWeekend && !holiday && awayCount === 0,
      awayPct: Math.round(awayPct * 100),
      dayWorkload,
      threshold,
    };
  };

  const activeDay = getDayInfo(selectedDate || from);

  const roleLabel = role === 'HR' ? 'HR' : role === 'MANAGER' ? 'Manager' : 'Employee';

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* ═══ Top Bar: Title + Controls ═══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Team Calendar
          </h1>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            padding: '0.2rem 0.6rem', borderRadius: '99px',
            background: role === 'HR' ? '#eff6ff' : role === 'MANAGER' ? '#faf5ff' : '#f0fdf4',
            color: role === 'HR' ? '#2563eb' : role === 'MANAGER' ? '#7c3aed' : '#16a34a',
          }}>
            {roleLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={goToToday} style={{
            padding: '0.4rem 0.9rem', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'white',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
            color: 'var(--color-text-secondary)', transition: 'all 0.2s',
          }}>
            Today
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', background: 'white',
            borderRadius: '12px', padding: '0.2rem',
            border: '1px solid var(--color-border)',
          }}>
            <button onClick={prevMonth} disabled={!canGoPrev} style={{
              width: '32px', height: '32px', borderRadius: '10px', border: 'none',
              background: 'transparent', cursor: canGoPrev ? 'pointer' : 'not-allowed',
              opacity: canGoPrev ? 1 : 0.3, fontSize: '1rem', color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <span style={{ fontWeight: 800, minWidth: '140px', textAlign: 'center', fontSize: '0.95rem' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} style={{
              width: '32px', height: '32px', borderRadius: '10px', border: 'none',
              background: 'transparent', cursor: 'pointer', fontSize: '1rem',
              color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/apply?startDate=${selectedDate}&endDate=${selectedDate}`)}
            style={{ borderRadius: '12px', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Apply Leave
          </button>
        </div>
      </div>

      {/* ═══ Day Inspector Strip ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1.25rem', borderRadius: '16px', marginBottom: '1rem',
        background: activeDay.isConflict ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
          : activeDay.holiday ? 'linear-gradient(135deg, #faf5ff, #f3e8ff)'
            : activeDay.isWeekend ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
              : activeDay.isModerate ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: `1px solid ${activeDay.isConflict ? '#fecaca' : activeDay.holiday ? '#e9d5ff'
            : activeDay.isWeekend ? '#e2e8f0' : activeDay.isModerate ? '#fde68a' : '#bbf7d0'
          }`,
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Day Badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
            background: activeDay.isConflict ? '#ef4444' : activeDay.holiday ? '#8b5cf6'
              : activeDay.isWeekend ? '#94a3b8' : activeDay.isModerate ? '#f59e0b' : '#22c55e',
            color: '#fff', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 10px ${activeDay.isConflict ? 'rgba(239,68,68,0.25)' : activeDay.holiday ? 'rgba(139,92,246,0.25)' : activeDay.isModerate ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
          }}>
            <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>{activeDay.dayName}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.1 }}>{activeDay.dayNumber}</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>{activeDay.fullDateName}</div>
              {activeDay.dayWorkload && (
                <span style={{
                  background: activeDay.dayWorkload.workloadLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : activeDay.dayWorkload.workloadLevel === 'HIGH' ? 'rgba(245, 158, 11, 0.15)' : activeDay.dayWorkload.workloadLevel === 'LOW' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: activeDay.dayWorkload.workloadLevel === 'CRITICAL' ? '#dc2626' : activeDay.dayWorkload.workloadLevel === 'HIGH' ? '#d97706' : activeDay.dayWorkload.workloadLevel === 'LOW' ? '#059669' : '#2563eb',
                  fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '99px',
                }}>
                  {activeDay.dayWorkload.workloadLevel} ({Math.round(activeDay.threshold * 100)}% Threshold)
                  {activeDay.dayWorkload.sprintName ? ` • ${activeDay.dayWorkload.sprintName}` : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--color-text-secondary)' }}>
              {activeDay.holiday ? <><b>{activeDay.holiday.name}</b> — Holiday</>
                : activeDay.isWeekend ? <>Weekend</>
                : activeDay.isConflict ? <><b style={{ color: '#dc2626' }}>Conflict</b> — {activeDay.awayCount} away ({activeDay.awayPct}% vs {Math.round(activeDay.threshold * 100)}% threshold)</>
                : activeDay.isModerate ? <><b style={{ color: '#d97706' }}>Moderate</b> — {activeDay.awayCount} away (Under {Math.round(activeDay.threshold * 100)}% threshold)</>
                : <><b style={{ color: '#16a34a' }}>Clear</b> — Full team available ({Math.round(activeDay.threshold * 100)}% Capacity)</>
              }
            </div>
          </div>
          {/* Away chips */}
          {activeDay.awayEntries.length > 0 && activeDay.awayEntries.map((e) => (
            <span key={e.leaveRequestId} onClick={() => navigate(`/requests/${e.leaveRequestId}`)} style={{
              background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(226,232,240,0.8)',
              borderRadius: '10px', padding: '0.25rem 0.6rem', fontSize: '0.7rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              cursor: 'pointer', fontWeight: 600,
            }}>
              <span style={{
                width: '18px', height: '18px', borderRadius: '6px',
                background: getAvatarColor(e.employeeName), color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.5rem', fontWeight: 700, flexShrink: 0,
              }}>{getInitials(e.employeeName)}</span>
              <b>{e.employeeName.split(' ')[0]}</b>
              <span style={{ color: 'var(--color-text-muted)' }}>{e.leaveType.split(' ')[0]}</span>
            </span>
          ))}
        </div>
        {!activeDay.isWeekend && !activeDay.holiday && (
          <button onClick={() => navigate(`/apply?startDate=${activeDay.dateStr}&endDate=${activeDay.dateStr}`)} style={{
            padding: '0.45rem 1rem', borderRadius: '12px', border: 'none',
            background: 'white', color: 'var(--color-text)', fontWeight: 700,
            fontSize: '0.775rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            whiteSpace: 'nowrap',
          }}>
            Apply for this day
          </button>
        )}
      </div>

      {/* ═══ FULL-WIDTH Team Grid ═══ */}
      <div style={{
        background: 'white', borderRadius: '20px', padding: '1rem 1.25rem',
        boxShadow: '0 2px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(226,232,240,0.5)',
        marginBottom: '1rem',
      }}>
        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
            Team Availability
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {[
              { c: '#22c55e', l: 'Available' }, { c: '#f59e0b', l: 'Moderate' },
              { c: '#ef4444', l: 'Conflict' }, { c: '#8b5cf6', l: 'Holiday' }, { c: '#94a3b8', l: 'Weekend' },
            ].map(({ c, l }) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />{l}
              </span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: '12px' }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `100px repeat(${days.length}, 1fr)`,
            fontSize: '0.7rem',
            gap: '1px',
          }}>
            {/* ─now working but some errors in TeamCalendarPage.tsx─ Day Header Row ── */}
            <div style={{ padding: '0.25rem', fontWeight: 600, fontSize: '0.6rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-end' }} />
            {days.map((d) => {
              const ds = fmtDate(year, month, d);
              const info = getDayInfo(ds);
              const isSelected = selectedDate === ds;
              const isToday = ds === todayStr;
              return (
                <div
                  key={`h-${d}`}
                  onClick={() => setSelectedDate(ds)}
                  onMouseEnter={() => setHoveredDay(ds)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    textAlign: 'center', cursor: 'pointer',
                    padding: '0.15rem 0',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--color-primary)' : isToday ? 'rgba(130,209,157,0.12)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'var(--color-primary-dark)' : info.isWeekend ? '#b0b8c4' : 'var(--color-text)',
                    fontWeight: isSelected || isToday ? 800 : 600,
                    border: isToday && !isSelected ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  title={info.holiday ? info.holiday.name : ds}
                >
                  <div style={{ fontSize: '0.5rem', opacity: 0.65, lineHeight: 1 }}>{info.dayName.slice(0, 2)}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.3 }}>{d}</div>
                </div>
              );
            })}

            {/* ── Status Row ── */}
            <div style={{ padding: '0.2rem 0.25rem', fontSize: '0.55rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Status
            </div>
            {days.map((d) => {
              const ds = fmtDate(year, month, d);
              const info = getDayInfo(ds);
              const isSelected = selectedDate === ds;
              let bg: string, clr: string, icon: string;
              if (info.holiday) { bg = 'rgba(139,92,246,0.18)'; clr = '#8b5cf6'; icon = 'H'; }
              else if (info.isWeekend) { bg = 'rgba(148,163,184,0.08)'; clr = '#b0b8c4'; icon = '·'; }
              else if (info.isConflict) { bg = 'rgba(239,68,68,0.18)'; clr = '#ef4444'; icon = '!'; }
              else if (info.isModerate) { bg = 'rgba(245,158,11,0.18)'; clr = '#f59e0b'; icon = '·'; }
              else { bg = 'rgba(34,197,94,0.15)'; clr = '#22c55e'; icon = '•'; }
              return (
                <div key={`s-${d}`} onClick={() => setSelectedDate(ds)} style={{
                  height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '5px', background: bg, color: clr,
                  fontWeight: 800, fontSize: '0.6rem', cursor: 'pointer',
                  outline: isSelected ? `2px solid ${clr}` : 'none', outlineOffset: '1px',
                  transition: 'all 0.15s',
                }}>
                  {icon}
                </div>
              );
            })}

            {/* ── Divider ── */}
            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'var(--color-border)', margin: '0.35rem 0', opacity: 0.4 }} />

            {/* ── Team Rows ── */}
            {[...byEmployee.entries()].map(([name, entries]) => (
              <div key={name} style={{ display: 'contents' }}
                onMouseEnter={() => setHoveredRow(name)} onMouseLeave={() => setHoveredRow(null)}>
                {/* Name cell */}
                <div style={{
                  padding: '0.25rem 0.35rem', fontWeight: 600, fontSize: '0.7rem',
                  color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis', display: 'flex', alignItems: 'center',
                  gap: '0.3rem',
                  background: hoveredRow === name ? 'rgba(99,102,241,0.03)' : 'transparent',
                  borderRadius: '8px',
                }} title={name}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '7px', flexShrink: 0,
                    background: getAvatarColor(name), color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 700,
                  }}>{getInitials(name)}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                </div>

                {/* Day cells */}
                {days.map((d) => {
                  const ds = fmtDate(year, month, d);
                  const isSelected = selectedDate === ds;
                  const date = new Date(year, month, d);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const entry = entries.find((e) => ds >= e.startDate && ds <= e.endDate);
                  const holiday = calendar?.holidays?.find((h) => h.date === ds);
                  const sc = entry ? (STATUS_CONFIG[entry.status] || STATUS_CONFIG.APPROVED) : null;
                  const isStart = entry && ds === entry.startDate;
                  const isEnd = entry && ds === entry.endDate;

                  return (
                    <div
                      key={`${name}-${d}`}
                      onClick={() => { setSelectedDate(ds); if (entry) navigate(`/requests/${entry.leaveRequestId}`); }}
                      onMouseEnter={() => setHoveredDay(ds)}
                      onMouseLeave={() => setHoveredDay(null)}
                      style={{
                        height: '24px', margin: '1px 0',
                        background: entry ? sc?.bg
                          : hoveredDay === ds || hoveredRow === name ? 'rgba(99,102,241,0.03)'
                            : holiday ? 'rgba(139,92,246,0.04)'
                              : isWeekend ? 'rgba(148,163,184,0.03)' : 'transparent',
                        borderRadius: entry
                          ? isStart && isEnd ? '8px' : isStart ? '8px 0 0 8px' : isEnd ? '0 8px 8px 0' : '0'
                          : '4px',
                        cursor: entry ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.55rem', fontWeight: 700, color: sc?.color || 'inherit',
                        borderLeft: isStart ? `2.5px solid ${sc?.dot}` : 'none',
                        outline: isSelected ? '1.5px solid rgba(99,102,241,0.3)' : 'none',
                        transition: 'background 0.12s',
                      }}
                      title={entry ? `${name}: ${entry.leaveType} (${sc?.label}) ${entry.startDate} → ${entry.endDate}` : holiday ? `Holiday: ${holiday.name}` : `${name} available`}
                    >
                      {isStart && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 1px' }}>{entry?.leaveType.split(' ')[0]}</span>}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Empty */}
            {byEmployee.size === 0 && !isLoading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>No team leave data for this period</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Bottom Cards Row: Holidays + Stats + Tips ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {/* Holidays */}
        <div style={{
          background: 'white', borderRadius: '18px', padding: '1.15rem 1.25rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.025)', border: '1px solid rgba(226,232,240,0.5)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Holidays in {MONTH_NAMES[month]}
          </h3>
          {calendar?.holidays && calendar.holidays.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {calendar.holidays.map((h) => (
                <div key={h.date} onClick={() => setSelectedDate(h.date)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.45rem 0.65rem', background: 'rgba(139,92,246,0.06)',
                  borderRadius: '10px', fontSize: '0.775rem', cursor: 'pointer',
                  border: '1px solid rgba(139,92,246,0.08)',
                }}>
                  <span style={{ fontWeight: 600 }}>{h.name}</span>
                  <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.7rem', background: 'rgba(139,92,246,0.1)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                    {h.date.split('-').reverse().join('/')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: 0 }}>No holidays this month</p>
          )}
        </div>

        {/* Team Stats - Manager/HR only */}
        {(role === 'MANAGER' || role === 'HR') && (
          <div style={{
            background: 'white', borderRadius: '18px', padding: '1.15rem 1.25rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.025)', border: '1px solid rgba(226,232,240,0.5)',
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {role === 'HR' ? 'Org' : 'Team'} Snapshot
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {[
                { v: calendar?.teamSize || 0, l: 'Team Size', c: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
                { v: activeDay.awayCount, l: 'Away Now', c: '#d97706', bg: 'rgba(245,158,11,0.08)' },
                { v: `${Math.round((calendar?.conflictThreshold || 0.4) * 100)}%`, l: 'Threshold', c: '#4f46e5', bg: 'rgba(99,102,241,0.08)' },
                { v: calendar?.holidays?.length || 0, l: 'Holidays', c: '#7c3aed', bg: 'rgba(139,92,246,0.08)' },
              ].map(({ v, l, c, bg }) => (
                <div key={l} style={{ background: bg, borderRadius: '12px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: '18px', padding: '1.15rem 1.25rem',
          border: '1px solid rgba(130,209,157,0.2)',
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.65rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Quick Tips
          </h3>
          <div style={{ fontSize: '0.775rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <span>•</span> <span>Click any <b>green</b> day for conflict-free leave</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <span>•</span> <span>Red indicates high overlap against dynamic threshold</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span>•</span> <span>Click a leave bar to see the full request details</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
