import { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, Select, Button, Row, Col, Tag, Space, Divider, message, Descriptions, Alert as AntdAlert
} from 'antd'
import {
  SafetyOutlined, AlertOutlined, SafetyCertificateOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_TYPE_LABELS, PRIORITY_LABELS } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

const { TextArea } = Input
const { Option } = Select

const presetLocations: Array<{ name: string; coords: [number, number] }> = [
  { name: '王府井大街', coords: [39.9120, 116.4080] },
  { name: '天安门广场', coords: [39.9055, 116.3976] },
  { name: '西单路口', coords: [39.9090, 116.3730] },
  { name: 'CBD国贸', coords: [39.9085, 116.4605] },
  { name: '北京站广场', coords: [39.9030, 116.4270] },
  { name: '中关村大街', coords: [39.9840, 116.3160] },
  { name: '东三环北路', coords: [39.9450, 116.4550] },
  { name: '西城区幸福小区', coords: [39.9200, 116.3800] }
]

export default function IncidentEntry() {
  const [form] = Form.useForm()
  const addIncident = usePoliceStore(s => s.addIncident)
  const classifyIncident = usePoliceStore(s => s.classifyIncident)
  const navigate = useNavigate()
  const [preview, setPreview] = useState<{ type: string; priority: number } | null>(null)
  const [nearbyCameras, setNearbyCameras] = useState(0)
  const cameras = usePoliceStore(s => s.cameras)

  const description = Form.useWatch('description', form)
  const location = Form.useWatch('location', form)

  useEffect(() => {
    if (description || location) {
      const result = classifyIncident(description || '', location || '')
      setPreview(result)
    } else {
      setPreview(null)
    }
  }, [description, location, classifyIncident])

  useEffect(() => {
    if (location) {
      const matched = presetLocations.find(l => location.includes(l.name))
      if (matched) {
        const nearby = cameras.filter(c => {
          const R = 6371
          const dLat = (c.coordinates[0] - matched.coords[0]) * Math.PI / 180
          const dLng = (c.coordinates[1] - matched.coords[1]) * Math.PI / 180
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(matched.coords[0] * Math.PI / 180) * Math.cos(c.coordinates[0] * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) < 1
        })
        setNearbyCameras(nearby.length)
      }
    }
  }, [location, cameras])

  const onSubmit = (values: any) => {
    const matched = presetLocations.find(l => values.location.includes(l.name))
    const coords = matched ? matched.coords : [39.9087, 116.4074]
    const newIncident = addIncident({ ...values, coordinates: coords })
    message.success(`警情录入成功！已自动分类为【${INCIDENT_TYPE_LABELS[newIncident.type]}】，优先级【${PRIORITY_LABELS[newIncident.priority]}】`)
    form.resetFields()
    setTimeout(() => navigate('/dispatch'), 1500)
  }

  const priorityColor = (p: number) => {
    if (p >= 4) return 'red'
    if (p >= 3) return 'orange'
    return 'blue'
  }

  const typeIcon = (t: string) => {
    if (t === 'criminal') return <SafetyOutlined />
    if (t === 'public_order') return <AlertOutlined />
    return <SafetyCertificateOutlined />
  }

  return (
    <div>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="警情信息录入" extra={<Tag color="blue">110接警台</Tag>}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              initialValues={{ priority: 3 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="报警人姓名" name="callerName" rules={[{ required: true, message: '请输入报警人姓名' }]}>
                    <Input placeholder="请输入报警人姓名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="联系电话" name="callerPhone" rules={[{ required: true, message: '请输入联系电话' }]}>
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="事发地点" name="location" rules={[{ required: true, message: '请输入事发地点' }]}>
                    <Select
                      showSearch
                      placeholder="请输入或选择事发地点"
                      optionFilterProp="children"
                    >
                      {presetLocations.map(l => (
                        <Option key={l.name} value={l.name}>{l.name}</Option>
                      ))}
                    </Select>
              </Form.Item>
              <Form.Item label="警情描述" name="description" rules={[{ required: true, message: '请输入警情描述' }]}>
                <TextArea rows={5} placeholder="请详细描述警情情况，包括事件经过、人员伤亡等信息..." />
              </Form.Item>

              {preview && (
                <AntdAlert
                  showIcon
                  type="info"
                  style={{ marginBottom: 24 }}
                  message={
                    <Space>
                      <span>系统自动分析结果：</span>
                      <Tag icon={typeIcon(preview.type)} color={preview.type === 'criminal' ? 'red' : preview.type === 'public_order' ? 'orange' : 'green'}>
                        {INCIDENT_TYPE_LABELS[preview.type]}
                      </Tag>
                      <Tag color={priorityColor(preview.priority)} className="priority-tag">
                        优先级：{PRIORITY_LABELS[preview.priority]}
                      </Tag>
                      {nearbyCameras > 0 && (
                        <Tag color="purple">附近摄像头：{nearbyCameras} 个</Tag>
                      )}
                    </Space>
                  }
                  description="系统根据历史警情数据库自动识别关键词进行分类和优先级评估"
                />
              )}

              <Divider />

              <Space>
                <Button type="primary" htmlType="submit" size="large">保存并派警</Button>
                <Button size="large" onClick={() => form.resetFields()}>重置</Button>
                <Button size="large" onClick={() => navigate('/incidents')}>查看警情列表</Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="智能分类说明">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="刑事类">
                <Tag color="red">刑事</Tag>
                <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
                  盗窃、抢劫、伤害、诈骗、纵火、爆炸、毒品等
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="治安类">
                <Tag color="orange">治安</Tag>
                <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
                  打架斗殴、赌博、黄毒、聚众闹事、纠纷争执、扰民等
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="求助类">
                <Tag color="green">求助</Tag>
                <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
                  人员走失、紧急医疗、困难救助、咨询服务等
                </div>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}><InfoCircleOutlined /> 优先级评估规则</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <div>• <Tag color="red">5级-紧急</Tag>：涉及人身安全、重大财产损失、公共安全威胁</div>
                <div>• <Tag color="orange">4级-较高</Tag>：一般刑事案件、重大治安事件</div>
                <div>• <Tag color="blue">3级-中等</Tag>：一般治安事件、一般求助</div>
                <div>• <Tag color="cyan">2级-较低</Tag>：普通求助、咨询服务</div>
                <div>• <Tag color="default">1级-一般</Tag>：非紧急事项</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
