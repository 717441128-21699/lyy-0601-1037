import dayjs from 'dayjs';
import type { Ship, Berth, Schedule, TideData, ShiftRecord } from '@/types';

export const mockShips: Ship[] = [
  {
    id: 'S001',
    name: '中远之星',
    imo: '9785432',
    voyage: 'COSCO-2024-001',
    length: 280,
    draft: 12.5,
    grossTonnage: 85000,
    cargoType: '集装箱',
    cargoWeight: 65000,
    agent: '中远海运代理',
    carrier: '中远海运',
    arrivalTime: dayjs().hour(6).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 8,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S002',
    name: '中海环球',
    imo: '9876543',
    voyage: 'CSCL-2024-015',
    length: 320,
    draft: 14.5,
    grossTonnage: 120000,
    cargoType: '集装箱',
    cargoWeight: 95000,
    agent: '中海船务代理',
    carrier: '中海集运',
    arrivalTime: dayjs().hour(8).minute(30).format('YYYY-MM-DD HH:mm'),
    operationDuration: 12,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S003',
    name: '山东海岳',
    imo: '9654321',
    voyage: 'SDHY-2024-008',
    length: 220,
    draft: 10.5,
    grossTonnage: 55000,
    cargoType: '散货',
    cargoWeight: 45000,
    agent: '山东海员代理',
    carrier: '山东海运',
    arrivalTime: dayjs().hour(10).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 10,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S004',
    name: '宁波先锋',
    imo: '9543210',
    voyage: 'NBXF-2024-023',
    length: 180,
    draft: 9.0,
    grossTonnage: 35000,
    cargoType: '液体化工',
    cargoWeight: 28000,
    agent: '宁波外轮代理',
    carrier: '宁波海运',
    arrivalTime: dayjs().hour(14).minute(30).format('YYYY-MM-DD HH:mm'),
    operationDuration: 6,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S005',
    name: '广东华润',
    imo: '9432109',
    voyage: 'GDHR-2024-012',
    length: 250,
    draft: 11.5,
    grossTonnage: 72000,
    cargoType: '粮食',
    cargoWeight: 58000,
    agent: '广东外运代理',
    carrier: '华润航运',
    arrivalTime: dayjs().hour(16).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 9,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S006',
    name: '上海宝钢',
    imo: '9321098',
    voyage: 'SHBG-2024-007',
    length: 290,
    draft: 13.5,
    grossTonnage: 92000,
    cargoType: '钢材',
    cargoWeight: 75000,
    agent: '上海外轮代理',
    carrier: '宝钢航运',
    arrivalTime: dayjs().add(1, 'day').hour(2).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 11,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S007',
    name: '福建能源',
    imo: '9210987',
    voyage: 'FJNY-2024-019',
    length: 200,
    draft: 9.8,
    grossTonnage: 48000,
    cargoType: '成品油',
    cargoWeight: 38000,
    agent: '福建船务代理',
    carrier: '福建能源',
    arrivalTime: dayjs().add(1, 'day').hour(5).minute(30).format('YYYY-MM-DD HH:mm'),
    operationDuration: 7,
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'S008',
    name: '海南燃气',
    imo: '9109876',
    voyage: 'HNQR-2024-003',
    length: 260,
    draft: 12.0,
    grossTonnage: 78000,
    cargoType: 'LNG',
    cargoWeight: 62000,
    agent: '海南外轮代理',
    carrier: '中海石油气',
    arrivalTime: dayjs().add(1, 'day').hour(10).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 14,
    specialRequirements: 'LNG专用泊位，需防爆作业',
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  }
];

