import { useState } from 'react'
import {
  Card, Table, Tag, Space, Button, Input, Select, DatePicker, Modal, Drawer, Descriptions,
  Timeline, Divider, Form, message
} from 'antd'
import {
  EyeOutlined, ThunderboltOutlined, FileAddOutlined, SafetyOutlined, AlertOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, PRIORITY_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import type { Incident } from '../types'

const { RangePicker } = DatePicker
const { Option } = Select

export default function IncidentList() {
  const incidents = usePoliceStore(s => s.incidents)
  const officers = usePoliceStore(s => s.officers)
  const vehicles = usePoliceStore(s => s.vehicles)
  const assignTask = usePoliceStore(s => s.assignTask)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null)
  const [noteForm] = Form.useForm()
  const addNoteToIncident = usePoliceStore(s => s.addNoteToIncident)
  const navigate = useNavigate()

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
        title="警情详情"
        width={640}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
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
    </div>
  )
}
