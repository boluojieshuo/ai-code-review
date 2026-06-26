import { useState, useRef, useCallback } from 'react'
import { Button, Select, Input, Card, Rate, Tag, Descriptions, Space, Spin, message } from 'antd'
import { UploadOutlined, InboxOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { TextArea } = Input

const SUPPORTED_EXTENSIONS = ['.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.cpp', '.c', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala']

const severityColor = { critical: 'red', major: 'orange', minor: 'blue', info: 'green' }
const severityText = { critical: '严重', major: '重要', minor: '次要', info: '建议' }
const categoryText = { bug: 'Bug', style: '代码风格', performance: '性能', security: '安全', maintainability: '可维护性' }

const languageOptions = [
    { value: 'Python', label: 'Python' },
    { value: 'Java', label: 'Java' },
    { value: 'JavaScript', label: 'JavaScript' },
    { value: 'TypeScript', label: 'TypeScript' },
    { value: 'C++', label: 'C++' },
    { value: 'C', label: 'C' },
    { value: 'C#', label: 'C#' },
    { value: 'Go', label: 'Go' },
]

const extToLanguage = {
    '.py': 'Python', '.java': 'Java', '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.cpp': 'C++', '.c': 'C',
    '.h': 'C', '.hpp': 'C++', '.cs': 'C#', '.go': 'Go',
}

function guessLanguage(filename) {
    const dot = filename.lastIndexOf('.')
    if (dot === -1) return 'Python'
    return extToLanguage[filename.substring(dot).toLowerCase()] || 'Python'
}

function extractOriginalSnippet(fullCode, snippetLines) {
    // Find the snippet content in the full code to locate changed lines
    if (!fullCode || !snippetLines) return null
    const codeLines = fullCode.split('\n')
    // Try to match the first non-empty line of snippet in the code
    const firstReal = snippetLines.find(l => l.trim() !== '') || ''
    for (let i = 0; i < codeLines.length; i++) {
        if (codeLines[i].trim() === firstReal.trim()) {
            return { startLine: i + 1, origLines: codeLines.slice(i, i + snippetLines.length) }
        }
    }
    return null
}

function computeDiffLines(original, improved) {
    if (!original || !improved) return new Set()
    const origLines = original.split('\n')
    const improvedLines = improved.split('\n')
    const changed = new Set()
    for (let i = 0; i < improvedLines.length; i++) {
        if (i >= origLines.length || origLines[i] !== improvedLines[i]) {
            changed.add(i + 1)
        }
    }
    return changed
}

function computeSnippetDiff(fullCode, snippet) {
    if (!fullCode || !snippet) return new Set()
    const snippetLines = snippet.split('\n')
    const match = extractOriginalSnippet(fullCode, snippetLines)
    if (!match) return new Set()
    const changed = new Set()
    for (let i = 0; i < snippetLines.length; i++) {
        if (i >= match.origLines.length || match.origLines[i].trim() !== snippetLines[i].trim()) {
            changed.add(i + 1)
        }
    }
    return changed
}

function CodeBlock({ code, language, fileName, highlightLines = null }) {
    const lines = (code || '').split('\n')

    return (
        <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            overflow: 'hidden',
            fontFamily: '"Fira Code", "Cascadia Code", Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
        }}>
            <div style={{
                background: '#2d2d2d',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid #3d3d3d',
            }}>
                <span style={{ color: '#ccc', fontSize: '12px' }}>{fileName || 'code'}</span>
                {language && <span style={{ color: '#888', fontSize: '11px' }}>{language}</span>}
            </div>
            <div style={{ display: 'flex', overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                <div style={{
                    userSelect: 'none', textAlign: 'right',
                    padding: '12px 12px 12px 16px', background: '#1a1a1a',
                    color: '#6e6e6e', minWidth: '44px', borderRight: '1px solid #2d2d2d',
                    fontSize: '13px', lineHeight: '1.6', flexShrink: 0,
                }}>
                    {lines.map((_, i) => (
                        <div key={i} style={{ color: highlightLines && highlightLines.has(i + 1) ? '#4ec9b0' : undefined }}>{i + 1}</div>
                    ))}
                </div>
                <div style={{
                    padding: '12px 16px', color: '#d4d4d4', flex: 1,
                    textAlign: 'left', fontSize: '13px', lineHeight: '1.6', minWidth: 0,
                }}>
                    {lines.map((line, i) => {
                        const changed = highlightLines && highlightLines.has(i + 1)
                        return (
                            <div key={i} style={{
                                background: changed ? 'rgba(78, 201, 176, 0.12)' : 'transparent',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                borderRadius: changed ? '3px' : 0,
                                padding: changed ? '0 4px' : 0,
                            }}>
                                {line || ' '}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function IssueItem({ issue, language, snippetDiffLines }) {
    const [showSnippet, setShowSnippet] = useState(false)
    return (
        <div key={issue.id} style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
                <Space>
                    <Tag color={severityColor[issue.severity]}>{severityText[issue.severity]}</Tag>
                    <Tag>{categoryText[issue.category]}</Tag>
                    {issue.line_number && <span style={{ color: '#999' }}>第 {issue.line_number} 行</span>}
                </Space>
            </div>
            <p><strong>问题描述：</strong>{issue.description}</p>
            <p><strong>修改建议：</strong>{issue.suggestion}</p>
            {issue.improved_code_snippet && (
                <div style={{ marginTop: '12px' }}>
                    <Button type="dashed" size="small" onClick={() => setShowSnippet(!showSnippet)} style={{ marginBottom: '10px' }}>
                        {showSnippet ? '收起改进代码' : '查看改进代码'}
                    </Button>
                    {showSnippet && <CodeBlock code={issue.improved_code_snippet} language={language} fileName="snippet" highlightLines={snippetDiffLines} />}
                </div>
            )}
        </div>
    )
}

const ReviewPage = () => {
    const [code, setCode] = useState('')
    const [language, setLanguage] = useState('Python')
    const [fileName, setFileName] = useState('untitled.py')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const [showImproved, setShowImproved] = useState(false)
    const fileInputRef = useRef(null)

    const readFile = useCallback((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            setCode(e.target.result)
            setFileName(file.name)
            setLanguage(guessLanguage(file.name))
            message.success(`已加载 ${file.name}`)
        }
        reader.readAsText(file)
    }, [])

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(true)
    }
    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
    }
    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
            if (SUPPORTED_EXTENSIONS.includes(ext)) {
                readFile(file)
            } else {
                message.warning(`不支持的文件类型: ${ext}`)
            }
        }
    }

    const handleSubmit = async () => {
        if (!code.trim()) {
            message.warning('请输入要评审的代码')
            return
        }
        setLoading(true)
        setResult(null)
        setShowImproved(false)
        try {
            const data = await request.post('/api/reviews', {
                code_content: code,
                language: language,
                file_name: fileName,
            })
            setResult(data)
            message.success('评审完成！')
        } catch (error) {
            console.error('评审失败:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <h2>智能代码评审</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
                粘贴代码或拖入文件，AI 将从代码风格、潜在 Bug、性能、安全等维度进行全面评审
            </p>

            <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                    <Card title="输入代码" style={{ marginBottom: '16px' }}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div>
                                    <div style={{ marginBottom: '4px', fontSize: '13px', color: '#666' }}>文件名</div>
                                    <Input
                                        value={fileName}
                                        onChange={(e) => {
                                            setFileName(e.target.value)
                                            setLanguage(guessLanguage(e.target.value))
                                        }}
                                        style={{ width: '200px' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ marginBottom: '4px', fontSize: '13px', color: '#666' }}>语言</div>
                                    <Select value={language} onChange={setLanguage} options={languageOptions} style={{ width: '150px' }} />
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept={SUPPORTED_EXTENSIONS.join(',')}
                                        onChange={(e) => {
                                            const file = e.target.files[0]
                                            if (file) readFile(file)
                                            e.target.value = ''
                                        }}
                                    />
                                    <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                                        选择文件
                                    </Button>
                                </div>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: dragOver ? '2px dashed #1890ff' : '2px dashed #d9d9d9',
                                    borderRadius: '8px', padding: '16px', textAlign: 'center',
                                    background: dragOver ? 'rgba(24, 144, 255, 0.04)' : '#fafafa',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                <InboxOutlined style={{ fontSize: '24px', color: dragOver ? '#1890ff' : '#bbb' }} />
                                <span style={{ marginLeft: '8px', color: '#999', fontSize: '13px' }}>
                                    拖拽文件到此处，或点击选择文件（也支持直接在下方粘贴/编辑代码）
                                </span>
                            </div>

                            <div>
                                <div style={{ marginBottom: '4px', fontSize: '13px', color: '#666' }}>
                                    代码内容（可直接粘贴、编辑）
                                </div>
                                <TextArea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="在此粘贴或编辑代码... 也可将文件拖入上方区域"
                                    rows={16}
                                    style={{
                                        fontFamily: '"Fira Code", Consolas, Monaco, monospace',
                                        fontSize: '13px', background: '#1e1e1e',
                                        color: '#d4d4d4', borderColor: '#3d3d3d',
                                    }}
                                />
                            </div>

                            <Button type="primary" size="large" onClick={handleSubmit} loading={loading} block>
                                开始评审
                            </Button>
                        </Space>
                    </Card>
                </div>

                <div style={{ flex: 1 }}>
                    <Card title="评审结果" style={{ height: '100%' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <Spin size="large" />
                                <p style={{ marginTop: '16px', color: '#666' }}>AI 正在评审代码，请稍候...</p>
                            </div>
                        ) : result ? (
                            <div>
                                <Descriptions bordered column={1} style={{ marginBottom: '24px' }}>
                                    <Descriptions.Item label="总体评分">
                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                                            {result.overall_score}
                                        </span>
                                        <span style={{ marginLeft: '8px' }}>分</span>
                                        <Rate disabled allowHalf value={result.overall_score / 20} style={{ marginLeft: '16px' }} />
                                    </Descriptions.Item>
                                    <Descriptions.Item label="总体评价">{result.summary}</Descriptions.Item>
                                    <Descriptions.Item label="编程语言"><Tag color="blue">{result.language}</Tag></Descriptions.Item>
                                    <Descriptions.Item label="文件名称">{result.file_name}</Descriptions.Item>
                                </Descriptions>

                                {result.improved_code && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{ marginBottom: '8px' }}>整体改进代码</h3>
                                        <Button
                                            onClick={() => setShowImproved(!showImproved)}
                                            style={{ marginBottom: '12px' }}
                                        >
                                            {showImproved ? '隐藏改进代码' : '查看改进代码'}
                                        </Button>
                                        {showImproved && (
                                            <CodeBlock
                                                code={result.improved_code}
                                                language={result.language}
                                                fileName={'improved_' + result.file_name}
                                                highlightLines={computeDiffLines(code, result.improved_code)}
                                            />
                                        )}
                                    </div>
                                )}

                                <h3>发现 {result.issues.length} 个问题</h3>
                                {result.issues.map((issue) => {
                                    const snippetDiffLines = issue.improved_code_snippet
                                        ? computeSnippetDiff(code, issue.improved_code_snippet)
                                        : null
                                    return (
                                        <IssueItem
                                            key={issue.id}
                                            issue={issue}
                                            language={result.language}
                                            snippetDiffLines={snippetDiffLines}
                                        />
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
                                <p>输入代码后点击"开始评审"</p>
                                <p>AI 将为你生成专业的代码评审报告</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default ReviewPage
