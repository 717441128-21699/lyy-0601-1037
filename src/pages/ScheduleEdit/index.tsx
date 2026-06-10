import { useState, useEffect } from 'react';
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
  Badge,
  Alert,
  List,
  Progress,
  Row,
  Col,
  Statistic,
  Typography
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
  InfoCircleOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { Schedule, ScheduleStatus, OperationRecord, AdjustmentPlan, PlanType } from '@/types';
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
const { Text } = Typography;

const statusOptions: ScheduleStatus[] = ['待靠泊', '靠泊中', '作业中', '已离港', '已取消', '延期'];

interface ScheduleEditProps {
  selectedScheduleId?: string | null;
}

const ScheduleEdit: React.FC<ScheduleEditProps> = ({ selectedScheduleId }) => {
  const [form] = Form.useForm();
  const [delayForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPlanDetailModalOpen, setIsPlanDetailModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AdjustmentPlan | null>(null);
  const [planType, setPlanType] = useState<PlanType>('reschedule');
  const [planScheduleId, setPlanScheduleId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'working' | 'delayed' | 'cancelled' | 'plans'>('all');

  const schedules = useSchedulerStore((state) => state.schedules);
  const ships = useSchedulerStore((state) => state.ships);
  const berths = useSchedulerStore((state) => state.berths);
  const adjustmentPlans = useSchedulerStore((state) => state.adjustmentPlans);
  const currentOperator = useSchedulerStore((state) => state.currentOperator);
  const addSchedule = useSchedulerStore((state) => state.addSchedule);
  const updateSchedule = useSchedulerStore((state) => state.updateSchedule);
  const deleteSchedule = useSchedulerStore((state) => state.deleteSchedule);
  const insertSchedule = useSchedulerStore((state) => state.insertSchedule);
  const delaySchedule = useSchedulerStore((state) => state.delaySchedule);
  const cancelSchedule = useSchedulerStore((state) => state.cancelSchedule);
  const getFilteredSchedules = useSchedulerStore((state) => state.getFilteredSchedules);
  const createAdjustmentPlan = useSchedulerStore((state) => state.createAdjustmentPlan);
  const simulatePlan = useSchedulerStore((state) => state.simulatePlan);
  const approvePlan = useSchedulerStore((state) => state.approvePlan);
  const rejectPlan = useSchedulerStore((state) => state.rejectPlan);
  const applyPlan = useSchedulerStore((state) => state.applyPlan);
  const deletePlan = useSchedulerStore((state) => state.deletePlan);
  const getScheduleById = useSchedulerStore((state) => state.getScheduleById);
  const getShipById = useSchedulerStore((state) => state.getShipById);
  const getBerthById = useSchedulerStore((state) => state.getBerthById);

  useEffect(() => {
    if (selectedScheduleId) {
      const schedule = getScheduleById(selectedScheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
      }
    }
  }, [selectedScheduleId, getScheduleById]);

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

  const getFilteredPlans = () => {
    return adjustmentPlans
      .filter(p => p.status !== 'applied' && p.status !== 'rejected')
      .sort((a, b) => dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf());
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

  const handleCreatePlan = (schedule: Schedule) => {
    setPlanScheduleId(schedule.id);
    setPlanType('reschedule');
    planForm.setFieldsValue({
      name: `调整预案-${getShipById(schedule.shipId)?.name || '未知船舶'}`,
      description: '',
      berthId: schedule.berthId,
      plannedBerthingTime: dayjs(schedule.plannedBerthingTime),
      operationDuration: schedule.operationDuration
    });
    setIsPlanModalOpen(true);
  };

  const handleSimulatePlan = async () => {
    try {
      const values = await planForm.validateFields();
      
      const proposedChanges: any = {
        berthId: values.berthId,
        plannedBerthingTime: values.plannedBerthingTime.format('YYYY-MM-DD HH:mm'),
        plannedDepartureTime: values.plannedBerthingTime
          .add(values.operationDuration, 'hour')
          .format('YYYY-MM-DD HH:mm'),
        operationDuration: values.operationDuration
      };

      if (planType === 'delay') {
        proposedChanges.status = '延期';
      } else if (planType === 'cancel') {
        proposedChanges.status = '已取消';
      } else if (planType === 'insert') {
        proposedChanges.priority = values.priority || 999;
      }

      const plan = createAdjustmentPlan({
        type: planType,
        name: values.name,
        description: values.description,
        scheduleId: planScheduleId,
        proposedChanges
      });

      const simulatedPlan = simulatePlan(plan.id);
      if (simulatedPlan) {
        setSelectedPlan(simulatedPlan);
        setIsPlanModalOpen(false);
        setIsPlanDetailModalOpen(true);
        message.success('预案模拟完成，请查看分析结果');
      }
    } catch (error) {
      console.error('预案创建失败:', error);
      message.error('请填写完整的预案信息');
    }
  };

  const handleViewPlanDetail = (plan: AdjustmentPlan) => {
    setSelectedPlan(plan);
    setIsPlanDetailModalOpen(true);
  };

  const handleApprovePlan = (planId: string) => {
    Modal.confirm({
      title: '确认预案',
      content: '确认此调整预案无误，准备执行？',
      onOk: () => {
        approvePlan(planId, '审核通过');
        message.success('预案已确认，可执行');
      }
    });
  };

  const handleApplyPlan = (planId: string) => {
    Modal.confirm({
      title: '执行预案',
      content: '执行此预案将修改调度计划并记录操作历史，确认继续？',
      onOk: () => {
        const result = applyPlan(planId, '预案执行');
        if (result.success) {
          message.success(result.message);
          setIsPlanDetailModalOpen(false);
        } else {
          message.error(result.message);
        }
      }
    });
  };

  const handleRejectPlan = (planId: string) => {
    Modal.confirm({
      title: '拒绝预案',
      content: '请输入拒绝原因：',
      onOk: () => {
        rejectPlan(planId, '审核不通过');
        message.warning('预案已拒绝');
      }
    });
  };

  const handleDeletePlan = (planId: string) => {
    Modal.confirm({
      title: '删除预案',
      content: '确定要删除此预案吗？',
      onOk: () => {
        deletePlan(planId);
        message.success('预案已删除');
      }
    });
  };

  const getPlanTypeLabel = (type: PlanType) => {
    const labels: Record<PlanType, string> = {
      reschedule: '调整泊位/时间',
      insert: '临时插队',
      delay: '延期离港',
      cancel: '取消靠泊',
      modify: '修改调度'
    };
    return labels[type] || type;
  };

  const getPlanStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '草稿',
      pending: '待审核',
      approved: '已批准',
      rejected: '已拒绝',
      applied: '已执行'
    };
    return labels[status] || status;
  };

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      pending: 'processing',
      approved: 'success',
      rejected: 'error',
      applied: 'purple'
    };
    return colors[status] || 'default';
  };

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'orange',
      high: 'red'
    };
    return colors[level] || 'default';
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
      width: 320,
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
            icon={<ExperimentOutlined />}
            onClick={() => handleCreatePlan(record)}
            disabled={record.status === '已取消' || record.status === '已离港'}
          >
            预案
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
    { key: 'cancelled', tab: '已取消', count: schedules.filter((s) => s.status === '已取消').length },
    { key: 'plans', tab: '调整预案', count: adjustmentPlans.filter(p => p.status !== 'applied' && p.status !== 'rejected').length }
  ];

  const filteredSchedules = getFilteredList();
  const filteredPlans = getFilteredPlans();

  const planColumns: ColumnsType<AdjustmentPlan> = [
    {
      title: '预案名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: PlanType) => <Tag color="blue">{getPlanTypeLabel(type)}</Tag>,
    },
    {
      title: '船舶',
      key: 'ship',
      width: 120,
      render: (_, record) => {
        const schedule = record.scheduleId ? getScheduleById(record.scheduleId) : undefined;
        const ship = schedule ? getShipById(schedule.shipId) : undefined;
        return ship?.name || '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getPlanStatusColor(status)}>{getPlanStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '风险等级',
      key: 'risk',
      width: 100,
      render: (_, record) => {
        if (record.status === 'draft') return <Tag color="default">未模拟</Tag>;
        return (
          <Tag color={getRiskLevelColor(record.impactAnalysis.riskLevel)}>
            {record.impactAnalysis.riskLevel === 'high' ? '高风险' : 
             record.impactAnalysis.riskLevel === 'medium' ? '中风险' : '低风险'}
          </Tag>
        );
      },
    },
    {
      title: '影响船舶',
      key: 'affected',
      width: 150,
      render: (_, record) => {
        if (record.status === 'draft') return '-';
        return (
          <Space wrap>
            {record.impactAnalysis.affectedShips.slice(0, 3).map((ship, idx) => (
              <Tag key={idx}>{ship}</Tag>
            ))}
            {record.impactAnalysis.affectedShips.length > 3 && (
              <Tag>+{record.impactAnalysis.affectedShips.length - 3}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '创建人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (text) => formatDateTime(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewPlanDetail(record)}
          >
            详情
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => {
                const simulated = simulatePlan(record.id);
                if (simulated) {
                  setSelectedPlan(simulated);
                  setIsPlanDetailModalOpen(true);
                  message.success('模拟分析完成');
                }
              }}
            >
              模拟分析
            </Button>
          )}
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprovePlan(record.id)}
              >
                确认
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRejectPlan(record.id)}
              >
                拒绝
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleApplyPlan(record.id)}
            >
              执行
            </Button>
          )}
          {record.status !== 'applied' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeletePlan(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
        {activeTab === 'plans' ? (
          <Table
            columns={planColumns}
            dataSource={filteredPlans}
            rowKey="id"
            scroll={{ x: 1400, y: 'calc(100vh - 380px)' }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条预案`
            }}
            locale={{ emptyText: '暂无调整预案，点击调度列表中的"预案"按钮创建' }}
          />
        ) : (
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
                    {record.conflictWarnings && record.conflictWarnings.filter(w => !w.resolved).length > 0 && (
                      <div style={{ marginTop: 12, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: '#faad14' }}>
                          <WarningOutlined /> 冲突警告（未处理 {record.conflictWarnings.filter(w => !w.resolved).length} 项）
                        </div>
                        {record.conflictWarnings.filter(w => !w.resolved).map((w) => (
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
        )}
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
