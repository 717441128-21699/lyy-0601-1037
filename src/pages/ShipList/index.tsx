import { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  Space,
  message,
  Popconfirm,
  Tag
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSchedulerStore } from '@/store';
import type { Ship, CargoType } from '@/types';
import { formatDateTime, getCargoColor, exportDailyPlan } from '@/utils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const cargoTypes: CargoType[] = ['集装箱', '散货', '液体化工', '成品油', 'LNG', '粮食', '钢材', '其他'];

const ShipList = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterAgent, setFilterAgent] = useState<string | undefined>();
  const [filterCargoType, setFilterCargoType] = useState<CargoType | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const ships = useSchedulerStore((state) => state.ships);
  const schedules = useSchedulerStore((state) => state.schedules);
  const berths = useSchedulerStore((state) => state.berths);
  const addShip = useSchedulerStore((state) => state.addShip);
  const updateShip = useSchedulerStore((state) => state.updateShip);
  const deleteShip = useSchedulerStore((state) => state.deleteShip);
  const addSchedule = useSchedulerStore((state) => state.addSchedule);

  const filteredShips = ships.filter((ship) => {
    if (searchText) {
      const search = searchText.toLowerCase();
      if (
        !ship.name.toLowerCase().includes(search) &&
        !ship.voyage.toLowerCase().includes(search) &&
        !ship.imo?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (filterAgent && !ship.agent.includes(filterAgent)) {
      return false;
    }
    if (filterCargoType && ship.cargoType !== filterCargoType) {
      return false;
    }
    if (dateRange) {
      const arrivalTime = dayjs(ship.arrivalTime);
      if (!arrivalTime.isBetween(dateRange[0], dateRange[1], 'day', '[]')) {
        return false;
      }
    }
    return true;
  });

  const handleAdd = () => {
    setEditingShip(null);
    form.resetFields();
    form.setFieldsValue({
      arrivalTime: dayjs(),
      operationDuration: 8
    });
    setIsModalOpen(true);
  };

  const handleEdit = (ship: Ship) => {
    setEditingShip(ship);
    form.setFieldsValue({
      ...ship,
      arrivalTime: dayjs(ship.arrivalTime)
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteShip(id);
    message.success('删除成功');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const shipData = {
        ...values,
        arrivalTime: values.arrivalTime.format('YYYY-MM-DD HH:mm')
      };

      if (editingShip) {
        updateShip(editingShip.id, shipData);
        message.success('更新成功');
      } else {
        addShip(shipData);
        message.success('添加成功');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleQuickSchedule = (ship: Ship) => {
    Modal.confirm({
      title: '快速创建调度',
      content: `确定为船舶"${ship.name}"创建调度计划吗？系统将自动分配合适的泊位。`,
      onOk: () => {
        const suitableBerth = berths.find(
          (b) =>
            b.allowedCargoTypes.includes(ship.cargoType) &&
            b.maxLength >= ship.length &&
            b.maxDraft >= ship.draft &&
            b.status === '空闲'
        );

        if (!suitableBerth) {
          message.error('没有找到合适的泊位，请手动创建调度');
          return;
        }

        const berthingTime = dayjs(ship.arrivalTime).add(1, 'hour');
        addSchedule({
          shipId: ship.id,
          berthId: suitableBerth.id,
          plannedBerthingTime: berthingTime.format('YYYY-MM-DD HH:mm'),
          plannedDepartureTime: berthingTime.add(ship.operationDuration, 'hour').format('YYYY-MM-DD HH:mm'),
          operationDuration: ship.operationDuration,
          status: '待靠泊',
          priority: schedules.length + 1
        });
        message.success('调度创建成功');
      }
    });
  };

  const handleExport = () => {
    exportDailyPlan(schedules, ships, berths, dayjs().format('YYYY-MM-DD'));
    message.success('导出成功');
  };

  const handleReset = () => {
    setSearchText('');
    setFilterAgent(undefined);
    setFilterCargoType(undefined);
    setDateRange(null);
  };

  const columns: ColumnsType<Ship> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '船名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'IMO编号',
      dataIndex: 'imo',
      key: 'imo',
      width: 100
    },
    {
      title: '航次',
      dataIndex: 'voyage',
      key: 'voyage',
      width: 140
    },
    {
      title: '船长(m)',
      dataIndex: 'length',
      key: 'length',
      width: 80
    },
    {
      title: '吃水(m)',
      dataIndex: 'draft',
      key: 'draft',
      width: 80
    },
    {
      title: '总吨位',
      dataIndex: 'grossTonnage',
      key: 'grossTonnage',
      width: 100,
      render: (value) => (value ? `${value.toLocaleString()} t` : '-')
    },
    {
      title: '货类',
      dataIndex: 'cargoType',
      key: 'cargoType',
      width: 100,
      render: (text: CargoType) => (
        <Tag color={getCargoColor(text)}>{text}</Tag>
      )
    },
    {
      title: '货量(t)',
      dataIndex: 'cargoWeight',
      key: 'cargoWeight',
      width: 100,
      render: (value) => value.toLocaleString()
    },
    {
      title: '代理',
      dataIndex: 'agent',
      key: 'agent',
      width: 140
    },
    {
      title: '承运人',
      dataIndex: 'carrier',
      key: 'carrier',
      width: 120
    },
    {
      title: '到港时间',
      dataIndex: 'arrivalTime',
      key: 'arrivalTime',
      width: 160,
      render: (text) => formatDateTime(text)
    },
    {
      title: '作业时长(h)',
      dataIndex: 'operationDuration',
      key: 'operationDuration',
      width: 100
    },
    {
      title: '特殊要求',
      dataIndex: 'specialRequirements',
      key: 'specialRequirements',
      width: 150,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<ScheduleOutlined />}
            onClick={() => handleQuickSchedule(record)}
          >
            调度
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除"
            description="删除后将同时关联的调度计划，是否继续？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const agents = Array.from(new Set(ships.map((s) => s.agent)));

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h2 className="page-title">船舶列表</h2>
        <div className="action-bar">
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<SearchOutlined />} type="primary" onClick={() => {}}>
            搜索
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
            新增船舶
          </Button>
          <Button icon={<SearchOutlined />} onClick={handleExport}>
            导出当日计划
          </Button>
        </div>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="搜索船名、航次、IMO"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="筛选代理"
          value={filterAgent}
          onChange={setFilterAgent}
          style={{ width: 180 }}
          allowClear
        >
          {agents.map((agent) => (
            <Option key={agent} value={agent}>
              {agent}
            </Option>
          ))}
        </Select>
        <Select
          placeholder="筛选货类"
          value={filterCargoType}
          onChange={setFilterCargoType}
          style={{ width: 140 }}
          allowClear
        >
          {cargoTypes.map((type) => (
            <Option key={type} value={type}>
              {type}
            </Option>
          ))}
        </Select>
        <RangePicker
          placeholder={['开始日期', '结束日期']}
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
        />
        <span style={{ color: '#666', marginLeft: 'auto' }}>
          共 <strong style={{ color: '#1890ff' }}>{filteredShips.length}</strong> 条记录
        </span>
      </div>

      <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={filteredShips}
          rowKey="id"
          scroll={{ x: 1600, y: 'calc(100vh - 320px)' }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </div>

      <Modal
        title={editingShip ? '编辑船舶信息' : '新增船舶信息'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="ship-form-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="name"
              label="船名"
              rules={[{ required: true, message: '请输入船名' }]}
            >
              <Input placeholder="请输入船名" />
            </Form.Item>
            <Form.Item name="imo" label="IMO编号">
              <Input placeholder="请输入IMO编号" />
            </Form.Item>
            <Form.Item
              name="voyage"
              label="航次"
              rules={[{ required: true, message: '请输入航次' }]}
            >
              <Input placeholder="请输入航次" />
            </Form.Item>
            <Form.Item
              name="length"
              label="船长(m)"
              rules={[{ required: true, message: '请输入船长' }]}
            >
              <InputNumber min={0} max={500} style={{ width: '100%' }} placeholder="请输入船长" />
            </Form.Item>
            <Form.Item
              name="draft"
              label="吃水(m)"
              rules={[{ required: true, message: '请输入吃水' }]}
            >
              <InputNumber min={0} max={20} step={0.1} style={{ width: '100%' }} placeholder="请输入吃水" />
            </Form.Item>
            <Form.Item name="grossTonnage" label="总吨位(t)">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入总吨位" />
            </Form.Item>
            <Form.Item
              name="cargoType"
              label="货类"
              rules={[{ required: true, message: '请选择货类' }]}
            >
              <Select placeholder="请选择货类">
                {cargoTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="cargoWeight"
              label="货量(t)"
              rules={[{ required: true, message: '请输入货量' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入货量" />
            </Form.Item>
            <Form.Item
              name="agent"
              label="代理"
              rules={[{ required: true, message: '请输入代理' }]}
            >
              <Input placeholder="请输入代理" />
            </Form.Item>
            <Form.Item name="carrier" label="承运人">
              <Input placeholder="请输入承运人" />
            </Form.Item>
            <Form.Item
              name="arrivalTime"
              label="到港时间"
              rules={[{ required: true, message: '请选择到港时间' }]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="operationDuration"
              label="预计作业时长(h)"
              rules={[{ required: true, message: '请输入作业时长' }]}
            >
              <InputNumber min={1} max={72} style={{ width: '100%' }} placeholder="请输入作业时长" />
            </Form.Item>
          </div>
          <Form.Item name="specialRequirements" label="特殊要求">
            <TextArea rows={3} placeholder="请输入特殊作业要求" />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShipList;
