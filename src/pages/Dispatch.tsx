import { useState, useEffect } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, List, Avatar, Table, Modal, Form, Input, message,
  Divider, Descriptions, Statistic, Drawer, Alert as AntdAlert
} from 'antd'
import {
  CarOutlined, UserOutlined, ThunderboltOutlined, CheckOutlined,
  SyncOutlined, EnvironmentOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, PRIORITY_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { Incident, TaskAssignment } from '../types'

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-icon',
  html: '<div style="background:#1677ff;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚓</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})

const incidentIcon = (priority: number) => {
  const color = priority >= 4 ? '#ef4444' : priority >= 3 ? '#f59e0b' : '#3b82f6'
  return L.divIcon({
    className: 'custom-incident-icon',
    html: `<div style="background:${color};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 0 4px rgba(239,68,68,0.3);animation:pulse 2s infinite;border:2px solid white">⚠️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })
}

export default function Dispatch() {
  const incidents = usePoliceStore(s => s.incidents)
  const vehicles = usePoliceStore(s => s.vehicles)
  const officers = usePoliceStore(s => s.officers)
  const assignments = usePoliceStore(s => s.assignments)
  const assignTask = usePoliceStore(s => s.assignTask)
  const confirmAssignment = usePoliceStore(s => s.confirmAssignment)
  const requestTransfer = usePoliceStore(s => s.requestTransfer)
  const approveTransfer = usePoliceStore(s => s.approveTransfer)

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [transferModal, setTransferModal] = useState(false)
  const [transferForm] = Form.useForm()
  const [selectedAssignment, setSelectedAssignment] = useState<TaskAssignment | null>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const t = setInterval(() => forceUpdate(x => x + 1), 3000)
    return () => clearInterval(t)
  }, [])

  const pendingIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'dispatched')
  const activeIncidents = incidents.filter(i => ['dispatched', 'en_route', 'handling'].includes(i.status))
  const pendingApprovals = assignments.filter(a => a.transferRequested && a.transferStatus === 'pending')

  const handleAssign = (inc: Incident) => {
    const assignment = assignTask(inc.id)
    if (assignment) {
      message.success(`已生成最优出警方案！预计 ${assignment.eta} 分钟到达`)
      setSelectedIncident(usePoliceStore.getState().incidents.find(i => i.id === inc.id) || null)
    } else {
      message.error('暂无可用警力资源')
    }
  }

  const handleConfirm = (assignment: TaskAssignment) => {
    confirmAssignment(assignment.id)
    message.success('警员已确认出警')
  }

  const openTransferModal = (assignment: TaskAssignment) => {
    setSelectedAssignment(assignment)
    setTransferModal(true)
  }

  const handleTransferRequest = () => {
    transferForm.validateFields().then(values => {
      if (selectedAssignment) {
        requestTransfer(selectedAssignment.id, values.reason)
        message.success('转派申请已提交，等待指挥长审批')
        setTransferModal(false)
        transferForm.resetFields()
      }
    })
  }

  const handleApproveTransfer = (assignment: TaskAssignment, approve: boolean) => {
    approveTransfer(assignment.id, approve)
    message.success(approve ? '已批准转派，正在重新调度...' : '已驳回转派申请')
  }

  const typeColor = (t: string) => t === 'criminal' ? 'red' : t === 'public_order' ? 'orange' : 'green'
  const priorityColor = (p: number) => p >= 4 ? 'red' : p >= 3 ? 'orange' : 'blue'

  const assignmentColumns: ColumnsType<TaskAssignment> = [
    {
      title: '警情', dataIndex: 'incidentId', width: 180,
      render: (v) => incidents.find(i => i.id === v)?.location || '-'
    },
    {
      title: '车辆', dataIndex: 'vehicleId', width: 120,
      render: (v) => vehicles.find(x => x.id === v)?.plateNumber || '-'
    },
    {
      title: '警员', dataIndex: 'officerIds', width: 160,
      render: (v: string[]) => v.map(id => officers.find(o => o.id === id)?.name).join('、')
    },
    { title: 'ETA', dataIndex: 'eta', width: 100, render: (v) => `${v} 分钟` },
    {
      title: '状态', width: 140,
      render: (_, r) => {
        if (r.transferRequested && r.transferStatus === 'pending') return <Tag color="orange">转派审批中</Tag>
        if (r.confirmed) return <Tag color="green">已确认</Tag>
        return <Tag color="processing">待确认</Tag>
      }
    },
    {
      title: '操作', width: 220,
      render: (_, r) => (
        <Space size="small">
          {!r.confirmed && !r.transferRequested && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(r)}>
                确认出警
              </Button>
              <Button size="small" icon={<SyncOutlined />} onClick={() => openTransferModal(r)}>
                申请转派
              </Button>
            </>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            title={
              <Space>
                <span>实时指挥地图</span>
                <Tag color="blue">警力: {vehicles.filter(v => v.status === 'available').length} 可用</Tag>
                <Tag color="orange">出警中: {vehicles.filter(v => v.status === 'on_duty').length}</Tag>
                <Tag color="red">待处置: {pendingIncidents.length}</Tag>
              </Space>
            }
            style={{ height: 560 }}
            bodyStyle={{ padding: 0, height: 500 }}
          >
            <MapContainer center={[39.915, 116.41]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehicles.map(v => (
                <Marker key={v.id} position={v.currentCoordinates} icon={vehicleIcon}>
                  <Popup>
                    <strong>{v.plateNumber}</strong><br />
                    类型: {v.type === 'patrol_car' ? '巡逻车' : v.type === 'swat_vehicle' ? '特警车辆' : '消防车'}<br />
                    状态: {v.status === 'available' ? '待命' : '出警中'}<br />
                    拥堵指数: {v.trafficIndex}/5
                  </Popup>
                </Marker>
              ))}
              {activeIncidents.map(inc => (
                <Marker key={inc.id} position={inc.coordinates} icon={incidentIcon(inc.priority)}>
                  <Popup>
                    <strong>{INCIDENT_TYPE_LABELS[inc.type]} - P{inc.priority}</strong><br />
                    {inc.location}<br />
                    {INCIDENT_STATUS_LABELS[inc.status]}
                  </Popup>
                </Marker>
              ))}
              {selectedIncident && selectedIncident.assignedVehicleId && (() => {
                const v = vehicles.find(x => x.id === selectedIncident!.assignedVehicleId)
                if (!v) return null
                return (
                  <Polyline
                    positions={[v.currentCoordinates, selectedIncident.coordinates]}
                    color="#ef4444"
                    weight={3}
                    dashArray="5, 10"
                  />
                )
              })()}
            </MapContainer>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="待出警警情" style={{ marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
            {pendingIncidents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无待出警警情</div>
            ) : (
              <List
                dataSource={pendingIncidents}
                renderItem={inc => (
                  <List.Item
                    className="incident-list-item"
                    onClick={() => setSelectedIncident(inc)}
                    style={{ padding: '12px 16px' }}
                  >
                    <div style={{ flex: 1 }}>
                      <Space size={4} wrap>
                        <Tag color={typeColor(inc.type)}>{INCIDENT_TYPE_LABELS[inc.type]}</Tag>
                        <Tag color={priorityColor(inc.priority)}>P{inc.priority}</Tag>
                        {inc.status === 'pending' && <Tag color="red">待派警</Tag>}
                      </Space>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{inc.location}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        <EnvironmentOutlined /> {inc.description.slice(0, 30)}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                        {dayjs(inc.reportedAt).format('HH:mm:ss')}
                      </div>
                    </div>
                    {inc.status === 'pending' && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleAssign(inc) }}
                      >
                        派警
                      </Button>
                    )}
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="警力资源" bodyStyle={{ padding: 0 }}>
            {vehicles.map(v => {
              const assigned = officers.filter(o => o.assignedVehicleId === v.id && o.status === 'on_duty')
              return (
                <div key={v.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                      <Avatar icon={<CarOutlined />} style={{ background: v.status === 'available' ? '#52c41a' : '#faad14' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{v.plateNumber}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {v.type === 'patrol_car' ? '巡逻车' : v.type === 'swat_vehicle' ? '特警车辆' : '消防车'} | 负载 {v.currentLoad}/{v.capacity}
                        </div>
                      </div>
                    </Space>
                    <div>
                      <Tag color={v.status === 'available' ? 'green' : 'orange'}>
                        {v.status === 'available' ? '待命' : '出警中'}
                      </Tag>
                    </div>
                  </div>
                  {assigned.length > 0 && (
                    <div style={{ marginTop: 8, paddingLeft: 40 }}>
                      {assigned.map(o => (
                        <Tag key={o.id} icon={<UserOutlined />} style={{ marginBottom: 4 }}>
                          {o.name} - {o.rank}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </Col>
      </Row>

      {pendingApprovals.length > 0 && (
        <Card title="转派审批" style={{ marginTop: 16, borderColor: '#faad14' }}>
          <AntdAlert
            message={`有 ${pendingApprovals.length} 个转派申请等待审批`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <List
            dataSource={pendingApprovals}
            renderItem={a => {
              const inc = incidents.find(i => i.id === a.incidentId)
              return (
                <List.Item>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{inc?.location}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      当前车辆：{vehicles.find(v => v.id === a.vehicleId)?.plateNumber} | 警员：
                      {a.officerIds.map(id => officers.find(o => o.id === id)?.name).join('、')}
                    </div>
                    {a.transferReason && (
                      <div style={{ fontSize: 12, color: '#d4380d', marginTop: 4 }}>申请原因：{a.transferReason}</div>
                    )}
                  </div>
                  <Space>
                    <Button type="primary" size="small" onClick={() => handleApproveTransfer(a, true)}>批准</Button>
                    <Button size="small" danger onClick={() => handleApproveTransfer(a, false)}>驳回</Button>
                  </Space>
                </List.Item>
              )
            }}
          />
        </Card>
      )}

      <Card title="派警任务列表" style={{ marginTop: 16 }}>
        <Table
          columns={assignmentColumns}
          dataSource={assignments}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Drawer
        title="警情调度详情"
        width={500}
        open={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
      >
        {selectedIncident && (() => {
          const assignment = assignments.find(a => a.incidentId === selectedIncident.id)
          return (
            <div>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="事发地点">{selectedIncident.location}</Descriptions.Item>
                <Descriptions.Item label="警情类型">
                  <Tag color={typeColor(selectedIncident.type)}>
                    {INCIDENT_TYPE_LABELS[selectedIncident.type]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={priorityColor(selectedIncident.priority)}>
                    P{selectedIncident.priority} {PRIORITY_LABELS[selectedIncident.priority]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {INCIDENT_STATUS_LABELS[selectedIncident.status]}
                </Descriptions.Item>
                <Descriptions.Item label="报警人">
                  {selectedIncident.callerName} ({selectedIncident.callerPhone})
                </Descriptions.Item>
                <Descriptions.Item label="描述">{selectedIncident.description}</Descriptions.Item>
              </Descriptions>

              {assignment && (
                <>
                  <Divider />
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>派警方案</div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic title="预计到达时间" value={assignment.eta} suffix="分钟" />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small">
                        <Statistic
                          title="派警时间"
                          value={dayjs(assignment.createdAt).format('HH:mm')}
                        />
                      </Card>
                    </Col>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                      出警车辆：<strong>{vehicles.find(v => v.id === assignment.vehicleId)?.plateNumber}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      处置警员：
                      {assignment.officerIds.map(id => {
                        const o = officers.find(x => x.id === id)
                        return (
                          <Tag key={id} icon={<UserOutlined />} style={{ marginLeft: 8 }}>
                            {o?.name} - {o?.rank}
                          </Tag>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>警员技能：</div>
                    {assignment.officerIds.map(id => {
                      const o = officers.find(x => x.id === id)
                      return (
                        <div key={id} style={{ marginTop: 4, fontSize: 12 }}>
                          <strong>{o?.name}：</strong>
                          {o?.skills.map(s => (
                            <Tag key={s} color="blue" style={{ marginRight: 4 }}>{s}</Tag>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </Drawer>

      <Modal
        title="申请转派"
        open={transferModal}
        onCancel={() => setTransferModal(false)}
        onOk={handleTransferRequest}
        okText="提交申请"
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item label="转派原因" name="reason" rules={[{ required: true, message: '请输入转派原因' }]}>
            <Input.TextArea rows={4} placeholder="请详细说明转派原因，如：警力不足、不具备相关技能、另有紧急任务等..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
