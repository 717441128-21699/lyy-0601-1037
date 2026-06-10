import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type { Ship, Berth, Schedule, TideData, ShiftRecord, ConflictWarning, FilterParams, OperationRecord, AdjustmentPlan, TodoItem, DashboardData, OperationReviewFilters, PlanType } from '@/types';
import { mockShips, mockBerths, mockSchedules, mockTideData, mockShiftRecords } from '@/data/mockData';

interface SchedulerState {
  ships: Ship[];
  berths: Berth[];
  schedules: Schedule[];
  tideData: TideData[];
  shiftRecords: ShiftRecord[];
  operationRecords: OperationRecord[];
  adjustmentPlans: AdjustmentPlan[];
  todoItems: TodoItem[];
  currentOperator: string;
  filterParams: FilterParams;
  selectedScheduleId: string | null;
  conflictWarnings: ConflictWarning[];
  
  setShips: (ships: Ship[]) => void;
  setBerths: (berths: Berth[]) => void;
  setSchedules: (schedules: Schedule[]) => void;
  setTideData: (tideData: TideData[]) => void;
  setShiftRecords: (shiftRecords: ShiftRecord[]) => void;
  setFilterParams: (params: Partial<FilterParams>) => void;
  setSelectedScheduleId: (id: string | null) => void;
  setCurrentOperator: (operator: string) => void;
  
  addShip: (ship: Omit<Ship, 'id' | 'createTime' | 'updateTime'>) => void;
  updateShip: (id: string, ship: Partial<Ship>) => void;
  deleteShip: (id: string) => void;
  
  addSchedule: (schedule: Omit<Schedule, 'id' | 'conflictWarnings' | 'operationHistory' | 'createTime' | 'updateTime'>) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  
  insertSchedule: (schedule: Omit<Schedule, 'id' | 'conflictWarnings' | 'operationHistory' | 'createTime' | 'updateTime'>, targetPosition: number) => void;
  delaySchedule: (id: string, delayHours: number, reason: string) => void;
  cancelSchedule: (id: string, reason: string) => void;
  
  rescheduleShip: (scheduleId: string, newBerthId: string, newBerthingTime: string, reason?: string) => void;
  
  addOperationRecord: (record: Omit<OperationRecord, 'id' | 'operationTime'>) => void;
  
  checkConflicts: (schedulesToCheck?: Schedule[]) => ConflictWarning[];
  resolveConflict: (warningId: string, reason: string) => void;
  autoResolveConflict: (warningId: string) => { success: boolean; message: string };
  getUnresolvedConflicts: () => ConflictWarning[];
  
  addShiftRecord: (record: Omit<ShiftRecord, 'id' | 'createTime'>, pendingTodos?: Omit<TodoItem, 'id' | 'progress' | 'createTime' | 'updateTime'>[]) => void;
  getCurrentShiftTodos: () => TodoItem[];
  
  getFilteredSchedules: () => Schedule[];
  getFilteredOperationRecords: (filters: OperationReviewFilters) => OperationRecord[];
  getShipById: (id: string) => Ship | undefined;
  getBerthById: (id: string) => Berth | undefined;
  getScheduleById: (id: string) => Schedule | undefined;
  
  createAdjustmentPlan: (plan: {
    type: PlanType;
    name: string;
    description: string;
    scheduleId?: string;
    proposedChanges: Partial<Schedule>;
  }) => AdjustmentPlan;
  simulatePlan: (planId: string) => AdjustmentPlan | null;
  approvePlan: (planId: string, reason: string) => boolean;
  rejectPlan: (planId: string, reason: string) => void;
  applyPlan: (planId: string, reason: string) => { success: boolean; message: string };
  deletePlan: (planId: string) => void;
  
  addTodo: (todo: Omit<TodoItem, 'id' | 'progress' | 'createTime' | 'updateTime'>) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  updateTodoProgress: (id: string, progress: number) => void;
  completeTodo: (id: string, remarks?: string) => void;
  getUncompletedTodos: () => TodoItem[];
  
  getDashboardData: () => DashboardData;
  getUpcomingSchedules: (hours: number) => Schedule[];
  
  initializeMockData: () => void;
  clearAllData: () => void;
}

