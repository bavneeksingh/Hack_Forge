import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { WorkationDto, TimezonePreviewDto } from '../types';
import { useToast } from '../toast';
import { useAuth } from '../auth';

const PRESET_DESTINATIONS = [
  { city: 'New York', country: 'USA', timezone: 'America/New_York', icon: '🗽', offset: '-9.5h' },
  { city: 'San Francisco', country: 'USA', timezone: 'America/Los_Angeles', icon: '🌉', offset: '-12.5h' },
  { city: 'Chicago', country: 'USA', timezone: 'America/Chicago', icon: '🏙️', offset: '-10.5h' },
  { city: 'Austin', country: 'USA', timezone: 'America/Chicago', icon: '🤠', offset: '-10.5h' },
  { city: 'Seattle', country: 'USA', timezone: 'America/Los_Angeles', icon: '🌲', offset: '-12.5h' },
  { city: 'Miami', country: 'USA', timezone: 'America/New_York', icon: '🏖️', offset: '-9.5h' },
];

const ICONS = ['🗽', '🌉', '🏙️', '🤠', '🌲', '🏖️', '🌴', '✈️', '☕', '🎒', '💻'];

export default function NomadModePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isManager = user?.role === 'MANAGER' || user?.role === 'HR';

  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [city, setCity] = useState('New York');
  const [country, setCountry] = useState('USA');
  const [timezone, setTimezone] = useState('America/New_York');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [statusIcon, setStatusIcon] = useState('🗽');
  const [statusMessage, setStatusMessage] = useState('Taking nomad leave in New York, USA! Reachable on urgent matters.');

  // Reject comment state for managers
  const [rejectNomadId, setRejectNomadId] = useState<number | null>(null);
  const [rejectNomadComment, setRejectNomadComment] = useState('');

  // Live Timezone Preview Query
  const { data: preview } = useQuery<TimezonePreviewDto>({
    queryKey: ['timezone-preview', timezone, startDate, endDate],
    queryFn: () =>
      api
        .get<TimezonePreviewDto>('/workations/preview', {
          params: { timezone, startDate, endDate },
        })
        .then((r) => r.data),
  });

  // My Workations
  const { data: myTrips, isLoading: isLoadingMine } = useQuery<WorkationDto[]>({
    queryKey: ['my-workations'],
    queryFn: () => api.get<WorkationDto[]>('/workations/me').then((r) => r.data),
  });

  // Team Workations (Approved only)
  const { data: teamTrips, isLoading: isLoadingTeam } = useQuery<WorkationDto[]>({
    queryKey: ['team-workations'],
    queryFn: () => api.get<WorkationDto[]>('/workations/team').then((r) => r.data),
  });

  // Pending Nomad Requests for Manager/HR
  const { data: pendingNomads } = useQuery<WorkationDto[]>({
    queryKey: ['workations-pending'],
    queryFn: () => api.get<WorkationDto[]>('/workations/pending').then((r) => r.data),
    enabled: isManager,
  });

  // Active Workation for current user
  const { data: activeTrip } = useQuery<WorkationDto | null>({
    queryKey: ['active-workation'],
    queryFn: () =>
      api
        .get<WorkationDto>('/workations/active')
        .then((r) => r.data)
        .catch(() => null),
  });

  // Create Workation Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post<WorkationDto>('/workations', data),
    onSuccess: (res) => {
      if (res.data.approvalStatus === 'APPROVED') {
        toast.success(`🌴 Nomad Leave activated for ${res.data.city}, ${res.data.country}!`);
      } else {
        toast.success(`🌴 Nomad leave submitted! Awaiting Manager & HR approval before updating base team calendar.`);
      }
      queryClient.invalidateQueries({ queryKey: ['my-workations'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
      queryClient.invalidateQueries({ queryKey: ['active-workation'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['workations-pending'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit Nomad Leave');
    },
  });

  // Approve Nomad Mutation
  const approveNomadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/workations/${id}/approve`, { comment: 'Approved' }),
    onSuccess: () => {
      toast.success('Nomad leave approved! Updated on base team calendar.');
      queryClient.invalidateQueries({ queryKey: ['workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Approval failed'),
  });

  // Reject Nomad Mutation
  const rejectNomadMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/workations/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Nomad leave request rejected');
      setRejectNomadId(null);
      setRejectNomadComment('');
      queryClient.invalidateQueries({ queryKey: ['workations-pending'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Rejection failed'),
  });

  // Delete Workation Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/workations/${id}`),
    onSuccess: () => {
      toast.success('Nomad leave request removed');
      queryClient.invalidateQueries({ queryKey: ['my-workations'] });
      queryClient.invalidateQueries({ queryKey: ['team-workations'] });
      queryClient.invalidateQueries({ queryKey: ['active-workation'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove trip');
    },
  });

  const handleSelectPreset = (preset: typeof PRESET_DESTINATIONS[0]) => {
    setCity(preset.city);
    setCountry(preset.country);
    setTimezone(preset.timezone);
    setStatusIcon(preset.icon);
    setStatusMessage(`Taking nomad leave from ${preset.city}! Reachable for urgent syncs.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !country || !timezone || !startDate || !endDate) {
      toast.error('Please fill in all required destination and date fields');
      return;
    }
    createMutation.mutate({
      city,
      country,
      timezone,
      startDate,
      endDate,
      statusMessage,
      statusIcon,
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>🌴</span> Nomad Mode — International Leave Hub
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Take leave from any country across timezones. The app automatically calculates the time gap and updates the Manager & HR calendar in Base HQ (IST) time.
          </p>
        </div>

        {activeTrip && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 1rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '999px',
              fontSize: '0.8125rem',
              color: '#10b981',
              fontWeight: 700,
            }}
          >
            <span>{activeTrip.statusIcon}</span>
            <span>Active Leave in {activeTrip.city}, {activeTrip.country} ({activeTrip.timeGapDescription})</span>
          </div>
        )}
      </div>

      {/* Manager / HR Pending Approvals Panel */}
      {isManager && pendingNomads && pendingNomads.length > 0 && (
        <div
          className="card animate-fade-in"
          style={{
            marginBottom: '2rem',
            padding: '1.25rem 1.5rem',
            border: '1.5px solid var(--color-warning)',
            background: 'rgba(245, 158, 11, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-warning)' }}>⚡</span> Action Required: Team Nomad Leave Requests ({pendingNomads.length})
            </h3>
            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
              Requires Approval
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {pendingNomads.map((w) => (
              <div
                key={`nomad-req-${w.id}`}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{w.statusIcon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>{w.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        {w.city}, {w.country} (Nomad Leave)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => approveNomadMutation.mutate(w.id)}
                      disabled={approveNomadMutation.isPending}
                    >
                      {w.approvalStatus === 'PENDING_HR' ? '✓ HR Final Approve' : '✓ Forward to HR'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setRejectNomadId(w.id)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>

                {/* Stage Info */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                    {w.approvalStatus === 'PENDING_HR' ? 'STAGE 2 OF 2: AWAITING HR' : 'STAGE 1 OF 2: AWAITING MANAGER'}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                    0 PTO DEDUCTION
                  </span>
                </div>

                {/* Dual Dates & Time Gap Display */}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--color-surface-2)', padding: '0.625rem', borderRadius: '6px' }}>
                  <div>🌐 <strong>Destination Leave Dates:</strong> <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{w.localDatesDisplay || `${w.startDate} → ${w.endDate} (${w.city} Time)`}</span></div>
                  <div>🏢 <strong>Base Country (IST) Calendar Period:</strong> <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{w.teamDatesDisplay || `${w.startDate} → ${w.endDate} (Base HQ IST)`}</span></div>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>⏱️ <strong>Time Gap:</strong> {w.timeGapDescription || `${w.timeDiffHours >= 0 ? `+${w.timeDiffHours}h` : `${w.timeDiffHours}h`} vs Base HQ`}</div>
                </div>

                {w.managerApprovedByName && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontStyle: 'italic' }}>
                    ✓ Manager approved by {w.managerApprovedByName}
                  </div>
                )}

                {w.statusMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    "{w.statusMessage}"
                  </div>
                )}

                {rejectNomadId === w.id && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                    <textarea
                      className="input"
                      value={rejectNomadComment}
                      onChange={(e) => setRejectNomadComment(e.target.value)}
                      placeholder="Rejection reason..."
                      style={{ marginBottom: '0.5rem', width: '100%', minHeight: '50px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => rejectNomadMutation.mutate({ id: w.id, comment: rejectNomadComment })}
                        disabled={rejectNomadMutation.isPending}
                      >
                        Confirm Reject
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setRejectNomadId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset USA Destinations Quick Select */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🇺🇸</span> Popular USA Destinations (Quick Select)
        </h3>
        <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {PRESET_DESTINATIONS.map((preset) => {
            const isSelected = city.toLowerCase() === preset.city.toLowerCase();
            return (
              <button
                key={preset.city}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: isSelected ? '#fff' : 'var(--color-text)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  minWidth: '110px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{preset.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{preset.city}</div>
                <div style={{ fontSize: '0.6875rem', opacity: isSelected ? 0.9 : 0.6 }}>{preset.offset} vs Base IST</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Trip Planner Form & Live Time Gap Calculator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Left Column: Form */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Plan a Nomad Leave
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>Destination City</label>
                <input
                  type="text"
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Tokyo"
                  required
                />
              </div>
              <div>
                <label>Country</label>
                <input
                  type="text"
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Japan"
                  required
                />
              </div>
            </div>

            <div>
              <label>Timezone (IANA)</label>
              <input
                type="text"
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. Asia/Tokyo or Europe/London"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>Leave Start Date (Destination Time)</label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Leave End Date (Destination Time)</label>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label>Status Icon</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setStatusIcon(ic)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      background: statusIcon === ic ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      border: statusIcon === ic ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label>Leave Note for Manager & HR</label>
              <input
                type="text"
                className="input"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. Taking nomad leave from Tokyo hub! Reachable on urgent matters."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              {createMutation.isPending ? 'Submitting...' : '✦ Submit Nomad Leave Request'}
            </button>
          </form>
        </div>

        {/* Right Column: Live Timezone & Leave Gap Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 107, 122, 0.1) 0%, var(--color-surface) 100%)', border: '1px solid rgba(59, 107, 122, 0.3)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⏱️</span> Live Time Gap & Calendar Converter
            </h3>

            {preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Visual Dual Clock Card */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    background: 'var(--color-surface)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase' }}>
                      🌐 Destination ({city || 'Remote'})
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                      Full Day Leave
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{timezone}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                      🏢 Base Country HQ (IST)
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                      {preview.baseStartTime} - {preview.baseEndTime}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Asia/Kolkata (UTC+5:30)</div>
                  </div>
                </div>

                {/* Time Gap Calculation Box */}
                <div style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      Time Gap Calculation
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                      {preview.timeDiffHours >= 0 ? `+${preview.timeDiffHours}h ahead` : `${preview.timeDiffHours}h behind`}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div>🗓️ <strong>Destination Leave Window:</strong> <span style={{ color: 'var(--color-primary-light)' }}>{preview.localLeaveWindow}</span></div>
                    <div>🏢 <strong>Base Country (IST) Window:</strong> <span style={{ color: 'var(--color-accent)' }}>{preview.baseLeaveWindow}</span></div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, background: 'rgba(59, 107, 122, 0.08)', padding: '0.75rem', borderRadius: '8px' }}>
                  💬 <strong>Calendar Calculation:</strong> According to the time gap ({preview.timeGapDescription}), your leave will be represented on the Base HQ Team Calendar for Manager & HR across <strong>{preview.baseStartDate} to {preview.baseEndDate}</strong>.
                </div>
              </div>
            ) : (
              <div className="skeleton" style={{ height: '180px' }}></div>
            )}
          </div>

          {/* Quick FAQ Card */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--color-surface)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              💡 How Nomad Mode Leave Works
            </h4>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6, margin: 0 }}>
              <li><strong>2-Stage Approval:</strong> Moves from Manager review to HR review before updating the Team Calendar.</li>
              <li><strong>Time Gap Alignment:</strong> Calendar automatically converts destination time into Base HQ (IST) time for accurate team presence.</li>
              <li><strong>PTO Independent:</strong> 0 PTO deduction for approved Nomad Mode trips.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: Team Nomad Radar (Approved Workations) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🗺️</span> Team Nomad Radar ({teamTrips?.length || 0} Remote Leaves)
          </h2>
        </div>

        {isLoadingTeam ? (
          <div className="skeleton" style={{ height: '140px' }}></div>
        ) : teamTrips && teamTrips.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {teamTrips.map((t) => (
              <div
                key={t.id}
                className="card animate-fade-in"
                style={{
                  padding: '1.25rem',
                  border: t.isCurrentlyActive ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: t.isCurrentlyActive ? 'rgba(130, 209, 157, 0.05)' : 'var(--color-surface-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{t.statusIcon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                        {t.userName}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                        {t.city}, {t.country} (Nomad Leave)
                      </div>
                    </div>
                  </div>
                  {t.isCurrentlyActive ? (
                    <span className="badge badge-approved" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                      ● Active Now
                    </span>
                  ) : (
                    <span className="badge badge-pending" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                      📅 Scheduled
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
                  🌐 <strong>Destination Leave:</strong> <span style={{ color: 'var(--color-primary-light)' }}>{t.localDatesDisplay || `${t.startDate} → ${t.endDate} (${t.city} Time)`}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
                  🏢 <strong>Base Country (IST):</strong> <span style={{ color: 'var(--color-accent)' }}>{t.teamDatesDisplay || `${t.startDate} → ${t.endDate} (Base HQ IST)`}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.6rem' }}>
                  ⏱️ <strong>Time Gap:</strong> {t.timeGapDescription || `${t.timeDiffHours >= 0 ? `+${t.timeDiffHours}h` : `${t.timeDiffHours}h`} vs Base HQ`}
                </div>

                {t.statusMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', background: 'var(--color-surface)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    "{t.statusMessage}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No active or upcoming approved team nomad leaves scheduled.</p>
          </div>
        )}
      </div>

      {/* Section 3: My Workation History */}
      <div>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋</span> My Scheduled Nomad Leaves ({myTrips?.length || 0})
          </h2>
        </div>

        {isLoadingMine ? (
          <div className="skeleton" style={{ height: '140px' }}></div>
        ) : myTrips && myTrips.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {myTrips.map((trip) => (
              <div key={trip.id} className="card animate-fade-in" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{trip.statusIcon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                        {trip.city}, {trip.country}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {trip.timezone}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {trip.approvalStatus === 'APPROVED' ? (
                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                        ✓ FULLY APPROVED (HR SIGNED)
                      </span>
                    ) : trip.approvalStatus === 'PENDING_HR' ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                        ⚡ STAGE 2: AWAITING HR
                      </span>
                    ) : trip.approvalStatus === 'REJECTED' ? (
                      <span className="badge badge-rejected" style={{ fontSize: '0.7rem' }}>
                        ✗ REJECTED
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        ⏳ STAGE 1: AWAITING MANAGER
                      </span>
                    )}

                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => deleteMutation.mutate(trip.id)}
                      disabled={deleteMutation.isPending}
                      title="Cancel Nomad Leave"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Dual Dates */}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>🌐 <strong>Destination Dates:</strong> <span style={{ color: 'var(--color-primary-light)' }}>{trip.localDatesDisplay || `${trip.startDate} → ${trip.endDate} (${trip.city} Time)`}</span></div>
                  <div>🏢 <strong>Base Country (IST):</strong> <span style={{ color: 'var(--color-accent)' }}>{trip.teamDatesDisplay || `${trip.startDate} → ${trip.endDate} (Base HQ IST)`}</span></div>
                  <div>⏱️ <strong>Time Gap:</strong> {trip.timeGapDescription || `${trip.timeDiffHours >= 0 ? `+${trip.timeDiffHours}h` : `${trip.timeDiffHours}h`} vs Base HQ`}</div>
                </div>

                {/* Multi-stage Audit Trail */}
                {trip.managerApprovedByName && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '0.25rem' }}>
                    ✓ Manager ({trip.managerApprovedByName}) approved{trip.managerApprovalComment ? `: "${trip.managerApprovalComment}"` : ''}
                  </div>
                )}
                {trip.hrApprovedByName && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '0.35rem' }}>
                    ✓ HR ({trip.hrApprovedByName}) final sign-off{trip.hrApprovalComment ? `: "${trip.hrApprovalComment}"` : ''}
                  </div>
                )}
                {trip.approvalStatus === 'REJECTED' && trip.approvalComment && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '0.35rem' }}>
                    ✗ Rejection reason: "{trip.approvalComment}"
                  </div>
                )}

                {trip.statusMessage && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', background: 'var(--color-surface)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    "{trip.statusMessage}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't planned any Nomad Mode leaves yet. Use the form above to schedule your first trip!</p>
          </div>
        )}
      </div>
    </div>
  );
}
