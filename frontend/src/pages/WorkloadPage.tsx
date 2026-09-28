import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { WeeklyWorkloadDto, SaveWorkloadRequest } from '../types';
import { useToast } from '../toast';

export default function WorkloadPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workloadLevel, setWorkloadLevel] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [workloadScore, setWorkloadScore] = useState(80);
  const [threshold, setThreshold] = useState(0.60);
  const [sprintName, setSprintName] = useState('');
  const [notes, setNotes] = useState('');

  const { data: workloads, isLoading } = useQuery({
    queryKey: ['manager-workloads'],
    queryFn: () => api.get<WeeklyWorkloadDto[]>('/manager/workloads').then((r) => r.data),
  });

  const levelConfigs: Record<string, { label: string; defaultThreshold: number; defaultScore: number; color: string; bg: string; desc: string }> = {
    LOW: {
      label: 'Low Workload',
      defaultThreshold: 0.25,
      defaultScore: 25,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      desc: 'Relaxed period, maintenance or exploration. High availability for leaves.',
    },
    NORMAL: {
      label: 'Normal Workload',
      defaultThreshold: 0.40,
      defaultScore: 50,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      desc: 'Standard sprint cadence. Default team base threshold applies.',
    },
    HIGH: {
      label: 'High Workload',
      defaultThreshold: 0.60,
      defaultScore: 80,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      desc: 'Heavy deliverables or sprint release. Threshold automatically increases to 60%.',
    },
    CRITICAL: {
      label: 'Critical Surge',
      defaultThreshold: 0.75,
      defaultScore: 95,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      desc: 'Production launches or compliance audits. Threshold scales to 75% for strict coverage.',
    },
  };

  const handleLevelChange = (lvl: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL') => {
    setWorkloadLevel(lvl);
    setThreshold(levelConfigs[lvl].defaultThreshold);
    setWorkloadScore(levelConfigs[lvl].defaultScore);
  };

  const setPresetWeek = (offsetWeeks: number) => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff + offsetWeeks * 7));
    const sunday = new Date(today.setDate(monday.getDate() + 6));

    const toIso = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(toIso(monday));
    setEndDate(toIso(sunday));
  };

  const openNewModal = () => {
    setEditingId(null);
    setPresetWeek(0);
    setWorkloadLevel('HIGH');
    setThreshold(0.60);
    setWorkloadScore(80);
    setSprintName('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (w: WeeklyWorkloadDto) => {
    setEditingId(w.id);
    setStartDate(w.startDate);
    setEndDate(w.endDate);
    setWorkloadLevel(w.workloadLevel);
    setThreshold(w.threshold);
    setWorkloadScore(w.workloadScore);
    setSprintName(w.sprintName || '');
    setNotes(w.notes || '');
    setShowModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: (req: SaveWorkloadRequest) => api.post('/manager/workloads', req),
    onSuccess: () => {
      toast.success(editingId ? 'Workload updated successfully' : 'Weekly workload scheduled');
      queryClient.invalidateQueries({ queryKey: ['manager-workloads'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
      setShowModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save workload');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/manager/workloads/${id}`),
    onSuccess: () => {
      toast.success('Weekly workload removed');
      queryClient.invalidateQueries({ queryKey: ['manager-workloads'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete workload');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    saveMutation.mutate({
      startDate,
      endDate,
      workloadLevel,
      workloadScore,
      threshold,
      sprintName: sprintName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Weekly Workload & Adaptive Thresholds
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure weekly sprint demands. When workload is high, conflict thresholds automatically scale to safeguard team delivery.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNewModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Schedule Week Workload
        </button>
      </div>

      {/* Adaptive Threshold Levels Guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {Object.entries(levelConfigs).map(([key, cfg]) => (
          <div
            key={key}
            className="card animate-fade-in"
            style={{
              padding: '1.25rem',
              borderLeft: `4px solid ${cfg.color}`,
              background: 'var(--color-surface-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                {cfg.label}
              </div>
              <span
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                }}
              >
                {Math.round(cfg.defaultThreshold * 100)}% Threshold
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {cfg.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Workload Schedules List */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Scheduled Weekly Workloads
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {workloads?.length || 0} configured week{workloads?.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: '240px' }}></div>
        ) : workloads && workloads.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {workloads.map((w) => {
              const cfg = levelConfigs[w.workloadLevel] || levelConfigs.NORMAL;
              return (
                <div
                  key={w.id}
                  className="card"
                  style={{
                    padding: '1.1rem 1.25rem',
                    background: 'var(--color-surface)',
                    border: `1px solid var(--color-border)`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                          {w.sprintName || 'Scheduled Week'}
                        </span>
                        <span
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                          }}
                        >
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          • {w.teamName}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>{w.startDate} → {w.endDate}</span>
                        <span>|</span>
                        <span>Intensity: <strong>{w.workloadScore}%</strong></span>
                        <span>|</span>
                        <span>Dynamic Conflict Threshold: <strong style={{ color: cfg.color }}>{Math.round(w.threshold * 100)}%</strong></span>
                      </div>

                      {w.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.35rem' }}>
                          "{w.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(w)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => {
                        if (window.confirm(`Delete workload for week ${w.startDate}?`)) {
                          deleteMutation.mutate(w.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
            <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>No weekly workloads scheduled yet</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1rem' }}>
              Add a workload schedule for upcoming sprint releases so the conflict threshold automatically adapts.
            </p>
            <button className="btn btn-primary btn-sm" onClick={openNewModal}>
              Schedule First Week
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '1.75rem',
              background: 'var(--color-surface-2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                {editingId ? 'Edit Weekly Workload' : 'Schedule Weekly Workload'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Quick week shortcuts */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--color-text)' }}>
                  Quick Week Presets
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresetWeek(0)}>This Week</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresetWeek(1)}>Next Week</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresetWeek(2)}>In 2 Weeks</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPresetWeek(3)}>In 3 Weeks</button>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block', color: 'var(--color-text)' }}>
                    Start Date (Monday)
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block', color: 'var(--color-text)' }}>
                    End Date (Sunday)
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Workload Level Selector */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--color-text)' }}>
                  Workload Level & Automatic Threshold
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const).map((lvl) => {
                    const cfg = levelConfigs[lvl];
                    const isSelected = workloadLevel === lvl;
                    return (
                      <div
                        key={lvl}
                        onClick={() => handleLevelChange(lvl)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '12px',
                          border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--color-border)',
                          background: isSelected ? cfg.bg : 'var(--color-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg.color }}>
                            {Math.round(cfg.defaultThreshold * 100)}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          Intensity: {cfg.defaultScore}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Threshold Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Effective Conflict Threshold
                  </label>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: levelConfigs[workloadLevel].color }}>
                    {Math.round(threshold * 100)}% (Max {Math.round(threshold * 100)}% team away at once)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: levelConfigs[workloadLevel].color }}
                />
              </div>

              {/* Sprint / Milestone Name */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block', color: 'var(--color-text)' }}>
                  Sprint or Milestone Name (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Sprint 24: Core Payment Launch"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                />
              </div>

              {/* Manager Notes */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', display: 'block', color: 'var(--color-text)' }}>
                  Manager Notes (Optional)
                </label>
                <textarea
                  className="input"
                  placeholder="e.g. Critical release week. Coverage required for deployment and QA standby."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ minHeight: '60px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Workload' : 'Save Workload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
