import { useState, useRef, useEffect } from 'react';
import {
  Button,
  DatePicker,
  Select,
  Tooltip,
  Popover,
  Badge,
  Card,
  Tag,
  Space,
  message,
  Modal
} from 'antd';
import {
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { Schedule, Berth } from '@/types';
import {
  formatDateTime,
  formatTime,
  getStatusColor,
  getStatusClass,
  getCargoColor,
  getConflictTypeLabel
} from '@/utils';

const { Option } = Select;

interface DragPreview {
    scheduleId: string;
    targetBerthId: string | null;
    targetTime: dayjs.Dayjs | null;
    isValid: boolean;
    validationMessage: string;
  }

const BerthGantt = () => {
  const [startDate, setStartDate] = useState(dayjs());
  const [timeRange, setTimeRange] = useState(48);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggingSchedule, setDraggingSchedule] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());

  const schedules = useSchedulerStore((state) => state.schedules);
  const berths = useSchedulerStore((state) => state.berths);
  const ships = useSchedulerStore((state) => state.ships);
  const tideData = useSchedulerStore((state) => state.tideData);
  const rescheduleShip = useSchedulerStore((state) => state.rescheduleShip);
  const checkConflicts = useSchedulerStore((state) => state.checkConflicts);
  const deleteSchedule = useSchedulerStore((state) => state.deleteSchedule);
  const selectedScheduleId = useSchedulerStore((state) => state.selectedScheduleId);
  const setSelectedScheduleId = useSchedulerStore((state) => state.setSelectedScheduleId);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const cellWidth = 80 * zoomLevel;
  const hoursPerCell = 2;
  const totalCells = Math.ceil(timeRange / hoursPerCell);

  const getCellLeft = (date: dayjs.Dayjs) => {
    const diff = date.diff(startDate, 'hour', true);
    return (diff / hoursPerCell) * cellWidth;
  };

  const getDateFromPosition = (x: number, containerRect: DOMRect) => {
    const relativeX = x - containerRect.left;
    const hours = (relativeX / cellWidth) * hoursPerCell;
    return startDate.add(hours, 'hour');
  };

  const getSchedulesByBerth = (berthId: string) => {
    return schedules
      .filter((s) => s.berthId === berthId && s.status !== '已取消')
      .sort((a, b) => dayjs(a.plannedBerthingTime).valueOf() - dayjs(b.plannedBerthingTime).valueOf());
  };

  const getTaskWidth = (schedule: Schedule) => {
    const start = dayjs(schedule.plannedBerthingTime);
    const end = dayjs(schedule.plannedDepartureTime);
    const duration = end.diff(start, 'hour', true);
    return (duration / hoursPerCell) * cellWidth;
  };

  const validateDragTarget = (
    targetBerthId: string | null,
    targetTime: dayjs.Dayjs | null,
    schedule: Schedule | undefined
  ): { isValid: boolean; message: string } => {
    if (!targetBerthId || !targetTime || !schedule) {
      return { isValid: false, message: '请拖到有效的泊位和时间区域' };
    }

    if (targetTime.isBefore(startDate) || targetTime.isAfter(startDate.add(timeRange, 'hour'))) {
      return { isValid: false, message: '请在可见时间范围内调整' };
    }

    const ship = ships.find((s) => s.id === schedule.shipId);
    const berth = berths.find((b) => b.id === targetBerthId);

    if (ship && berth) {
      if (ship.length > berth.maxLength) {
        return { isValid: false, message: `船长(${ship.length}m)超出泊位最大长度(${berth.maxLength}m)` };
      }
      if (ship.draft > berth.maxDraft) {
        return { isValid: false, message: `吃水(${ship.draft}m)超出泊位最大吃水(${berth.maxDraft}m)` };
      }
      if (!berth.allowedCargoTypes.includes(ship.cargoType)) {
        return { isValid: false, message: `该泊位不允许停靠${ship.cargoType}类型船舶` };
      }
    }

    return { isValid: true, message: '可以停靠' };
  };

  const handleDragStart = (e: React.MouseEvent, scheduleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSchedule(scheduleId);
    setDragPreview({
      scheduleId,
      targetBerthId: null,
      targetTime: null,
      isValid: false,
      validationMessage: '拖动到目标位置'
    });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingSchedule || !ganttRef.current || !dragPreview) return;
    
    const timelineBody = ganttRef.current.querySelector('.gantt-timeline-body');
    if (!timelineBody) return;
    
    const bodyRect = timelineBody.getBoundingClientRect();
    const rowElements = timelineBody.querySelectorAll('.gantt-timeline-row');
    
    let targetBerthId: string | null = null;
    rowElements.forEach((row, index) => {
      const rowRect = row.getBoundingClientRect();
      if (e.clientY >= rowRect.top && e.clientY <= rowRect.bottom) {
        targetBerthId = berths[index]?.id;
      }
    });
    
    const newBerthingTime = getDateFromPosition(e.clientX, bodyRect);
    const roundedTime = newBerthingTime
      .set('minute', Math.round(newBerthingTime.minute() / 30) * 30)
      .set('second', 0);
    
    const schedule = schedules.find((s) => s.id === draggingSchedule);
    const validation = validateDragTarget(targetBerthId, roundedTime, schedule);
    
    setDragPreview({
      scheduleId: draggingSchedule,
      targetBerthId,
      targetTime: roundedTime,
      isValid: validation.isValid,
      validationMessage: validation.message
    });
  };

  const handleDragEnd = (e: React.MouseEvent) => {
    if (!draggingSchedule || !dragPreview) {
      setDraggingSchedule(null);
      setDragPreview(null);
      return;
    }

    const schedule = schedules.find((s) => s.id === draggingSchedule);
    const berth = berths.find((b) => b.id === dragPreview.targetBerthId);
    
    if (!dragPreview.isValid || !schedule || !dragPreview.targetTime) {
      message.error(dragPreview.validationMessage || '无法放置在此位置');
      setDraggingSchedule(null);
      setDragPreview(null);
      return;
    }

    Modal.confirm({
      title: '确认调整调度',
      content: (
        <div>
          <p>确定将以下调度调整到新位置吗？</p>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 8 }}>
            <p style={{ margin: '4px 0' }}>
              <strong>船舶：</strong>{ships.find(s => s.id === schedule.shipId)?.name}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>原泊位：</strong>{berths.find(b => b.id === schedule.berthId)?.name}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>原靠泊时间：</strong>{formatDateTime(schedule.plannedBerthingTime)}
            </p>
            <p style={{ margin: '4px 0', borderTop: '1px dashed #ddd', paddingTop: 8 }}>
              <strong>新泊位：</strong>{berth?.name}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>新靠泊时间：</strong>{formatDateTime(dragPreview.targetTime.toDate())}
            </p>
          </div>
        </div>
      ),
      okText: '确认调整',
      cancelText: '取消',
      onOk: () => {
        rescheduleShip(
          draggingSchedule, 
          dragPreview.targetBerthId!, 
          dragPreview.targetTime!.format('YYYY-MM-DD HH:mm'),
          '拖拽调整泊位/时间'
        );
        message.success('调度已更新，正在重新检查冲突...');
        setDraggingSchedule(null);
        setDragPreview(null);
        setTimeout(() => {
          checkConflicts();
          message.info('冲突检查已完成');
        }, 200);
      },
      onCancel: () => {
        setDraggingSchedule(null);
        setDragPreview(null);
      }
    });
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setSelectedScheduleId(schedule.id);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此调度计划吗？',
      onOk: () => {
        deleteSchedule(scheduleId);
        message.success('删除成功');
        setSelectedSchedule(null);
      }
    });
  };

  const handleRefresh = () => {
    checkConflicts();
    message.success('已刷新并重新检查冲突');
  };

  const renderScheduleDetail = (schedule: Schedule) => {
    const ship = ships.find((s) => s.id === schedule.shipId);
    const berth = berths.find((b) => b.id === schedule.berthId);
    
    return (
      <div style={{ width: 320 }}>
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{ship?.name}</h4>
          <Tag color={getStatusColor(schedule.status)}>{schedule.status}</Tag>
          <Tag color={getCargoColor(ship?.cargoType || '')}>{ship?.cargoType}</Tag>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p><strong>航次：</strong>{ship?.voyage}</p>
          <p><strong>泊位：</strong>{berth?.name}</p>
          <p><strong>船长：</strong>{ship?.length}m | <strong>吃水：</strong>{ship?.draft}m</p>
          <p><strong>货量：</strong>{ship?.cargoWeight?.toLocaleString()}t</p>
          <p><strong>代理：</strong>{ship?.agent}</p>
          <p><strong>预计靠泊：</strong>{formatDateTime(schedule.plannedBerthingTime)}</p>
          <p><strong>预计离港：</strong>{formatDateTime(schedule.plannedDepartureTime)}</p>
          <p><strong>作业时长：</strong>{schedule.operationDuration}小时</p>
          {schedule.remarks && <p><strong>备注：</strong>{schedule.remarks}</p>}
        </div>
        {schedule.conflictWarnings && schedule.conflictWarnings.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              <WarningOutlined style={{ color: '#faad14' }} /> 冲突警告
            </p>
            {schedule.conflictWarnings.map((w) => (
              <div
                key={w.id}
                className={`conflict-badge conflict-${w.severity}`}
                style={{ marginBottom: 4, width: '100%' }}
              >
                {getConflictTypeLabel(w.type)}：{w.message}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {}}
            style={{ flex: 1 }}
          >
            编辑
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSchedule(schedule.id)}
            style={{ flex: 1 }}
          >
            删除
          </Button>
        </div>
      </div>
    );
  };

  const renderTideChart = () => {
    const dayTides = tideData.filter((t) => t.date === startDate.format('YYYY-MM-DD'));
    if (dayTides.length === 0) return null;
    
    const maxHeight = Math.max(...dayTides.map((t) => t.height));
    const minHeight = Math.min(...dayTides.map((t) => t.height));
    
    return (
      <div className="tide-chart-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>
            <ClockCircleOutlined /> {startDate.format('YYYY-MM-DD')} 潮汐信息
          </h4>
          <div style={{ fontSize: 12, color: '#666' }}>
            最高潮: {maxHeight.toFixed(1)}m | 最低潮: {minHeight.toFixed(1)}m
          </div>
        </div>
        <div className="tide-chart" style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              bottom: (3.0 / (maxHeight + 1)) * 180,
              left: 0,
              right: 0,
              borderTop: '2px dashed #ff4d4f',
              fontSize: 11,
              color: '#ff4d4f',
              paddingLeft: 4
            }}
          >
            安全水深 3.0m
          </div>
          {dayTides.map((tide, index) => {
            const height = (tide.height / (maxHeight + 1)) * 180;
            const left = (index / (dayTides.length - 1 || 1)) * (totalCells * cellWidth - 40) + 20;
            return (
              <Tooltip
                key={tide.id}
                title={`${tide.time} - 潮高 ${tide.height.toFixed(1)}m (${tide.type === 'high' ? '高潮' : '低潮'})`}
              >
                <div>
                  <div
                    className="tide-bar"
                    style={{
                      left,
                      height,
                      background: tide.type === 'high' 
                        ? 'linear-gradient(to top, #1890ff, #69c0ff)' 
                        : 'linear-gradient(to top, #52c41a, #95de64)'
                    }}
                  />
                  <span className="tide-value" style={{ left }}>
                    {tide.height.toFixed(1)}
                  </span>
                  <span className="tide-label" style={{ left }}>
                    {tide.time}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeHeader = () => {
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const time = startDate.add(i * hoursPerCell, 'hour');
      const isMidnight = time.hour() === 0;
      cells.push(
        <div
          key={i}
          className="gantt-time-cell"
          style={{
            minWidth: cellWidth,
            background: isMidnight ? '#f0f5ff' : undefined,
            fontWeight: isMidnight ? 600 : undefined,
            color: isMidnight ? '#1890ff' : undefined
          }}
        >
          <div style={{ fontSize: 11, color: '#999' }}>
            {isMidnight ? time.format('MM-DD') : ''}
          </div>
          <div>{formatTime(time.toDate())}</div>
        </div>
      );
    }
    return cells;
  };

  const renderCurrentTimeLine = () => {
    const left = getCellLeft(currentTime);
    if (left < 0 || left > totalCells * cellWidth) return null;
    
    return (
      <div
        className="gantt-current-time"
        style={{ left }}
      >
        <Tooltip title={`当前时间: ${currentTime.format('YYYY-MM-DD HH:mm')}`}>
          <div style={{ position: 'absolute', top: -24, left: -20, fontSize: 11, color: '#ff4d4f', whiteSpace: 'nowrap' }}>
            {currentTime.format('HH:mm')}
          </div>
        </Tooltip>
      </div>
    );
  };

  const getBerthStatus = (berth: Berth) => {
    const now = dayjs();
    const berthSchedules = getSchedulesByBerth(berth.id);
    const activeSchedule = berthSchedules.find((s) =>
      now.isAfter(dayjs(s.plannedBerthingTime)) && now.isBefore(dayjs(s.plannedDepartureTime))
    );
    
    if (berth.status === '维护中') return 'maintenance';
    if (activeSchedule) return 'occupied';
    return 'available';
  };

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2 className="page-title">泊位甘特图</h2>
        <div className="action-bar">
          <Space>
            <DatePicker
              value={startDate}
              onChange={(date) => date && setStartDate(date.startOf('day'))}
              style={{ width: 160 }}
            />
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 120 }}
            >
              <Option value={24}>24小时</Option>
              <Option value={48}>48小时</Option>
              <Option value={72}>72小时</Option>
              <Option value={168}>7天</Option>
            </Select>
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
            />
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.5))}
            />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </div>
      </div>

      <div className="filter-bar">
        <Space size={16}>
          <Badge status="processing" text="作业中" />
          <Badge status="warning" text="待靠泊" />
          <Badge status="success" text="已离港" />
          <Badge status="default" text="已取消" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />
            <span style={{ fontSize: 12 }}>严重冲突</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#faad14' }} />
            <span style={{ fontSize: 12 }}>预警</span>
          </div>
        </Space>
        <span style={{ color: '#666', marginLeft: 'auto' }}>
          提示：拖拽任务块可调整靠泊时间和泊位
        </span>
      </div>

      {renderTideChart()}

      <div
        className="gantt-container"
        ref={ganttRef}
        style={{ flex: 1 }}
        onMouseMove={(e) => draggingSchedule && handleDragMove(e)}
        onMouseUp={(e) => draggingSchedule && handleDragEnd(e)}
        onMouseLeave={() => {
          setDraggingSchedule(null);
          setDragPreview(null);
        }}
      >
        <div className="gantt-header">
          <div className="gantt-resource-header">泊位</div>
          <div className="gantt-timeline-header" style={{ width: totalCells * cellWidth }}>
            {renderTimeHeader()}
          </div>
        </div>

        <div className="gantt-body">
          <div className="gantt-resource-column">
            {berths.map((berth) => {
              const status = getBerthStatus(berth);
              const statusClass = status === 'maintenance' 
                ? 'maintenance' 
                : status === 'occupied' 
                  ? 'occupied' 
                  : 'available';
              return (
                <div
                  key={berth.id}
                  className={`gantt-resource-row berth-card ${statusClass}`}
                  style={{ margin: 0, borderRadius: 0, borderRight: 'none', borderLeft: 'none' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{berth.name}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {berth.code} | {berth.maxLength}m | {berth.maxDraft}m
                    </div>
                  </div>
                  <Tooltip
                    title={`允许货类: ${berth.allowedCargoTypes.join(', ')}\n${berth.description || ''}`}
                  >
                    <InfoCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                  </Tooltip>
                </div>
              );
            })}
          </div>

          <div className="gantt-timeline-body" style={{ width: totalCells * cellWidth, position: 'relative' }}>
            {dragPreview && dragPreview.targetTime && dragPreview.targetBerthId && (
              <div
                className={`drag-preview ${dragPreview.isValid ? 'valid' : 'invalid'}`}
                style={{
                  position: 'absolute',
                  top: berths.findIndex(b => b.id === dragPreview.targetBerthId) * 60 + 5,
                  left: Math.max(getCellLeft(dragPreview.targetTime), 0),
                  width: getTaskWidth(schedules.find(s => s.id === dragPreview.scheduleId)!),
                  height: 50,
                  background: dragPreview.isValid 
                    ? 'rgba(82, 196, 26, 0.5)' 
                    : 'rgba(255, 77, 79, 0.5)',
                  border: `2px dashed ${dragPreview.isValid ? '#52c41a' : '#ff4d4f'}`,
                  borderRadius: 4,
                  zIndex: 200,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <Tooltip title={dragPreview.validationMessage}>
                  <span>{dragPreview.isValid ? '释放确认放置' : dragPreview.validationMessage}</span>
                </Tooltip>
              </div>
            )}
            
            {berths.map((berth, berthIndex) => {
              const berthSchedules = getSchedulesByBerth(berth.id);
              return (
                <div key={berth.id} className="gantt-timeline-row">
                  {Array.from({ length: totalCells }).map((_, i) => {
                    const isMidnight = startDate.add(i * hoursPerCell, 'hour').hour() === 0;
                    return (
                      <div
                        key={i}
                        className="gantt-grid-line"
                        style={{
                          left: i * cellWidth,
                          background: isMidnight ? '#d6e4ff' : '#f0f0f0',
                          width: isMidnight ? 2 : 1
                        }}
                      />
                    );
                  })}
                  
                  {berthIndex === 0 && renderCurrentTimeLine()}
                  
                  {berthSchedules.map((schedule) => {
                    const ship = ships.find((s) => s.id === schedule.shipId);
                    const left = getCellLeft(dayjs(schedule.plannedBerthingTime));
                    const width = getTaskWidth(schedule);
                    const hasError = schedule.conflictWarnings?.some((w) => w.severity === 'error');
                    const hasWarning = schedule.conflictWarnings?.some((w) => w.severity === 'warning');
                    
                    if (left + width < 0 || left > totalCells * cellWidth) return null;
                    
                    return (
                      <Popover
                        key={schedule.id}
                        content={renderScheduleDetail(schedule)}
                        placement="right"
                        trigger="click"
                        open={selectedScheduleId === schedule.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setSelectedSchedule(schedule);
                            setSelectedScheduleId(schedule.id);
                          }
                        }}
                      >
                        <div
                          className={`gantt-task ${draggingSchedule === schedule.id ? 'dragging' : ''} ${selectedScheduleId === schedule.id ? 'selected' : ''}`}
                          style={{
                            left: Math.max(left, 0),
                            width: Math.min(width, (totalCells * cellWidth) - Math.max(left, 0)),
                            background: ship ? getCargoColor(ship.cargoType) : '#1890ff',
                            opacity: schedule.status === '已取消' ? 0.4 : 1,
                            zIndex: draggingSchedule === schedule.id ? 100 : 10
                          }}
                          onMouseDown={(e) => handleDragStart(e, schedule.id)}
                          onClick={() => handleScheduleClick(schedule)}
                        >
                          <div className="gantt-task-content">
                            {ship?.name} - {schedule.operationDuration}h
                          </div>
                          {hasError && <div className="gantt-task-error" />}
                          {!hasError && hasWarning && <div className="gantt-task-warning" />}
                        </div>
                      </Popover>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <h4 style={{ margin: '0 0 12px 0' }}>泊位状态概览</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {berths.map((berth) => {
            const status = getBerthStatus(berth);
            const berthSchedules = getSchedulesByBerth(berth.id);
            return (
              <Card
                key={berth.id}
                size="small"
                className={`berth-card ${status}`}
                style={{ margin: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{berth.name}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      {berth.allowedCargoTypes.join(', ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      计划: {berthSchedules.length}艘
                    </div>
                    <Tag
                      className={getStatusClass(
                        status === 'maintenance' ? '延期' : 
                        status === 'occupied' ? '作业中' : '待靠泊'
                      )}
                    >
                      {status === 'maintenance' ? '维护中' : 
                       status === 'occupied' ? '作业中' : '空闲'}
                    </Tag>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BerthGantt;
