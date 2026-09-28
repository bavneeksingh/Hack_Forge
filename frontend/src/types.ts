export interface UserDto {
  id?: number;
  userId?: number;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR';
  teamId?: number;
  teamName?: string;
  managerId?: number;
  managerName?: string;
}

export type User = UserDto;

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface UserSummaryDto {
  id: number;
  name: string;
}

export interface ConflictDetail {
  date: string;
  awayNames: string[];
  awayMembers?: string[];
  pct: number;
  awayPercentage?: number;
  threshold?: number;
  workloadLevel?: string;
  sprintName?: string;
}

export interface ApprovalHistoryDto {
  stage: string;
  actor: UserSummaryDto;
  action: string;
  comment?: string;
  at: string;
  createdAt?: string;
}

export interface LeaveRequestDto {
  id: number;
  requester: UserSummaryDto;
  type: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason?: string;
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentAssignee?: UserSummaryDto;
  dueAt?: string;
  escalated: boolean;
  escalatedFrom?: string;
  stageSkipped: boolean;
  conflictFlagged: boolean;
  conflictDetails: ConflictDetail[];
  history: ApprovalHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSubmitRequest {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
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

export interface PublicHolidayDto {
  date: string;
  name: string;
}

export interface WeeklyWorkloadDto {
  id: number;
  teamId: number;
  teamName: string;
  startDate: string;
  endDate: string;
  workloadLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  workloadScore: number;
  threshold: number;
  sprintName?: string;
  notes?: string;
  createdByName?: string;
}

export interface SaveWorkloadRequest {
  teamId?: number;
  startDate: string;
  endDate: string;
  workloadLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  workloadScore?: number;
  threshold?: number;
  sprintName?: string;
  notes?: string;
}

export interface TeamCalendarDto {
  from: string;
  to: string;
  entries: TeamCalendarEntry[];
  holidays?: PublicHolidayDto[];
  teamSize?: number;
  conflictThreshold?: number;
  workloads?: WeeklyWorkloadDto[];
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
