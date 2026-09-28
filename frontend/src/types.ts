export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR';
  managerId: number | null;
  managerName: string | null;
  teamId: number | null;
  teamName: string | null;
}

export interface UserSummaryDto {
  id: number;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface LeaveSubmitRequest {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ConflictDetail {
  date: string;
  awayNames: string[];
  pct: number;
}

export interface ApprovalHistoryDto {
  stage: string;
  actor: UserSummaryDto;
  action: string;
  comment: string | null;
  at: string;
}

export interface LeaveRequestDto {
  id: number;
  requester: UserSummaryDto;
  type: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string | null;
  status: string;
  currentAssignee: UserSummaryDto | null;
  dueAt: string | null;
  escalated: boolean;
  escalatedFrom: string | null;
  stageSkipped: boolean;
  conflictFlagged: boolean;
  conflictDetails: ConflictDetail[];
  history: ApprovalHistoryDto[];
}

export interface LeavePreviewDto {
  workingDays: number;
  conflictFlagged: boolean;
  conflictDetails: ConflictDetail[];
  holidays: string[];
  startDate: string;
  endDate: string;
}

export interface BalanceDto {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  available: number;
}

export interface PolicyDto {
  teamId: number;
  teamName: string;
  conflictThreshold: number;
  escalationTimeoutHours: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface TeamCalendarDto {
  from: string;
  to: string;
  entries: TeamCalendarEntry[];
}

export interface TeamCalendarEntry {
  employeeId: number;
  employeeName: string;
  leaveRequestId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
}