export const mockBerths: Berth[] = [
  {
    id: 'B001',
    name: '1号集装箱泊位',
    code: 'CT-01',
    maxLength: 350,
    maxDraft: 15.0,
    allowedCargoTypes: ['集装箱'],
    maxShips: 1,
    status: '空闲',
    position: 1,
    description: '大型集装箱专用泊位'
  },
  {
    id: 'B002',
    name: '2号集装箱泊位',
    code: 'CT-02',
    maxLength: 320,
    maxDraft: 14.5,
    allowedCargoTypes: ['集装箱'],
    maxShips: 1,
    status: '空闲',
    position: 2,
    description: '中型集装箱泊位'
  },
  {
    id: 'B003',
    name: '3号散货泊位',
    code: 'BK-01',
    maxLength: 280,
    maxDraft: 13.0,
    allowedCargoTypes: ['散货', '粮食', '钢材'],
    maxShips: 1,
    status: '空闲',
    position: 3,
    description: '散货通用泊位'
  },
  {
    id: 'B004',
    name: '4号液体化工泊位',
    code: 'LC-01',
    maxLength: 220,
    maxDraft: 11.0,
    allowedCargoTypes: ['液体化工', '成品油'],
    maxShips: 1,
    status: '空闲',
    position: 4,
    description: '液体化工专用泊位'
  },
  {
    id: 'B005',
    name: '5号LNG泊位',
    code: 'LNG-01',
    maxLength: 300,
    maxDraft: 13.5,
    allowedCargoTypes: ['LNG'],
    maxShips: 1,
    status: '空闲',
    position: 5,
    description: 'LNG专用泊位，防爆设施齐全'
  },
  {
    id: 'B006',
    name: '6号通用泊位',
    code: 'GN-01',
    maxLength: 200,
    maxDraft: 10.0,
    allowedCargoTypes: ['散货', '钢材', '粮食', '其他'],
    maxShips: 1,
    status: '维护中',
    position: 6,
    description: '通用泊位，维护中'
  }
];

export const mockSchedules: Schedule[] = [
  {
    id: 'SCH001',
    shipId: 'S001',
    berthId: 'B001',
    plannedBerthingTime: dayjs().hour(7).minute(0).format('YYYY-MM-DD HH:mm'),
    plannedDepartureTime: dayjs().hour(15).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 8,
    status: '待靠泊',
    priority: 1,
    conflictWarnings: [],
    operationHistory: [],
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'SCH002',
    shipId: 'S002',
    berthId: 'B002',
    plannedBerthingTime: dayjs().hour(10).minute(0).format('YYYY-MM-DD HH:mm'),
    plannedDepartureTime: dayjs().hour(22).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 12,
    status: '待靠泊',
    priority: 2,
    conflictWarnings: [],
    operationHistory: [],
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'SCH003',
    shipId: 'S003',
    berthId: 'B003',
    plannedBerthingTime: dayjs().hour(12).minute(0).format('YYYY-MM-DD HH:mm'),
    plannedDepartureTime: dayjs().hour(22).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 10,
    status: '待靠泊',
    priority: 3,
    conflictWarnings: [],
    operationHistory: [],
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  },
  {
    id: 'SCH004',
    shipId: 'S004',
    berthId: 'B004',
    plannedBerthingTime: dayjs().hour(16).minute(0).format('YYYY-MM-DD HH:mm'),
    plannedDepartureTime: dayjs().hour(22).minute(0).format('YYYY-MM-DD HH:mm'),
    operationDuration: 6,
    status: '待靠泊',
    priority: 4,
    conflictWarnings: [],
    operationHistory: [],
    createTime: dayjs().format('YYYY-MM-DD HH:mm'),
    updateTime: dayjs().format('YYYY-MM-DD HH:mm')
  }
];

export const mockTideData: TideData[] = Array.from({ length: 30 }, (_, i) => {
  const date = dayjs().add(Math.floor(i / 4), 'day');
  const timeOfDay = i % 4;
  const isHigh = timeOfDay % 2 === 0;
  const hours = [0, 6, 12, 18][timeOfDay];
  
  return {
    id: `TIDE-${i + 1}`,
    date: date.format('YYYY-MM-DD'),
    time: `${String(hours).padStart(2, '0')}:00`,
    height: isHigh ? 5.5 + Math.random() * 1.5 : 1.0 + Math.random() * 1.5,
    type: isHigh ? 'high' : 'low'
  };
});

export const mockShiftRecords: ShiftRecord[] = [
  {
    id: 'SHIFT001',
    shiftDate: dayjs().format('YYYY-MM-DD'),
    shiftType: '早班',
    operator: '张调度',
    nextOperator: '李调度',
    handoverTime: dayjs().hour(8).minute(0).format('YYYY-MM-DD HH:mm'),
    schedules: ['SCH001', 'SCH002'],
    summary: '今日早班共安排4艘船舶靠泊，中远之星和中海环球已完成作业计划确认。',
    pendingMatters: '需确认山东海岳的作业机械配置',
    createTime: dayjs().format('YYYY-MM-DD HH:mm')
  }
];
