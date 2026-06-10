import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Button, Typography, List, Alert, Tooltip, Badge } from 'antd';
import { DashboardOutlined, GlobalOutlined, WarningOutlined, ClockCircleOutlined, ThunderboltOutlined, RocketOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { DashboardData, ConflictType } from '@/types';

const { Title, Text } = Typography;

const conflictTypeLabels: Record<ConflictType, string> = {
  tide: '潮汐冲突',
  berth_capacity: '泊位能力',
  simultaneous_operation: '作业冲突',
  overtime: '超时风险',
  draft: '吃水限制'
};

const conflictTypeColors: Record<ConflictType, string> = {
  tide: 'blue',
  berth_capacity: 'orange',
  simultaneous_operation: 'red',
  overtime: 'gold',
  draft: 'purple'
};

const Dashboard: React.FC<{ onNavigate: (page: string, scheduleId?: string) => void }> = ({ onNavigate }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const getDashboardData = useSchedulerStore((state) => state.getDashboardData);
  const getUnresolvedConflicts = useSchedulerStore((state) => state.getUnresolvedConflicts);
  const getShipById = useSchedulerStore((state) => state.getShipById);
  const getScheduleById = useSchedulerStore((state) => state.getScheduleById);
  const adjustmentPlans = useSchedulerStore((state) => state.adjustmentPlans);
  const todoItems = useSchedulerStore((state) => state.todoItems);

  useEffect(() => {
    const data = getDashboardData();
    setDashboardData(data);
    
    const interval = setInterval(() => {
      const newData = getDashboardData();
      setDashboardData(newData);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refreshKey, getDashboardData]);

  const pendingPlans = useMemo(() => 
    adjustmentPlans.filter(p => p.status === 'pending' || p.status === 'draft'),
    [adjustmentPlans]
  );

  const pendingTodos = useMemo(() => 
    todoItems.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    [todoItems]
  );

  const unresolvedConflicts = useMemo(() => getUnresolvedConflicts(), [getUnresolvedConflicts]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatCountdown = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟后`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟后` : `${hours}小时后`;
  };

  const formatWaitTime = (hours: number) => {
    if (hours < 0) return '已超时';
    if (hours < 1) return '即将靠泊';
    if (hours < 24) return `等待${hours}小时`;
    const days = Math.floor(hours / 24);
    return `等待${days}天`;
  };

  const getOvertimeRiskColor = (risk: 'high' | 'medium' | 'low') => {
    switch (risk) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
    }
  };

  const getTodoPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
    }
  };

  const getTodoSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      conflict: '冲突风险',
      plan: '待确认预案',
      ship: '重点船舶',
      handover: '交接班',
      manual: '手动添加'
    };
    return labels[source] || source;
  };

  const berthColumns = [
    {
      title: '泊位',
      dataIndex: 'berthName',
      key: 'berthName',
      width: 100,
    },
    {
      title: '占用率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 150,
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate > 80 ? 'exception' : rate > 60 ? 'normal' : 'success'}
        />
      ),
    },
    {
      title: '已用(小时)',
      dataIndex: 'occupiedHours',
      key: 'occupiedHours',
      width: 100,
      render: (h: number) => <Text strong>{h}h</Text>,
    },
    {
      title: '可用(小时)',
      dataIndex: 'availableHours',
      key: 'availableHours',
      width: 100,
      render: (h: number) => <Text type={h < 10 ? 'danger' : undefined}>{h}h</Text>,
    },
    {
      title: '调度数',
      dataIndex: 'scheduleCount',
      key: 'scheduleCount',
      width: 80,
    },
  ];

  const riskColumns = [
    {
      title: '风险类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: ConflictType) => (
        <Tag color={conflictTypeColors[type]}>{conflictTypeLabels[type]}</Tag>
      ),
    },
    {
      title: '船舶',
      key: 'ship',
      render: (_: any, record: any) => {
        const schedule = getScheduleById(record.scheduleId);
        const ship = schedule ? getShipById(schedule.shipId) : undefined;
        return ship?.name || '未知船舶';
      },
    },
    {
      title: '描述',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => (
        <Tooltip title={msg}>
          <Text ellipsis style={{ maxWidth: 200 }}>{msg}</Text>
        </Tooltip>
      ),
    },
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      render: (s: string) => {
        const icon = s === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                     s === 'warning' ? <WarningOutlined style={{ color: '#faad14' }} /> :
                     <InfoCircleOutlined style={{ color: '#1890ff' }} />;
        return <Space>{icon}{s === 'error' ? '严重' : s === 'warning' ? '警告' : '提示'}</Space>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => onNavigate('conflict', record.scheduleId)}>
          处理
        </Button>
      ),
    },
  ];

  if (!dashboardData) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>
            <DashboardOutlined /> 值班驾驶舱
          </Title>
          <Text type="secondary">
            今日 {dayjs().format('YYYY-MM-DD')} · 未来72小时概览
          </Text>
        </Space>
        <Button onClick={handleRefresh}>刷新数据</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <GlobalOutlined style={{ color: '#1890ff' }} />
                  待靠泊船舶
                </Space>
              }
              value={dashboardData.pendingShips.count}
              suffix="艘"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                已分配泊位: {dashboardData.pendingShips.ships.filter(s => s.berthName !== '未分配').length} 艘
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  待处理风险
                </Space>
              }
              value={dashboardData.riskStats.unresolved}
              suffix="项"
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={Math.round((dashboardData.riskStats.resolved / (dashboardData.riskStats.total || 1)) * 100)}
                size="small"
                success={{ percent: 100 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                已解决 {dashboardData.riskStats.resolved}/{dashboardData.riskStats.total} 项
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                  即将超时作业
                </Space>
              }
              value={dashboardData.overtimeRisk.count}
              suffix="个"
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                高风险: {dashboardData.overtimeRisk.schedules.filter(s => s.overtimeRisk === 'high').length} 个
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#722ed1' }} />
                  今日操作
                </Space>
              }
              value={
                dashboardData.operationStats.todayInsert +
                dashboardData.operationStats.todayDelay +
                dashboardData.operationStats.todayCancel +
                dashboardData.operationStats.todayReschedule +
                dashboardData.operationStats.todayModify
              }
              suffix="次"
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="green">插队 {dashboardData.operationStats.todayInsert}</Tag>
              <Tag color="orange">延期 {dashboardData.operationStats.todayDelay}</Tag>
              <Tag color="red">取消 {dashboardData.operationStats.todayCancel}</Tag>
              <Tag color="blue">调整 {dashboardData.operationStats.todayReschedule}</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {pendingPlans.length > 0 && (
        <Alert
          style={{ marginTop: 16, marginBottom: 16 }}
          message="待确认预案"
          description={
            <Space>
              <Text>有 {pendingPlans.length} 个调整预案等待确认</Text>
              {pendingPlans.slice(0, 3).map(p => (
                <Tag key={p.id} color="blue">{p.name}</Tag>
              ))}
              <Button type="link" size="small" onClick={() => onNavigate('schedule')}>
                前往处理 <ArrowRightOutlined />
              </Button>
            </Space>
          }
          type="info"
          showIcon
          closable
        />
      )}

      {pendingTodos.length > 0 && (
        <Alert
          style={{ marginTop: 16, marginBottom: 16 }}
          message="待办事项"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>有 {pendingTodos.length} 项待办需要处理</Text>
              <List
                size="small"
                dataSource={pendingTodos.slice(0, 3)}
                renderItem={(todo) => (
                  <List.Item
                    style={{ paddingLeft: 0, paddingRight: 0 }}
                    actions={[
                      <Button type="link" size="small" onClick={() => {
                        if (todo.scheduleId) onNavigate('schedule', todo.scheduleId);
                        else if (todo.conflictId) onNavigate('conflict');
                        else if (todo.planId) onNavigate('schedule');
                      }}>
                        处理
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge status={todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'warning' : 'success'} />
                      }
                      title={
                        <Space>
                          <Text strong>{todo.title}</Text>
                          <Tag color={getTodoPriorityColor(todo.priority)}>
                            {todo.priority === 'high' ? '高优' : todo.priority === 'medium' ? '中优' : '低优'}
                          </Tag>
                          <Tag color="purple">{getTodoSourceLabel(todo.source)}</Tag>
                        </Space>
                      }
                      description={todo.description}
                    />
                    <Progress percent={todo.progress} size="small" style={{ width: 100 }} />
                  </List.Item>
                )}
              />
            </Space>
          }
          type="warning"
          showIcon
          closable
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col span={14}>
          <Card
            title={
              <Space>
                <DashboardOutlined /> 泊位占用情况（未来72小时）
              </Space>
            }
            size="small"
          >
            <Table
              columns={berthColumns}
              dataSource={dashboardData.berthOccupancy}
              rowKey="berthId"
              size="small"
              pagination={false}
            />
          </Card>

          {unresolvedConflicts.length > 0 ? (
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#ff4d4f' }} /> 未处理风险列表
                </Space>
              }
              size="small"
              style={{ marginTop: 16 }}
              extra={<Button type="link" onClick={() => onNavigate('conflict')}>查看全部</Button>}
            >
              <Table
                columns={riskColumns}
                dataSource={unresolvedConflicts.slice(0, 6)}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          ) : (
            <Card
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> 风险状态
                </Space>
              }
              size="small"
              style={{ marginTop: 16 }}
            >
              <Alert
                message="当前没有未处理的风险"
                description="所有冲突已标记为解决，系统运行正常"
                type="success"
                showIcon
              />
            </Card>
          )}
        </Col>

        <Col span={10}>
          <Card
            title={
              <Space>
                <RocketOutlined /> 即将靠泊（24小时内）
              </Space>
            }
            size="small"
            extra={<Button type="link" onClick={() => onNavigate('gantt')}>查看甘特图</Button>}
          >
            <List
              size="small"
              dataSource={dashboardData.upcomingSchedules.schedules}
              locale={{ emptyText: '未来24小时内没有待靠泊船舶' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => onNavigate('schedule', item.scheduleId)}>
                      详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<GlobalOutlined />}
                    title={
                      <Space>
                        <Text strong>{item.shipName}</Text>
                        <Tag color="blue">{item.berthName}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">
                          计划靠泊: {dayjs(item.plannedBerthingTime).format('MM-DD HH:mm')}
                        </Text>
                        <Text type="secondary">
                          优先级: #{item.priority}
                        </Text>
                      </Space>
                    }
                  />
                  <Tag color={item.countdownMinutes < 60 ? 'red' : item.countdownMinutes < 180 ? 'orange' : 'green'}>
                    {formatCountdown(item.countdownMinutes)}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={
              <Space>
                <ClockCircleOutlined /> 即将超时作业（24小时内）
              </Space>
            }
            size="small"
            style={{ marginTop: 16 }}
          >
            <List
              size="small"
              dataSource={dashboardData.overtimeRisk.schedules}
              locale={{ emptyText: '没有即将超时的作业' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => onNavigate('schedule', item.scheduleId)}>
                      调整
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: getOvertimeRiskColor(item.overtimeRisk),
                        marginLeft: 8
                      }} />
                    }
                    title={
                      <Space>
                        <Text strong>{item.shipName}</Text>
                        <Tag color="blue">{item.berthName}</Tag>
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        预计离港: {dayjs(item.plannedDepartureTime).format('MM-DD HH:mm')}
                      </Text>
                    }
                  />
                  <Tag color={item.overtimeRisk === 'high' ? 'red' : item.overtimeRisk === 'medium' ? 'orange' : 'green'}>
                    剩余 {item.remainingHours} 小时
                  </Tag>
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={
              <Space>
                <GlobalOutlined /> 待靠船舶列表
              </Space>
            }
            size="small"
            style={{ marginTop: 16 }}
          >
            <List
              size="small"
              dataSource={dashboardData.pendingShips.ships}
              locale={{ emptyText: '没有待靠泊船舶' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => onNavigate('ships')}>
                      查看
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<GlobalOutlined />}
                    title={
                      <Space>
                        <Text strong>{item.shipName}</Text>
                        <Tag color={item.status === '延期' ? 'orange' : 'blue'}>
                          {item.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">
                          到港时间: {dayjs(item.arrivalTime).format('MM-DD HH:mm')}
                        </Text>
                        <Text type="secondary">
                          泊位: {item.berthName}
                        </Text>
                      </Space>
                    }
                  />
                  <Tag color={item.waitHours < 0 ? 'red' : item.waitHours < 2 ? 'orange' : 'green'}>
                    {formatWaitTime(item.waitHours)}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
