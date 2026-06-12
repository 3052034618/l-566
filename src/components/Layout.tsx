import { useState, useEffect } from 'react'
import { Layout, Menu, Badge, Avatar, Dropdown, Button } from 'antd'
import {
  DashboardOutlined, FileAddOutlined, UnorderedListOutlined,
  ThunderboltOutlined, EyeOutlined, VideoCameraOutlined,
  CalendarOutlined, FolderOpenOutlined, BarChartOutlined,
  BellOutlined, UserOutlined, LogoutOutlined, SettingOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { usePoliceStore } from '../store/policeStore'
import dayjs from 'dayjs'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '指挥中心' },
  { key: '/incidents/new', icon: <FileAddOutlined />, label: '警情录入' },
  { key: '/incidents', icon: <UnorderedListOutlined />, label: '警情列表' },
  { key: '/dispatch', icon: <ThunderboltOutlined />, label: '智能调度' },
  { key: '/tracking', icon: <EyeOutlined />, label: '状态追踪' },
  { key: '/video', icon: <VideoCameraOutlined />, label: '视频监控' },
  { key: '/schedule', icon: <CalendarOutlined />, label: '巡逻排班' },
  { key: '/cases', icon: <FolderOpenOutlined />, label: '案件管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
  { key: '/joint-review', icon: <TeamOutlined />, label: '协同处置复盘' }
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const alerts = usePoliceStore(s => s.alerts)
  const markAlertRead = usePoliceStore(s => s.markAlertRead)
  const unreadCount = alerts.filter(a => !a.read).length
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'))

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss')), 1000)
    return () => clearInterval(t)
  }, [])

  const selectedKey = menuItems.some(m => m.key === location.pathname)
    ? location.pathname
    : '/'

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
    ]
  }

  const alertMenu = {
    items: alerts.slice(0, 8).map(a => ({
      key: a.id,
      label: (
        <div onClick={() => markAlertRead(a.id)}>
          <div style={{ fontWeight: a.read ? 400 : 600, fontSize: 13 }}>{a.title}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{a.message}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            {dayjs(a.createdAt).format('MM-DD HH:mm')}
          </div>
        </div>
      )
    }))
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: 1,
          background: 'rgba(255,255,255,0.05)'
        }}>
          🚓 警务指挥系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#001529' }}>
              城市警务指挥与警力调度系统
            </span>
            <span style={{ color: '#888', fontSize: 13 }}>|</span>
            <span style={{ color: '#666', fontSize: 13 }}>{currentTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Dropdown menu={alertMenu} placement="bottomRight" trigger={['click']}>
              <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Dropdown>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={32} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
                <span style={{ color: '#333' }}>指挥长·系统管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, padding: 20, background: '#f0f2f5' }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
