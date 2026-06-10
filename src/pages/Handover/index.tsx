import { useState } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Table,
  Modal,
  Tabs,
  Tag,
  Space,
  Descriptions,
  Timeline,
  Row,
  Col,
  Statistic,
  message,
  Divider,
  Typography,
  List
} from 'antd';
import {
  UserSwitchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ExportOutlined,
  PrinterOutlined,
  SaveOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { ShiftRecord, Schedule } from '@/types';
import {
  formatDateTime,
  getStatusClass,
  getCargoColor,
  generateHandoverSummary,
  exportDailyPlan,
  exportHistoryRecords,
  getOperationTypeLabel
} from '@/utils';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const shiftTypes = ['早班', '中班', '晚班'] as const;

const Handover = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'handover' | 'history' | 'schedule'>('handover');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printContent, setPrintContent] = useState<string>('');
  const [selectedShiftRecord, setSelectedShiftRecord] = useState<ShiftRecord | null>(null);

  const schedules = useSchedulerStore((state) => state.schedules);
  const ships = useSchedulerStore((state) => state.ships);
  const berths = useSchedulerStore((state) => state.berths);
  const shiftRecords = useSchedulerStore((state) => state.shiftRecords);
  const operationRecords = useSchedulerStore((state) => state.operationRecords);
  const addShiftRecord = useSchedulerStore((state) => state.addShiftRecord);
  const currentOperator = useSchedulerStore((state) => state.currentOperator);
  const conflictWarnings = useSchedulerStore((state) => state.conflictWarnings);

  const todaySchedules = schedules.filter((s) =>
    dayjs(s.plannedBerthingTime).isSame(dayjs(), 'day')
  );

  const pendingSchedules = todaySchedules.filter((s) => s.status === '待靠泊');
  const workingSchedules = todaySchedules.filter((s) => s.status === '作业中' || s.status === '靠泊中');
  const completedSchedules = todaySchedules.filter((s) => s.status === '已离港');
  const conflictSchedules = todaySchedules.filter(
    (s) => s.conflictWarnings && s.conflictWarnings.some((w) => !w.resolved)
  );

  const handleGenerateSummary = () => {
    const values = form.getFieldsValue();
    const summary = generateHandoverSummary(schedules, ships, berths, values.shiftType || '早班');
    form.setFieldsValue({ summary });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const newRecord = {
        shiftDate: values.shiftDate.format('YYYY-MM-DD'),
        shiftType: values.shiftType,
        operator: currentOperator,
        nextOperator: values.nextOperator,
        handoverTime: dayjs().format('YYYY-MM-DD HH:mm'),
        schedules: todaySchedules.map((s) => s.id),
        summary: values.summary,
        pendingMatters: values.pendingMatters
      };

      addShiftRecord(newRecord);
      message.success('交接班记录已保存');
      form.resetFields();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleExportDailyPlan = () => {
    exportDailyPlan(schedules, ships, berths, dayjs().format('YYYY-MM-DD'));
    message.success('当日计划已导出');
  };

  const handleExportHistory = () => {
    exportHistoryRecords(operationRecords, schedules, ships);
    message.success('历史记录已导出');
  };

  const handlePrintSchedule = () => {
    const content = generateSchedulePrintContent();
    setPrintContent(content);
    setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewShiftDetail = (record: ShiftRecord) => {
    setSelectedShiftRecord(record);
  };

  const generateSchedulePrintContent = () => {
    const today = dayjs().format('YYYY年MM月DD日');
    const validSchedules = todaySchedules.filter((s) => s.status !== '已取消');
    
    let content = `
【港口船舶靠泊调度单】
日期：${today}
生成时间：${dayjs().format('YYYY-MM-DD HH:mm')}
值班调度：${currentOperator}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

今日调度计划（共${validSchedules.length}艘）：

`;

    validSchedules
      .sort((a, b) => a.priority - b.priority)
      .forEach((schedule, index) => {
        const ship = ships.find((s) => s.id === schedule.shipId);
        const berth = berths.find((b) => b.id === schedule.berthId);
        
        content += `${index + 1}. ${ship?.name || '未知船舶'}
   航次：${ship?.voyage || '-'}
   货类：${ship?.cargoType || '-'} / ${ship?.cargoWeight?.toLocaleString() || '-'}吨
   泊位：${berth?.name || '-'}
   靠泊时间：${formatDateTime(schedule.plannedBerthingTime)}
   离港时间：${formatDateTime(schedule.plannedDepartureTime)}
   作业时长：${schedule.operationDuration}小时
   状态：${schedule.status}
   代理：${ship?.agent || '-'}
   ${schedule.remarks ? `备注：${schedule.remarks}` : ''}
   ${schedule.conflictWarnings && schedule.conflictWarnings.length > 0 
     ? `⚠️  冲突：${schedule.conflictWarnings.map(w => w.message).join('; ')}` 
     : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      });

    const pendingCount = pendingSchedules.length;
    const workingCount = workingSchedules.length;
    const completedCount = completedSchedules.length;
    const conflictCount = conflictSchedules.length;

    content += `
【统计信息】
待靠泊：${pendingCount} 艘
作业中：${workingCount} 艘
已离港：${completedCount} 艘
存在冲突：${conflictCount} 艘

【值班注意事项】
${conflictCount > 0 ? '⚠️  请优先处理存在冲突的调度计划\n' : ''}
1. 请密切关注潮汐变化，确保船舶靠泊安全
2. 作业前确认泊位设备状态正常
3. 及时更新船舶动态信息
4. 遇到问题请及时与相关部门沟通

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
调度员签字：__________  日期：__________
接班调度签字：__________  日期：__________
`;

    return content;
  };

  const scheduleColumns: ColumnsType<Schedule> = [
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 70,
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
      width: 90,
      render: (_, record) => {
        const ship = ships.find((s) => s.id === record.shipId);
        return ship ? <Tag color={getCargoColor(ship.cargoType)}>{ship.cargoType}</Tag> : '-';
      }
    },
    {
      title: '泊位',
      key: 'berthName',
      width: 130,
      render: (_, record) => {
        const berth = berths.find((b) => b.id === record.berthId);
        return berth?.name || '-';
      }
    },
    {
      title: '预计靠泊',
      dataIndex: 'plannedBerthingTime',
      key: 'plannedBerthingTime',
      width: 150,
      render: (text) => formatDateTime(text)
    },
    {
      title: '预计离港',
      dataIndex: 'plannedDepartureTime',
      key: 'plannedDepartureTime',
      width: 150,
      render: (text) => formatDateTime(text)
    },
    {
      title: '作业时长',
      dataIndex: 'operationDuration',
      key: 'operationDuration',
      width: 90,
      render: (text) => `${text}h`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (text) => <Tag className={getStatusClass(text)}>{text}</Tag>
    },
    {
      title: '冲突',
      key: 'conflict',
      width: 60,
      render: (_, record) => {
        const hasConflict = record.conflictWarnings?.some((w) => !w.resolved);
        return hasConflict ? (
          <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
        ) : (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        );
      }
    }
  ];

  const historyColumns: ColumnsType<ShiftRecord> = [
    {
      title: '日期',
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      width: 120
    },
    {
      title: '班次',
      dataIndex: 'shiftType',
      key: 'shiftType',
      width: 80,
      render: (text) => (
        <Tag color={text === '早班' ? '#1890ff' : text === '中班' ? '#faad14' : '#722ed1'}>
          {text}
        </Tag>
      )
    },
    {
      title: '交班人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100
    },
    {
      title: '接班人',
      dataIndex: 'nextOperator',
      key: 'nextOperator',
      width: 100
    },
    {
      title: '交接时间',
      dataIndex: 'handoverTime',
      key: 'handoverTime',
      width: 160,
      render: (text) => formatDateTime(text)
    },
    {
      title: '调度数量',
      key: 'scheduleCount',
      width: 100,
      render: (_, record) => `${record.schedules.length} 艘`
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (text) => (
        <div style={{ maxWidth: 300 }}>{text}</div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewShiftDetail(record)}
        >
          查看详情
        </Button>
      )
    }
  ];

  const renderHandoverForm = () => (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日计划"
              value={todaySchedules.filter((s) => s.status !== '已取消').length}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待靠泊"
              value={pendingSchedules.length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="作业中"
              value={workingSchedules.length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="存在冲突"
              value={conflictSchedules.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: conflictSchedules.length > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="交接班信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="shiftDate"
                label="交接班日期"
                initialValue={dayjs()}
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="shiftType"
                label="班次"
                initialValue="早班"
                rules={[{ required: true, message: '请选择班次' }]}
              >
                <Select>
                  {shiftTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="nextOperator"
                label="接班调度员"
                rules={[{ required: true, message: '请输入接班调度员姓名' }]}
              >
                <Input placeholder="请输入接班调度员姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="交班调度员">
                <Input value={currentOperator} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="交接时间">
                <Input value={dayjs().format('YYYY-MM-DD HH:mm')} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="summary"
            label="交接班摘要"
            rules={[{ required: true, message: '请生成或填写交接班摘要' }]}
          >
            <TextArea rows={8} placeholder="点击下方按钮自动生成交接班摘要，或手动填写..." />
          </Form.Item>
          <Form.Item name="pendingMatters" label="待办事项">
            <TextArea rows={4} placeholder="请输入需要下一班次跟进的事项..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button icon={<FileTextOutlined />} onClick={handleGenerateSummary}>
              自动生成摘要
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintSchedule}>
              打印调度单
            </Button>
            <Button icon={<SaveOutlined />} type="primary" onClick={handleSubmit}>
              保存交接班记录
            </Button>
          </div>
        </Form>
      </Card>

      <Card title="今日作业事项">
        <Space direction="vertical" style={{ width: '100%' }}>
          {pendingSchedules.length > 0 && (
            <div>
              <Text strong style={{ color: '#faad14' }}>
                <ClockCircleOutlined /> 待靠泊船舶（{pendingSchedules.length}艘）：
              </Text>
              <List
                size="small"
                dataSource={pendingSchedules.slice(0, 5)}
                renderItem={(schedule) => {
                  const ship = ships.find((s) => s.id === schedule.shipId);
                  const berth = berths.find((b) => b.id === schedule.berthId);
                  return (
                    <List.Item>
                      <span>
                        <strong>{ship?.name}</strong> - {berth?.name} - {formatDateTime(schedule.plannedBerthingTime)}
                      </span>
                      {schedule.conflictWarnings && schedule.conflictWarnings.length > 0 && (
                        <Tag color="red">有冲突</Tag>
                      )}
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
          {workingSchedules.length > 0 && (
            <div>
              <Text strong style={{ color: '#52c41a' }}>
                <CheckCircleOutlined /> 作业中船舶（{workingSchedules.length}艘）：
              </Text>
              <List
                size="small"
                dataSource={workingSchedules}
                renderItem={(schedule) => {
                  const ship = ships.find((s) => s.id === schedule.shipId);
                  const berth = berths.find((b) => b.id === schedule.berthId);
                  return (
                    <List.Item>
                      <span>
                        <strong>{ship?.name}</strong> - {berth?.name} - 预计{formatDateTime(schedule.plannedDepartureTime)}离港
                      </span>
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
          {conflictSchedules.length > 0 && (
            <div>
              <Text strong style={{ color: '#ff4d4f' }}>
                <WarningOutlined /> 需要注意的冲突（{conflictSchedules.length}项）：
              </Text>
              <List
                size="small"
                dataSource={conflictSchedules}
                renderItem={(schedule) => {
                  const ship = ships.find((s) => s.id === schedule.shipId);
                  const warnings = schedule.conflictWarnings?.filter(w => !w.resolved).map(w => w.message).join('; ');
                  return (
                    <List.Item style={{ color: '#ff4d4f' }}>
                      <InfoCircleOutlined /> <strong>{ship?.name}</strong>: {warnings}
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
        </Space>
      </Card>
    </div>
  );

  const renderHistoryRecords = () => (
    <div style={{ padding: 16 }}>
      <div className="page-header">
        <h3>历史交接班记录</h3>
        <div className="action-bar">
          <Button icon={<ExportOutlined />} onClick={handleExportHistory}>
            导出历史记录
          </Button>
        </div>
      </div>
      <div className="table-container">
        <Table
          columns={historyColumns}
          dataSource={shiftRecords}
          rowKey="id"
          scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </div>

      <Modal
        title="交接班记录详情"
        open={!!selectedShiftRecord}
        onCancel={() => setSelectedShiftRecord(null)}
        footer={null}
        width={800}
      >
        {selectedShiftRecord && (
          <div>
            <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{selectedShiftRecord.shiftDate}</Descriptions.Item>
              <Descriptions.Item label="班次">{selectedShiftRecord.shiftType}</Descriptions.Item>
              <Descriptions.Item label="交班人">{selectedShiftRecord.operator}</Descriptions.Item>
              <Descriptions.Item label="接班人">{selectedShiftRecord.nextOperator}</Descriptions.Item>
              <Descriptions.Item label="交接时间" span={2}>
                {formatDateTime(selectedShiftRecord.handoverTime)}
              </Descriptions.Item>
              <Descriptions.Item label="调度数量">{selectedShiftRecord.schedules.length} 艘</Descriptions.Item>
              <Descriptions.Item label="记录时间">{formatDateTime(selectedShiftRecord.createTime)}</Descriptions.Item>
            </Descriptions>
            
            <Divider orientation="left">交接班摘要</Divider>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
              {selectedShiftRecord.summary}
            </div>
            
            <Divider orientation="left">待办事项</Divider>
            <div style={{ padding: 12, background: '#fffbe6', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
              {selectedShiftRecord.pendingMatters || '无'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  const renderScheduleList = () => (
    <div style={{ padding: 16 }}>
      <div className="page-header">
        <h3>当日调度计划</h3>
        <div className="action-bar">
          <Button icon={<PrinterOutlined />} onClick={handlePrintSchedule}>
            打印调度单
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExportDailyPlan}>
            导出Excel
          </Button>
        </div>
      </div>
      <div className="table-container">
        <Table
          columns={scheduleColumns}
          dataSource={todaySchedules.filter((s) => s.status !== '已取消')}
          rowKey="id"
          scroll={{ x: 1400, y: 'calc(100vh - 300px)' }}
          pagination={false}
        />
      </div>

      <Card title="今日操作记录" style={{ marginTop: 16 }}>
        <Timeline
          items={operationRecords
            .filter((r) => dayjs(r.operationTime).isSame(dayjs(), 'day'))
            .sort((a, b) => dayjs(b.operationTime).valueOf() - dayjs(a.operationTime).valueOf())
            .slice(0, 10)
            .map((record) => {
              const schedule = schedules.find((s) => s.id === record.scheduleId);
              const ship = schedule ? ships.find((s) => s.id === schedule.shipId) : null;
              return {
                color: record.operationType === 'cancel' ? 'red' : record.operationType === 'delay' ? 'orange' : 'blue',
                children: (
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {getOperationTypeLabel(record.operationType)}
                      {ship && ` - ${ship.name}`}
                      <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                        {record.operationTime}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      操作人：{record.operator} | 原因：{record.reason}
                    </div>
                  </div>
                )
              };
            })}
        />
        {operationRecords.filter((r) => dayjs(r.operationTime).isSame(dayjs(), 'day')).length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
            今日暂无操作记录
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ padding: '16px 16px 0 16px' }}>
        <h2 className="page-title">
          <UserSwitchOutlined style={{ marginRight: 8 }} />
          交接班
        </h2>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        items={[
          {
            key: 'handover',
            label: (
              <span>
                <UserSwitchOutlined /> 交接班
              </span>
            ),
            children: <div style={{ flex: 1, overflow: 'auto' }}>{renderHandoverForm()}</div>
          },
          {
            key: 'schedule',
            label: (
              <span>
                <FileTextOutlined /> 当日调度单
              </span>
            ),
            children: <div style={{ flex: 1, overflow: 'auto' }}>{renderScheduleList()}</div>
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> 历史记录
              </span>
            ),
            children: <div style={{ flex: 1, overflow: 'auto' }}>{renderHistoryRecords()}</div>
          }
        ]}
      />

      <Modal
        title="打印调度单"
        open={isPrintModalOpen}
        onCancel={() => setIsPrintModalOpen(false)}
        width={800}
        footer={[
          <Button key="back" onClick={() => setIsPrintModalOpen(false)}>
            关闭
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            打印
          </Button>
        ]}
      >
        <div className="schedule-print" id="print-content">
          <div className="schedule-print-header">
            <div className="schedule-print-title">港口船舶靠泊调度单</div>
            <div className="schedule-print-subtitle">
              {dayjs().format('YYYY年MM月DD日')} | 值班调度：{currentOperator}
            </div>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.8,
              background: 'none',
              border: 'none',
              padding: 0
            }}
          >
            {printContent}
          </pre>
        </div>
      </Modal>
    </div>
  );
};

export default Handover;
