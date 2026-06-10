import { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Space,
  Tag,
  message,
  Popconfirm,
  Card,
  Descriptions,
  Timeline,
  Tabs,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  ClockCircleOutlined,
  StopOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { Schedule, ScheduleStatus, OperationRecord } from '@/types';
import {
  formatDateTime,
  getStatusColor,
  getStatusClass,
  getCargoColor,
  getOperationTypeLabel,
  getConflictTypeLabel
} from '@/utils';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const statusOptions: ScheduleStatus[] = ['待靠泊', '靠泊中', '作业中', '已离港', '已取消', '延期'];

const ScheduleEdit = () => {
  const [form] = Form.useForm();
  const [delayForm] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'working' | 'delayed' | 'cancelled'>('all');

  const schedules = useSchedulerStore((state) => state.schedules);
  const ships = useSchedulerStore((state) => state.ships);
  const berths = useSchedulerStore((state) => state.berths);
  const addSchedule = useSchedulerStore((state) => state.addSchedule);
  const updateSchedule = useSchedulerStore((state) => state.updateSchedule);
  const deleteSchedule = useSchedulerStore((state) => state.deleteSchedule);
  const insertSchedule = useSchedulerStore((state) => state.insertSchedule);
  const delaySchedule = useSchedulerStore((state) => state.delaySchedule);
  const cancelSchedule = useSchedulerStore((state) => state.cancelSchedule);
  const getFilteredSchedules = useSchedulerStore((state) => state.getFilteredSchedules);

  const getAvailableBerths = (shipId?: string) => {
    if (!shipId) return berths.filter((b) => b.status !== '维护中');
    const ship = ships.find((s) => s.id === shipId);
    if (!ship) return berths;
    return berths.filter(
      (b) =>
        b.allowedCargoTypes.includes(ship.cargoType) &&
        b.maxLength >= ship.length &&
        b.maxDraft >= ship.draft &&
        b.status !== '维护中'
    );
  };

  const getAvailableShips = () => {
    const scheduledShipIds = schedules
      .filter((s) => s.status !== '已取消' && s.status !== '已离港')
      .map((s) => s.shipId);
    return ships.filter((s) => !scheduledShipIds.includes(s.id));
  };

  const getFilteredList = () => {
    let filtered = getFilteredSchedules();
    
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter((s) => s.status === '待靠泊');
        break;
      case 'working':
        filtered = filtered.filter((s) => s.status === '作业中' || s.status === '靠泊中');
        break;
      case 'delayed':
        filtered = filtered.filter((s) => s.status === '延期');
        break;
      case 'cancelled':
        filtered = filtered.filter((s) => s.status === '已取消');
        break;
      default:
        break;
    }
    
    return filtered.sort((a, b) => a.priority - b.priority);
  };

  const handleAdd = () => {
    setEditingSchedule(null);
    form.resetFields();
    const availableShips = getAvailableShips();
    if (availableShips.length === 0) {
      message.warning('暂无可调度的船舶，请先在船舶列表中添加');
      return;
    }
    form.setFieldsValue({
      plannedBerthingTime: dayjs().add(1, 'hour'),
      operationDuration: 8,
      priority: schedules.length + 1
    });
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    form.setFieldsValue({
      ...schedule,
      plannedBerthingTime: dayjs(schedule.plannedBerthingTime),
      plannedDepartureTime: dayjs(schedule.plannedDepartureTime)
    });
    setIsModalOpen(true);
  };

  const handleInsert = (targetPosition: number) => {
    const availableShips = getAvailableShips();
    if (availableShips.length === 0) {
      message.warning('暂无可调度的船舶，无法插队');
      return;
    }
    
    Modal.confirm({
      title: '临时插队',
      content: `确定要在第${targetPosition}位插入新的调度吗？后续调度的优先级将自动调整。`,
      onOk: () => {
        setEditingSchedule(null);
        form.resetFields();
        form.setFieldsValue({
          plannedBerthingTime: dayjs().add(1, 'hour'),
          operationDuration: 8,
          priority: targetPosition
        });
        setIsModalOpen(true);
      }
    });
  };

  const handleDelay = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    delayForm.resetFields();
    delayForm.setFieldsValue({
      delayHours: 2,
      reason: ''
    });
    setIsDelayModalOpen(true);
  };

  const handleConfirmDelay = async () => {
    if (!selectedSchedule) return;
    
    try {
      const values = await delayForm.validateFields();
      delaySchedule(selectedSchedule.id, values.delayHours, values.reason);
      message.success('已延期');
      setIsDelayModalOpen(false);
    } catch (error) {
      console.error('延期失败:', error);
    }
  };

  const handleCancel = (scheduleId: string) => {
    Modal.confirm({
      title: '取消靠泊',
      content: '确定要取消此靠泊计划吗？请输入取消原因：',
      okText: '确认取消',
      okButtonProps: { danger: true },
      onOk: () => {
        Modal.confirm({
          title: '请输入取消原因',
          content: (
            <Input.TextArea
              id="cancelReason"
              rows={3}
              placeholder="请输入取消原因"
              style={{ marginTop: 8 }}
            />
          ),
          onOk: () => {
            const reason = (document.getElementById('cancelReason') as HTMLTextAreaElement)?.value || '未填写原因';
            cancelSchedule(scheduleId, reason);
            message.success('已取消靠泊');
          }
        });
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const scheduleData = {
        shipId: values.shipId,
        berthId: values.berthId,
        plannedBerthingTime: values.plannedBerthingTime.format('YYYY-MM-DD HH:mm'),
        plannedDepartureTime: values.plannedBerthingTime
          .add(values.operationDuration, 'hour')
          .format('YYYY-MM-DD HH:mm'),
        operationDuration: values.operationDuration,
        status: values.status || '待靠泊',
        priority: values.priority,
        remarks: values.remarks
      };

      if (editingSchedule) {
        updateSchedule(editingSchedule.id, scheduleData);
        message.success('更新成功');
      } else {
        const targetPriority = form.getFieldValue('priority');
        const existingSchedule = schedules.find((s) => s.priority === targetPriority);
        
        if (existingSchedule && !editingSchedule) {
          insertSchedule(scheduleData, targetPriority);
        } else {
          addSchedule(scheduleData);
        }
        message.success('创建成功');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleViewHistory = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsHistoryModalOpen(true);
  };

  const handleShipChange = (shipId: string) => {
    const ship = ships.find((s) => s.id === shipId);
    if (ship) {
      form.setFieldsValue({
        operationDuration: ship.operationDuration
      });
    }
  };

  const renderOperationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      insert: <PushpinOutlined style={{ color: '#faad14' }} />,
      delay: <ClockCircleOutlined style={{ color: '#faad14' }} />,
      cancel: <StopOutlined style={{ color: '#ff4d4f' }} />,
      modify: <EditOutlined style={{ color: '#1890ff' }} />,
      reschedule: <CheckCircleOutlined style={{ color: '#52c41a' }} />
    };
    return iconMap[type] || <InfoCircleOutlined />;
  };

  const columns: ColumnsType<Schedule> = [
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (text) => (
        <Tag color={text <= 3 ? '#ff4d4f' : text <= 6 ? '#faad14' : '#1890ff'}>
          {text}
        </Tag>
      )
    },
    {
      title: '船名',
      key: 'shipName',
      width: 120,
      render: (_, record) => {
        const ship = ships.find((s) => s.id === record.shipId);
        return <strong>{ship?.name || '-'}</strong>;
      }
    },
    {
      title: '航次',
      key: 'voyage',
      width: 140,
      render: (_, record) => {
        const ship = ships.find((s) => s.id === record.shipId);
        return ship?.voyage || '-';
      }
    },
    {
      title: '货类',
      key: 'cargoType',
      width: 100,
      render: (_, record) => {
        const ship = ships.find((s) => s.id === record.shipId);
        return ship ? <Tag color={getCargoColor(ship.cargoType)}>{ship.cargoType}</Tag> : '-';
      }
    },
    {
      title: '泊位',
      key: 'berthName',
      width: 140,
      render: (_, record) => {
        const berth = berths.find((b) => b.id === record.berthId);
        return berth?.name || '-';
      }
    },
    {
      title: '预计靠泊',
      dataIndex: 'plannedBerthingTime',
      key: 'plannedBerthingTime',
      width: 160,
      render: (text) => formatDateTime(text)
    },
    {
      title: '预计离港',
      dataIndex: 'plannedDepartureTime',
      key: 'plannedDepartureTime',
      width: 160,
      render: (text) => formatDateTime(text)
    },
    {
      title: '作业时长',
      dataIndex: 'operationDuration',
      key: 'operationDuration',
      width: 100,
      render: (text) => `${text}小时`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text: ScheduleStatus) => (
        <Tag className={getStatusClass(text)}>{text}</Tag>
      )
    },
    {
      title: '冲突',
      key: 'conflicts',
      width: 80,
      render: (_, record) => {
        const errors = record.conflictWarnings?.filter((w) => w.severity === 'error') || [];
        const warnings = record.conflictWarnings?.filter((w) => w.severity === 'warning') || [];
        
        if (errors.length > 0) {
          return (
            <Badge count={errors.length} size="small" status="error">
              <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            </Badge>
          );
        }
        if (warnings.length > 0) {
          return (
            <Badge count={warnings.length} size="small" status="warning">
              <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
            </Badge>
          );
        }
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.status === '已取消' || record.status === '已离港'}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PushpinOutlined />}
            onClick={() => handleInsert(record.priority)}
            disabled={record.status === '已取消' || record.status === '已离港'}
          >
            插队
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => handleDelay(record)}
            disabled={record.status === '已取消' || record.status === '已离港'}
          >
            延期
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<StopOutlined />}
            onClick={() => handleCancel(record.id)}
            disabled={record.status === '已取消' || record.status === '已离港'}
          >
            取消
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
          >
            历史
          </Button>
        </Space>
      )
    }
  ];

  const tabList = [
    { key: 'all', tab: '全部', count: schedules.length },
    { key: 'pending', tab: '待靠泊', count: schedules.filter((s) => s.status === '待靠泊').length },
    { key: 'working', tab: '作业中', count: schedules.filter((s) => s.status === '作业中' || s.status === '靠泊中').length },
    { key: 'delayed', tab: '已延期', count: schedules.filter((s) => s.status === '延期').length },
    { key: 'cancelled', tab: '已取消', count: schedules.filter((s) => s.status === '已取消').length }
  ];

  const filteredSchedules = getFilteredList();

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2 className="page-title">调度编辑</h2>
        <div className="action-bar">
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
            新增调度
          </Button>
          <Button
            icon={<PushpinOutlined />}
            onClick={() => handleInsert(1)}
          >
            紧急插队
          </Button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 0 }}>
        <Space size={16}>
          {tabList.map((tab) => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? 'primary' : 'default'}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.tab} <Badge count={tab.count} size="small" />
            </Button>
          ))}
        </Space>
        <span style={{ color: '#666', marginLeft: 'auto' }}>
          共 <strong style={{ color: '#1890ff' }}>{filteredSchedules.length}</strong> 条调度计划
        </span>
      </div>

      <div className="table-container" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={filteredSchedules}
          rowKey="id"
          scroll={{ x: 1600, y: 'calc(100vh - 380px)' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          expandable={{
            expandedRowRender: (record) => {
              const ship = ships.find((s) => s.id === record.shipId);
              const berth = berths.find((b) => b.id === record.berthId);
              
              return (
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Descriptions size="small" column={4}>
                    <Descriptions.Item label="船长">
                      {ship?.length}m
                    </Descriptions.Item>
                    <Descriptions.Item label="吃水">
                      {ship?.draft}m
                    </Descriptions.Item>
                    <Descriptions.Item label="货量">
                      {ship?.cargoWeight?.toLocaleString()}t
                    </Descriptions.Item>
                    <Descriptions.Item label="代理">
                      {ship?.agent}
                    </Descriptions.Item>
                    <Descriptions.Item label="泊位参数">
                      {berth?.maxLength}m / {berth?.maxDraft}m
                    </Descriptions.Item>
                    <Descriptions.Item label="允许货类">
                      {berth?.allowedCargoTypes.join(', ')}
                    </Descriptions.Item>
                    <Descriptions.Item label="特殊要求">
                      {ship?.specialRequirements || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="备注">
                      {record.remarks || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                  {record.conflictWarnings && record.conflictWarnings.length > 0 && (
                    <div style={{ marginTop: 12, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: '#faad14' }}>
                        <WarningOutlined /> 冲突警告
                      </div>
                      {record.conflictWarnings.map((w) => (
                        <div
                          key={w.id}
                          className={`conflict-badge conflict-${w.severity}`}
                          style={{ marginBottom: 4 }}
                        >
                          {getConflictTypeLabel(w.type)}：{w.message}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            }
          }}
        />
      </div>

      <Modal
        title={editingSchedule ? '编辑调度' : '新增调度'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="ship-form-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="shipId"
              label="船舶"
              rules={[{ required: true, message: '请选择船舶' }]}
            >
              <Select
                placeholder="请选择船舶"
                onChange={handleShipChange}
                showSearch
                optionFilterProp="children"
              >
                {getAvailableShips().map((ship) => (
                  <Option key={ship.id} value={ship.id}>
                    {ship.name} - {ship.voyage} ({ship.cargoType})
                  </Option>
                ))}
                {editingSchedule && (() => {
                  const ship = ships.find((s) => s.id === editingSchedule.shipId);
                  return ship ? (
                    <Option key={ship.id} value={ship.id}>
                      {ship.name} - {ship.voyage} ({ship.cargoType})
                    </Option>
                  ) : null;
                })()}
              </Select>
            </Form.Item>
            <Form.Item
              name="berthId"
              label="泊位"
              rules={[{ required: true, message: '请选择泊位' }]}
            >
              <Select
                placeholder="请选择泊位"
                showSearch
                optionFilterProp="children"
              >
                {getAvailableBerths(form.getFieldValue('shipId')).map((berth) => (
                  <Option key={berth.id} value={berth.id}>
                    {berth.name} ({berth.maxLength}m / {berth.maxDraft}m)
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="plannedBerthingTime"
              label="预计靠泊时间"
              rules={[{ required: true, message: '请选择靠泊时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="operationDuration"
              label="作业时长(小时)"
              rules={[{ required: true, message: '请输入作业时长' }]}
            >
              <InputNumber min={1} max={72} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="priority"
              label="优先级"
              rules={[{ required: true, message: '请输入优先级' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="status"
              label="状态"
              initialValue="待靠泊"
            >
              <Select placeholder="请选择状态">
                {statusOptions.map((status) => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="remarks" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="延期离港"
        open={isDelayModalOpen}
        onOk={handleConfirmDelay}
        onCancel={() => setIsDelayModalOpen(false)}
        okText="确认延期"
        cancelText="取消"
      >
        <Form form={delayForm} layout="vertical">
          <Form.Item
            name="delayHours"
            label="延期时长(小时)"
            rules={[{ required: true, message: '请输入延期时长' }]}
          >
            <InputNumber min={1} max={72} style={{ width: '100%' }} placeholder="请输入延期时长" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="延期原因"
            rules={[{ required: true, message: '请输入延期原因' }]}
          >
            <TextArea rows={3} placeholder="请输入延期原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="操作历史"
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedSchedule && (
          <div>
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
              <strong>
                {ships.find((s) => s.id === selectedSchedule.shipId)?.name} - 
                {berths.find((b) => b.id === selectedSchedule.berthId)?.name}
              </strong>
            </div>
            <Timeline
              items={selectedSchedule.operationHistory
                .slice()
                .sort((a, b) => dayjs(b.operationTime).valueOf() - dayjs(a.operationTime).valueOf())
                .map((record: OperationRecord) => ({
                  dot: renderOperationIcon(record.operationType),
                  color: record.operationType === 'cancel' ? 'red' : record.operationType === 'delay' ? 'orange' : 'blue',
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {getOperationTypeLabel(record.operationType)}
                        <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                          {record.operationTime}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                        操作人：{record.operator}
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>
                        原因：{record.reason}
                      </div>
                      {record.oldValue && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                          <span style={{ color: '#ff4d4f' }}>旧值：</span>
                          {record.oldValue.length > 100 ? record.oldValue.substring(0, 100) + '...' : record.oldValue}
                        </div>
                      )}
                      {record.newValue && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                          <span style={{ color: '#52c41a' }}>新值：</span>
                          {record.newValue.length > 100 ? record.newValue.substring(0, 100) + '...' : record.newValue}
                        </div>
                      )}
                    </div>
                  )
                }))}
            />
            {selectedSchedule.operationHistory.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                暂无操作历史
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleEdit;
