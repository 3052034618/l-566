import { useState } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, List, Modal, message, Badge, Empty, Tooltip, Statistic
} from 'antd'
import {
  VideoCameraOutlined, WarningOutlined, EyeOutlined, BellOutlined,
  PlayCircleOutlined, SoundOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import dayjs from 'dayjs'

export default function VideoMonitor() {
  const cameras = usePoliceStore(s => s.cameras)
  const incidents = usePoliceStore(s => s.incidents)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const alertCameras = cameras.filter(c => c.hasAlert)
  const onlineCameras = cameras.filter(c => c.status === 'online')

  const viewDetail = (cameraId: string) => {
    setSelectedCamera(cameraId)
    setDetailVisible(true)
  }

  const handleAcknowledgeAlert = (cameraId: string) => {
    message.success('报警已确认，已通知附近巡逻警员前往处置')
  }

  const getRelatedIncidents = (cameraId: string) => {
    return incidents.filter(i => i.cameraIds.includes(cameraId))
  }

  const currentCamera = cameras.find(c => c.id === selectedCamera)

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="摄像头总数"
              value={cameras.length}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="在线"
              value={onlineCameras.length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="离线"
              value={cameras.length - onlineCameras.length}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="异常报警"
              value={alertCameras.length}
              valueStyle={{ color: alertCameras.length > 0 ? '#cf1322' : undefined }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {alertCameras.length > 0 && (
        <Card
          title={
            <Space>
              <Badge count={alertCameras.length} offset={[-2, 2]}>
                <span>🚨 异常行为报警（声光联动）</span>
              </Badge>
              <Tag color="red" icon={<SoundOutlined />}>声光报警已触发</Tag>
            </Space>
          }
          style={{ marginBottom: 16, borderColor: '#ff4d4f', background: '#fff1f0' }}
        >
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={alertCameras}
            renderItem={camera => (
              <List.Item>
                <Card
                  size="small"
                  style={{ borderColor: '#ff4d4f' }}
                  cover={
                    <div className="video-tile alert" style={{ height: 140 }}>
                      <Badge.Ribbon text="ALERT" color="red">
                        <div style={{ position: 'relative', zIndex: 5 }}>
                          <WarningOutlined style={{ fontSize: 40, color: '#ff4d4f' }} />
                          <div style={{ marginTop: 8, fontSize: 12 }}>{camera.alertType}</div>
                        </div>
                      </Badge.Ribbon>
                      <div style={{
                        position: 'absolute', bottom: 8, left: 8, right: 8,
                        display: 'flex', justifyContent: 'space-between', zIndex: 5
                      }}>
                        <Tag color="red" style={{ margin: 0 }}>● REC</Tag>
                        <span style={{ fontSize: 11 }}>
                          {dayjs().format('HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  }
                  actions={[
                    <Tooltip title="查看详情">
                      <EyeOutlined key="view" onClick={() => viewDetail(camera.id)} />
                    </Tooltip>,
                    <Tooltip title="确认报警">
                      <BellOutlined key="ack" onClick={() => handleAcknowledgeAlert(camera.id)} />
                    </Tooltip>
                  ]}
                >
                  <Card.Meta
                    title={camera.name}
                    description={
                      <div style={{ fontSize: 12 }}>
                        <div>📍 {camera.location}</div>
                        <Tag color="red" style={{ marginTop: 4 }}>{camera.alertType}</Tag>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Card title="全部监控画面">
        {cameras.length === 0 ? (
          <Empty description="暂无监控设备" />
        ) : (
          <Row gutter={[16, 16]}>
            {cameras.map(camera => (
              <Col xs={24} sm={12} md={8} lg={6} key={camera.id}>
                <div
                  className={`video-tile ${camera.hasAlert ? 'alert' : ''}`}
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => viewDetail(camera.id)}
                >
                  <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                    {camera.status === 'offline' ? (
                      <div>
                        <VideoCameraOutlined style={{ fontSize: 36, color: '#666' }} />
                        <div style={{ marginTop: 8 }}>设备离线</div>
                      </div>
                    ) : (
                      <div>
                        <PlayCircleOutlined style={{ fontSize: 36, color: '#fff', opacity: 0.8 }} />
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                          {camera.hasAlert ? camera.alertType : '实时监控中'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 5
                  }}>
                    {camera.status === 'online' ? (
                      <Tag color="green" style={{ margin: 0 }}>● LIVE</Tag>
                    ) : (
                      <Tag color="default" style={{ margin: 0 }}>● OFFLINE</Tag>
                    )}
                  </div>
                  {camera.hasAlert && (
                    <div className="alert-badge">
                      <Badge status="error" />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8, right: 8,
                    display: 'flex', justifyContent: 'space-between', zIndex: 5
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{camera.name}</span>
                    <span style={{ fontSize: 11 }}>
                      {camera.status === 'online' ? dayjs().format('HH:mm:ss') : '--:--:--'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  📍 {camera.location}
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={currentCamera?.name || '监控详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={
          <Space>
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
            {currentCamera?.hasAlert && (
              <Button type="primary" danger onClick={() => handleAcknowledgeAlert(currentCamera.id)}>
                确认报警并派警
              </Button>
            )}
          </Space>
        }
      >
        {currentCamera && (
          <div>
            <div
              className={`video-tile ${currentCamera.hasAlert ? 'alert' : ''}`}
              style={{ height: 360, marginBottom: 16 }}
            >
              <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: 64, color: '#fff', opacity: 0.8 }} />
                <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>
                  {currentCamera.status === 'offline' ? '设备已离线' :
                    currentCamera.hasAlert ? `检测到异常：${currentCamera.alertType}` : '实时监控画面'}
                </div>
              </div>
              <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 5
              }}>
                {currentCamera.status === 'online' ? (
                  <Tag color="green" style={{ margin: 0, fontSize: 14 }}>● LIVE</Tag>
                ) : (
                  <Tag color="default" style={{ margin: 0, fontSize: 14 }}>● OFFLINE</Tag>
                )}
              </div>
              {currentCamera.hasAlert && (
                <Badge.Ribbon text="异常报警" color="red">
                  <div></div>
                </Badge.Ribbon>
              )}
              <div style={{
                position: 'absolute', bottom: 12, left: 12, right: 12,
                display: 'flex', justifyContent: 'space-between', zIndex: 5
              }}>
                <span style={{ fontWeight: 600 }}>{currentCamera.name}</span>
                <span>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
              </div>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="设备信息">
                  <div style={{ fontSize: 13, lineHeight: 2 }}>
                    <div><strong>设备ID：</strong>{currentCamera.id}</div>
                    <div><strong>安装位置：</strong>{currentCamera.location}</div>
                    <div><strong>经纬度：</strong>{currentCamera.coordinates.join(', ')}</div>
                    <div>
                      <strong>状态：</strong>
                      <Tag color={currentCamera.status === 'online' ? 'green' : 'default'}>
                        {currentCamera.status === 'online' ? '在线' : '离线'}
                      </Tag>
                    </div>
                    {currentCamera.hasAlert && (
                      <div>
                        <strong>报警类型：</strong>
                        <Tag color="red">{currentCamera.alertType}</Tag>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="关联警情">
                  {getRelatedIncidents(currentCamera.id).length === 0 ? (
                    <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 12 }}>
                      暂无关联警情
                    </div>
                  ) : (
                    <List
                      size="small"
                      dataSource={getRelatedIncidents(currentCamera.id)}
                      renderItem={inc => (
                        <List.Item>
                          <div>
                            <div style={{ fontWeight: 500 }}>{inc.location}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              {inc.description.slice(0, 30)}...
                            </div>
                          </div>
                          <Tag color={inc.priority >= 4 ? 'red' : 'blue'}>P{inc.priority}</Tag>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}
