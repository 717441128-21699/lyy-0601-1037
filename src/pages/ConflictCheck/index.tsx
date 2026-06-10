import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Select,
  Badge,
  Statistic,
  Row,
  Col,
  Progress,
  Alert,
  Tooltip,
  Modal,
  message
} from 'antd';
import {
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  AlertOutlined,
  EditOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { ConflictWarning, ConflictType } from '@/types';
import {
  formatDateTime,
  getCargoColor,
  getConflictTypeLabel,
  getStatusClass
} from '@/utils';

const { Option } = Select;

interface ConflictCheckProps {
  selectedScheduleId?: string | null;
}

const ConflictCheck: React.FC<ConflictCheckProps> = ({ selectedScheduleId }) => {
  const [filterType, setFilterType] = useState<ConflictType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const conflictWarnings = useSchedulerStore((state) => state.conflictWarnings);
  const schedules = useSchedulerStore((state) => state.schedules);
  const ships = useSchedulerStore((state) => state.ships);
  const berths = useSchedulerStore((state) => state.berths);
  const checkConflicts = useSchedulerStore((state) => state.checkConflicts);
  const resolveConflict = useSchedulerStore((state) => state.resolveConflict);
  const autoResolveConflict = useSchedulerStore((state) => state.autoResolveConflict);

  useEffect(() => {
    if (autoRefresh) {
      const timer = setInterval(() => {
        checkConflicts();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [autoRefresh, checkConflicts]);

  const filteredWarnings = conflictWarnings.filter((warning) => {
    if (!showResolved && warning.resolved) return false;
    if (filterType !== 'all' && warning.type !== filterType) return false;
    if (filterSeverity !== 'all' && warning.severity !== filterSeverity) return false;
    return true;
  });

  const errorCount = conflictWarnings.filter((w) => w.severity === 'error' && !w.resolved).length;
  const warningCount = conflictWarnings.filter((w) => w.severity === 'warning' && !w.resolved).length;
  const infoCount = conflictWarnings.filter((w) => w.severity === 'info' && !w.resolved).length;
  const resolvedCount = conflictWarnings.filter((w) => w.resolved).length;

  const handleRefresh = () => {
    checkConflicts();
    message.success('已重新检查所有冲突');
  };

  const handleResolve = (warning: ConflictWarning) => {
    const schedule = schedules.find((s) => s.id === warning.scheduleId);
    if (!schedule) return;

    Modal.confirm({
      title: '标记为已解决',
      content: (
        <div>
          <p>确定要将此冲突标记为已解决吗？</p>
          <p style={{ color: '#faad14', margin: '8px 0' }}>
            <WarningOutlined /> 建议先调整调度计划以消除冲突。
          </p>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <p style={{ margin: 0 }}><strong>冲突类型：</strong>{getConflictTypeLabel(warning.type)}</p>
            <p style={{ margin: '4px 0 0 0' }}><strong>冲突描述：</strong>{warning.message}</p>
          </div>
        </div>
      ),
      onOk: () => {
        resolveConflict(warning.id, '人工标记已解决');
        message.success('已标记为已解决，操作历史已记录');
        setTimeout(() => checkConflicts(), 100);
      }
    });
  };

  const handleAutoResolve = (warning: ConflictWarning) => {
    const schedule = schedules.find((s) => s.id === warning.scheduleId);
    if (!schedule) return;
    const ship = ships.find((s) => s.id === schedule.shipId);
    if (!ship) return;

    Modal.confirm({
      title: '自动处理冲突',
      content: (
        <div>
          <p>系统将尝试自动处理此冲突，是否继续？</p>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 8 }}>
            <p style={{ margin: 0 }}><strong>船舶：</strong>{ship.name}</p>
            <p style={{ margin: '4px 0' }}><strong>冲突类型：</strong>{getConflictTypeLabel(warning.type)}</p>
            <p style={{ margin: 0 }}><strong>冲突描述：</strong>{warning.message}</p>
          </div>
          <p style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
            <InfoCircleOutlined /> 系统将根据冲突类型自动调整调度，并记录操作历史。
          </p>
        </div>
      ),
      onOk: () => {
        const result = autoResolveConflict(warning.id);
        if (result.success) {
          message.success(`${result.message}，操作历史已记录`);
          setTimeout(() => checkConflicts(), 200);
        } else {
          message.error(result.message);
        }
      }
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />;
    }
  };

  const columns: ColumnsType<ConflictWarning> = [
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (text) => (
        <div style={{ textAlign: 'center' }}>
          {getSeverityIcon(text)}
          <div style={{ fontSize: 11, marginTop: 4, color: '#999', textTransform: 'uppercase' }}>
            {text}
          </div>
        </div>
      )
    },
    {
      title: '冲突类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (text: ConflictType) => (
        <Tag color={text === 'tide' ? '#1890ff' : text === 'berth_capacity' || text === 'draft' ? '#722ed1' : text === 'simultaneous_operation' ? '#ff4d4f' : '#faad14'}>
          {getConflictTypeLabel(text)}
        </Tag>
      )
    },
    {
      title: '船名',
      key: 'shipName',
      width: 120,
      render: (_, record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        const ship = schedule ? ships.find((s) => s.id === schedule.shipId) : null;
        return ship ? <strong>{ship.name}</strong> : '-';
      }
    },
    {
      title: '货类',
      key: 'cargoType',
      width: 100,
      render: (_, record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        const ship = schedule ? ships.find((s) => s.id === schedule.shipId) : null;
        return ship ? <Tag color={getCargoColor(ship.cargoType)}>{ship.cargoType}</Tag> : '-';
      }
    },
    {
      title: '泊位',
      key: 'berthName',
      width: 140,
      render: (_, record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        const berth = schedule ? berths.find((b) => b.id === schedule.berthId) : null;
        return berth?.name || '-';
      }
    },
    {
      title: '调度状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        return schedule ? <Tag className={getStatusClass(schedule.status)}>{schedule.status}</Tag> : '-';
      }
    },
    {
      title: '预计靠泊',
      key: 'berthingTime',
      width: 160,
      render: (_, record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        return schedule ? formatDateTime(schedule.plannedBerthingTime) : '-';
      }
    },
    {
      title: '冲突描述',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '检测时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (text) => formatDateTime(text)
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 80,
      render: (text) =>
        text ? (
          <Tag color="green">
            <CheckCircleOutlined /> 已解决
          </Tag>
        ) : (
          <Tag color="red">
            <AlertOutlined /> 未解决
          </Tag>
        )
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {!record.resolved && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleAutoResolve(record)}
              >
                自动处理
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolve(record)}
              >
                标记解决
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const getConflictDistribution = () => {
    const types: Record<string, number> = {
      tide: 0,
      berth_capacity: 0,
      simultaneous_operation: 0,
      overtime: 0,
      draft: 0
    };
    conflictWarnings.forEach((w) => {
      if (!w.resolved) {
        types[w.type] = (types[w.type] || 0) + 1;
      }
    });
    return types;
  };

  const distribution = getConflictDistribution();
  const totalUnresolved = errorCount + warningCount + infoCount;

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2 className="page-title">
          <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
          冲突检查
        </h2>
        <div className="action-bar">
          <Button
            type={autoRefresh ? 'primary' : 'default'}
            icon={<ClockCircleOutlined />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '自动刷新中' : '开启自动刷新'}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            重新检查
          </Button>
        </div>
      </div>

      {totalUnresolved > 0 && (
        <Alert
          message={`当前存在 ${totalUnresolved} 个未解决的冲突`}
          description="请及时处理这些冲突，以确保调度计划的顺利执行。红色为严重冲突，必须处理；橙色为预警，建议处理。"
          type={errorCount > 0 ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="严重冲突"
              value={errorCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<AlertOutlined />}
            />
            <Progress percent={totalUnresolved > 0 ? (errorCount / totalUnresolved) * 100 : 0} strokeColor="#ff4d4f" size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="预警"
              value={warningCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
            <Progress percent={totalUnresolved > 0 ? (warningCount / totalUnresolved) * 100 : 0} strokeColor="#faad14" size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提示"
              value={infoCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<InfoCircleOutlined />}
            />
            <Progress percent={totalUnresolved > 0 ? (infoCount / totalUnresolved) * 100 : 0} strokeColor="#1890ff" size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已解决"
              value={resolvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<SafetyOutlined />}
            />
            <Progress
              percent={conflictWarnings.length > 0 ? (resolvedCount / conflictWarnings.length) * 100 : 0}
              strokeColor="#52c41a"
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space size={16} wrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#666' }}>显示已解决：</span>
              <Select
                value={showResolved ? 'yes' : 'no'}
                onChange={(v) => setShowResolved(v === 'yes')}
                style={{ width: 100 }}
              >
                <Option value="no">否</Option>
                <Option value="yes">是</Option>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#666' }}>冲突类型：</span>
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 160 }}
                allowClear
              >
                <Option value="all">全部类型</Option>
                <Option value="tide">潮汐冲突</Option>
                <Option value="berth_capacity">泊位能力不足</Option>
                <Option value="simultaneous_operation">同时作业冲突</Option>
                <Option value="overtime">超时风险</Option>
                <Option value="draft">吃水限制</Option>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#666' }}>严重程度：</span>
              <Select
                value={filterSeverity}
                onChange={setFilterSeverity}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="all">全部</Option>
                <Option value="error">严重</Option>
                <Option value="warning">警告</Option>
                <Option value="info">提示</Option>
              </Select>
            </div>
          </Space>
          <span style={{ color: '#666' }}>
            共 <strong style={{ color: '#1890ff' }}>{filteredWarnings.length}</strong> 条冲突记录
          </span>
        </div>
      </Card>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(distribution).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={type === 'tide' ? '#1890ff' : type === 'berth_capacity' || type === 'draft' ? '#722ed1' : type === 'simultaneous_operation' ? '#ff4d4f' : '#faad14'}>
                {getConflictTypeLabel(type)}
              </Tag>
              <Badge count={count} size="small" />
            </div>
          ))}
        </div>
      </Card>

      <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={filteredWarnings}
          rowKey="id"
          scroll={{ x: 1400, y: 'calc(100vh - 580px)' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          rowClassName={(record) =>
            record.resolved ? 'resolved-row' : record.severity === 'error' ? 'error-row' : ''
          }
        />
      </div>

      <style>{`
        .error-row {
          background: #fff1f0;
        }
        .error-row:hover > td {
          background: #fff1f0 !important;
        }
        .resolved-row {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default ConflictCheck;
