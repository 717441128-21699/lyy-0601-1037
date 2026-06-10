import { useState } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Select,
  DatePicker,
  Input,
  Statistic,
  Row,
  Col,
  Tooltip,
  message,
  Modal,
  Descriptions
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  ExportOutlined,
  SearchOutlined,
  EyeOutlined,
  InsertRowLeftOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  SwapOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { OperationRecord, OperationType } from '@/types';
import {
  formatDateTime,
  getOperationTypeLabel,
  getCargoColor,
  prepareHistoryExportData,
  exportToExcel
} from '@/utils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

interface FilterState {
  dateRange: [Dayjs, Dayjs] | null;
  shipName: string;
  berthId: string;
  originalBerthId: string;
  newBerthId: string;
  operator: string;
  operationType: OperationType | 'all';
}

const ScheduleReview = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: [dayjs().subtract(7, 'day'), dayjs()],
    shipName: '',
    berthId: '',
    originalBerthId: '',
    newBerthId: '',
    operator: '',
    operationType: 'all'
  });
  const [selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const operationRecords = useSchedulerStore((state) => state.operationRecords);
  const schedules = useSchedulerStore((state) => state.schedules);
  const ships = useSchedulerStore((state) => state.ships);
  const berths = useSchedulerStore((state) => state.berths);
  const getFilteredOperationRecords = useSchedulerStore((state) => state.getFilteredOperationRecords);

  const filteredRecords = getFilteredOperationRecords({
    dateRange: filters.dateRange ? [filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')] : undefined,
    shipName: filters.shipName || undefined,
    berthId: filters.berthId || undefined,
    originalBerthId: filters.originalBerthId || undefined,
    newBerthId: filters.newBerthId || undefined,
    operator: filters.operator || undefined,
    operationType: filters.operationType
  });

  const insertCount = filteredRecords.filter(r => r.operationType === 'insert').length;
  const delayCount = filteredRecords.filter(r => r.operationType === 'delay').length;
  const cancelCount = filteredRecords.filter(r => r.operationType === 'cancel').length;
  const rescheduleCount = filteredRecords.filter(r => r.operationType === 'reschedule').length;
  const modifyCount = filteredRecords.filter(r => r.operationType === 'modify').length;

  const getOperationIcon = (type: OperationType) => {
    switch (type) {
      case 'insert':
        return <InsertRowLeftOutlined style={{ color: '#722ed1' }} />;
      case 'delay':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'cancel':
        return <DeleteOutlined style={{ color: '#ff4d4f' }} />;
      case 'reschedule':
        return <SwapOutlined style={{ color: '#1890ff' }} />;
      case 'modify':
        return <EditOutlined style={{ color: '#52c41a' }} />;
      default:
        return <EditOutlined />;
    }
  };

  const getOperationColor = (type: OperationType) => {
    switch (type) {
      case 'insert':
        return '#722ed1';
      case 'delay':
        return '#faad14';
      case 'cancel':
        return '#ff4d4f';
      case 'reschedule':
        return '#1890ff';
      case 'modify':
        return '#52c41a';
      default:
        return '#8c8c8c';
    }
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      message.warning('没有可导出的记录');
      return;
    }
    
    const data = prepareHistoryExportData(filteredRecords, schedules, ships);
    const fileName = filters.dateRange 
      ? `调度复盘记录_${filters.dateRange[0].format('YYYYMMDD')}-${filters.dateRange[1].format('YYYYMMDD')}`
      : '调度复盘记录';
    
    exportToExcel(data, '调度复盘记录', fileName);
    message.success(`已导出 ${filteredRecords.length} 条记录`);
  };

  const handleViewDetail = (record: OperationRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: [dayjs().subtract(7, 'day'), dayjs()],
      shipName: '',
      berthId: '',
      originalBerthId: '',
      newBerthId: '',
      operator: '',
      operationType: 'all'
    });
    message.success('筛选条件已重置');
  };

  const columns: ColumnsType<OperationRecord> = [
    {
      title: '操作时间',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 170,
      fixed: 'left',
      render: (text) => formatDateTime(text),
      sorter: (a, b) => dayjs(a.operationTime).valueOf() - dayjs(b.operationTime).valueOf(),
      defaultSortOrder: 'descend'
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 120,
      render: (type: OperationType) => (
        <Tag color={getOperationColor(type)} icon={getOperationIcon(type)}>
          {getOperationTypeLabel(type)}
        </Tag>
      ),
      filters: [
        { text: '临时插队', value: 'insert' },
        { text: '延期离港', value: 'delay' },
        { text: '取消靠泊', value: 'cancel' },
        { text: '拖拽调整', value: 'reschedule' },
        { text: '修改调度', value: 'modify' }
      ],
      onFilter: (value, record) => record.operationType === value
    },
    {
      title: '船名',
      key: 'shipName',
      width: 120,
      render: (_, record) => {
        const schedule = schedules.find(s => s.id === record.scheduleId);
        const ship = schedule ? ships.find(s => s.id === schedule.shipId) : null;
        return ship ? (
          <Space>
            <Tag color={getCargoColor(ship.cargoType)}>{ship.cargoType}</Tag>
            <strong>{ship.name}</strong>
          </Space>
        ) : '-';
      }
    },
    {
      title: '航次',
      key: 'voyage',
      width: 100,
      render: (_, record) => {
        const schedule = schedules.find(s => s.id === record.scheduleId);
        const ship = schedule ? ships.find(s => s.id === schedule.shipId) : null;
        return ship?.voyage || '-';
      }
    },
    {
      title: '泊位',
      key: 'berthName',
      width: 100,
      render: (_, record) => {
        const schedule = schedules.find(s => s.id === record.scheduleId);
        const berth = schedule ? berths.find(b => b.id === schedule.berthId) : null;
        return berth?.name || '-';
      }
    },
    {
      title: '原泊位',
      key: 'originalBerth',
      width: 100,
      render: (_, record) => {
        const berth = record.originalBerthId ? berths.find(b => b.id === record.originalBerthId) : null;
        return berth ? (
          <span style={{ color: '#ff4d4f' }}>{berth.name}</span>
        ) : '-';
      }
    },
    {
      title: '新泊位',
      key: 'newBerth',
      width: 100,
      render: (_, record) => {
        const berth = record.newBerthId ? berths.find(b => b.id === record.newBerthId) : null;
        return berth ? (
          <span style={{ color: '#52c41a' }}>{berth.name}</span>
        ) : '-';
      }
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100
    },
    {
      title: '原因/备注',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '变更前',
      dataIndex: 'oldValue',
      key: 'oldValue',
      width: 200,
      ellipsis: true,
      render: (text) => text ? (
        <Tooltip title={text}>
          <span style={{ color: '#ff4d4f' }}>{text}</span>
        </Tooltip>
      ) : '-'
    },
    {
      title: '变更后',
      dataIndex: 'newValue',
      key: 'newValue',
      width: 200,
      ellipsis: true,
      render: (text) => text ? (
        <Tooltip title={text}>
          <span style={{ color: '#52c41a' }}>{text}</span>
        </Tooltip>
      ) : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ];

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    const schedule = schedules.find(s => s.id === selectedRecord.scheduleId);
    const ship = schedule ? ships.find(s => s.id === schedule.shipId) : null;
    const berth = schedule ? berths.find(b => b.id === schedule.berthId) : null;

    return (
      <Modal
        title="操作详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="操作时间" span={2}>
            {formatDateTime(selectedRecord.operationTime)}
          </Descriptions.Item>
          <Descriptions.Item label="操作类型">
            <Tag color={getOperationColor(selectedRecord.operationType)} icon={getOperationIcon(selectedRecord.operationType)}>
              {getOperationTypeLabel(selectedRecord.operationType)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="操作人">
            {selectedRecord.operator}
          </Descriptions.Item>
          {ship && (
            <>
              <Descriptions.Item label="船名">
                <strong>{ship.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="航次">
                {ship.voyage}
              </Descriptions.Item>
              <Descriptions.Item label="货类">
                <Tag color={getCargoColor(ship.cargoType)}>{ship.cargoType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="船长/吃水">
                {ship.length}m / {ship.draft}m
              </Descriptions.Item>
            </>
          )}
          {berth && (
            <Descriptions.Item label="当前泊位" span={2}>
              {berth.name} ({berth.code})
            </Descriptions.Item>
          )}
          {selectedRecord.originalBerthId && (
            <Descriptions.Item label="原泊位">
              <span style={{ color: '#ff4d4f' }}>
                {berths.find(b => b.id === selectedRecord.originalBerthId)?.name || selectedRecord.originalBerthId}
              </span>
            </Descriptions.Item>
          )}
          {selectedRecord.newBerthId && (
            <Descriptions.Item label="新泊位">
              <span style={{ color: '#52c41a' }}>
                {berths.find(b => b.id === selectedRecord.newBerthId)?.name || selectedRecord.newBerthId}
              </span>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="操作原因" span={2}>
            {selectedRecord.reason}
          </Descriptions.Item>
          {selectedRecord.oldValue && (
            <Descriptions.Item label="变更前" span={2}>
              <div style={{ background: '#fff1f0', padding: 8, borderRadius: 4, color: '#ff4d4f' }}>
                {selectedRecord.oldValue}
              </div>
            </Descriptions.Item>
          )}
          {selectedRecord.newValue && (
            <Descriptions.Item label="变更后" span={2}>
              <div style={{ background: '#f6ffed', padding: 8, borderRadius: 4, color: '#52c41a' }}>
                {selectedRecord.newValue}
              </div>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="记录ID" span={2}>
            <span style={{ color: '#999', fontFamily: 'monospace', fontSize: 12 }}>
              {selectedRecord.id}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    );
  };

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2 className="page-title">
          <HistoryOutlined style={{ color: '#722ed1', marginRight: 8 }} />
          调度复盘
        </h2>
        <div className="action-bar">
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
              重置筛选
            </Button>
            <Button 
              type="primary" 
              icon={<ExportOutlined />} 
              onClick={handleExport}
            >
              导出Excel
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="临时插队"
              value={insertCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<InsertRowLeftOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="延期离港"
              value={delayCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="取消靠泊"
              value={cancelCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<DeleteOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="拖拽调整"
              value={rescheduleCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="修改调度"
              value={modifyCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总计记录"
              value={filteredRecords.length}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size={16} wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', whiteSpace: 'nowrap' }}>操作日期：</span>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters(f => ({ ...f, dateRange: dates as [Dayjs, Dayjs] | null }))}
              style={{ width: 280 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', whiteSpace: 'nowrap' }}>操作类型：</span>
            <Select
              value={filters.operationType}
              onChange={(value) => setFilters(f => ({ ...f, operationType: value }))}
              style={{ width: 140 }}
              allowClear
            >
              <Option value="all">全部类型</Option>
              <Option value="insert">临时插队</Option>
              <Option value="delay">延期离港</Option>
              <Option value="cancel">取消靠泊</Option>
              <Option value="reschedule">拖拽调整</Option>
              <Option value="modify">修改调度</Option>
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', whiteSpace: 'nowrap' }}>当前泊位：</span>
            <Select
              value={filters.berthId}
              onChange={(value) => setFilters(f => ({ ...f, berthId: value }))}
              style={{ width: 140 }}
              allowClear
              showSearch
              placeholder="选择泊位"
            >
              {berths.map(berth => (
                <Option key={berth.id} value={berth.id}>
                  {berth.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ff4d4f', whiteSpace: 'nowrap' }}>原泊位：</span>
            <Select
              value={filters.originalBerthId}
              onChange={(value) => setFilters(f => ({ ...f, originalBerthId: value }))}
              style={{ width: 140 }}
              allowClear
              showSearch
              placeholder="原泊位"
            >
              {berths.map(berth => (
                <Option key={berth.id} value={berth.id}>
                  {berth.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#52c41a', whiteSpace: 'nowrap' }}>新泊位：</span>
            <Select
              value={filters.newBerthId}
              onChange={(value) => setFilters(f => ({ ...f, newBerthId: value }))}
              style={{ width: 140 }}
              allowClear
              showSearch
              placeholder="新泊位"
            >
              {berths.map(berth => (
                <Option key={berth.id} value={berth.id}>
                  {berth.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#666', whiteSpace: 'nowrap' }}>操作人：</span>
            <Input
              placeholder="输入操作人"
              value={filters.operator}
              onChange={(e) => setFilters(f => ({ ...f, operator: e.target.value }))}
              style={{ width: 120 }}
              allowClear
            />
          </div>
          <Search
            placeholder="搜索船名"
            value={filters.shipName}
            onChange={(e) => setFilters(f => ({ ...f, shipName: e.target.value }))}
            onSearch={(value) => setFilters(f => ({ ...f, shipName: value }))}
            style={{ width: 160 }}
            allowClear
            prefix={<SearchOutlined />}
          />
        </Space>
      </Card>

      <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          scroll={{ x: 1900, y: 'calc(100vh - 480px)' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条操作记录`
          }}
          rowClassName={(record) => {
            if (record.operationType === 'cancel') return 'cancel-row';
            if (record.operationType === 'delay') return 'delay-row';
            if (record.operationType === 'insert') return 'insert-row';
            return '';
          }}
        />
      </div>

      {renderDetailModal()}

      <style>{`
        .cancel-row {
          background: #fff1f0;
        }
        .cancel-row:hover > td {
          background: #fff1f0 !important;
        }
        .delay-row {
          background: #fffbe6;
        }
        .delay-row:hover > td {
          background: #fffbe6 !important;
        }
        .insert-row {
          background: #f9f0ff;
        }
        .insert-row:hover > td {
          background: #f9f0ff !important;
        }
      `}</style>
    </div>
  );
};

export default ScheduleReview;
