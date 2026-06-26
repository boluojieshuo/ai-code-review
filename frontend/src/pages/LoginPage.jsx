import { useState } from 'react'
import { Card, Form, Input, Button, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import request from '../utils/request'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
    const [activeTab, setActiveTab] = useState('login')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    // 登录
    const handleLogin = async (values) => {
        setLoading(true)
        try {
            const data = await request.post('/api/auth/login', values)
            // 保存 token 到本地存储
            localStorage.setItem('token', data.access_token)
            message.success('登录成功！')
            // 跳转到评审页面
            navigate('/review')
        } catch (error) {
            console.error('登录失败:', error)
            message.error('登录失败，请检查用户名和密码')
        } finally {
            setLoading(false)
        }
    }

    // 注册
    const handleRegister = async (values) => {
        if (values.password !== values.confirmPassword) {
            message.error('两次输入的密码不一致')
            return
        }

        setLoading(true)
        try {
            await request.post('/api/auth/register', {
                username: values.username,
                password: values.password,
                email: values.email
            })
            message.success('注册成功！请登录')
            setActiveTab('login')
        } catch (error) {
            console.error('注册失败:', error)
            message.error('注册失败，请换个用户名试试')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Card
                style={{
                    width: '420px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#333' }}>🤖 AI 代码评审助手</h1>
                    <p style={{ color: '#666', margin: 0 }}>智能代码评审，提升代码质量</p>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    centered
                    items={[
                        {
                            key: 'login',
                            label: '登录',
                        },
                        {
                            key: 'register',
                            label: '注册',
                        },
                    ]}
                />

                {activeTab === 'login' && (
                    <Form
                        name="login"
                        onFinish={handleLogin}
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: '请输入用户名' }]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="用户名"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: '请输入密码' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                loading={loading}
                            >
                                登录
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                {activeTab === 'register' && (
                    <Form
                        name="register"
                        onFinish={handleRegister}
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            rules={[
                                { required: true, message: '请输入用户名' },
                                { min: 3, message: '用户名至少3个字符' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="用户名"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            rules={[
                                { type: 'email', message: '请输入有效的邮箱地址' }
                            ]}
                        >
                            <Input
                                placeholder="邮箱（选填）"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: '请输入密码' },
                                { min: 6, message: '密码至少6个字符' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="密码"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            rules={[{ required: true, message: '请确认密码' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="确认密码"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                loading={loading}
                            >
                                注册
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </Card>
        </div>
    )
}

export default LoginPage