import { useState } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, Table, Modal, Form, Select, DatePicker,
  message, List, Badge, Tooltip, Divider
} from 'antd'
import {
  CalendarOutlined, ReloadOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import { SHIFT_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { Schedule } from '../types'

const { Option } = Select

const riskColor = (level: string) => level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'green'
const riskLabel = (level: string) => level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'

export default function Schedule() {
  const schedules = usePoliceStore(s => s.schedules)
  const officers = usePoliceStore(s => s.officers)
  const areas = usePoliceStore(s => s.areas)
  const generateSchedules = usePoliceStore(s => s.generateSchedules)
  const requestScheduleChange = usePoliceStore(s => s.requestScheduleChange)
  const approveScheduleChange = usePoliceStore(s => s.approveScheduleChange)

  const [dateFilter, setDateFilter] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [areaFilter, setAreaFilter] = useState<string | undefined>()
  const [shiftFilter, setShiftFilter] = useState<string | undefined>()
  const [changeModal, setChangeModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [changeForm] = Form.useForm()

  const filteredSchedules = schedules.filter(s => {
    if (dateFilter && s.date !== dateFilter) return false
    if (areaFilter && s.areaId !== areaFilter) return false
    if (shiftFilter && s.shift !== shiftFilter) return false
    return true
  })

  const pendingChanges = schedules.filter(s => s.changeRequested && s.changeStatus === 'pending')

  const handleGenerate = () => {
    Modal.confirm({
      title: '重新生成排班',
      content: '将根据辖区风险等级自动生成未来7天排班表，是否继续？',
      onOk: () => {
        generateSchedules()
        message.success('排班已自动生成')
      }
    })
  }

  const openChangeModal = (s: Schedule) => {
    setSelectedSchedule(s)
    changeForm.setFieldsValue({
      date: s.date,
      shift: s.shift,
      areaId: s.areaId
    })
    setChangeModal(true)
  }

  const handleChangeRequest = () => {
    if (selectedSchedule) {
      requestScheduleChange(selectedSchedule.id)
      message.success('调班申请已提交，等待审批')
      setChangeModal(false)
    }
  }

  const handleApprove = (s: Schedule, approve: boolean) => {
    approveScheduleChange(s.id, approve)
    message.success(approve ? '已批准调班' : '已驳回调班申请')
  }

  const columns: ColumnsType<Schedule> = [
    {
      title: '日期', dataIndex: 'date', width: 120,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: '班次', dataIndex: 'shift', width: 160,
      render: (v) => SHIFT_LABELS[v]
    },
    {
      title: '警员', dataIndex: 'officerId', width: 140,
      render: (v) => {
        const o = officers.find(x => x.id === v)
        return o ? `${o.name} (${o.badgeNumber})` : '-'
      }
    },
    {
      title: '警衔', dataIndex: 'officerId', width: 100,
      render: (v) => officers.find(x => x.id === v)?.rank || '-'
    },
    {
      title: '巡逻区域', dataIndex: 'areaName', width: 140
    },
    {
      title: '风险等级', dataIndex: 'riskLevel', width: 100,
      render: (v) => <Tag color={riskColor(v)}>{riskLabel(v)}</Tag>
    },
    {
      title: '状态', width: 140,
      render: (_, r) => {
        if (r.changeRequested && r.changeStatus === 'pending') {
          return <Tag color="orange" icon={<WarningOutlined />}>调班审批中</Tag>
        }
        if (r.changeStatus === 'approved') return <Tag color="green">已调班</Tag>
        if (r.changeStatus === 'rejected') return <Tag color="default">调班已驳回</Tag>
        return <Tag color="blue">正常</Tag>
      }
    },
    {
      title: '操作', width: 140, fixed: 'right' as const,
      render: (_, r) => (
        <Tooltip title="申请调班">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openChangeModal(r)}
            disabled={r.changeRequested && r.changeStatus === 'pending'}
          >
            调班
          </Button>
        </Tooltip>
      )
    }
  ]

  const dates = Array.from(new Set(schedules.map(s => s.date))).sort()

  return (
    <div>
      {pendingChanges.length > 0 && (
        <Card
          title={<span>📢 调班审批 ({pendingChanges.length})</span>}
          style={{ marginBottom: 16, borderColor: '#faad14' }}
        >
          <List
            dataSource={pendingChanges}
            renderItem={s => {
              const o = officers.find(x => x.id === s.officerId)
              return (
                <List.Item>
                  <div style={{ flex: 1 }}>
                    <Space>
                      <Badge status="warning" />
                      <strong>{o?.name}</strong>
                      <span style={{ color: '#666' }}>申请调班</span>
                    </Space>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      原排班：{s.date} {SHIFT_LABELS[s.shift]} - {s.areaName}
                      （<Tag color={riskColor(s.riskLevel)}>{riskLabel(s.riskLevel)}</Tag>）
                    </div>
                  </div>
                  <Space>
                    <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(s, true)}>
                      批准
                    </Button>
                    <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleApprove(s, false)}>
                      驳回
                    </Button>
                  </Space>
                </List.Item>
              )
            }}
          />
        </Card>
      )}

      <Card
        title="巡逻排班表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleGenerate}>
              自动生成排班
            </Button>
            <Button type="primary" icon={<CalendarOutlined />}>
              导出排班表
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="选择日期"
            style={{ width: 180 }}
            value={dateFilter}
            onChange={setDateFilter}
            allowClear
          >
            {dates.map(d => (
              <Option key={d} value={d}>
                {d} ({dayjs(d).format('dddd')})
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择区域"
            style={{ width: 160 }}
            allowClear
            value={areaFilter}
            onChange={setAreaFilter}
          >
            {areas.map(a => (
              <Option key={a.id} value={a.id}>
                {a.name} (<Tag color={riskColor(a.riskLevel)} style={{ margin: 0 }}>{riskLabel(a.riskLevel)}</Tag>)
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择班次"
            style={{ width: 200 }}
            allowClear
            value={shiftFilter}
            onChange={setShiftFilter}
          >
            <Option value="morning">{SHIFT_LABELS.morning}</Option>
            <Option value="afternoon">{SHIFT_LABELS.afternoon}</Option>
            <Option value="night">{SHIFT_LABELS.night}</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredSchedules}
          rowKey="id"
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Divider />

      <Card title="辖区风险等级分布">
        <Row gutter={[16, 16]}>
          {areas.map(area => (
            <Col xs={24} sm={12} md={8} key={area.id}>
              <Card
                size="small"
                style={{
                  borderLeft: `4px solid ${area.riskLevel === 'high' ? '#ff4d4f' :
                    area.riskLevel === 'medium' ? '#faad14' : '#52c41a'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{area.name}</span>
                  <Tag color={riskColor(area.riskLevel)}>{riskLabel(area.riskLevel)}</Tag>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                  犯罪率：{Math.round(area.crimeRate * 100)}%
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                  自动分配{riskLabel(area.riskLevel)}巡逻力量，高风险区域增加巡逻频次
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        title="申请调班"
        open={changeModal}
        onCancel={() => setChangeModal(false)}
        onOk={handleChangeRequest}
        okText="提交申请"
      >
        <Form form={changeForm} layout="vertical">
          <Form.Item label="原排班日期" name="date">
            <DatePicker style={{ width: '100%' }} disabled />
          </Form.Item>
          <Form.Item label="原班次" name="shift">
            <Select disabled>
              <Option value="morning">{SHIFT_LABELS.morning}</Option>
              <Option value="afternoon">{SHIFT_LABELS.afternoon}</Option>
              <Option value="night">{SHIFT_LABELS.night}</Option>
            </Select>
          </Form.Item>
          <Form.Item label="原巡逻区域" name="areaId">
            <Select disabled>
              {areas.map(a => (
                <Option key={a.id} value={a.id}>{a.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="调班原因" name="reason" rules={[{ required: true, message: '请输入调班原因' }]}>
            <Select>
              <Option value="personal">个人事务</Option>
              <Option value="swap">与同事换班</Option>
              <Option value="training">培训学习</Option>
              <Option value="other">其他原因</Option>
            </Select>
          </Form.Item>
          <div style={{ color: '#888', fontSize: 12 }}>
            ⚠️ 调班申请需经指挥长审批后方可生效，紧急情况请直接致电指挥中心。
          </div>
        </Form>
      </Modal>
    </div>
  )
}
