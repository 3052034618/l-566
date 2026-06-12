import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, Table, Modal, Form, Input, Select, DatePicker,
  message, Drawer, Descriptions, List, Upload, Steps, Progress, Divider, Alert, Tooltip
} from 'antd'
import {
  PlusOutlined, FolderOpenOutlined, FileTextOutlined, PaperClipOutlined,
  EyeOutlined, EditOutlined, UploadOutlined, ExclamationCircleOutlined,
  DownloadOutlined, FilterOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { CASE_STATUS_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { Case, CaseStatus, Evidence, Transcript } from '../types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { Option } = Select
const { TextArea } = Input

export default function CaseManagement() {
  const cases = usePoliceStore(s => s.cases)
  const incidents = usePoliceStore(s => s.incidents)
  const officers = usePoliceStore(s => s.officers)
  const addCase = usePoliceStore(s => s.addCase)
  const updateCaseStatus = usePoliceStore(s => s.updateCaseStatus)
  const addTranscript = usePoliceStore(s => s.addTranscript)
  const addEvidence = usePoliceStore(s => s.addEvidence)

  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentCase, setCurrentCase] = useState<Case | null>(null)
  const [caseForm] = Form.useForm()
  const [transcriptForm] = Form.useForm()
  const [evidenceForm] = Form.useForm()
  const [transcriptModal, setTranscriptModal] = useState(false)
  const [evidenceModal, setEvidenceModal] = useState(false)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [transcriptFileList, setTranscriptFileList] = useState<any[]>([])
  const [evidenceFileList, setEvidenceFileList] = useState<any[]>([])
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<string>('all')

  const filteredCases = cases.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (keyword) {
      const kw = keyword.toLowerCase()
      if (!c.title.toLowerCase().includes(kw) &&
        !c.caseNumber.toLowerCase().includes(kw)) return false
    }
    return true
  })

  const filteredEvidences = useMemo(() => {
    if (!currentCase) return []
    if (evidenceTypeFilter === 'all') return currentCase.evidences
    return currentCase.evidences.filter(e => e.type === evidenceTypeFilter)
  }, [currentCase, evidenceTypeFilter])

  const getMaterialTypeLabel = (type: string, isTranscript: boolean) => {
    if (isTranscript) return '笔录'
    const map: Record<string, string> = {
      image: '图片', video: '视频', audio: '音频',
      document: '文档', physical: '物证'
    }
    return map[type] || type
  }

  const handleExportMaterialList = () => {
    if (!currentCase) return

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('案件材料清单', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`案件编号：${currentCase.caseNumber}`, 14, 32)
    doc.text(`案件名称：${currentCase.title}`, 14, 40)
    doc.text(`导出时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 48)

    const materials: Array<{
      name: string
      type: string
      uploadTime: string
      caseNumber: string
    }> = []

    currentCase.transcripts.forEach(t => {
      materials.push({
        name: t.fileName || t.title,
        type: '笔录',
        uploadTime: dayjs(t.uploadedAt).format('YYYY-MM-DD HH:mm'),
        caseNumber: currentCase.caseNumber
      })
    })

    currentCase.evidences.forEach(e => {
      materials.push({
        name: e.fileName || e.name,
        type: getMaterialTypeLabel(e.type, false),
        uploadTime: dayjs(e.uploadedAt).format('YYYY-MM-DD HH:mm'),
        caseNumber: currentCase.caseNumber
      })
    })

    autoTable(doc, {
      startY: 58,
      head: [['序号', '文件名称', '类型', '上传时间', '所属案件']],
      body: materials.map((m, idx) => [
        idx + 1,
        m.name,
        m.type,
        m.uploadTime,
        m.caseNumber
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 119, 255] }
    })

    doc.save(`案件材料清单_${currentCase.caseNumber}_${dayjs().format('YYYYMMDDHHmmss')}.pdf`)
    message.success('材料清单导出成功')
  }

  const overdueCases = cases.filter(c => c.isOverdue)

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      accepted: 'blue', investigating: 'orange', solved: 'green', transferred: 'purple'
    }
    return map[s] || 'default'
  }

  const viewDetail = (c: Case) => {
    setCurrentCase(c)
    setDetailVisible(true)
  }

  const handleCreateCase = () => {
    caseForm.validateFields().then(values => {
      const newCase = addCase({
        caseNumber: values.caseNumber,
        title: values.title,
        type: values.type,
        status: values.status || 'accepted',
        relatedIncidentId: values.relatedIncidentId,
        officerInCharge: values.officerInCharge,
        acceptedAt: values.acceptedAt ? values.acceptedAt.format() : dayjs().format(),
        notes: ''
      })
      message.success(`案件 ${newCase.caseNumber} 创建成功`)
      setCreateModal(false)
      caseForm.resetFields()
    })
  }

  const handleUpdateStatus = (caseId: string, nextStatus: CaseStatus) => {
    Modal.confirm({
      title: '更新案件状态',
      content: `确认将案件状态更新为【${CASE_STATUS_LABELS[nextStatus]}】？`,
      onOk: () => {
        updateCaseStatus(caseId, nextStatus)
        message.success('案件状态已更新')
        setCurrentCase(usePoliceStore.getState().cases.find(c => c.id === caseId) || null)
      }
    })
  }

  const handleAddTranscript = async () => {
    try {
      const values = await transcriptForm.validateFields()
      if (currentCase) {
        await addTranscript(currentCase.id, {
          title: values.title,
          content: values.content,
          uploadedAt: dayjs().format(),
          uploadedBy: '系统管理员'
        }, transcriptFile || undefined)
        message.success('笔录上传成功')
        setTranscriptModal(false)
        transcriptForm.resetFields()
        setTranscriptFile(null)
        setTranscriptFileList([])
        setCurrentCase(usePoliceStore.getState().cases.find(c => c.id === currentCase.id) || null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddEvidence = async () => {
    try {
      const values = await evidenceForm.validateFields()
      if (currentCase) {
        await addEvidence(currentCase.id, {
          name: values.name,
          type: values.type,
          description: values.description,
          uploadedAt: dayjs().format()
        }, evidenceFile || undefined)
        message.success('证据添加成功')
        setEvidenceModal(false)
        evidenceForm.resetFields()
        setEvidenceFile(null)
        setEvidenceFileList([])
        setCurrentCase(usePoliceStore.getState().cases.find(c => c.id === currentCase.id) || null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const columns: ColumnsType<Case> = [
    {
      title: '案件编号', dataIndex: 'caseNumber', width: 140,
      render: (v, r) => (
        <Space>
          <span style={{ fontFamily: 'monospace' }}>{v}</span>
          {r.isOverdue && (
            <Tooltip title="案件超期未破案">
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    { title: '案件名称', dataIndex: 'title', ellipsis: true },
    { title: '案件类型', dataIndex: 'type', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v) => <Tag color={statusColor(v)}>{CASE_STATUS_LABELS[v]}</Tag>
    },
    {
      title: '主办警员', dataIndex: 'officerInCharge', width: 120
    },
    {
      title: '关联警情', dataIndex: 'relatedIncidentId', width: 120,
      render: (v) => v ? incidents.find(i => i.id === v)?.location?.slice(0, 10) + '...' : '-'
    },
    {
      title: '受理时间', dataIndex: 'acceptedAt', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '笔录/证据', width: 110,
      render: (_, r) => (
        <Space>
          <Tag icon={<FileTextOutlined />}>{r.transcripts.length}</Tag>
          <Tag icon={<PaperClipOutlined />}>{r.evidences.length}</Tag>
        </Space>
      )
    },
    {
      title: '操作', width: 140, fixed: 'right' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(r)}>详情</Button>
        </Space>
      )
    }
  ]

  const statusSteps = ['accepted', 'investigating', 'solved', 'transferred']

  return (
    <div>
      {overdueCases.length > 0 && (
        <Alert
          message={`⚠️ 有 ${overdueCases.length} 个案件超期未破案，请及时处理`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Space>
              {overdueCases.slice(0, 3).map(c => (
                <Tag key={c.id} color="red" style={{ cursor: 'pointer' }} onClick={() => viewDetail(c)}>
                  {c.caseNumber}
                </Tag>
              ))}
              {overdueCases.length > 3 && <Tag color="red">+{overdueCases.length - 3}</Tag>}
            </Space>
          }
        />
      )}

      <Card
        title="案件管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
            新建案件
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索案件编号/名称"
            style={{ width: 260 }}
            allowClear
            onSearch={setKeyword}
          />
          <Select
            placeholder="案件状态"
            style={{ width: 160 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="accepted">受理</Option>
            <Option value="investigating">侦查</Option>
            <Option value="solved">破案</Option>
            <Option value="transferred">移送</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredCases}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="新建案件"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreateCase}
        okText="创建案件"
        width={600}
      >
        <Form form={caseForm} layout="vertical" initialValues={{ status: 'accepted', acceptedAt: dayjs() }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="案件编号" name="caseNumber" rules={[{ required: true, message: '请输入案件编号' }]}>
                <Input placeholder="例如：2024-刑-006" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="案件类型" name="type" rules={[{ required: true, message: '请输入案件类型' }]}>
                <Select placeholder="请选择">
                  <Option value="盗窃罪">盗窃罪</Option>
                  <Option value="抢劫罪">抢劫罪</Option>
                  <Option value="故意伤害罪">故意伤害罪</Option>
                  <Option value="诈骗罪">诈骗罪</Option>
                  <Option value="敲诈勒索罪">敲诈勒索罪</Option>
                  <Option value="寻衅滋事">寻衅滋事</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="案件名称" name="title" rules={[{ required: true, message: '请输入案件名称' }]}>
            <Input placeholder="请输入案件名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="主办警员" name="officerInCharge" rules={[{ required: true, message: '请选择主办警员' }]}>
                <Select placeholder="请选择主办警员">
                  {officers.filter(o => o.skills.some(s => s.includes('侦查'))).map(o => (
                    <Option key={o.id} value={o.name}>{o.name} - {o.rank}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="受理时间" name="acceptedAt">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="关联警情" name="relatedIncidentId">
            <Select placeholder="可选择关联的警情" allowClear>
              {incidents.map(i => (
                <Option key={i.id} value={i.id}>{i.location} - {i.description.slice(0, 20)}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="初始状态" name="status">
            <Select>
              <Option value="accepted">受理</Option>
              <Option value="investigating">侦查</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="案件详情"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          currentCase && (
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExportMaterialList}>
                导出材料清单
              </Button>
              {currentCase.status === 'accepted' && (
                <Button type="primary" onClick={() => handleUpdateStatus(currentCase.id, 'investigating')}>
                  开始侦查
                </Button>
              )}
              {currentCase.status === 'investigating' && (
                <Button type="primary" onClick={() => handleUpdateStatus(currentCase.id, 'solved')}>
                  破案
                </Button>
              )}
              {currentCase.status === 'solved' && (
                <Button type="primary" onClick={() => handleUpdateStatus(currentCase.id, 'transferred')}>
                  移送检察院
                </Button>
              )}
            </Space>
          )
        }
      >
        {currentCase && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={statusColor(currentCase.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
                {CASE_STATUS_LABELS[currentCase.status]}
              </Tag>
              {currentCase.isOverdue && (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>超期预警</Tag>
              )}
              <span style={{ fontWeight: 600, fontSize: 16 }}>{currentCase.caseNumber} - {currentCase.title}</span>
            </Space>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Steps
                current={statusSteps.indexOf(currentCase.status)}
                items={[
                  { title: '受理' },
                  { title: '侦查' },
                  { title: '破案' },
                  { title: '移送' }
                ]}
              />
            </Card>

            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="案件编号">{currentCase.caseNumber}</Descriptions.Item>
              <Descriptions.Item label="案件类型">{currentCase.type}</Descriptions.Item>
              <Descriptions.Item label="主办警员">{currentCase.officerInCharge}</Descriptions.Item>
              <Descriptions.Item label="受理时间">
                {dayjs(currentCase.acceptedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="关联警情">
                {currentCase.relatedIncidentId
                  ? incidents.find(i => i.id === currentCase.relatedIncidentId)?.location
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="破案时间">
                {currentCase.solvedAt ? dayjs(currentCase.solvedAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="移送时间" span={2}>
                {currentCase.transferredAt ? dayjs(currentCase.transferredAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              {currentCase.notes && (
                <Descriptions.Item label="备注" span={2}>{currentCase.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>笔录材料</span>
                  <Tag color="blue">{currentCase.transcripts.length} 份</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
              extra={
                <Button size="small" icon={<UploadOutlined />} onClick={() => setTranscriptModal(true)}>
                  上传笔录
                </Button>
              }
              size="small"
            >
              {currentCase.transcripts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无笔录材料</div>
              ) : (
                <List
                  size="small"
                  dataSource={currentCase.transcripts}
                  renderItem={t => (
                    <List.Item
                      actions={[
                        <Button type="link" size="small" icon={<EyeOutlined />}>查看</Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                        title={
                          <Space>
                            <span>{t.title}</span>
                            {t.fileName && (
                              <Tag color="blue" icon={<PaperClipOutlined />}>{t.fileName}</Tag>
                            )}
                          </Space>
                        }
                        description={
                          <Space size={16} wrap>
                            <span style={{ fontSize: 12 }}>上传人：{t.uploadedBy}</span>
                            <span style={{ fontSize: 12 }}>{dayjs(t.uploadedAt).format('YYYY-MM-DD HH:mm')}</span>
                            {t.fileType && (
                              <span style={{ fontSize: 12, color: '#1677ff' }}>
                                类型：{t.fileType.split('/').pop()?.toUpperCase() || t.fileType}
                              </span>
                            )}
                            {t.fileSize && (
                              <span style={{ fontSize: 12, color: '#888' }}>
                                大小：{t.fileSize < 1024 ? `${t.fileSize}B` : t.fileSize < 1024 * 1024 ? `${(t.fileSize / 1024).toFixed(1)}KB` : `${(t.fileSize / 1024 / 1024).toFixed(1)}MB`}
                              </span>
                            )}
                          </Space>
                        }
                      />
                      <div style={{ fontSize: 13, color: '#666', maxWidth: 400 }}>
                        {t.content.slice(0, 50)}...
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            <Card
              title={
                <Space>
                  <PaperClipOutlined />
                  <span>证据材料</span>
                  <Tag color="green">
                    {filteredEvidences.length} / {currentCase.evidences.length} 件
                  </Tag>
                </Space>
              }
              size="small"
              extra={
                <Button size="small" icon={<PlusOutlined />} onClick={() => setEvidenceModal(true)}>
                  添加证据
                </Button>
              }
            >
              <Space style={{ marginBottom: 12 }} wrap size={4}>
                <span style={{ fontSize: 12, color: '#666' }}><FilterOutlined /> 类型筛选：</span>
                <Tag
                  color={evidenceTypeFilter === 'all' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('all')}
                >
                  全部
                </Tag>
                <Tag
                  color={evidenceTypeFilter === 'image' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('image')}
                >
                  图片
                </Tag>
                <Tag
                  color={evidenceTypeFilter === 'video' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('video')}
                >
                  视频
                </Tag>
                <Tag
                  color={evidenceTypeFilter === 'document' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('document')}
                >
                  文档
                </Tag>
                <Tag
                  color={evidenceTypeFilter === 'audio' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('audio')}
                >
                  音频
                </Tag>
                <Tag
                  color={evidenceTypeFilter === 'physical' ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEvidenceTypeFilter('physical')}
                >
                  物证
                </Tag>
              </Space>
              {filteredEvidences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无证据材料</div>
              ) : (
                <Row gutter={[12, 12]}>
                  {filteredEvidences.map(e => (
                    <Col xs={24} sm={12} key={e.id}>
                      <Card size="small" style={{ background: '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            fontSize: 24,
                            color: e.type === 'image' ? '#eb2f96' :
                              e.type === 'video' ? '#722ed1' :
                                e.type === 'audio' ? '#13c2c2' : '#1677ff'
                          }}>
                            {e.type === 'image' ? '🖼️' :
                              e.type === 'video' ? '🎬' :
                                e.type === 'audio' ? '🎵' : e.type === 'physical' ? '🔍' : '📄'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>
                              <Space>
                                <span>{e.name}</span>
                                {e.fileName && (
                                  <Tag icon={<PaperClipOutlined />}>{e.fileName}</Tag>
                                )}
                              </Space>
                            </div>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                              <Space wrap size={8}>
                                <Tag>{e.type === 'document' ? '文档' :
                                  e.type === 'image' ? '图片' :
                                    e.type === 'video' ? '视频' :
                                      e.type === 'audio' ? '音频' : '物证'}</Tag>
                                <span>{dayjs(e.uploadedAt).format('YYYY-MM-DD HH:mm')}</span>
                                {e.fileType && (
                                  <span style={{ color: '#1677ff' }}>
                                    {e.fileType.split('/').pop()?.toUpperCase() || e.fileType}
                                  </span>
                                )}
                                {e.fileSize && (
                                  <span style={{ color: '#888' }}>
                                    {e.fileSize < 1024 ? `${e.fileSize}B` : e.fileSize < 1024 * 1024 ? `${(e.fileSize / 1024).toFixed(1)}KB` : `${(e.fileSize / 1024 / 1024).toFixed(1)}MB`}
                                  </span>
                                )}
                              </Space>
                            </div>
                            {e.description && (
                              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                {e.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </div>
        )}
      </Drawer>

      <Modal
        title="上传笔录"
        open={transcriptModal}
        onCancel={() => {
          setTranscriptModal(false)
          setTranscriptFile(null)
          setTranscriptFileList([])
        }}
        onOk={handleAddTranscript}
        okText="确认上传"
      >
        <Form form={transcriptForm} layout="vertical">
          <Form.Item label="笔录标题" name="title" rules={[{ required: true, message: '请输入笔录标题' }]}>
            <Input placeholder="例如：被害人询问笔录" />
          </Form.Item>
          <Form.Item label="笔录内容" name="content" rules={[{ required: true, message: '请输入笔录内容' }]}>
            <TextArea rows={6} placeholder="请输入笔录详细内容..." />
          </Form.Item>
          <Form.Item label="附件（可选）">
            <Upload
              fileList={transcriptFileList}
              beforeUpload={(file) => {
                setTranscriptFile(file)
                setTranscriptFileList([file])
                return false
              }}
              onRemove={() => {
                setTranscriptFile(null)
                setTranscriptFileList([])
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            {transcriptFile && (
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 8 }}>
                ✓ 已选择文件：{transcriptFile.name} ({transcriptFile.type || '未知类型'})
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加证据"
        open={evidenceModal}
        onCancel={() => {
          setEvidenceModal(false)
          setEvidenceFile(null)
          setEvidenceFileList([])
        }}
        onOk={handleAddEvidence}
        okText="确认添加"
      >
        <Form form={evidenceForm} layout="vertical">
          <Form.Item label="证据名称" name="name" rules={[{ required: true, message: '请输入证据名称' }]}>
            <Input placeholder="例如：现场监控录像" />
          </Form.Item>
          <Form.Item label="证据类型" name="type" rules={[{ required: true, message: '请选择证据类型' }]}>
            <Select>
              <Option value="document">文档</Option>
              <Option value="image">图片</Option>
              <Option value="video">视频</Option>
              <Option value="audio">音频</Option>
              <Option value="physical">物证</Option>
            </Select>
          </Form.Item>
          <Form.Item label="证据描述" name="description" rules={[{ required: true, message: '请输入证据描述' }]}>
            <TextArea rows={3} placeholder="请详细描述证据..." />
          </Form.Item>
          <Form.Item label="上传文件">
            <Upload
              fileList={evidenceFileList}
              beforeUpload={(file) => {
                setEvidenceFile(file)
                setEvidenceFileList([file])
                return false
              }}
              onRemove={() => {
                setEvidenceFile(null)
                setEvidenceFileList([])
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            {evidenceFile && (
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 8 }}>
                ✓ 已选择文件：{evidenceFile.name} ({evidenceFile.type || '未知类型'})
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
