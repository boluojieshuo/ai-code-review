import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar } from 'antd'
import { CodeOutlined, HistoryOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import ReviewPage from './pages/ReviewPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import './App.css'

const { Header, Content, Sider } = Layout

// 路由守卫组件
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [username, setUsername] = useState('用户')

  // 从 token 里解析用户名（简单处理）
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // 简单处理，实际应该解析 JWT
      setUsername('用户')
    }
  }, [location.pathname])

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  // 登录页不显示侧边栏
  if (location.pathname === '/login') {
    return (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    )
  }

  const menuItems = [
    {
      key: '/review',
      icon: <CodeOutlined />,
      label: '代码评审',
      onClick: () => navigate('/review')
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
      onClick: () => navigate('/history')
    },
  ]

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    },
  ]

  return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <div className="logo" style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h2 style={{
              color: 'white',
              margin: 0,
              fontSize: collapsed ? '18px' : '16px',
              whiteSpace: 'nowrap'
            }}>
              {collapsed ? 'AI' : 'AI代码评审'}
            </h2>
          </div>
          <Menu
              theme="dark"
              selectedKeys={[location.pathname]}
              items={menuItems}
          />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: '8px' }}>{username}</span>
              </div>
            </Dropdown>
          </Header>
          <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: '8px' }}>
            <Routes>
              <Route path="/review" element={<PrivateRoute><ReviewPage /></PrivateRoute>} />
              <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/review" />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
  )
}

export default App