import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Ship, Schedule, Berth, OperationRecord } from '@/types';

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    '待靠泊': '#1890ff',
    '靠泊中': '#fa8c16',
    '作业中': '#52c41a',
    '已离港': '#8c8c8c',
    '已取消': '#f5222d',
    '延期': '#faad14'
  };
  return colorMap[status] || '#1890ff';
};

export const getStatusClass = (status: string): string => {
  const classMap: Record<string, string> = {
    '待靠泊': 'status-pending',
    '靠泊中': 'status-berthing',
    '作业中': 'status-working',
    '已离港': 'status-departed',
    '已取消': 'status-cancelled',
    '延期': 'status-delayed'
  };
  return classMap[status] || 'status-pending';
};

export const getCargoColor = (cargoType: string): string => {
  const colorMap: Record<string, string> = {
    '集装箱': '#1890ff',
    '散货': '#52c41a',
    '液体化工': '#722ed1',
    '成品油': '#eb2f96',
    'LNG': '#fa8c16',
    '粮食': '#a0d911',
    '钢材': '#faad14',
    '其他': '#8c8c8c'
  };
  return colorMap[cargoType] || '#1890ff';
};

export const getConflictTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    tide: '潮汐冲突',
    berth_capacity: '泊位能力不足',
    simultaneous_operation: '同时作业冲突',
    overtime: '超时风险',
    draft: '吃水限制'
  };
  return labelMap[type] || type;
};

export const getOperationTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    insert: '临时插队',
    delay: '延期离港',
    cancel: '取消靠泊',
    modify: '修改调度',
    reschedule: '重新安排'
  };
  return labelMap[type] || type;
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm');
};

export const calculateDuration = (start: string | Date, end: string | Date): number => {
  return dayjs(end).diff(dayjs(start), 'hour', true);
};

export interface ExportScheduleData {
  shipName: string;
  shipLength: number;
  draft: number;
  cargoType: string;
  cargoWeight: number;
  agent: string;
  berthName: string;
  plannedBerthingTime: string;
  plannedDepartureTime: string;
  operationDuration: number;
  status: string;
  priority: number;
  remarks?: string;
}

export const prepareScheduleExportData = (
  schedules: Schedule[],
  ships: Ship[],
  berths: Berth[]
): ExportScheduleData[] => {
  return schedules.map((schedule) => {
    const ship = ships.find((s) => s.id === schedule.shipId);
    const berth = berths.find((b) => b.id === schedule.berthId);
    return {
      shipName: ship?.name || '-',
      shipLength: ship?.length || 0,
      draft: ship?.draft || 0,
      cargoType: ship?.cargoType || '-',
      cargoWeight: ship?.cargoWeight || 0,
      agent: ship?.agent || '-',
      berthName: berth?.name || '-',
      plannedBerthingTime: formatDateTime(schedule.plannedBerthingTime),
      plannedDepartureTime: formatDateTime(schedule.plannedDepartureTime),
      operationDuration: schedule.operationDuration,
      status: schedule.status,
      priority: schedule.priority,
      remarks: schedule.remarks
    };
  });
};

export interface ExportHistoryData {
  operationTime: string;
  operator: string;
  operationType: string;
  shipName: string;
  reason: string;
  oldValue?: string;
  newValue?: string;
}

export const prepareHistoryExportData = (
  records: OperationRecord[],
  schedules: Schedule[],
  ships: Ship[]
): ExportHistoryData[] => {
  return records.map((record) => {
    const schedule = schedules.find((s) => s.id === record.scheduleId);
    const ship = schedule ? ships.find((s) => s.id === schedule.shipId) : null;
    return {
      operationTime: formatDateTime(record.operationTime),
      operator: record.operator,
      operationType: getOperationTypeLabel(record.operationType),
      shipName: ship?.name || '-',
      reason: record.reason,
      oldValue: record.oldValue,
      newValue: record.newValue
    };
  });
};

export const exportToExcel = <T>(
  data: T[],
  sheetName: string,
  fileName: string
): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
};

export const exportDailyPlan = (
  schedules: Schedule[],
  ships: Ship[],
  berths: Berth[],
  date: string
): void => {
  const daySchedules = schedules.filter((s) =>
    dayjs(s.plannedBerthingTime).isSame(dayjs(date), 'day')
  );
  const data = prepareScheduleExportData(daySchedules, ships, berths);
  exportToExcel(data, '当日调度计划', `当日调度计划_${dayjs(date).format('YYYYMMDD')}`);
};

export const exportHistoryRecords = (
  records: OperationRecord[],
  schedules: Schedule[],
  ships: Ship[],
  startDate?: string,
  endDate?: string
): void => {
  let filteredRecords = records;
  if (startDate) {
    filteredRecords = filteredRecords.filter((r) =>
      dayjs(r.operationTime).isAfter(dayjs(startDate))
    );
  }
  if (endDate) {
    filteredRecords = filteredRecords.filter((r) =>
      dayjs(r.operationTime).isBefore(dayjs(endDate).endOf('day'))
    );
  }
  const data = prepareHistoryExportData(filteredRecords, schedules, ships);
  exportToExcel(data, '历史调整记录', '历史调整记录');
};

export const generateHandoverSummary = (
  schedules: Schedule[],
  ships: Ship[],
  berths: Berth[],
  shiftType: string
): string => {
  const todaySchedules = schedules.filter((s) =>
    dayjs(s.plannedBerthingTime).isSame(dayjs(), 'day')
  );
  
  const pendingCount = todaySchedules.filter((s) => s.status === '待靠泊').length;
  const workingCount = todaySchedules.filter((s) => s.status === '作业中').length;
  const completedCount = todaySchedules.filter((s) => s.status === '已离港').length;
  const conflictCount = todaySchedules.filter(
    (s) => s.conflictWarnings && s.conflictWarnings.length > 0
  ).length;
  
  const summary = `
【交接班摘要】
交接班时间：${dayjs().format('YYYY-MM-DD HH:mm')}
班次：${shiftType}

今日调度统计：
- 计划靠泊船舶：${todaySchedules.length} 艘
- 待靠泊：${pendingCount} 艘
- 作业中：${workingCount} 艘
- 已离港：${completedCount} 艘
- 存在冲突：${conflictCount} 艘

待办事项：
${todaySchedules
  .filter((s) => s.status === '待靠泊')
  .slice(0, 5)
  .map((s) => {
    const ship = ships.find((sh) => sh.id === s.shipId);
    const berth = berths.find((b) => b.id === s.berthId);
    return `- ${ship?.name || '未知'} / ${berth?.name || '未知泊位'} / ${dayjs(s.plannedBerthingTime).format('HH:mm')}`;
  })
  .join('\n')}

注意事项：
${todaySchedules
  .filter((s) => s.conflictWarnings && s.conflictWarnings.length > 0)
  .map((s) => {
    const ship = ships.find((sh) => sh.id === s.shipId);
    const warnings = s.conflictWarnings.map((w) => w.message).join('; ');
    return `- ${ship?.name || '未知'}: ${warnings}`;
  })
  .join('\n')}
  `.trim();
  
  return summary;
};
