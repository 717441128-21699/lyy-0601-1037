import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Ship, Berth, Schedule, TideData, ShiftRecord, ConflictWarning, FilterParams, OperationRecord } from '@/types';
import { mockShips, mockBerths, mockSchedules, mockTideData, mockShiftRecords } from '@/data/mockData';

interface SchedulerState {
  ships: Ship[];
  berths: Berth[];
  schedules: Schedule[];
  tideData: TideData[];
  shiftRecords: ShiftRecord[];
  operationRecords: OperationRecord[];
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
  
  rescheduleShip: (scheduleId: string, newBerthId: string, newBerthingTime: string) => void;
  
  addOperationRecord: (record: Omit<OperationRecord, 'id' | 'operationTime'>) => void;
  
  checkConflicts: () => ConflictWarning[];
  
  addShiftRecord: (record: Omit<ShiftRecord, 'id' | 'createTime'>) => void;
  
  getFilteredSchedules: () => Schedule[];
  getShipById: (id: string) => Ship | undefined;
  getBerthById: (id: string) => Berth | undefined;
  getScheduleById: (id: string) => Schedule | undefined;
  
  initializeMockData: () => void;
}

const generateId = (prefix: string) => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
};

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  ships: [],
  berths: [],
  schedules: [],
  tideData: [],
  shiftRecords: [],
  operationRecords: [],
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

  rescheduleShip: (scheduleId, newBerthId, newBerthingTime) => {
    const schedule = get().getScheduleById(scheduleId);
    if (!schedule) return;
    
    const newDepartureTime = dayjs(newBerthingTime).add(schedule.operationDuration, 'hour').format('YYYY-MM-DD HH:mm');
    
    get().updateSchedule(scheduleId, {
      berthId: newBerthId,
      plannedBerthingTime: newBerthingTime,
      plannedDepartureTime: newDepartureTime
    });
    
    get().addOperationRecord({
      scheduleId,
      operationType: 'reschedule',
      operator: get().currentOperator,
      reason: '拖拽调整泊位/时间',
      oldValue: `泊位: ${schedule.berthId}, 靠泊: ${schedule.plannedBerthingTime}`,
      newValue: `泊位: ${newBerthId}, 靠泊: ${newBerthingTime}`
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

  checkConflicts: () => {
    const { schedules, ships, berths, tideData } = get();
    const warnings: ConflictWarning[] = [];
    
    const MIN_TIDE_HEIGHT = 3.0;
    
    schedules.forEach((schedule) => {
      if (schedule.status === '已取消') return;
      
      const ship = ships.find((s) => s.id === schedule.shipId);
      const berth = berths.find((b) => b.id === schedule.berthId);
      
      if (!ship || !berth) return;
      
      if (ship.length > berth.maxLength) {
        warnings.push({
          id: generateId('WARN'),
          type: 'berth_capacity',
          severity: 'error',
          message: `船长(${ship.length}m)超出泊位${berth.name}最大长度(${berth.maxLength}m)`,
          scheduleId: schedule.id,
          resolved: false,
          createTime: dayjs().format('YYYY-MM-DD HH:mm')
        });
      }
      
      if (ship.draft > berth.maxDraft) {
        warnings.push({
          id: generateId('WARN'),
          type: 'draft',
          severity: 'error',
          message: `吃水(${ship.draft}m)超出泊位${berth.name}最大吃水(${berth.maxDraft}m)`,
          scheduleId: schedule.id,
          resolved: false,
          createTime: dayjs().format('YYYY-MM-DD HH:mm')
        });
      }
      
      if (!berth.allowedCargoTypes.includes(ship.cargoType)) {
        warnings.push({
          id: generateId('WARN'),
          type: 'berth_capacity',
          severity: 'error',
          message: `泊位${berth.name}不允许停靠${ship.cargoType}类型船舶`,
          scheduleId: schedule.id,
          resolved: false,
          createTime: dayjs().format('YYYY-MM-DD HH:mm')
        });
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
          warnings.push({
            id: generateId('WARN'),
            type: 'tide',
            severity: 'warning',
            message: `预计靠泊时潮高(${relevantTide.height.toFixed(1)}m)低于安全水深(${MIN_TIDE_HEIGHT}m)`,
            scheduleId: schedule.id,
            resolved: false,
            createTime: dayjs().format('YYYY-MM-DD HH:mm')
          });
        }
      }
      
      const maxOperationHours = 24;
      if (schedule.operationDuration > maxOperationHours) {
        warnings.push({
          id: generateId('WARN'),
          type: 'overtime',
          severity: 'warning',
          message: `作业时长(${schedule.operationDuration}小时)超出最大作业时长限制`,
          scheduleId: schedule.id,
          resolved: false,
          createTime: dayjs().format('YYYY-MM-DD HH:mm')
        });
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
          warnings.push({
            id: generateId('WARN'),
            type: 'simultaneous_operation',
            severity: 'error',
            message: `与调度${schedule2.id}在同一泊位作业时间冲突`,
            scheduleId: schedule1.id,
            relatedScheduleIds: [schedule2.id],
            resolved: false,
            createTime: dayjs().format('YYYY-MM-DD HH:mm')
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

  addShiftRecord: (record) => {
    const newRecord: ShiftRecord = {
      ...record,
      id: generateId('SHIFT'),
      createTime: dayjs().format('YYYY-MM-DD HH:mm')
    };
    set((state) => ({ shiftRecords: [...state.shiftRecords, newRecord] }));
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
}));
