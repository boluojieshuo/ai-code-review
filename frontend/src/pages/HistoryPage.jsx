import { useState, useEffect } from 'react'
import { Table, Card, Tag, Button, Modal, Descriptions, List, Space, message } from 'antd'
import request from '../utils/request'

const HistoryPage = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [detailModal, setDetailModal] = useState(false)
    const [currentReview, setCurrentReview] = useState(null)

    // 严重程度对应的颜色
    const severityColor = {
        critical: 'red',
        major: 'orange',
        minor: 'blue',
        info: 'green'
    }

    const severityText = {
        critical: '严重',
        major: '重要',
        minor: '次要',
        info: '建议'
    }

    const categoryText = {
        bug: 'Bug',
        style: '代码风格',
        performance: '性能',
        security: '安全',
        maintainability: '可维护性'
    }

    const statusText = {
        pending: '评审中',
        completed: '已完成',
        failed: '失败'
    }

    const statusColor = {
        pending: 'orange',
        completed: 'green',
        failed: 'red'
    }

    // 获取历史记录
    const fetchHistory = async () => {
        setLoading(true)
        try {
            const data = await request.get('/api/reviews')
            setData(data)
        } catch (error) {
            console.error('获取历史记录失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 页面加载时获取数据
    useEffect(() => {
        fetchHistory()
    }, [])

    // 查看详情
    const handleViewDetail = async (id) => {
        try {
            const data = await request.get(`/api/reviews/${id}`)
            setCurrentReview(data)
            setDetailModal(true)
        } catch (error) {
            console.error('获取详情失败:', error)
        }
    }

    // 表格列定义
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '文件名',
            dataIndex: 'file_name',
            key: 'file_name',
        },
        {
            title: '编程语言',
            dataIndex: 'language',
            key: 'language',
            width: 120,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: '评分',
            dataIndex: 'overall_score',
            key: 'overall_score',
            width: 100,
            render: (score) => {
                if (score === null) return '-'
                let color = 'green'
                if (score < 60) color = 'red'
                else if (score < 80) color = 'orange'
                return <Tag color={color}>{score} 分</Tag>
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => (
                <Tag color={statusColor[status]}>{statusText[status]}</Tag>
            ),
        },
        {
            title: '评审时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 200,
            render: (text) => new Date(text).toLocaleString('zh-CN'),
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Button type="link" onClick={() => handleViewDetail(record.id)}>
                    查看详情
                </Button>
            ),
        },
    ]

    return (
        <div>
            <h2>评审历史</h2>
            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                />
            </Card>

            {/* 详情弹窗 */}
            <Modal
                title="评审详情"
                open={detailModal}
                onCancel={() => setDetailModal(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModal(false)}>
                        关闭
                    </Button>,
                ]}
                width={800}
            >
                {currentReview && (
                    <div>
                        <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
                            <Descriptions.Item label="文件名">{currentReview.file_name}</Descriptions.Item>
                            <Descriptions.Item label="编程语言">{currentReview.language}</Descriptions.Item>
                            <Descriptions.Item label="总体评分">
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {currentReview.overall_score}
                </span> 分
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={statusColor[currentReview.status]}>
                                    {statusText[currentReview.status]}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="总体评价" span={2}>
                                {currentReview.summary}
                            </Descriptions.Item>
                            <Descriptions.Item label="评审时间" span={2}>
                                {new Date(currentReview.created_at).toLocaleString('zh-CN')}
                            </Descriptions.Item>
                        </Descriptions>

                        <h3>问题列表（共 {currentReview.issues.length} 个）</h3>
                        <List
                            itemLayout="vertical"
                            dataSource={currentReview.issues}
                            renderItem={(issue) => (
                                <List.Item key={issue.id}>
                                    <List.Item.Meta
                                        title={
                                            <Space>
                                                <Tag color={severityColor[issue.severity]}>
                                                    {severityText[issue.severity]}
                                                </Tag>
                                                <Tag>{categoryText[issue.category]}</Tag>
                                                {issue.line_number && (
                                                    <span style={{ color: '#999' }}>第 {issue.line_number} 行</span>
                                                )}
                                            </Space>
                                        }
                                        description={
                                            <div>
                                                <p><strong>问题描述：</strong>{issue.description}</p>
                                                <p><strong>修改建议：</strong>{issue.suggestion}</p>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default HistoryPage