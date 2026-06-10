export type CargoType = '集装箱' | '散货' | '液体化工' | '成品油' | 'LNG' | '粮食' | '钢材' | '其他';
export type BerthStatus = '空闲' | '作业中' | '已预约' | '维护中';
export type ScheduleStatus = '待靠泊' | '靠泊中' | '作业中' | '已离港' | '已取消' | '延期';
export type ConflictType = 'tide' | 'berth_capacity' | 'simultaneous_operation' | 'overtime' | 'draft';
export type OperationType = 'insert' | 'delay' | 'cancel' | 'modify' | 'reschedule';

export interface Ship {
  id: string;
  name: string;
  imo?: string;
  voyage: string;
  length: number;
  draft: number;
  grossTonnage?: number;
  cargoType: CargoType;
  cargoWeight: number;
  agent: string;
  carrier?: string;
  arrivalTime: string;
  estimatedDepartureTime?: string;
  operationDuration: number;
  specialRequirements?: string;
  remarks?: string;
  createTime: string;
  updateTime: string;
}

export interface Berth {
  id: string;
  name: string;
  code: string;
  maxLength: number;
  maxDraft: number;
  allowedCargoTypes: CargoType[];
  maxShips: number;
  status: BerthStatus;
  position: number;
  description?: string;
}

export interface Schedule {
  id: string;
  shipId: string;
  berthId: string;
  plannedBerthingTime: string;
  plannedDepartureTime: string;
  actualBerthingTime?: string;
  actualDepartureTime?: string;
  operationDuration: number;
  status: ScheduleStatus;
  priority: number;
  conflictWarnings: ConflictWarning[];
  operationHistory: OperationRecord[];
  remarks?: string;
  createTime: string;
  updateTime: string;
}

export interface TideData {
  id: string;
  date: string;
  time: string;
  height: number;
  type: 'high' | 'low';
}

export interface ConflictWarning {
  id: string;
  type: ConflictType;
  severity: 'warning' | 'error' | 'info';
  message: string;
  scheduleId: string;
  relatedScheduleIds?: string[];
  resolved: boolean;
  createTime: string;
}

export interface OperationRecord {
  id: string;
  scheduleId: string;
  operationType: OperationType;
  operator: string;
  operationTime: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
  originalBerthId?: string;
  newBerthId?: string;
}

export interface ShiftRecord {
  id: string;
  shiftDate: string;
  shiftType: '早班' | '中班' | '晚班';
  operator: string;
  nextOperator: string;
  handoverTime: string;
  schedules: string[];
  summary: string;
  pendingMatters: string;
  pendingTodoIds?: string[];
  createTime: string;
}

export interface ExportConfig {
  startDate: string;
  endDate: string;
  includeShipInfo: boolean;
  includeSchedule: boolean;
  includeHistory: boolean;
}

export interface FilterParams {
  shipName?: string;
  voyage?: string;
  agent?: string;
  cargoType?: CargoType;
  status?: ScheduleStatus;
  startDate?: string;
  endDate?: string;
}

export type PlanType = 'reschedule' | 'insert' | 'delay' | 'cancel' | 'modify';
export type PlanStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'applied';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 'high' | 'medium' | 'low';
export type TodoSource = 'conflict' | 'plan' | 'ship' | 'handover' | 'manual';

export interface AdjustmentPlan {
  id: string;
  type: PlanType;
  name: string;
  description: string;
  scheduleId?: string;
  originalSchedule?: Partial<Schedule>;
  proposedChanges: Partial<Schedule>;
  affectedScheduleIds: string[];
  conflictChanges: {
    newConflicts: ConflictWarning[];
    resolvedConflicts: ConflictWarning[];
    existingConflicts: ConflictWarning[];
  };
  impactAnalysis: {
    affectedShips: string[];
    delayMinutes: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  status: PlanStatus;
  priority: number;
  operator: string;
  reviewer?: string;
  createTime: string;
  updateTime: string;
  applyTime?: string;
  rejectReason?: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  source: TodoSource;
  sourceId: string;
  priority: TodoPriority;
  status: TodoStatus;
  scheduleId?: string;
  conflictId?: string;
  planId?: string;
  shipId?: string;
  assignee: string;
  assignor: string;
  progress: number;
  dueTime?: string;
  completedTime?: string;
  remarks?: string;
  createTime: string;
  updateTime: string;
}

export interface DashboardData {
  timeRange: {
    start: string;
    end: string;
  };
  berthOccupancy: {
    berthId: string;
    berthName: string;
    occupancyRate: number;
    occupiedHours: number;
    availableHours: number;
    scheduleCount: number;
  }[];
  pendingShips: {
    count: number;
    ships: {
      shipId: string;
      shipName: string;
      arrivalTime: string;
      berthName: string;
      status: ScheduleStatus;
      waitHours: number;
    }[];
  };
  riskStats: {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<ConflictType, { total: number; unresolved: number }>;
    bySeverity: {
      error: { total: number; unresolved: number };
      warning: { total: number; unresolved: number };
      info: { total: number; unresolved: number };
    };
  };
  overtimeRisk: {
    count: number;
    schedules: {
      scheduleId: string;
      shipName: string;
      berthName: string;
      plannedDepartureTime: string;
      remainingHours: number;
      overtimeRisk: 'high' | 'medium' | 'low';
    }[];
  };
  upcomingSchedules: {
    count: number;
    schedules: {
      scheduleId: string;
      shipName: string;
      berthName: string;
      plannedBerthingTime: string;
      countdownMinutes: number;
      priority: number;
    }[];
  };
  operationStats: {
    todayInsert: number;
    todayDelay: number;
    todayCancel: number;
    todayReschedule: number;
    todayModify: number;
  };
}

export interface OperationReviewFilters {
  dateRange?: [string, string];
  shipName?: string;
  berthId?: string;
  originalBerthId?: string;
  newBerthId?: string;
  operator?: string;
  operationType?: OperationType | 'all';
}
