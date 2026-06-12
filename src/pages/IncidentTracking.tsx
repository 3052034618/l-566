import { useState, useEffect } from 'react'
import {
  Card, Row, Col, Tag, Space, Progress, List, Button, Modal, message, Descriptions, Statistic, Divider
} from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_STATUS_LABELS, INCIDENT_TYPE_LABELS, PRIORITY_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import type { Incident } from '../types'

export default function IncidentTracking() {
  const incidents = usePoliceStore(s => s.incidents)
  const officers = usePoliceStore(s => s.officers)
  const vehicles = usePoliceStore(s => s.vehicles)
  const closeIncident = usePoliceStore(s => s.closeIncident)
  const updateIncidentStatus = usePoliceStore(s => s.updateIncidentStatus)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const activeIncidents = incidents.filter(i => i.status !== 'closed')

  const getProgress = (inc: Incident) => {
    const map: Record<string, number> = {
      pending: 0, dispatched: 25, en_route: 50, handling: 75, closed: 100
    }
    return map[inc.status] || 0
  }

  const getElapsed = (inc: Incident) => {
    const start = dayjs(inc.reportedAt)
    return dayjs().diff(start, 'minute')
  }

  const handleClose = (inc: Incident) => {
    Modal.confirm({
      title: '确认结案',
      content: '警情处置完成，确认结案？',
      onOk: () => {
        closeIncident(inc.id)
        message.success('警情已结案')
      }
    })
  }

  const handleAdvance = (inc: Incident) => {
    const nextMap: Record<string, any> = {
      pending: 'dispatched', dispatched: 'en_route', en_route: 'handling'
    }
    const next = nextMap[inc.status]
    if (next) {
      updateIncidentStatus(inc.id, next)
      message.success('状态已更新')
    }
  }

  const stats = {
    pending: incidents.filter(i => i.status === 'pending').length,
    enRoute: incidents.filter(i => i.status === 'en_route').length,
    handling: incidents.filter(i => i.status === 'handling').length,
    overdue: incidents.filter(i => i.isOverdue).length
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="待出警"
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="赶赴现场"
              value={stats.enRoute}
              prefix={<EnvironmentOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="处置中"
              value={stats.handling}
              prefix={<ExclamationCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="超时警情"
              value={stats.overdue}
              valueStyle={{ color: stats.overdue > 0 ? '#cf1322' : undefined }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="警情实时追踪">
        {activeIncidents.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>当前无进行中警情</div>
        ) : (
          <Row gutter={[16, 16]}>
            {activeIncidents.map(inc => (
              <Col xs={24} md={12} key={inc.id}>
                <Card
                  size="small"
                  style={{
                    borderColor: inc.isOverdue ? '#ff4d4f' : undefined,
                    boxShadow: inc.isOverdue ? '0 0 0 2px rgba(255,77,79,0.2)' : undefined
                  }}
                  title={
                    <Space>
                      <Tag color={inc.type === 'criminal' ? 'red' : inc.type === 'public_order' ? 'orange' : 'green'}>
                        {INCIDENT_TYPE_LABELS[inc.type]}
                      </Tag>
                      <Tag color={inc.priority >= 4 ? 'red' : inc.priority >= 3 ? 'orange' : 'blue'}>
                        P{inc.priority}
                      </Tag>
                      <span style={{ fontWeight: 600 }}>{inc.location}</span>
                      {inc.isOverdue && <Tag color="red" icon={<ExclamationCircleOutlined />}>超时预警</Tag>}
                      {inc.escalated && <Tag color="purple">已通知上级</Tag>}
                    </Space>
                  }
                  extra={
                    <span style={{ color: '#888', fontSize: 12 }}>
                      已用时 {getElapsed(inc)} 分钟
                    </span>
                  }
                >
                  <Progress
                    percent={getProgress(inc)}
                    status={inc.isOverdue ? 'exception' : 'active'}
                    strokeColor={inc.isOverdue ? '#ff4d4f' : undefined}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="状态">
                        <Tag color={inc.status === 'pending' ? 'default' :
                          inc.status === 'dispatched' ? 'processing' :
                            inc.status === 'en_route' ? 'orange' : 'blue'}>
                          {INCIDENT_STATUS_LABELS[inc.status]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="优先级">
                        {PRIORITY_LABELS[inc.priority]}
                      </Descriptions.Item>
                      <Descriptions.Item label="出警车辆">
                        {inc.assignedVehicleId
                          ? vehicles.find(v => v.id === inc.assignedVehicleId)?.plateNumber
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="处置警员">
                        {inc.assignedOfficerIds.length > 0
                          ? inc.assignedOfficerIds.map(id => officers.find(o => o.id === id)?.name).join('、')
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="报警人" span={2}>
                        {inc.callerName} - {inc.callerPhone}
                      </Descriptions.Item>
                      <Descriptions.Item label="警情描述" span={2}>
                        {inc.description}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>处置时间线：</strong>
                    </div>
                    <List
                      size="small"
                      dataSource={[
                        inc.reportedAt && { time: inc.reportedAt, label: '接警' },
                        inc.dispatchedAt && { time: inc.dispatchedAt, label: '派警' },
                        inc.arrivedAt && { time: inc.arrivedAt, label: '到场' }
                      ].filter(Boolean) as any[]}
                      renderItem={(item: any) => (
                        <List.Item>
                          <Space>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <span>{item.label}</span>
                            <span style={{ color: '#999' }}>
                              {dayjs(item.time).format('HH:mm:ss')}
                            </span>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>

                  {inc.notes.length > 0 && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ fontSize: 12 }}>
                        <div style={{ marginBottom: 6, color: '#666' }}><strong>处置记录：</strong></div>
                        {inc.notes.map((n, i) => (
                          <div key={i} style={{ padding: 4, background: '#fafafa', borderRadius: 4, fontSize: 11 }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Divider style={{ margin: '12px 0' }} />

                  <Space>
                    {inc.status !== 'handling' && inc.status !== 'closed' && (
                      <Button size="small" type="primary" onClick={() => handleAdvance(inc)}>
                        推进状态
                      </Button>
                    )}
                    {inc.status === 'handling' && (
                      <Button size="small" type="primary" onClick={() => handleClose(inc)}>
                        结案
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  )
}