const generateId = (prefix: string) => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
};

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set, get) => ({
      ships: [],
      berths: [],
      schedules: [],
      tideData: [],
      shiftRecords: [],
      operationRecords: [],
      adjustmentPlans: [],
      todoItems: [],
      currentOperator: '调度员',
      filterParams: {},
      selectedScheduleId: null,
      conflictWarnings: [],

  setShips: (ships) => set({ ships }),
  setBerths: (berths) => set({ berths }),
  setSchedules: (schedules) => set({ schedules }),
  setTideData: (tideData) => set({ tideData }),
  setShiftRecords: (shiftRecords) => set({ shiftRecords }),
  setFilterParams: (params) => set((state) => ({ filterParams: { ...state.filterParams, ...params } })),
  setSelectedScheduleId: (id) => set({ selectedScheduleId: id }),
  setCurrentOperator: (operator) => set({ currentOperator: operator }),

  addShip: (shipData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const newShip: Ship = {
      ...shipData,
      id: generateId('S'),
      createTime: now,
      updateTime: now
    };
    set((state) => ({ ships: [...state.ships, newShip] }));
  },

  updateShip: (id, shipData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    set((state) => ({
      ships: state.ships.map((s) =>
        s.id === id ? { ...s, ...shipData, updateTime: now } : s
      )
    }));
  },

  deleteShip: (id) => {
    set((state) => ({
      ships: state.ships.filter((s) => s.id !== id),
      schedules: state.schedules.filter((s) => s.shipId !== id)
    }));
  },

  addSchedule: (scheduleData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const newSchedule: Schedule = {
      ...scheduleData,
      id: generateId('SCH'),
      conflictWarnings: [],
      operationHistory: [],
      createTime: now,
      updateTime: now
    };
    set((state) => {
      const updatedSchedules = [...state.schedules, newSchedule];
      return { schedules: updatedSchedules };
    });
    get().addOperationRecord({
      scheduleId: newSchedule.id,
      operationType: 'modify',
      operator: get().currentOperator,
      reason: '新增调度计划',
      newValue: JSON.stringify(scheduleData)
    });
    setTimeout(() => get().checkConflicts(), 100);
  },

  updateSchedule: (id, scheduleData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const oldSchedule = get().getScheduleById(id);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, ...scheduleData, updateTime: now } : s
      )
    }));
    if (oldSchedule && scheduleData) {
      get().addOperationRecord({
        scheduleId: id,
        operationType: 'modify',
        operator: get().currentOperator,
        reason: '修改调度计划',
        oldValue: JSON.stringify(oldSchedule),
        newValue: JSON.stringify({ ...oldSchedule, ...scheduleData })
      });
    }
    setTimeout(() => get().checkConflicts(), 100);
  },

  deleteSchedule: (id) => {
    const schedule = get().getScheduleById(id);
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id)
    }));
    if (schedule) {
      get().addOperationRecord({
        scheduleId: id,
        operationType: 'cancel',
        operator: get().currentOperator,
        reason: '删除调度计划',
        oldValue: JSON.stringify(schedule)
      });
    }
    setTimeout(() => get().checkConflicts(), 100);
  },

  insertSchedule: (scheduleData, targetPosition) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const newSchedule: Schedule = {
      ...scheduleData,
      id: generateId('SCH'),
      priority: targetPosition,
      conflictWarnings: [],
      operationHistory: [],
      createTime: now,
      updateTime: now
    };
    set((state) => {
      const updatedSchedules = state.schedules
        .map((s) => (s.priority >= targetPosition ? { ...s, priority: s.priority + 1 } : s))
        .sort((a, b) => a.priority - b.priority);
      updatedSchedules.splice(targetPosition - 1, 0, newSchedule);
      return { schedules: updatedSchedules };
    });
    get().addOperationRecord({
      scheduleId: newSchedule.id,
      operationType: 'insert',
      operator: get().currentOperator,
      reason: `插队到第${targetPosition}位`,
      newValue: JSON.stringify(scheduleData)
    });
    setTimeout(() => get().checkConflicts(), 100);
  },

  delaySchedule: (id, delayHours, reason) => {
    const schedule = get().getScheduleById(id);
    if (!schedule) return;
    
    const newBerthingTime = dayjs(schedule.plannedBerthingTime).add(delayHours, 'hour').format('YYYY-MM-DD HH:mm');
    const newDepartureTime = dayjs(schedule.plannedDepartureTime).add(delayHours, 'hour').format('YYYY-MM-DD HH:mm');
    
    get().updateSchedule(id, {
      plannedBerthingTime: newBerthingTime,
      plannedDepartureTime: newDepartureTime,
      status: '延期'
    });
    
    get().addOperationRecord({
      scheduleId: id,
      operationType: 'delay',
      operator: get().currentOperator,
      reason,
      oldValue: `靠泊: ${schedule.plannedBerthingTime}, 离港: ${schedule.plannedDepartureTime}`,
      newValue: `靠泊: ${newBerthingTime}, 离港: ${newDepartureTime}`
    });
  },

  cancelSchedule: (id, reason) => {
    get().updateSchedule(id, { status: '已取消' });
    get().addOperationRecord({
      scheduleId: id,
      operationType: 'cancel',
      operator: get().currentOperator,
      reason
    });
  },

  rescheduleShip: (scheduleId, newBerthId, newBerthingTime, reason = '拖拽调整泊位/时间') => {
    const schedule = get().getScheduleById(scheduleId);
    if (!schedule) return;
    
    const oldBerth = get().getBerthById(schedule.berthId);
    const newBerth = get().getBerthById(newBerthId);
    
    const newDepartureTime = dayjs(newBerthingTime).add(schedule.operationDuration, 'hour').format('YYYY-MM-DD HH:mm');
    
    const oldValue = `泊位: ${oldBerth?.name || schedule.berthId}, 靠泊: ${schedule.plannedBerthingTime}, 离港: ${schedule.plannedDepartureTime}`;
    const newValue = `泊位: ${newBerth?.name || newBerthId}, 靠泊: ${newBerthingTime}, 离港: ${newDepartureTime}`;
    
    get().updateSchedule(scheduleId, {
      berthId: newBerthId,
      plannedBerthingTime: newBerthingTime,
      plannedDepartureTime: newDepartureTime
    });
    
    get().addOperationRecord({
      scheduleId,
      operationType: 'reschedule',
      operator: get().currentOperator,
      reason,
      oldValue,
      newValue,
      originalBerthId: schedule.berthId,
      newBerthId
    });
  },

  resolveConflict: (warningId, reason) => {
    set((state) => {
      const updatedWarnings = state.conflictWarnings.map((w) =>
        w.id === warningId ? { ...w, resolved: true } : w
      );
      
      const updatedSchedules = state.schedules.map((s) => ({
        ...s,
        conflictWarnings: s.conflictWarnings.map((w) =>
          w.id === warningId ? { ...w, resolved: true } : w
        )
      }));
      
      return {
        conflictWarnings: updatedWarnings,
        schedules: updatedSchedules
      };
    });
    
    const warning = get().conflictWarnings.find((w) => w.id === warningId);
    if (warning) {
      get().addOperationRecord({
        scheduleId: warning.scheduleId,
        operationType: 'modify',
        operator: get().currentOperator,
        reason: `冲突已解决: ${reason}`,
        oldValue: `冲突: ${warning.message}`,
        newValue: '已标记为解决'
      });
    }
  },

  autoResolveConflict: (warningId) => {
    const { schedules, ships, berths } = get();
    const warning = get().conflictWarnings.find((w) => w.id === warningId);
    
    if (!warning) {
      return { success: false, message: '未找到冲突记录' };
    }
    
    const schedule = schedules.find((s) => s.id === warning.scheduleId);
    if (!schedule) {
      return { success: false, message: '未找到调度计划' };
    }
    
    const ship = ships.find((s) => s.id === schedule.shipId);
    if (!ship) {
      return { success: false, message: '未找到船舶信息' };
    }

    const oldValue = `泊位: ${schedule.berthId}, 靠泊: ${schedule.plannedBerthingTime}`;
    
    if (warning.type === 'simultaneous_operation') {
      const conflictingSchedule = schedules.find((s) => s.id === warning.relatedScheduleIds?.[0]);
      if (conflictingSchedule) {
        const newBerthingTime = dayjs(conflictingSchedule.plannedDepartureTime).add(1, 'hour');
        get().rescheduleShip(
          schedule.id,
          schedule.berthId,
          newBerthingTime.format('YYYY-MM-DD HH:mm'),
          `自动解决冲突: 调整时间避开与调度${warning.relatedScheduleIds?.[0]}的作业重叠`
        );
        return { success: true, message: '已自动调整靠泊时间' };
      }
    } else if (warning.type === 'berth_capacity' || warning.type === 'draft') {
      const suitableBerth = berths.find(
        (b) =>
          b.allowedCargoTypes.includes(ship.cargoType) &&
          b.maxLength >= ship.length &&
          b.maxDraft >= ship.draft &&
          b.status !== '维护中' &&
          b.id !== schedule.berthId
      );
      
      if (suitableBerth) {
        get().rescheduleShip(
          schedule.id,
          suitableBerth.id,
          schedule.plannedBerthingTime,
          `自动解决冲突: 更换泊位至${suitableBerth.name}`
        );
        return { success: true, message: `已分配到${suitableBerth.name}` };
      } else {
        return { success: false, message: '未找到合适的泊位，请手动调整' };
      }
    } else if (warning.type === 'tide') {
      const currentTime = dayjs(schedule.plannedBerthingTime);
      const newBerthingTime = currentTime.add(6, 'hour');
      get().rescheduleShip(
        schedule.id,
        schedule.berthId,
        newBerthingTime.format('YYYY-MM-DD HH:mm'),
        '自动解决冲突: 调整靠泊时间等待高潮位'
      );
      return { success: true, message: '已调整靠泊时间以等待高潮位' };
    } else if (warning.type === 'overtime') {
      get().updateSchedule(schedule.id, { operationDuration: 24 });
      get().addOperationRecord({
        scheduleId: schedule.id,
        operationType: 'modify',
        operator: get().currentOperator,
        reason: '自动解决超时冲突',
        oldValue: `作业时长: ${schedule.operationDuration}小时`,
        newValue: '作业时长: 24小时'
      });
      return { success: true, message: '已自动调整作业时长至24小时' };
    }
    
    return { success: false, message: '无法自动解决此类型的冲突' };
  },

  getFilteredOperationRecords: (filters) => {
    let records = [...get().operationRecords];
    
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      records = records.filter((r) => {
        const recordDate = dayjs(r.operationTime);
        return recordDate.isAfter(dayjs(startDate).startOf('day')) && 
               recordDate.isBefore(dayjs(endDate).endOf('day'));
      });
    }
    
    if (filters.shipName) {
      const matchingShipIds = get().ships
        .filter((s) => s.name.includes(filters.shipName!))
        .map((s) => s.id);
      records = records.filter((r) => {
        const schedule = get().getScheduleById(r.scheduleId);
        return matchingShipIds.includes(schedule?.shipId || '') || 
               matchingShipIds.some(id => r.scheduleId.includes(id));
      });
    }
    
    if (filters.berthId) {
      const berthId = filters.berthId;
      const berth = get().getBerthById(berthId);
      records = records.filter((r) => {
        const schedule = get().getScheduleById(r.scheduleId);
        return schedule?.berthId === berthId ||
               r.originalBerthId === berthId ||
               r.newBerthId === berthId ||
               (berth && (r.oldValue?.includes(berth.name) || r.newValue?.includes(berth.name)));
      });
    }
    
    if (filters.originalBerthId) {
      const berthId = filters.originalBerthId;
      const berth = get().getBerthById(berthId);
      records = records.filter((r) => {
        return r.originalBerthId === berthId ||
               (r.oldValue && r.oldValue.includes(berthId)) || 
               (berth && r.oldValue && r.oldValue.includes(berth.name));
      });
    }
    
    if (filters.newBerthId) {
      const berthId = filters.newBerthId;
      const berth = get().getBerthById(berthId);
      records = records.filter((r) => {
        const schedule = get().getScheduleById(r.scheduleId);
        return r.newBerthId === berthId ||
               schedule?.berthId === berthId || 
               (r.newValue && r.newValue.includes(berthId)) ||
               (berth && r.newValue && r.newValue.includes(berth.name));
      });
    }
    
    if (filters.operator) {
      records = records.filter((r) => r.operator.includes(filters.operator!));
    }
    
    if (filters.operationType && filters.operationType !== 'all') {
      records = records.filter((r) => r.operationType === filters.operationType);
    }
    
    return records.sort((a, b) => dayjs(b.operationTime).valueOf() - dayjs(a.operationTime).valueOf());
  },

  clearAllData: () => {
    set({
      ships: [],
      schedules: [],
      shiftRecords: [],
      operationRecords: [],
      adjustmentPlans: [],
      todoItems: [],
      conflictWarnings: [],
      selectedScheduleId: null,
      filterParams: {}
    });
  },

  addOperationRecord: (record) => {
    const newRecord: OperationRecord = {
      ...record,
      id: generateId('OP'),
      operationTime: dayjs().format('YYYY-MM-DD HH:mm')
    };
    set((state) => ({ operationRecords: [...state.operationRecords, newRecord] }));
    
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === record.scheduleId
          ? { ...s, operationHistory: [...s.operationHistory, newRecord] }
          : s
      )
    }));
  },

  getUnresolvedConflicts: () => {
    return get().conflictWarnings.filter((w) => !w.resolved);
  },

  checkConflicts: (schedulesToCheck) => {
    const { ships, berths, tideData, conflictWarnings: existingWarnings } = get();
    const schedules = schedulesToCheck || get().schedules;
    const warnings: ConflictWarning[] = [];
    
    const MIN_TIDE_HEIGHT = 3.0;
    
    const findExistingResolvedWarning = (scheduleId: string, type: ConflictWarning['type'], message: string) => {
      return existingWarnings.find(
        (w) => w.scheduleId === scheduleId && w.type === type && w.message === message && w.resolved
      );
    };
    
    schedules.forEach((schedule) => {
      if (schedule.status === '已取消') return;
      
      const ship = ships.find((s) => s.id === schedule.shipId);
      const berth = berths.find((b) => b.id === schedule.berthId);
      
      if (!ship || !berth) return;
      
      const checkAndAddWarning = (type: ConflictWarning['type'], severity: ConflictWarning['severity'], message: string) => {
        const existingResolved = findExistingResolvedWarning(schedule.id, type, message);
        warnings.push({
          id: existingResolved?.id || generateId('WARN'),
          type,
          severity,
          message,
          scheduleId: schedule.id,
          resolved: existingResolved?.resolved || false,
          createTime: existingResolved?.createTime || dayjs().format('YYYY-MM-DD HH:mm')
        });
      };
      
      if (ship.length > berth.maxLength) {
        checkAndAddWarning(
          'berth_capacity',
          'error',
          `船长(${ship.length}m)超出泊位${berth.name}最大长度(${berth.maxLength}m)`
        );
      }
      
      if (ship.draft > berth.maxDraft) {
        checkAndAddWarning(
          'draft',
          'error',
          `吃水(${ship.draft}m)超出泊位${berth.name}最大吃水(${berth.maxDraft}m)`
        );
      }
      
      if (!berth.allowedCargoTypes.includes(ship.cargoType)) {
        checkAndAddWarning(
          'berth_capacity',
          'error',
          `泊位${berth.name}不允许停靠${ship.cargoType}类型船舶`
        );
      }
      
      const berthingDate = dayjs(schedule.plannedBerthingTime).format('YYYY-MM-DD');
      const dayTides = tideData.filter((t) => t.date === berthingDate);
      
      if (dayTides.length > 0) {
        const berthingHour = dayjs(schedule.plannedBerthingTime).hour();
        const relevantTide = dayTides.reduce((prev, curr) => {
          const prevDiff = Math.abs(parseInt(curr.time.split(':')[0]) - berthingHour);
          const currDiff = Math.abs(parseInt(prev.time.split(':')[0]) - berthingHour);
          return prevDiff < currDiff ? curr : prev;
        });
        
        if (relevantTide.height < MIN_TIDE_HEIGHT) {
          checkAndAddWarning(
            'tide',
            'warning',
            `预计靠泊时潮高(${relevantTide.height.toFixed(1)}m)低于安全水深(${MIN_TIDE_HEIGHT}m)`
          );
        }
      }
      
      const maxOperationHours = 24;
      if (schedule.operationDuration > maxOperationHours) {
        checkAndAddWarning(
          'overtime',
          'warning',
          `作业时长(${schedule.operationDuration}小时)超出最大作业时长限制`
        );
      }
    });
    
    schedules.forEach((schedule1, i) => {
      if (schedule1.status === '已取消') return;
      
      schedules.slice(i + 1).forEach((schedule2) => {
        if (schedule2.status === '已取消') return;
        if (schedule1.berthId !== schedule2.berthId) return;
        
        const start1 = dayjs(schedule1.plannedBerthingTime);
        const end1 = dayjs(schedule1.plannedDepartureTime);
        const start2 = dayjs(schedule2.plannedBerthingTime);
        const end2 = dayjs(schedule2.plannedDepartureTime);
        
        if (start1.isBefore(end2) && end1.isAfter(start2)) {
          const message = `与调度${schedule2.id}在同一泊位作业时间冲突`;
          const existingResolved = findExistingResolvedWarning(schedule1.id, 'simultaneous_operation', message);
          warnings.push({
            id: existingResolved?.id || generateId('WARN'),
            type: 'simultaneous_operation',
            severity: 'error',
            message,
            scheduleId: schedule1.id,
            relatedScheduleIds: [schedule2.id],
            resolved: existingResolved?.resolved || false,
            createTime: existingResolved?.createTime || dayjs().format('YYYY-MM-DD HH:mm')
          });
        }
      });
    });
    
    set((state) => ({
      schedules: state.schedules.map((s) => ({
        ...s,
        conflictWarnings: warnings.filter((w) => w.scheduleId === s.id)
      })),
      conflictWarnings: warnings
    }));
    
    return warnings;
  },

  addShiftRecord: (record, pendingTodos) => {
    const newRecord: ShiftRecord = {
      ...record,
      id: generateId('SHIFT'),
      createTime: dayjs().format('YYYY-MM-DD HH:mm')
    };
    set((state) => ({ shiftRecords: [...state.shiftRecords, newRecord] }));
    
    if (pendingTodos && pendingTodos.length > 0) {
      const now = dayjs().format('YYYY-MM-DD HH:mm');
      const newTodos = pendingTodos.map((todo) => ({
        ...todo,
        id: generateId('TODO'),
        progress: 0,
        createTime: now,
        updateTime: now
      }));
      set((state) => ({ todoItems: [...state.todoItems, ...newTodos] }));
    }
  },

  getCurrentShiftTodos: () => {
    const today = dayjs().format('YYYY-MM-DD');
    return get().todoItems.filter((todo) => 
      todo.status !== 'completed' && 
      todo.status !== 'cancelled' &&
      dayjs(todo.createTime).format('YYYY-MM-DD') === today
    );
  },

  createAdjustmentPlan: (planData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const schedule = planData.scheduleId ? get().getScheduleById(planData.scheduleId) : undefined;
    
    const newPlan: AdjustmentPlan = {
      id: generateId('PLAN'),
      type: planData.type,
      name: planData.name,
      description: planData.description,
      scheduleId: planData.scheduleId,
      originalSchedule: schedule ? { ...schedule } : undefined,
      proposedChanges: planData.proposedChanges,
      affectedScheduleIds: [],
      conflictChanges: {
        newConflicts: [],
        resolvedConflicts: [],
        existingConflicts: []
      },
      impactAnalysis: {
        affectedShips: [],
        delayMinutes: 0,
        riskLevel: 'low'
      },
      status: 'draft',
      priority: 1,
      operator: get().currentOperator,
      createTime: now,
      updateTime: now
    };
    
    set((state) => ({ adjustmentPlans: [...state.adjustmentPlans, newPlan] }));
    return newPlan;
  },

  simulatePlan: (planId) => {
    const { schedules, ships, berths } = get();
    const plan = get().adjustmentPlans.find((p) => p.id === planId);
    if (!plan) return null;
    
    const simulatedSchedules = schedules.map((s) => {
      if (s.id === plan.scheduleId) {
        return { ...s, ...plan.proposedChanges };
      }
      return s;
    });
    
    if (plan.type === 'insert' && plan.proposedChanges.shipId) {
      const newSchedule: Schedule = {
        id: generateId('SCH_SIM'),
        shipId: plan.proposedChanges.shipId,
        berthId: plan.proposedChanges.berthId || '',
        plannedBerthingTime: plan.proposedChanges.plannedBerthingTime || '',
        plannedDepartureTime: plan.proposedChanges.plannedDepartureTime || '',
        operationDuration: plan.proposedChanges.operationDuration || 0,
        status: '待靠泊',
        priority: plan.proposedChanges.priority || 999,
        conflictWarnings: [],
        operationHistory: [],
        createTime: dayjs().format('YYYY-MM-DD HH:mm'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm')
      };
      simulatedSchedules.push(newSchedule);
    }
    
    const originalConflicts = get().checkConflicts(schedules);
    const newConflicts = get().checkConflicts(simulatedSchedules);
    
    const newConflictIds = new Set(newConflicts.map((c) => `${c.scheduleId}-${c.type}-${c.message}`));
    const originalConflictIds = new Set(originalConflicts.map((c) => `${c.scheduleId}-${c.type}-${c.message}`));
    
    const addedConflicts = newConflicts.filter((c) => 
      !originalConflictIds.has(`${c.scheduleId}-${c.type}-${c.message}`)
    );
    const resolvedConflicts = originalConflicts.filter((c) => 
      !newConflictIds.has(`${c.scheduleId}-${c.type}-${c.message}`)
    );
    const existingConflicts = newConflicts.filter((c) => 
      originalConflictIds.has(`${c.scheduleId}-${c.type}-${c.message}`)
    );
    
    const affectedScheduleIds = new Set<string>();
    addedConflicts.forEach((c) => {
      affectedScheduleIds.add(c.scheduleId);
      if (c.relatedScheduleIds) {
        c.relatedScheduleIds.forEach((id) => affectedScheduleIds.add(id));
      }
    });
    resolvedConflicts.forEach((c) => {
      affectedScheduleIds.add(c.scheduleId);
    });
    
    const affectedShips = Array.from(affectedScheduleIds)
      .map((sid) => {
        const sched = schedules.find((s) => s.id === sid) || simulatedSchedules.find((s) => s.id === sid);
        const ship = sched ? ships.find((sh) => sh.id === sched.shipId) : undefined;
        return ship?.name || '';
      })
      .filter(Boolean);
    
    let totalDelay = 0;
    Array.from(affectedScheduleIds).forEach((sid) => {
      const original = schedules.find((s) => s.id === sid);
      const simulated = simulatedSchedules.find((s) => s.id === sid);
      if (original && simulated) {
        const delay = dayjs(simulated.plannedBerthingTime).diff(dayjs(original.plannedBerthingTime), 'minute');
        if (delay > 0) totalDelay += delay;
      }
    });
    
    const riskLevel: 'low' | 'medium' | 'high' = 
      addedConflicts.length > 2 ? 'high' : 
      addedConflicts.length > 0 ? 'medium' : 'low';
    
    const updatedPlan: AdjustmentPlan = {
      ...plan,
      affectedScheduleIds: Array.from(affectedScheduleIds),
      conflictChanges: {
        newConflicts: addedConflicts,
        resolvedConflicts,
        existingConflicts
      },
      impactAnalysis: {
        affectedShips,
        delayMinutes: totalDelay,
        riskLevel
      },
      status: 'pending',
      updateTime: dayjs().format('YYYY-MM-DD HH:mm')
    };
    
    set((state) => ({
      adjustmentPlans: state.adjustmentPlans.map((p) => 
        p.id === planId ? updatedPlan : p
      )
    }));
    
    return updatedPlan;
  },

  approvePlan: (planId, reason) => {
    const plan = get().adjustmentPlans.find((p) => p.id === planId);
    if (!plan) return false;
    
    set((state) => ({
      adjustmentPlans: state.adjustmentPlans.map((p) => 
        p.id === planId 
          ? { ...p, status: 'approved', reviewer: get().currentOperator, updateTime: dayjs().format('YYYY-MM-DD HH:mm') } 
          : p
      )
    }));
    
    return true;
  },

  rejectPlan: (planId, reason) => {
    set((state) => ({
      adjustmentPlans: state.adjustmentPlans.map((p) => 
        p.id === planId 
          ? { ...p, status: 'rejected', rejectReason: reason, reviewer: get().currentOperator, updateTime: dayjs().format('YYYY-MM-DD HH:mm') } 
          : p
      )
    }));
  },

  applyPlan: (planId, reason) => {
    const plan = get().adjustmentPlans.find((p) => p.id === planId);
    if (!plan) return { success: false, message: '预案不存在' };
    if (plan.status === 'rejected') return { success: false, message: '预案已被拒绝，无法执行' };
    
    const schedule = plan.scheduleId ? get().getScheduleById(plan.scheduleId) : undefined;
    const changes = plan.proposedChanges;
    
    try {
      if (plan.type === 'reschedule' && schedule) {
        const oldBerth = get().getBerthById(schedule.berthId);
        const newBerth = changes.berthId ? get().getBerthById(changes.berthId) : undefined;
        const newBerthingTime = changes.plannedBerthingTime || schedule.plannedBerthingTime;
        get().rescheduleShip(
          schedule.id,
          changes.berthId || schedule.berthId,
          newBerthingTime,
          `${reason}（预案执行：${plan.name}）`
        );
      } else if (plan.type === 'delay' && schedule) {
        const delayHours = changes.plannedBerthingTime 
          ? dayjs(changes.plannedBerthingTime).diff(dayjs(schedule.plannedBerthingTime), 'hour')
          : 0;
        if (delayHours > 0) {
          get().delaySchedule(schedule.id, delayHours, `${reason}（预案执行：${plan.name}）`);
        }
      } else if (plan.type === 'cancel' && schedule) {
        get().cancelSchedule(schedule.id, `${reason}（预案执行：${plan.name}）`);
      } else if (plan.type === 'insert') {
        if (changes.shipId && changes.berthId && changes.plannedBerthingTime && changes.plannedDepartureTime) {
          const ship = get().getShipById(changes.shipId);
          if (ship) {
            get().insertSchedule({
              shipId: changes.shipId,
              berthId: changes.berthId,
              plannedBerthingTime: changes.plannedBerthingTime,
              plannedDepartureTime: changes.plannedDepartureTime,
              operationDuration: changes.operationDuration || ship.operationDuration,
              status: '待靠泊',
              priority: changes.priority || 1
            }, changes.priority || 1);
          }
        }
      } else if (plan.type === 'modify' && schedule) {
        get().updateSchedule(schedule.id, changes);
      }
      
      set((state) => ({
        adjustmentPlans: state.adjustmentPlans.map((p) => 
          p.id === planId 
            ? { ...p, status: 'applied', applyTime: dayjs().format('YYYY-MM-DD HH:mm'), updateTime: dayjs().format('YYYY-MM-DD HH:mm') } 
            : p
        )
      }));
      
      setTimeout(() => get().checkConflicts(), 100);
      return { success: true, message: '预案执行成功' };
    } catch (error) {
      return { success: false, message: `执行失败：${error}` };
    }
  },

  deletePlan: (planId) => {
    set((state) => ({
      adjustmentPlans: state.adjustmentPlans.filter((p) => p.id !== planId)
    }));
  },

  addTodo: (todoData) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const newTodo: TodoItem = {
      ...todoData,
      id: generateId('TODO'),
      progress: 0,
      createTime: now,
      updateTime: now
    };
    set((state) => ({ todoItems: [...state.todoItems, newTodo] }));
  },

  updateTodo: (id, updates) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    set((state) => ({
      todoItems: state.todoItems.map((t) => 
        t.id === id ? { ...t, ...updates, updateTime: now } : t
      )
    }));
  },

  updateTodoProgress: (id, progress) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    set((state) => ({
      todoItems: state.todoItems.map((t) => 
        t.id === id ? { 
          ...t, 
          progress, 
          status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'pending',
          completedTime: progress >= 100 ? now : undefined,
          updateTime: now 
        } : t
      )
    }));
  },

  completeTodo: (id, remarks) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    set((state) => ({
      todoItems: state.todoItems.map((t) => 
        t.id === id ? { 
          ...t, 
          progress: 100, 
          status: 'completed', 
          completedTime: now, 
          remarks: remarks || t.remarks,
          updateTime: now 
        } : t
      )
    }));
  },

  getUncompletedTodos: () => {
    return get().todoItems.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  },

  getDashboardData: () => {
    const { ships, berths, schedules, conflictWarnings, operationRecords, todoItems } = get();
    const now = dayjs();
    const endTime = now.add(72, 'hour');
    
    const timeRangeSchedules = schedules.filter((s) => {
      if (s.status === '已取消') return false;
      const startTime = dayjs(s.plannedBerthingTime);
      const departTime = dayjs(s.plannedDepartureTime);
      return startTime.isBefore(endTime) && departTime.isAfter(now);
    });
    
    const berthOccupancy = berths.map((berth) => {
      const berthSchedules = timeRangeSchedules.filter((s) => s.berthId === berth.id);
      let occupiedHours = 0;
      
      berthSchedules.forEach((s) => {
        const sStart = dayjs(s.plannedBerthingTime);
        const sEnd = dayjs(s.plannedDepartureTime);
        const overlapStart = sStart.isAfter(now) ? sStart : now;
        const overlapEnd = sEnd.isBefore(endTime) ? sEnd : endTime;
        if (overlapEnd.isAfter(overlapStart)) {
          occupiedHours += overlapEnd.diff(overlapStart, 'hour', true);
        }
      });
      
      const totalHours = 72;
      return {
        berthId: berth.id,
        berthName: berth.name,
        occupancyRate: Math.round((occupiedHours / totalHours) * 100),
        occupiedHours: Math.round(occupiedHours),
        availableHours: Math.round(totalHours - occupiedHours),
        scheduleCount: berthSchedules.length
      };
    });
    
    const pendingShips = schedules
      .filter((s) => s.status === '待靠泊' || s.status === '延期')
      .filter((s) => dayjs(s.plannedBerthingTime).isBefore(endTime))
      .map((s) => {
        const ship = ships.find((sh) => sh.id === s.shipId);
        const berth = berths.find((b) => b.id === s.berthId);
        return {
          shipId: s.shipId,
          shipName: ship?.name || '未知船舶',
          arrivalTime: ship?.arrivalTime || '',
          berthName: berth?.name || '未分配',
          status: s.status,
          waitHours: Math.round(dayjs(s.plannedBerthingTime).diff(now, 'hour', true))
        };
      })
      .sort((a, b) => a.waitHours - b.waitHours);
    
    const unresolvedConflicts = conflictWarnings.filter((w) => !w.resolved);
    const riskStats = {
      total: conflictWarnings.length,
      resolved: conflictWarnings.filter((w) => w.resolved).length,
      unresolved: unresolvedConflicts.length,
      byType: {
        tide: {
          total: conflictWarnings.filter((w) => w.type === 'tide').length,
          unresolved: unresolvedConflicts.filter((w) => w.type === 'tide').length
        },
        berth_capacity: {
          total: conflictWarnings.filter((w) => w.type === 'berth_capacity').length,
          unresolved: unresolvedConflicts.filter((w) => w.type === 'berth_capacity').length
        },
        simultaneous_operation: {
          total: conflictWarnings.filter((w) => w.type === 'simultaneous_operation').length,
          unresolved: unresolvedConflicts.filter((w) => w.type === 'simultaneous_operation').length
        },
        overtime: {
          total: conflictWarnings.filter((w) => w.type === 'overtime').length,
          unresolved: unresolvedConflicts.filter((w) => w.type === 'overtime').length
        },
        draft: {
          total: conflictWarnings.filter((w) => w.type === 'draft').length,
          unresolved: unresolvedConflicts.filter((w) => w.type === 'draft').length
        }
      },
      bySeverity: {
        error: {
          total: conflictWarnings.filter((w) => w.severity === 'error').length,
          unresolved: unresolvedConflicts.filter((w) => w.severity === 'error').length
        },
        warning: {
          total: conflictWarnings.filter((w) => w.severity === 'warning').length,
          unresolved: unresolvedConflicts.filter((w) => w.severity === 'warning').length
        },
        info: {
          total: conflictWarnings.filter((w) => w.severity === 'info').length,
          unresolved: unresolvedConflicts.filter((w) => w.severity === 'info').length
        }
      }
    };
    
    const overtimeSchedules = timeRangeSchedules
      .filter((s) => {
        const remainingHours = dayjs(s.plannedDepartureTime).diff(now, 'hour', true);
        return remainingHours > 0 && remainingHours < 24;
      })
      .map((s) => {
        const ship = ships.find((sh) => sh.id === s.shipId);
        const berth = berths.find((b) => b.id === s.berthId);
        const remainingHours = dayjs(s.plannedDepartureTime).diff(now, 'hour', true);
        return {
          scheduleId: s.id,
          shipName: ship?.name || '未知船舶',
          berthName: berth?.name || '未知泊位',
          plannedDepartureTime: s.plannedDepartureTime,
          remainingHours: Math.round(remainingHours),
          overtimeRisk: (remainingHours < 4 ? 'high' : remainingHours < 12 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        };
      })
      .sort((a, b) => a.remainingHours - b.remainingHours);
    
    const upcomingSchedules = schedules
      .filter((s) => {
        if (s.status !== '待靠泊' && s.status !== '延期') return false;
        const diffMinutes = dayjs(s.plannedBerthingTime).diff(now, 'minute', true);
        return diffMinutes > 0 && diffMinutes < 1440;
      })
      .map((s) => {
        const ship = ships.find((sh) => sh.id === s.shipId);
        const berth = berths.find((b) => b.id === s.berthId);
        return {
          scheduleId: s.id,
          shipName: ship?.name || '未知船舶',
          berthName: berth?.name || '未分配',
          plannedBerthingTime: s.plannedBerthingTime,
          countdownMinutes: Math.round(dayjs(s.plannedBerthingTime).diff(now, 'minute')),
          priority: s.priority
        };
      })
      .sort((a, b) => a.countdownMinutes - b.countdownMinutes);
    
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');
    const todayOperations = operationRecords.filter((r) => 
      dayjs(r.operationTime).isBetween(todayStart, todayEnd, null, '[]')
    );
    
    const operationStats = {
      todayInsert: todayOperations.filter((r) => r.operationType === 'insert').length,
      todayDelay: todayOperations.filter((r) => r.operationType === 'delay').length,
      todayCancel: todayOperations.filter((r) => r.operationType === 'cancel').length,
      todayReschedule: todayOperations.filter((r) => r.operationType === 'reschedule').length,
      todayModify: todayOperations.filter((r) => r.operationType === 'modify').length
    };
    
    return {
      timeRange: {
        start: now.format('YYYY-MM-DD HH:mm'),
        end: endTime.format('YYYY-MM-DD HH:mm')
      },
      berthOccupancy,
      pendingShips: {
        count: pendingShips.length,
        ships: pendingShips.slice(0, 10)
      },
      riskStats,
      overtimeRisk: {
        count: overtimeSchedules.length,
        schedules: overtimeSchedules.slice(0, 8)
      },
      upcomingSchedules: {
        count: upcomingSchedules.length,
        schedules: upcomingSchedules.slice(0, 6)
      },
      operationStats
    };
  },

  getUpcomingSchedules: (hours) => {
    const { schedules } = get();
    const now = dayjs();
    const endTime = now.add(hours, 'hour');
    
    return schedules
      .filter((s) => {
        if (s.status === '已取消') return false;
        const berthTime = dayjs(s.plannedBerthingTime);
        return berthTime.isAfter(now) && berthTime.isBefore(endTime);
      })
      .sort((a, b) => dayjs(a.plannedBerthingTime).valueOf() - dayjs(b.plannedBerthingTime).valueOf());
  },

  getFilteredSchedules: () => {
    const { schedules, ships, filterParams } = get();
    let filtered = [...schedules];
    
    if (filterParams.shipName) {
      const matchingShipIds = ships
        .filter((s) => s.name.includes(filterParams.shipName!))
        .map((s) => s.id);
      filtered = filtered.filter((s) => matchingShipIds.includes(s.shipId));
    }
    
    if (filterParams.voyage) {
      const matchingShipIds = ships
        .filter((s) => s.voyage.includes(filterParams.voyage!))
        .map((s) => s.id);
      filtered = filtered.filter((s) => matchingShipIds.includes(s.shipId));
    }
    
    if (filterParams.agent) {
      const matchingShipIds = ships
        .filter((s) => s.agent.includes(filterParams.agent!))
        .map((s) => s.id);
      filtered = filtered.filter((s) => matchingShipIds.includes(s.shipId));
    }
    
    if (filterParams.cargoType) {
      const matchingShipIds = ships
        .filter((s) => s.cargoType === filterParams.cargoType)
        .map((s) => s.id);
      filtered = filtered.filter((s) => matchingShipIds.includes(s.shipId));
    }
    
    if (filterParams.status) {
      filtered = filtered.filter((s) => s.status === filterParams.status);
    }
    
    if (filterParams.startDate) {
      filtered = filtered.filter((s) =>
        dayjs(s.plannedBerthingTime).isAfter(dayjs(filterParams.startDate))
      );
    }
    
    if (filterParams.endDate) {
      filtered = filtered.filter((s) =>
        dayjs(s.plannedBerthingTime).isBefore(dayjs(filterParams.endDate).endOf('day'))
      );
    }
    
    return filtered.sort((a, b) => a.priority - b.priority);
  },

  getShipById: (id) => get().ships.find((s) => s.id === id),
  getBerthById: (id) => get().berths.find((b) => b.id === id),
  getScheduleById: (id) => get().schedules.find((s) => s.id === id),

  initializeMockData: () => {
    set({
      ships: mockShips,
      berths: mockBerths,
      schedules: mockSchedules,
      tideData: mockTideData,
      shiftRecords: mockShiftRecords
    });
    setTimeout(() => get().checkConflicts(), 100);
  }
    }),
    {
      name: 'port-scheduler-storage',
      partialize: (state) => ({
        ships: state.ships,
        berths: state.berths,
        schedules: state.schedules,
        tideData: state.tideData,
        shiftRecords: state.shiftRecords,
        operationRecords: state.operationRecords,
        adjustmentPlans: state.adjustmentPlans,
        todoItems: state.todoItems,
        currentOperator: state.currentOperator,
        conflictWarnings: state.conflictWarnings
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => state.checkConflicts(), 100);
        }
      }
    }
  )
);
