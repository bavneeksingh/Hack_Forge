export function StatusBadge({ status, escalated, conflictFlagged }: { status: string; escalated?: boolean; conflictFlagged?: boolean }) {
  const badges: Record<string, string> = {
    PENDING_MANAGER: 'badge-pending',
    PENDING_HR: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CANCELLED: 'badge-cancelled',
  };

  const labels: Record<string, string> = {
    PENDING_MANAGER: 'Pending Manager',
    PENDING_HR: 'Pending HR',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };

  return (
    <span style={{ display: 'inline-flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <span className={`badge ${badges[status] || 'badge-pending'}`}>
        {labels[status] || status}
      </span>
      {escalated && <span className="badge badge-escalated">⚡ Escalated</span>}
      {conflictFlagged && <span className="badge badge-conflict">⚠ Conflict</span>}
    </span>
  );
}
