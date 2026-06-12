import { useState, useEffect } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, List, Badge, Avatar, Statistic,
  Progress, Empty, Tooltip, Drawer, Descriptions, message
} from 'antd'
import {
  SafetyOutlined, AlertOutlined, SafetyCertificateOutlined,
  CarOutlined, UserOutlined, BellOutlined, VideoCameraOutlined,
  WarningOutlined, EnvironmentOutlined, ThunderboltOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS, PRIORITY_LABELS, CASE_STATUS_LABELS } from '../data/mockData'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import type { Incident } from '../types'

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-icon',
  html: '<div style="background:#1677ff;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">🚓</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
})

const incidentIcon = (priority: number) => {
  const color = priority >= 4 ? '#ef4444' : priority >= 3 ? '#f59e0b' : '#3b82f6'
  return L.divIcon({
    className: 'custom-incident-icon',
    html: `<div style="background:${color};color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 0 3px rgba(239,68,68,0.25);animation:pulse 2s infinite;border:2px solid white">⚠️</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const incidents = usePoliceStore(s => s.incidents)
  const vehicles = usePoliceStore(s => s.vehicles)
  const officers = usePoliceStore(s => s.officers)
  const cameras = usePoliceStore(s => s.cameras)
  const cases = usePoliceStore(s => s.cases)
  const alerts = usePoliceStore(s => s.alerts)
  const markAlertRead = usePoliceStore(s => s.markAlertRead)
  const getStatistics = usePoliceStore(s => s.getStatistics)
  const assignTask = usePoliceStore(s => s.assignTask)

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [tick, setTick] = useState(0)
  const stats = getStatistics()

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 5000)
    return () => clearInterval(t)
  }, [])

  const activeIncidents = incidents.filter(i => ['pending', 'dispatched', 'en_route', 'handling'].includes(i.status))
  const pendingIncidents = incidents.filter(i => i.status === 'pending')
  const unreadAlerts = alerts.filter(a => !a.read)
  const alertCameras = cameras.filter(c => c.hasAlert)

  const typeColor = (t: string) => t === 'criminal' ? 'red' : t === 'public_order' ? 'orange' : 'green'
  const typeIcon = (t: string) =>
    t === 'criminal' ? <SafetyOutlined /> : t === 'public_order' ? <AlertOutlined /> : <SafetyCertificateOutlined />
  const priorityColor = (p: number) => p >= 4 ? 'red' : p >= 3 ? 'orange' : 'blue'

  const viewDetail = (inc: Incident) => {
    setSelectedIncident(inc)
    setDetailVisible(true)
  }

  const quickAssign = (inc: Incident) => {
    const assignment = assignTask(inc.id)
    if (assignment) {
      message.success(`已派警！预计 ${assignment.eta} 分钟到达`)
      navigate('/dispatch')
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card
            title={
              <Space>
                <span>🗺️ 实时态势地图</span>
                <Tag color="blue">
                  <CarOutlined /> {vehicles.filter(v => v.status === 'available').length} 待命
                </Tag>
                <Tag color="orange">
                  <CarOutlined /> {vehicles.filter(v => v.status === 'on_duty').length} 出警
                </Tag>
                <Tag color="red">
                  <WarningOutlined /> {pendingIncidents.length} 待处置
                </Tag>
              </Space>
            }
            style={{ height: 500 }}
            bodyStyle={{ padding: 0, height: 440 }}
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
                    {v.status === 'available' ? '待命' : '出警中'} | {v.currentLoad}/{v.capacity}
                  </Popup>
                </Marker>
              ))}
              {activeIncidents.map(inc => (
                <Marker
                  key={inc.id}
                  position={inc.coordinates}
                  icon={incidentIcon(inc.priority)}
                  eventHandlers={{ click: () => viewDetail(inc) }}
                >
                  <Popup>
                    <strong>{INCIDENT_TYPE_LABELS[inc.type]} - P{inc.priority}</strong><br />
                    {inc.location}<br />
                    {INCIDENT_STATUS_LABELS[inc.status]}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>实时预警</span>
                <Badge count={unreadAlerts.length} offset={[-2, 2]} />
              </Space>
            }
            style={{ height: 500, overflow: 'hidden' }}
            bodyStyle={{ padding: 0, height: 440, overflow: 'auto' }}
          >
            {unreadAlerts.length === 0 && alerts.length === 0 ? (
              <Empty description="暂无预警信息" style={{ marginTop: 60 }} />
            ) : (
              <List
                dataSource={alerts}
                renderItem={a => (
                  <List.Item
                    onClick={() => markAlertRead(a.id)}
                    style={{
                      padding: '10px 16px', borderBottom: '1px solid #f0f0f0',
                      background: a.read ? 'transparent' : '#fffbe6', cursor: 'pointer'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{
                            background: a.severity === 'error' ? '#ff4d4f' :
                              a.severity === 'warning' ? '#faad14' : '#1677ff'
                          }}
                          icon={<WarningOutlined />}
                        />
                      }
                      title={
                        <Space>
                          <span style={{ fontWeight: a.read ? 400 : 600 }}>{a.title}</span>
                          {!a.read && <Badge status="processing" />}
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{a.message}</div>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {dayjs(a.createdAt).format('MM-DD HH:mm:ss')}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={6}>
          <div className="stat-card">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>本月接警</span>}
              value={stats.totalIncidents}
              valueStyle={{ color: '#fff' }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className="stat-card criminal">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>刑事警情</span>}
              value={stats.incidentsByType.criminal}
              valueStyle={{ color: '#fff' }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className="stat-card public-order">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>治安警情</span>}
              value={stats.incidentsByType.public_order}
              valueStyle={{ color: '#fff' }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className="stat-card assistance">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>破案率</span>}
              value={stats.solveRate}
              suffix="%"
              valueStyle={{ color: '#fff' }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>待处置警情</span>
                <Tag color="red">{pendingIncidents.length}</Tag>
              </Space>
            }
            extra={<Button type="link" onClick={() => navigate('/dispatch')}>前往调度 →</Button>}
          >
            {pendingIncidents.length === 0 ? (
              <Empty description="暂无待处置警情" />
            ) : (
              <List
                dataSource={incidents.filter(i => i.status === 'pending').slice(0, 5)}
                renderItem={inc => (
                  <List.Item
                    className="incident-list-item"
                    onClick={() => viewDetail(inc)}
                    actions={[
                      <Button
                        key="assign"
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={(e) => { e.stopPropagation(); quickAssign(inc) }}
                      >
                        一键派警
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{ background: inc.priority >= 4 ? '#ef4444' : inc.priority >= 3 ? '#f59e0b' : '#3b82f6' }}
                          icon={typeIcon(inc.type)}
                        />
                      }
                      title={
                        <Space>
                          <Tag color={typeColor(inc.type)}>{INCIDENT_TYPE_LABELS[inc.type]}</Tag>
                          <Tag color={priorityColor(inc.priority)}>P{inc.priority}</Tag>
                          <strong>{inc.location}</strong>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            <EnvironmentOutlined /> {inc.description}
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                            报警人：{inc.callerName} | {dayjs(inc.reportedAt).format('HH:mm:ss')}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <VideoCameraOutlined />
                <span>视频监控异常</span>
                <Tag color="red">{alertCameras.length}</Tag>
              </Space>
            }
            extra={<Button type="link" onClick={() => navigate('/video')}>查看全部 →</Button>}
          >
            {alertCameras.length === 0 ? (
              <Empty description="所有监控运行正常" />
            ) : (
              <List
                dataSource={alertCameras}
                renderItem={cam => (
                  <List.Item className="incident-list-item" onClick={() => navigate('/video')}>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ background: '#ef4444' }} icon={<VideoCameraOutlined />} />
                      }
                      title={
                        <Space>
                          <strong>{cam.name}</strong>
                          <Badge status="error" text={cam.alertType} />
                        </Space>
                      }
                      description={
                        <div style={{ fontSize: 12, color: '#666' }}>
                          <EnvironmentOutlined /> {cam.location}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>案件动态</span>
              </Space>
            }
            extra={<Button type="link" onClick={() => navigate('/cases')}>案件管理 →</Button>}
          >
            <List
              dataSource={cases.slice(0, 5)}
              renderItem={c => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ background: c.isOverdue ? '#ef4444' : '#1677ff' }} icon={<FileTextOutlined />} />
                    }
                    title={
                      <Space>
                        <span style={{ fontFamily: 'monospace' }}>{c.caseNumber}</span>
                        <Tag color={c.status === 'accepted' ? 'blue' :
                          c.status === 'investigating' ? 'orange' :
                            c.status === 'solved' ? 'green' : 'purple'}>
                          {CASE_STATUS_LABELS[c.status]}
                        </Tag>
                        {c.isOverdue && <Tag color="red">超期</Tag>}
                        <strong>{c.title}</strong>
                      </Space>
                    }
                    description={
                      <div style={{ fontSize: 12, color: '#666' }}>
                        主办：{c.officerInCharge} | 受理：{dayjs(c.acceptedAt).format('YYYY-MM-DD')}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>警力状态</span>
              </Space>
            }
            extra={<Button type="link" onClick={() => navigate('/schedule')}>排班管理 →</Button>}
          >
            <List
              dataSource={officers.filter(o => o.status === 'on_duty').slice(0, 5)}
              renderItem={o => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: o.currentLoad >= 2 ? '#faad14' : '#52c41a' }}>{o.name[0]}</Avatar>}
                    title={
                      <Space>
                        <strong>{o.name}</strong>
                        <Tag>{o.rank}</Tag>
                        <span style={{ fontSize: 12, color: '#888' }}>{o.badgeNumber}</span>
                      </Space>
                    }
                    description={
                      <Space size={4} wrap>
                        {o.skills.slice(0, 3).map(s => (
                          <Tag key={s} color="blue" style={{ fontSize: 11 }}>{s}</Tag>
                        ))}
                        <Progress
                          percent={Math.min(o.currentLoad * 33, 100)}
                          size="small"
                          style={{ width: 80 }}
                          format={() => `负载${o.currentLoad}`}
                        />
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title="警情详情"
        width={480}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedIncident && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag icon={typeIcon(selectedIncident.type)} color={typeColor(selectedIncident.type)}>
                {INCIDENT_TYPE_LABELS[selectedIncident.type]}
              </Tag>
              <Tag color={priorityColor(selectedIncident.priority)}>
                P{selectedIncident.priority} {PRIORITY_LABELS[selectedIncident.priority]}
              </Tag>
              <Tag>{INCIDENT_STATUS_LABELS[selectedIncident.status]}</Tag>
              {selectedIncident.isOverdue && <Tag color="red">超时</Tag>}
            </Space>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="事发地点">{selectedIncident.location}</Descriptions.Item>
              <Descriptions.Item label="报警人">{selectedIncident.callerName} ({selectedIncident.callerPhone})</Descriptions.Item>
              <Descriptions.Item label="警情描述">{selectedIncident.description}</Descriptions.Item>
              <Descriptions.Item label="接警时间">{dayjs(selectedIncident.reportedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="关联摄像头">{selectedIncident.cameraIds.length} 个</Descriptions.Item>
            </Descriptions>
            <Space style={{ marginTop: 16 }}>
              {selectedIncident.status === 'pending' && (
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => quickAssign(selectedIncident)}>
                  派警处置
                </Button>
              )}
              <Button onClick={() => navigate('/tracking')}>查看追踪</Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  )
}
