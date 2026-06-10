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
