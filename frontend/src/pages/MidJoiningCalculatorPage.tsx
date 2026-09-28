import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import type {
  MidJoiningPreviewResponse,
  UserAdjustmentDto,
  BatchRecalibrateResponse,
} from '../types';

export default function MidJoiningCalculatorPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isHr = user?.role === 'HR';
  const isManager = user?.role === 'MANAGER' || isHr;

  // Active view: 'adjust' | 'recalibrate'
  const [activeTab, setActiveTab] = useState<'adjust' | 'recalibrate'>('adjust');

  // Filter & Search states
  const [calcYear, setCalcYear] = useState<number>(2026);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'MANAGER' | 'HR'>('ALL');
  const [onlyMidYearJoiners, setOnlyMidYearJoiners] = useState(false);

  // Form states for the selected member
  const [customJoinDate, setCustomJoinDate] = useState<string>('');
  const [customEntitlements, setCustomEntitlements] = useState<Record<number, number>>({});

  // Recalibrate Tab state (HR only)
  const [recalibrateYear, setRecalibrateYear] = useState<number>(2026);

  // ── Queries ──────────────────────────────────────────────────────────

  // 1. Organization members query
  const { data: orgUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['calculator-users', calcYear],
    queryFn: () =>
      api
        .get<UserAdjustmentDto[]>('/calculator/users', {
          params: { year: calcYear },
        })
        .then((r) => r.data),
  });

  // Selected user
  const selectedUser =
    orgUsers?.find((u) => u.id === selectedUserId) ||
    (orgUsers && orgUsers.length > 0 ? orgUsers[0] : null);

  // Initialize selected member on first load
  useEffect(() => {
    if (!selectedUserId && orgUsers && orgUsers.length > 0) {
      handleSelectUser(orgUsers[0]);
    }
  }, [orgUsers, selectedUserId]);

  // 2. Real-time preview calculation for the selected member's join date
  const activeDate = customJoinDate || selectedUser?.joinDate || `${calcYear}-01-01`;
  const { data: datePreview, isLoading: previewLoading } = useQuery({
    queryKey: ['date-preview', activeDate, calcYear],
    queryFn: () =>
      api
        .get<MidJoiningPreviewResponse>('/calculator/preview', {
          params: { joinDate: activeDate, year: calcYear },
        })
        .then((r) => r.data),
    enabled: !!activeDate,
  });

  // When a user is selected, sync form inputs
  const handleSelectUser = (u: UserAdjustmentDto) => {
    setSelectedUserId(u.id);
    setCustomJoinDate(u.joinDate);
    const initialEntitlements: Record<number, number> = {};
    u.calculatedEntitlements.forEach((c) => {
      initialEntitlements[c.leaveTypeId] = c.proRatedEntitlement;
    });
    setCustomEntitlements(initialEntitlements);
  };

  // When user changes date, update calculated entitlements automatically
  const handleDateChange = (newDate: string) => {
    setCustomJoinDate(newDate);
  };

  // Whenever the preview for activeDate finishes loading, update customEntitlements with calculated values
  const applyCalculatedEntitlementsForDate = () => {
    if (!datePreview) return;
    const updated: Record<number, number> = {};
    datePreview.calculations.forEach((c) => {
      updated[c.leaveTypeId] = c.proRatedEntitlement;
    });
    setCustomEntitlements(updated);
    toast.success(`Applied calculated pro-rated entitlements for ${activeDate}`);
  };

  // ── Mutations ────────────────────────────────────────────────────────

  // Adjust balance mutation (Push to balance)
  const pushMutation = useMutation({
    mutationFn: (payload: {
      userId: number;
      joinDate: string;
      year: number;
      leaveTypeEntitlements: Record<number, number>;
    }) => api.post<UserAdjustmentDto>('/calculator/push-balance', payload).then((r) => r.data),
    onSuccess: (updatedUser) => {
      toast.success(`Leave balances successfully pushed and updated for ${updatedUser.name}!`);
      queryClient.invalidateQueries({ queryKey: ['calculator-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-balances'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to push balance adjustment');
    },
  });

  // Batch recalibrate mutation (HR only)
  const recalibrateMutation = useMutation({
    mutationFn: (year: number) =>
      api.post<BatchRecalibrateResponse>('/calculator/recalibrate-all', null, { params: { year } }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || `Successfully pushed mid-joining leaves for ${data.year}!`);
      queryClient.invalidateQueries({ queryKey: ['calculator-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-balances'] });
      queryClient.invalidateQueries({ queryKey: ['my-balance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to recalibrate mid-joining leaves');
    },
  });

  // Filtered org users
  const filteredUsers = orgUsers?.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.teamName.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesMidYear = !onlyMidYearJoiners || u.joinedInTargetYear;
    return matchesSearch && matchesRole && matchesMidYear;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">
            Adjust Member Balances
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Adjust and push pro-rated leave entitlements for Employees, Managers, and HR according to their joining date.
          </p>
        </div>

        {/* View Switchers */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#FFFFFF', padding: '0.35rem', borderRadius: '99px', border: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('adjust')}
            className={`btn ${activeTab === 'adjust' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '99px', padding: '0.45rem 1.25rem', fontSize: '0.875rem' }}
          >
            Adjust Member Balances
          </button>
          {isHr && (
            <button
              onClick={() => setActiveTab('recalibrate')}
              className={`btn ${activeTab === 'recalibrate' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '99px', padding: '0.45rem 1.25rem', fontSize: '0.875rem' }}
            >
              Org Recalibration
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION: ADJUST MEMBER BALANCES ACCORDING TO DATE             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'adjust' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 370px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Member Directory & Filters */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Organization Members</h3>
              <select
                className="input"
                value={calcYear}
                onChange={(e) => setCalcYear(Number(e.target.value))}
                style={{ width: '100px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Select a member to adjust their balance according to their joining date.
            </p>

            {/* Role Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {(['ALL', 'EMPLOYEE', 'MANAGER', 'HR'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '99px', border: '1px solid var(--color-border)' }}
                >
                  {r === 'ALL' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              className="input"
              placeholder="Search by name, email, team..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ width: '100%', marginBottom: '0.75rem' }}
            />

            {/* Checkbox for mid-year joiners */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyMidYearJoiners}
                onChange={(e) => setOnlyMidYearJoiners(e.target.checked)}
              />
              Show only mid-year joiners ({calcYear})
            </label>

            {/* Members List */}
            {usersLoading ? (
              <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {filteredUsers?.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '16px',
                        background: isSelected ? 'var(--color-surface-3)' : '#FFFFFF',
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.925rem' }}>
                          {u.name}
                        </div>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background:
                              u.role === 'HR'
                                ? 'rgba(246, 184, 96, 0.2)'
                                : u.role === 'MANAGER'
                                ? 'rgba(59, 107, 122, 0.2)'
                                : 'rgba(130, 209, 157, 0.2)',
                            color:
                              u.role === 'HR'
                                ? '#b45309'
                                : u.role === 'MANAGER'
                                ? '#3B6B7A'
                                : '#2e7d32',
                          }}
                        >
                          {u.role}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        {u.teamName} • Joined: <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{u.joinDate}</span>
                      </div>

                      {u.joinedInTargetYear && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: 'var(--color-warning)',
                              background: 'rgba(246, 184, 96, 0.15)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '99px',
                            }}
                          >
                            Mid-Year Joiner
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredUsers?.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No members found matching filters.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Member Inspector & Adjustment According to Date */}
          {selectedUser ? (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Member Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.4rem',
                    }}
                  >
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedUser.name}</h2>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {selectedUser.email} • Team: {selectedUser.teamName} • Reports to: {selectedUser.managerName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.85rem',
                      background:
                        selectedUser.role === 'HR'
                          ? 'rgba(246, 184, 96, 0.2)'
                          : selectedUser.role === 'MANAGER'
                          ? 'rgba(59, 107, 122, 0.2)'
                          : 'rgba(130, 209, 157, 0.2)',
                      color:
                        selectedUser.role === 'HR'
                          ? '#b45309'
                          : selectedUser.role === 'MANAGER'
                          ? '#3B6B7A'
                          : '#2e7d32',
                    }}
                  >
                    {selectedUser.role}
                  </span>
                  {selectedUser.joinedInTargetYear && (
                    <span className="badge badge-pending">Mid-Year Joiner</span>
                  )}
                </div>
              </div>

              {/* Adjust According to Date Banner */}
              <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '20px', marginBottom: '1.75rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      Adjust Balance According to Date
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                      Change or select the joining date below. Leaves will be pro-rated for the remaining months of {calcYear}.
                    </p>
                  </div>

                  {datePreview && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', background: '#FFFFFF', padding: '0.35rem 0.85rem', borderRadius: '99px', border: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-secondary)' }}>
                        {datePreview.remainingMonths} / 12 months coverage ({datePreview.totalProRatedDays} total days)
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.35rem' }}>
                      Joining / Adjustment Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={customJoinDate || selectedUser.joinDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      style={{ width: '100%', background: '#FFFFFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.35rem' }}>
                      Quick Actions
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ border: '1px solid var(--color-border)', borderRadius: '99px', fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                        onClick={() => {
                          setCustomJoinDate(selectedUser.joinDate);
                        }}
                      >
                        Reset to Member's Date ({selectedUser.joinDate})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ borderRadius: '99px', fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                        disabled={previewLoading}
                        onClick={applyCalculatedEntitlementsForDate}
                      >
                        Apply Pro-Rated Formula
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Comparison Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  Adjust Member Balances ({calcYear})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Values can be customized or kept matching the calculated pro-rated formula.
                </span>
              </div>

              <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Full Annual</th>
                      <th>Current Recorded</th>
                      <th>Calculated for Date</th>
                      <th>Adjusted Entitlement</th>
                      <th>Used</th>
                      <th>Pending</th>
                      <th>Projected Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.calculatedEntitlements.map((c) => {
                      const currentBal = selectedUser.currentBalances.find(
                        (b) => b.leaveType.toLowerCase() === c.leaveTypeName.toLowerCase()
                      );
                      const currentEntitled = currentBal ? currentBal.entitled : c.annualEntitlement;
                      const used = currentBal ? currentBal.used : 0;
                      const pending = currentBal ? currentBal.pending : 0;

                      // Check if we have calculated value for the current active date from preview
                      const dateCalc = datePreview?.calculations.find((dc) => dc.leaveTypeId === c.leaveTypeId);
                      const proRatedForDate = dateCalc ? dateCalc.proRatedEntitlement : c.proRatedEntitlement;

                      const editedVal =
                        customEntitlements[c.leaveTypeId] !== undefined
                          ? customEntitlements[c.leaveTypeId]
                          : proRatedForDate;

                      const projectedAvailable = Number((editedVal - used - pending).toFixed(1));

                      return (
                        <tr key={c.leaveTypeId}>
                          <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{c.leaveTypeName}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{c.annualEntitlement} days</td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{currentEntitled} days</span>
                            {currentEntitled !== proRatedForDate && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', marginLeft: '0.35rem' }}>
                                (Diff: {(proRatedForDate - currentEntitled).toFixed(1)})
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>
                            {proRatedForDate} days
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={c.annualEntitlement}
                              className="input"
                              style={{ width: '90px', padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 700 }}
                              value={editedVal}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCustomEntitlements((prev) => ({
                                  ...prev,
                                  [c.leaveTypeId]: val,
                                }));
                              }}
                            />
                          </td>
                          <td style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{used}</td>
                          <td style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{pending}</td>
                          <td
                            style={{
                              fontWeight: 800,
                              color: projectedAvailable < 0 ? 'var(--color-danger)' : 'var(--color-success)',
                            }}
                          >
                            {projectedAvailable} days
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {!isManager ? (
                    <span style={{ color: 'var(--color-warning)' }}>
                      Note: You are viewing in read-only mode. HR or the manager can push adjustments.
                    </span>
                  ) : (
                    <span>
                      Pushing will immediately update <strong>{selectedUser.name}'s</strong> live leave balances in the system according to this date.
                    </span>
                  )}
                </div>

                {isManager && (
                  <button
                    className="btn btn-primary"
                    disabled={pushMutation.isPending}
                    onClick={() => {
                      pushMutation.mutate({
                        userId: selectedUser.id,
                        joinDate: customJoinDate || selectedUser.joinDate,
                        year: calcYear,
                        leaveTypeEntitlements: customEntitlements,
                      });
                    }}
                    style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
                  >
                    {pushMutation.isPending ? 'Pushing to Balance...' : 'Push Calculated Leaves to Balance'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Select a member from the left to view and adjust their mid-joining balances.
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION: ORGANIZATION-WIDE RECALIBRATION (HR ONLY)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'recalibrate' && isHr && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  Batch Recalibration for Mid-Year Joiners
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Automatically calculate and push pro-rated leave entitlements for all Employees, Managers, and HR who joined in {recalibrateYear}.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                  className="input"
                  value={recalibrateYear}
                  onChange={(e) => setRecalibrateYear(Number(e.target.value))}
                  style={{ width: '140px' }}
                >
                  <option value={2025}>Year 2025</option>
                  <option value={2026}>Year 2026</option>
                  <option value={2027}>Year 2027</option>
                </select>

                <button
                  className="btn btn-primary"
                  disabled={recalibrateMutation.isPending}
                  onClick={() => recalibrateMutation.mutate(recalibrateYear)}
                  style={{ padding: '0.65rem 1.5rem' }}
                >
                  {recalibrateMutation.isPending ? 'Pushing to Balances...' : 'Push Mid-Joining Leaves to All Balances'}
                </button>
              </div>
            </div>

            {/* List of members joining in target year */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Join Date</th>
                    <th>Status</th>
                    <th>Calculated Pro-Rated Entitlements</th>
                  </tr>
                </thead>
                <tbody>
                  {orgUsers
                    ?.filter((u) => u.joinedInTargetYear)
                    .map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{u.name}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.7rem',
                              background:
                                u.role === 'HR'
                                  ? 'rgba(246, 184, 96, 0.2)'
                                  : u.role === 'MANAGER'
                                  ? 'rgba(59, 107, 122, 0.2)'
                                  : 'rgba(130, 209, 157, 0.2)',
                              color:
                                u.role === 'HR'
                                  ? '#b45309'
                                  : u.role === 'MANAGER'
                                  ? '#3B6B7A'
                                  : '#2e7d32',
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>{u.teamName}</td>
                        <td style={{ fontWeight: 600 }}>{u.joinDate}</td>
                        <td>
                          <span className="badge badge-approved">Mid-Year Joiner</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {u.calculatedEntitlements.map((c) => (
                              <span
                                key={c.leaveTypeId}
                                style={{
                                  fontSize: '0.75rem',
                                  background: 'var(--color-surface)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                }}
                              >
                                {c.leaveTypeName}: <strong>{c.proRatedEntitlement}d</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}

                  {orgUsers?.filter((u) => u.joinedInTargetYear).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No members found who joined mid-year in {recalibrateYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
