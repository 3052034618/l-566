import { useState, useMemo, useEffect } from 'react'
import {
  Card, Table, Tag, Space, Button, Input, Select, DatePicker, Modal, Drawer, Descriptions,
  Timeline, Divider, Form, message, List, Progress, Tooltip, Row, Col, Steps, Empty,
  Alert, Badge
} from 'antd'
import {
  EyeOutlined, ThunderboltOutlined, FileAddOutlined, SafetyOutlined, AlertOutlined,
  SafetyCertificateOutlined, RiseOutlined, TeamOutlined, CarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, PlusOutlined, CloseOutlined, SendOutlined,
  MessageOutlined, ExclamationCircleOutlined, EnvironmentOutlined, VideoCameraOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, PRIORITY_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import type {
  Incident, AssignmentLog, JointDisposalUnit,
  CollaborationCommand, CommandFeedback, UnitCategory, CommandPriority
} from '../types'

const { RangePicker } = DatePicker
const { Option } = Select

export default function IncidentList() {
  const incidents = usePoliceStore(s => s.incidents)
  const officers = usePoliceStore(s => s.officers)
  const vehicles = usePoliceStore(s => s.vehicles)
  const assignTask = usePoliceStore(s => s.assignTask)
  const upgradeToJointOperation = usePoliceStore(s => s.upgradeToJointOperation)
  const addReinforcementUnit = usePoliceStore(s => s.addReinforcementUnit)
  const updateDisposalNode = usePoliceStore(s => s.updateDisposalNode)
  const updateOnSiteDivision = usePoliceStore(s => s.updateOnSiteDivision)
  const verifyTransfer = usePoliceStore(s => s.verifyTransfer)
  const markUnitArrived = usePoliceStore(s => s.markUnitArrived)
  const issueCommand = usePoliceStore(s => s.issueCommand)
  const addCommandFeedback = usePoliceStore(s => s.addCommandFeedback)
  const updateUnitStatus = usePoliceStore(s => s.updateUnitStatus)
  const updateUnitFeedback = usePoliceStore(s => s.updateUnitFeedback)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null)
  const [noteForm] = Form.useForm()
  const [divisionForm] = Form.useForm()
  const [reinforcementModal, setReinforcementModal] = useState(false)
  const [reinforcementForm] = Form.useForm()
  const [commandForm] = Form.useForm()
  const [feedbackForm] = Form.useForm()
  const [commandModal, setCommandModal] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<CollaborationCommand | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<'basic' | 'commands'>('basic')
  const [searchParams, setSearchParams] = useSearchParams()
  const addNoteToIncident = usePoliceStore(s => s.addNoteToIncident)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const incidentId = searchParams.get('id')
    if (incidentId && !detailVisible) {
      const incident = incidents.find(i => i.id === incidentId)
      if (incident) {
        setCurrentIncident(incident)
        setDetailVisible(true)
        const highlightJoint = searchParams.get('joint') === '1'
        if (highlightJoint) {
          setActiveDetailTab('commands')
        }
      }
    }
  }, [searchParams, incidents, detailVisible])

  const filteredIncidents = incidents.filter(i => {
    if (typeFilter && i.type !== typeFilter) return false
    if (statusFilter && i.status !== statusFilter) return false
    if (keyword) {
      const kw = keyword.toLowerCase()
      if (!i.location.toLowerCase().includes(kw) &&
        !i.callerName.toLowerCase().includes(kw) &&
        !i.description.toLowerCase().includes(kw)) return false
    }
    return true
  })

  const typeColor = (t: string) => t === 'criminal' ? 'red' : t === 'public_order' ? 'orange' : 'green'
  const typeIcon = (t: string) =>
    t === 'criminal' ? <SafetyOutlined /> : t === 'public_order' ? <AlertOutlined /> : <SafetyCertificateOutlined />

  const priorityColor = (p: number) => {
    if (p >= 4) return 'red'
    if (p >= 3) return 'orange'
    return 'blue'
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: 'default', dispatched: 'processing', en_route: 'orange', handling: 'blue', closed: 'success'
    }
    return map[s] || 'default'
  }

  const viewDetail = (inc: Incident) => {
    setCurrentIncident(inc)
    setDetailVisible(true)
  }

  const handleAssign = (inc: Incident) => {
    const assignment = assignTask(inc.id)
    if (assignment) {
      message.success(`已生成最优出警方案！预计 ${assignment.eta} 分钟到达`)
      navigate('/dispatch')
    } else {
      message.error('暂无可用警力资源')
    }
  }

  const handleAddNote = () => {
    noteForm.validateFields().then(values => {
      if (currentIncident) {
        addNoteToIncident(currentIncident.id, `[${dayjs().format('YYYY-MM-DD HH:mm')}] ${values.note}`)
        message.success('备注添加成功')
        noteForm.resetFields()
        setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
      }
    })
  }

  const handleUpgradeToJoint = () => {
    if (!currentIncident) return
    Modal.confirm({
      title: '升级为联合处置',
      content: '确认将该警情升级为重大警情联合处置模式？升级后可调度多组警力协同处置。',
      okText: '确认升级',
      okType: 'danger',
      onOk: () => {
        upgradeToJointOperation(currentIncident.id)
        message.success('已升级为联合处置模式')
        setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
      }
    })
  }

  const handleAddReinforcement = () => {
    reinforcementForm.validateFields().then(values => {
      if (!currentIncident) return
      const selectedOfficers = officers.filter(o => values.officerIds?.includes(o.id))
      const vehicle = vehicles.find(v => v.id === values.vehicleId)
      addReinforcementUnit(currentIncident.id, {
        unitName: values.unitName,
        role: 'reinforcement',
        unitCategory: values.unitCategory || 'other',
        vehicleId: values.vehicleId,
        vehiclePlate: vehicle?.plateNumber || '',
        officerIds: values.officerIds,
        officerNames: selectedOfficers.map(o => o.name),
        status: 'en_route',
        eta: values.eta || 10,
        task: values.task
      })
      message.success('增援警力已派出')
      setReinforcementModal(false)
      reinforcementForm.resetFields()
      setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
    })
  }

  const handleVerifyTransfer = (passed: boolean) => {
    if (!currentIncident) return
    Modal.confirm({
      title: passed ? '确认转派验收通过' : '确认转派验收不通过',
      content: passed
        ? '确认新警力已到位，验收通过？'
        : '确认验收不通过？需重新调度警力。',
      onOk: () => {
        verifyTransfer(currentIncident.id, passed, passed ? '验收通过，新警力已到位' : '验收不通过，需重新调度')
        message.success(passed ? '转派验收通过' : '验收不通过')
        setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
      }
    })
  }

  const handleUpdateNode = (nodeId: string, status: 'in_progress' | 'completed') => {
    if (!currentIncident) return
    updateDisposalNode(currentIncident.id, nodeId, status)
    setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
  }

  const handleUpdateDivision = () => {
    divisionForm.validateFields().then(values => {
      if (!currentIncident) return
      updateOnSiteDivision(currentIncident.id, values.division)
      message.success('现场分工已更新')
      setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
    })
  }

  const handleMarkUnitArrived = (unitId: string) => {
    if (!currentIncident) return
    Modal.confirm({
      title: '确认增援到场',
      content: '确认该增援单位已到达现场？',
      onOk: () => {
        markUnitArrived(currentIncident.id, unitId, '指挥中心')
        message.success('已确认到场')
        setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
      }
    })
  }

  const handleOpenCommandModal = () => {
    commandForm.resetFields()
    setCommandModal(true)
  }

  const handleIssueCommand = () => {
    commandForm.validateFields().then(values => {
      if (!currentIncident) return
      const unit = (currentIncident.jointUnits || []).find(u => u.id === values.unitId)
      if (!unit) return
      issueCommand(
        currentIncident.id,
        unit.id,
        unit.unitName,
        values.unitCategory || unit.unitCategory || 'other',
        values.content,
        values.priority,
        '指挥长',
        values.deadline ? dayjs(values.deadline).format() : undefined
      )
      message.success('指令已下发')
      setCommandModal(false)
      commandForm.resetFields()
      setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
    })
  }

  const handleOpenFeedbackModal = (cmd: CollaborationCommand) => {
    feedbackForm.resetFields()
    setSelectedCommand(cmd)
    setFeedbackModal(true)
  }

  const handleAddFeedback = () => {
    feedbackForm.validateFields().then(values => {
      if (!currentIncident || !selectedCommand) return
      addCommandFeedback(
        currentIncident.id,
        selectedCommand.id,
        values.status,
        values.content,
        '现场指挥员'
      )
      message.success('反馈已提交')
      setFeedbackModal(false)
      feedbackForm.resetFields()
      setCurrentIncident(usePoliceStore.getState().incidents.find(i => i.id === currentIncident.id) || null)
    })
  }

  const getCommandStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      sent: '已下发', received: '已接收', in_progress: '执行中', completed: '已完成'
    }
    return map[status] || status
  }

  const getCommandStatusColor = (status: string) => {
    const map: Record<string, string> = {
      sent: 'default', received: 'blue', in_progress: 'processing', completed: 'success'
    }
    return map[status] || 'default'
  }

  const getPriorityLabel = (p: string) => {
    const map: Record<string, string> = {
      normal: '普通', urgent: '紧急', critical: '特急'
    }
    return map[p] || p
  }

  const getPriorityColor = (p: string) => {
    const map: Record<string, string> = {
      normal: 'default', urgent: 'orange', critical: 'red'
    }
    return map[p] || 'default'
  }

  const getUnitCategoryLabel = (c: string) => {
    const map: Record<string, string> = {
      patrol: '巡警', swat: '特警', traffic: '交警', tech: '技侦',
      fire: '消防', medical: '医疗', other: '其他'
    }
    return map[c] || c
  }

  const getLogTypeLabel = (type: AssignmentLog['type']) => {
    const map: Record<string, string> = {
      dispatch: '派警',
      transfer_request: '转派申请',
      transfer_approved: '转派批准',
      transfer_rejected: '转派驳回',
      acceptance: '转派验收',
      reinforcement: '增援派出'
    }
    return map[type] || type
  }

  const getLogTypeColor = (type: AssignmentLog['type']) => {
    const map: Record<string, string> = {
      dispatch: 'blue',
      transfer_request: 'orange',
      transfer_approved: 'green',
      transfer_rejected: 'red',
      acceptance: 'purple',
      reinforcement: 'cyan'
    }
    return map[type] || 'default'
  }

  const columns: ColumnsType<Incident> = [
    {
      title: '警情编号', dataIndex: 'id', width: 100,
      render: (v) => <span style={{ fontFamily: 'monospace' }}>{v.slice(0, 8).toUpperCase()}</span>
    },
    {
      title: '类型', dataIndex: 'type', width: 90,
      render: (v, r) => <Tag icon={typeIcon(r.type)} color={typeColor(r.type)}>
        {INCIDENT_TYPE_LABELS[r.type]}
      </Tag>
    },
    {
      title: '优先级', dataIndex: 'priority', width: 90,
      render: (v) => <Tag color={priorityColor(v)} className="priority-tag">
        P{v} {PRIORITY_LABELS[v]}
      </Tag>
    },
    { title: '事发地点', dataIndex: 'location', ellipsis: true },
    { title: '报警人', dataIndex: 'callerName', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v, r) => (
        <Space>
          <Tag color={statusColor(r.status)}>{INCIDENT_STATUS_LABELS[r.status]}</Tag>
          {r.isOverdue && <Tag color="red">超时</Tag>}
        </Space>
      )
    },
    {
      title: '接警时间', dataIndex: 'reportedAt', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '出警车辆', dataIndex: 'assignedVehicleId', width: 110,
      render: (v) => v ? vehicles.find(x => x.id === v)?.plateNumber || '-' : '-'
    },
    {
      title: '处置警员', dataIndex: 'assignedOfficerIds', width: 140,
      render: (v: string[]) => v.length > 0
        ? v.map(id => officers.find(o => o.id === id)?.name).join('、')
        : '-'
    },
    {
      title: '操作', width: 180, fixed: 'right' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(r)}>详情</Button>
          {r.status === 'pending' && (
            <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => handleAssign(r)}>
              派警
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title="警情列表"
        extra={<Button type="primary" icon={<FileAddOutlined />} onClick={() => navigate('/incidents/new')}>
          新增警情
        </Button>}
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="搜索地点/报警人/描述"
            style={{ width: 260 }}
            allowClear
            onSearch={setKeyword}
          />
          <Select
            placeholder="警情类型"
            style={{ width: 140 }}
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Option value="criminal">刑事</Option>
            <Option value="public_order">治安</Option>
            <Option value="assistance">求助</Option>
          </Select>
          <Select
            placeholder="状态"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">待出警</Option>
            <Option value="dispatched">已派警</Option>
            <Option value="en_route">赶赴中</Option>
            <Option value="handling">处置中</Option>
            <Option value="closed">已结案</Option>
          </Select>
          <RangePicker showTime />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredIncidents}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Drawer
        title={
          <Space>
            <span>警情详情</span>
            {currentIncident?.isJointOperation && (
              <Tag color="red" icon={<TeamOutlined />}>联合处置</Tag>
            )}
          </Space>
        }
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          currentIncident && (
            <Space>
              {!currentIncident.isJointOperation && currentIncident.status !== 'closed' && currentIncident.status !== 'pending' && (
                <Button icon={<RiseOutlined />} onClick={handleUpgradeToJoint}>
                  升级联合处置
                </Button>
              )}
              <Button onClick={() => setDetailVisible(false)}>关闭</Button>
            </Space>
          )
        }
      >
        {currentIncident && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag icon={typeIcon(currentIncident.type)} color={typeColor(currentIncident.type)}>
                {INCIDENT_TYPE_LABELS[currentIncident.type]}
              </Tag>
              <Tag color={priorityColor(currentIncident.priority)} className="priority-tag">
                P{currentIncident.priority} {PRIORITY_LABELS[currentIncident.priority]}
              </Tag>
              <Tag color={statusColor(currentIncident.status)}>
                {INCIDENT_STATUS_LABELS[currentIncident.status]}
              </Tag>
              {currentIncident.isOverdue && <Tag color="red">⚠️ 超时</Tag>}
            </Space>

            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="警情编号">{currentIncident.id.slice(0, 8).toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="接警时间">
                {dayjs(currentIncident.reportedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="报警人">{currentIncident.callerName}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{currentIncident.callerPhone}</Descriptions.Item>
              <Descriptions.Item label="事发地点" span={2}>{currentIncident.location}</Descriptions.Item>
              <Descriptions.Item label="警情描述" span={2}>{currentIncident.description}</Descriptions.Item>
              <Descriptions.Item label="出警车辆">
                {currentIncident.assignedVehicleId
                  ? vehicles.find(v => v.id === currentIncident.assignedVehicleId)?.plateNumber
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="处置警员">
                {currentIncident.assignedOfficerIds.length > 0
                  ? currentIncident.assignedOfficerIds.map(id => officers.find(o => o.id === id)?.name).join('、')
                  : '-'
                }
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">处置时间线</Divider>
            <Timeline
              items={[
                currentIncident.reportedAt ? {
                  color: 'blue',
                  children: `接警 - ${dayjs(currentIncident.reportedAt).format('HH:mm:ss')}`
                } : null,
                currentIncident.dispatchedAt ? {
                  color: 'orange',
                  children: `派警 - ${dayjs(currentIncident.dispatchedAt).format('HH:mm:ss')}`
                } : null,
                currentIncident.arrivedAt ? {
                  color: 'green',
                  children: `到场 - ${dayjs(currentIncident.arrivedAt).format('HH:mm:ss')}`
                } : null,
                currentIncident.closedAt ? {
                  color: 'gray',
                  children: `结案 - ${dayjs(currentIncident.closedAt).format('HH:mm:ss')}`
                } : null
              ].filter(Boolean) as any}
            />

            {currentIncident.isJointOperation && (
              <>
                <Divider orientation="left">
                  <Space>
                    <TeamOutlined style={{ color: '#cf1322' }} />
                    <span>联合处置力量</span>
                    <Tag color="red">{currentIncident.jointUnits?.length || 0} 组</Tag>
                  </Space>
                </Divider>
                <List
                  size="small"
                  dataSource={currentIncident.jointUnits || []}
                  renderItem={(unit: JointDisposalUnit) => (
                    <List.Item
                      actions={[
                        <Tag key="role" color={unit.role === 'primary' ? 'red' : 'blue'}>
                          {unit.role === 'primary' ? '主责' : '增援'}
                        </Tag>,
                        unit.status === 'en_route' && currentIncident.status !== 'closed' && (
                          <Button key="arrived" size="small" type="primary" onClick={() => handleMarkUnitArrived(unit.id)}>
                            确认到场
                          </Button>
                        )
                      ].filter(Boolean) as any[]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: unit.role === 'primary' ? '#fff1f0' : '#e6f7ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: unit.role === 'primary' ? '#cf1322' : '#1890ff',
                            fontSize: 18
                          }}>
                            {unit.role === 'primary' ? '🚨' : '🚔'}
                          </div>
                        }
                        title={
                          <Space>
                            <span style={{ fontWeight: 500 }}>{unit.unitName}</span>
                            <Tag color="purple">{getUnitCategoryLabel(unit.unitCategory || 'other')}</Tag>
                            <Tag color={
                              unit.status === 'arrived' ? 'green' :
                              unit.status === 'handling' ? 'blue' :
                              unit.status === 'completed' ? 'default' : 'orange'
                            }>
                              {unit.status === 'en_route' ? '赶赴中' :
                               unit.status === 'arrived' ? '已到场' :
                               unit.status === 'handling' ? '处置中' : '已完成'}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                            <div>
                              <CarOutlined style={{ marginRight: 4 }} />
                              {unit.vehiclePlate}
                              <span style={{ margin: '0 8px' }}>|</span>
                              <TeamOutlined style={{ marginRight: 4 }} />
                              {unit.officerNames.length > 0 ? unit.officerNames.join('、') : '待指派'}
                            </div>
                            <div style={{ color: '#888' }}>
                              任务：{unit.task}
                              {unit.eta !== undefined && unit.status === 'en_route' && (
                                <span style={{ marginLeft: 8, color: '#fa8c16' }}>预计 {unit.eta} 分钟到达</span>
                              )}
                              {unit.confirmedArrivedAt && (
                                <span style={{ marginLeft: 8, color: '#52c41a' }}>
                                  到场：{dayjs(unit.confirmedArrivedAt).format('HH:mm:ss')}（{unit.confirmedArrivedBy}确认）
                                </span>
                              )}
                            </div>
                            {unit.lastFeedback && (
                              <div style={{
                                marginTop: 6, padding: '6px 10px', background: '#f6ffed',
                                borderLeft: '3px solid #52c41a', borderRadius: 2
                              }}>
                                <span style={{ color: '#52c41a', fontWeight: 500 }}>最近反馈：</span>
                                {unit.lastFeedback}
                                {unit.lastFeedbackAt && (
                                  <span style={{ color: '#999', marginLeft: 8 }}>
                                    {dayjs(unit.lastFeedbackAt).format('HH:mm')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />

                {currentIncident.status !== 'closed' && (
                  <Button
                    type="dashed"
                    block
                    style={{ marginTop: 8 }}
                    icon={<PlusOutlined />}
                    onClick={() => setReinforcementModal(true)}
                  >
                    派增援
                  </Button>
                )}

                <Divider orientation="left">
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>处置节点</span>
                  </Space>
                </Divider>
                <Steps
                  direction="vertical"
                  size="small"
                  items={(currentIncident.disposalNodes || []).map((node, idx) => ({
                    status: node.status === 'completed' ? 'finish' : node.status === 'in_progress' ? 'process' : 'wait',
                    title: (
                      <Space>
                        <span>{node.name}</span>
                        {node.status === 'in_progress' && currentIncident.status !== 'closed' && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => handleUpdateNode(node.id, 'completed')}
                          >
                            完成
                          </Button>
                        )}
                        {node.status === 'pending' && currentIncident.status !== 'closed' && idx === (currentIncident.disposalNodes || []).findIndex(n => n.status === 'pending') && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => handleUpdateNode(node.id, 'in_progress')}
                          >
                            开始
                          </Button>
                        )}
                      </Space>
                    ),
                    description: node.completedAt
                      ? `${node.completedBy || ''} · ${dayjs(node.completedAt).format('HH:mm')}`
                      : node.notes || '',
                  }))}
                />

                <Divider orientation="left">
                  <Space>
                    <FileTextOutlined />
                    <span>现场分工</span>
                  </Space>
                </Divider>
                {currentIncident.onSiteDivision ? (
                  <div style={{
                    padding: 12, background: '#f9f9f9', borderRadius: 4,
                    fontSize: 13, whiteSpace: 'pre-wrap'
                  }}>
                    {currentIncident.onSiteDivision}
                  </div>
                ) : (
                  <Empty description="暂无现场分工" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
                {currentIncident.status !== 'closed' && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => {
                      divisionForm.setFieldsValue({ division: currentIncident.onSiteDivision || '' })
                      Modal.confirm({
                        title: '编辑现场分工',
                        content: (
                          <Form form={divisionForm} layout="vertical" style={{ marginTop: 16 }}>
                            <Form.Item name="division" rules={[{ required: true, message: '请输入现场分工' }]}>
                              <Input.TextArea rows={4} placeholder="请输入各单位现场分工..." />
                            </Form.Item>
                          </Form>
                        ),
                        onOk: handleUpdateDivision
                      })
                    }}
                  >
                    {currentIncident.onSiteDivision ? '编辑分工' : '+ 添加现场分工'}
                  </Button>
                )}

                <Divider orientation="left">
                  <Space>
                    <SendOutlined style={{ color: '#1890ff' }} />
                    <span>协作指令流</span>
                    <Tag color="blue">{currentIncident.commands?.length || 0} 条</Tag>
                  </Space>
                </Divider>

                {currentIncident.status !== 'closed' && (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    style={{ marginBottom: 12 }}
                    onClick={handleOpenCommandModal}
                  >
                    下发指令
                  </Button>
                )}

                {(currentIncident.commands && currentIncident.commands.length > 0) ? (
                  <Timeline
                    mode="left"
                    items={[...currentIncident.commands].reverse().map(cmd => ({
                      color: cmd.status === 'completed' ? 'green' : cmd.status === 'in_progress' ? 'blue' : cmd.status === 'received' ? 'orange' : 'gray',
                      label: (
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {dayjs(cmd.issuedAt).format('HH:mm:ss')}
                        </div>
                      ),
                      children: (
                        <Card size="small" style={{ marginBottom: 8 }}>
                          <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                            <Space>
                              <Tag color={getPriorityColor(cmd.priority)}>
                                {getPriorityLabel(cmd.priority)}
                              </Tag>
                              <Tag color="purple">{getUnitCategoryLabel(cmd.unitCategory)}</Tag>
                              <span style={{ fontWeight: 500 }}>{cmd.unitName}</span>
                            </Space>
                            <Space>
                              <Tag color={getCommandStatusColor(cmd.status)}>
                                {getCommandStatusLabel(cmd.status)}
                              </Tag>
                              {currentIncident.status !== 'closed' && cmd.status !== 'completed' && (
                                <Button size="small" type="link" onClick={() => handleOpenFeedbackModal(cmd)}>
                                  <MessageOutlined /> 回传反馈
                                </Button>
                              )}
                            </Space>
                          </Space>
                          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
                            {cmd.content}
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                            下发人：{cmd.issuedBy}
                            {cmd.deadline && (
                              <span style={{ marginLeft: 16 }}>
                                截止：{dayjs(cmd.deadline).format('MM-DD HH:mm')}
                              </span>
                            )}
                          </div>
                          {cmd.feedbacks.length > 0 && (
                            <div style={{
                              marginTop: 8, padding: '8px 12px', background: '#f6ffed',
                              borderRadius: 4, borderLeft: '3px solid #52c41a'
                            }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#52c41a', marginBottom: 4 }}>
                                反馈记录
                              </div>
                              {cmd.feedbacks.map((fb: CommandFeedback, idx: number) => (
                                <div key={fb.id} style={{ fontSize: 12, marginBottom: idx < cmd.feedbacks.length - 1 ? 6 : 0 }}>
                                  <Space>
                                    <Tag color={getCommandStatusColor(fb.status)}>
                                      {getCommandStatusLabel(fb.status)}
                                    </Tag>
                                    <span style={{ color: '#666' }}>{fb.content}</span>
                                  </Space>
                                  <div style={{ color: '#999', marginTop: 2 }}>
                                    {fb.providedBy} · {dayjs(fb.providedAt).format('HH:mm:ss')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      )
                    }))}
                  />
                ) : (
                  <Empty description="暂无指令" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </>
            )}

            <Divider orientation="left">
              <Space>
                <ClockCircleOutlined />
                <span>派警流转记录</span>
              </Space>
            </Divider>
            {(currentIncident.assignmentLogs && currentIncident.assignmentLogs.length > 0) ? (
              <Timeline
                items={[...currentIncident.assignmentLogs].reverse().map(log => ({
                  color: getLogTypeColor(log.type),
                  dot: log.type.includes('approved') || log.type === 'acceptance'
                    ? <CheckCircleOutlined />
                    : log.type.includes('rejected')
                    ? <CloseOutlined />
                    : <ClockCircleOutlined />,
                  children: (
                    <div>
                      <Space style={{ marginBottom: 4 }}>
                        <Tag color={getLogTypeColor(log.type)}>{getLogTypeLabel(log.type)}</Tag>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {dayjs(log.operatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </Space>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        操作人：{log.operator}
                      </div>
                      {log.beforeVehicle && log.beforeOfficers && (
                        <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 4 }}>
                          换前：{log.beforeVehicle.plate} · {log.beforeOfficers.map(o => o.name).join('、')}
                        </div>
                      )}
                      {log.afterVehicle && log.afterOfficers && (
                        <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>
                          换后：{log.afterVehicle.plate} · {log.afterOfficers.map(o => o.name).join('、')}
                        </div>
                      )}
                      {log.reason && (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                          原因：{log.reason}
                        </div>
                      )}
                      {log.approvalComments && (
                        <div style={{ fontSize: 12, color: '#1890ff', marginTop: 2 }}>
                          审批意见：{log.approvalComments}
                          {log.approvedBy && `（${log.approvedBy}）`}
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            ) : (
              <Empty description="暂无流转记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}

            {currentIncident.assignmentLogs?.some(l => l.type === 'transfer_approved') &&
             !currentIncident.assignmentLogs?.some(l => l.type === 'acceptance') &&
             currentIncident.status !== 'closed' && (
              <Card size="small" style={{ marginTop: 16, borderColor: '#faad14', background: '#fffbe6' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <AlertOutlined style={{ color: '#faad14' }} />
                    <span style={{ fontWeight: 500 }}>转派待验收</span>
                    <span style={{ fontSize: 12, color: '#666' }}>请确认新警力是否到位</span>
                  </Space>
                  <Space>
                    <Button size="small" danger onClick={() => handleVerifyTransfer(false)}>
                      验收不通过
                    </Button>
                    <Button size="small" type="primary" onClick={() => handleVerifyTransfer(true)}>
                      验收通过
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}

            {currentIncident.notes.length > 0 && (
              <>
                <Divider orientation="left">处置记录</Divider>
                {currentIncident.notes.map((n, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px', background: '#f9f9f9', borderRadius: 4, marginBottom: 8, fontSize: 13
                  }}>{n}</div>
                ))}
              </>
            )}

            <Divider orientation="left">添加处置记录</Divider>
            <Form form={noteForm} layout="vertical">
              <Form.Item name="note" rules={[{ required: true, message: '请输入记录内容' }]}>
                <Input.TextArea rows={3} placeholder="请输入处置记录..." />
              </Form.Item>
              <Button type="primary" onClick={handleAddNote}>提交记录</Button>
            </Form>
          </div>
        )}
      </Drawer>

      <Modal
        title="派遣增援警力"
        open={reinforcementModal}
        onCancel={() => setReinforcementModal(false)}
        onOk={handleAddReinforcement}
        okText="确认派遣"
        width={520}
      >
        <Form form={reinforcementForm} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item label="增援单位名称" name="unitName" rules={[{ required: true, message: '请输入单位名称' }]}>
                <Input placeholder="例如：特警支队一大队" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="单位类别" name="unitCategory" rules={[{ required: true, message: '请选择单位类别' }]} initialValue="patrol">
                <Select placeholder="选择单位类别">
                  <Option value="patrol">巡警</Option>
                  <Option value="swat">特警</Option>
                  <Option value="traffic">交警</Option>
                  <Option value="tech">技侦</Option>
                  <Option value="fire">消防</Option>
                  <Option value="medical">医疗</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="增援车辆" name="vehicleId" rules={[{ required: true, message: '请选择车辆' }]}>
                <Select placeholder="选择车辆">
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <Option key={v.id} value={v.id}>
                      {v.plateNumber}（{v.type === 'patrol_car' ? '巡逻车' : v.type === 'swat_vehicle' ? '特警车' : v.type}）
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预计到达(分钟)" name="eta" rules={[{ required: true, message: '请输入预计时间' }]}>
                <Input type="number" placeholder="例如：10" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="增援警员" name="officerIds" rules={[{ required: true, message: '请选择警员' }]}>
            <Select mode="multiple" placeholder="选择 2-3 名警员">
              {officers.filter(o => o.status === 'on_duty' && o.currentLoad < 2).map(o => (
                <Option key={o.id} value={o.id}>
                  {o.name} - {o.rank}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="职责任务" name="task" rules={[{ required: true, message: '请输入任务' }]}>
            <Input.TextArea rows={3} placeholder="请描述该增援单位的具体任务..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="下发协作指令"
        open={commandModal}
        onCancel={() => setCommandModal(false)}
        onOk={handleIssueCommand}
        okText="确认下发"
        width={520}
      >
        <Form form={commandForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="接收单位" name="unitId" rules={[{ required: true, message: '请选择单位' }]}>
                <Select placeholder="选择接收单位">
                  {(currentIncident?.jointUnits || []).map(u => (
                    <Option key={u.id} value={u.id}>
                      {u.unitName}（{getUnitCategoryLabel(u.unitCategory || 'other')}）
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="指令优先级" name="priority" rules={[{ required: true, message: '请选择优先级' }]} initialValue="normal">
                <Select placeholder="选择优先级">
                  <Option value="normal">普通</Option>
                  <Option value="urgent">紧急</Option>
                  <Option value="critical">特急</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="指令内容" name="content" rules={[{ required: true, message: '请输入指令内容' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述该单位需要执行的任务..." />
          </Form.Item>
          <Form.Item label="要求完成时间" name="deadline">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择要求完成时间（可选）"
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedCommand ? `回传反馈 - ${selectedCommand.unitName}` : '回传反馈'}
        open={feedbackModal}
        onCancel={() => setFeedbackModal(false)}
        onOk={handleAddFeedback}
        okText="提交反馈"
        width={520}
      >
        {selectedCommand && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>原指令：</div>
            <div style={{ fontSize: 13 }}>{selectedCommand.content}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              下发时间：{dayjs(selectedCommand.issuedAt).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
        )}
        <Form form={feedbackForm} layout="vertical">
          <Form.Item label="当前状态" name="status" rules={[{ required: true, message: '请选择状态' }]} initialValue="in_progress">
            <Select placeholder="选择当前执行状态">
              <Option value="received">已接收</Option>
              <Option value="in_progress">执行中</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Form.Item>
          <Form.Item label="反馈内容" name="content" rules={[{ required: true, message: '请输入反馈内容' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述执行情况、遇到的问题或结果..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
