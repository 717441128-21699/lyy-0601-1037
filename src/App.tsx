import { useState, useEffect } from 'react';
import { Layout, Menu, theme, Badge, Avatar, Dropdown, Space } from 'antd';
import {
  GlobalOutlined,
  BarChartOutlined,
  EditOutlined,
  WarningOutlined,
  UserSwitchOutlined,
  ExportOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useSchedulerStore } from '@/store';
import ShipList from '@/pages/ShipList';
import BerthGantt from '@/pages/BerthGantt';
import ScheduleEdit from '@/pages/ScheduleEdit';
import ConflictCheck from '@/pages/ConflictCheck';
import Handover from '@/pages/Handover';
import ScheduleReview from '@/pages/ScheduleReview';

const { Header, Sider, Content } = Layout;

type PageKey = 'ships' | 'gantt' | 'schedule' | 'conflict' | 'handover' | 'review';

const menuItems = [
  {
    key: 'ships',
    icon: <GlobalOutlined />,
    label: '船舶列表'
  },
  {
    key: 'gantt',
    icon: <BarChartOutlined />,
    label: '泊位甘特图'
  },
  {
    key: 'schedule',
    icon: <EditOutlined />,
    label: '调度编辑'
  },
  {
    key: 'conflict',
    icon: <WarningOutlined />,
    label: (
      <Badge dot={useSchedulerStore.getState().conflictWarnings.some(w => w.severity === 'error' && !w.resolved)}>
        冲突检查
      </Badge>
    )
  },
  {
    key: 'handover',
    icon: <UserSwitchOutlined />,
    label: '交接班'
  },
  {
    key: 'review',
    icon: <HistoryOutlined />,
    label: '调度复盘'
  }
];

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('gantt');
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken();
  const initializeMockData = useSchedulerStore((state) => state.initializeMockData);
  const conflictWarnings = useSchedulerStore((state) => state.conflictWarnings);
  const currentOperator = useSchedulerStore((state) => state.currentOperator);
  const setCurrentOperator = useSchedulerStore((state) => state.setCurrentOperator);

  useEffect(() => {
    const state = useSchedulerStore.getState();
    if (state.ships.length === 0 && state.schedules.length === 0) {
      initializeMockData();
    } else {
      setTimeout(() => state.checkConflicts(), 100);
    }
  }, [initializeMockData]);

  const errorCount = conflictWarnings.filter((w) => w.severity === 'error' && !w.resolved).length;
  const warningCount = conflictWarnings.filter((w) => w.severity === 'warning' && !w.resolved).length;

  const userMenuItems = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: `当前用户：${currentOperator}`
    },
    {
      key: '2',
      icon: <SettingOutlined />,
      label: '系统设置'
    },
    {
      key: '3',
      icon: <ExportOutlined />,
      label: '导出数据'
    },
    {
      type: 'divider' as const
    },
    {
      key: '4',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true
    }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'ships':
        return <ShipList />;
      case 'gantt':
        return <BerthGantt />;
      case 'schedule':
        return <ScheduleEdit />;
      case 'conflict':
        return <ConflictCheck />;
      case 'handover':
        return <Handover />;
      case 'review':
        return <ScheduleReview />;
      default:
        return <BerthGantt />;
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GlobalOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <h1 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 600 }}>
            港口船舶靠泊调度系统
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Space size={16}>
            {errorCount > 0 && (
              <Badge count={errorCount} size="small" status="error" text="严重冲突" />
            )}
            {warningCount > 0 && (
              <Badge count={warningCount} size="small" status="warning" text="预警" />
            )}
          </Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: '#fff' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{currentOperator}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="dark">
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            onClick={({ key }) => setCurrentPage(key as PageKey)}
            style={{ height: '100%', borderRight: 0 }}
            theme="dark"
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '16px' }}>
          <Content
            style={{
              padding: 0,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              height: '100%',
              overflow: 'auto'
            }}
          >
            {renderPage()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
