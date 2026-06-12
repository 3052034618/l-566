import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, Table, Modal, Form, Select, DatePicker,
  message, List, Badge, Tooltip, Divider, Tabs, Statistic
} from 'antd'
import {
  CalendarOutlined, ReloadOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  WarningOutlined, TeamOutlined, ExclamationCircleOutlined, SafetyOutlined
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
  const [coverageDate, setCoverageDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [activeTab, setActiveTab] = useState('schedule')

  const coverageData = useMemo(() => {
    const daySchedules = schedules.filter(s => s.date === coverageDate && s.changeStatus !== 'rejected')
    const result: Record<string, Record<string, number>> = {}
    areas.forEach(area => {
      result[area.id] = { morning: 0, afternoon: 0, night: 0 }
    })
    daySchedules.forEach(s => {
      if (result[s.areaId]) {
        result[s.areaId][s.shift]++
      }
    })
    return result
  }, [schedules, coverageDate, areas])

  const highRiskAreas = useMemo(() => areas.filter(a => a.riskLevel === 'high'), [areas])

  const coverageStats = useMemo(() => {
    let totalShifts = 0
    let filledShifts = 0
    let vacantShifts = 0
    let highRiskVacant = 0

    areas.forEach(area => {
      ;(['morning', 'afternoon', 'night'] as const).forEach(shift => {
        totalShifts++
        const count = coverageData[area.id]?.[shift] || 0
        if (count > 0) {
          filledShifts++
        } else {
          vacantShifts++
          if (area.riskLevel === 'high') {
            highRiskVacant++
          }
        }
      })
    })

    return { totalShifts, filledShifts, vacantShifts, highRiskVacant }
  }, [coverageData, areas])

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
      date: dayjs(s.date),
      shift: s.shift,
      areaId: s.areaId,
      targetDate: null,
      targetShift: null,
      targetAreaId: null,
      reason: null
    })
    setChangeModal(true)
  }

  const handleChangeRequest = async () => {
    try {
      const values = await changeForm.validateFields()
      if (selectedSchedule) {
        const targetArea = areas.find(a => a.id === values.targetAreaId)
        requestScheduleChange(selectedSchedule.id, {
          date: values.targetDate.format('YYYY-MM-DD'),
          shift: values.targetShift,
          areaId: values.targetAreaId,
          areaName: targetArea?.name || '',
          reason: values.reason
        })
        message.success('调班申请已提交，等待审批')
        setChangeModal(false)
      }
    } catch (e) {
      console.error(e)
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
                      {s.changeReason && (
                        <Tag color="blue">原因：{
                          s.changeReason === 'personal' ? '个人事务' :
                          s.changeReason === 'swap' ? '与同事换班' :
                          s.changeReason === 'training' ? '培训学习' : '其他原因'
                        }</Tag>
                      )}
                    </Space>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      <span style={{ color: '#faad14' }}>原排班：</span>
                      {s.originalSchedule?.date || s.date} {SHIFT_LABELS[s.originalSchedule?.shift as keyof typeof SHIFT_LABELS] || SHIFT_LABELS[s.shift]} - {s.originalSchedule?.areaName || s.areaName}
                    </div>
                    {s.changeTargetDate && s.changeTargetShift && s.changeTargetAreaName && (
                      <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                        <span style={{ color: '#52c41a' }}>目标排班：</span>
                        {s.changeTargetDate} {SHIFT_LABELS[s.changeTargetShift]} - {s.changeTargetAreaName}
                      </div>
                    )}
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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'schedule',
            label: <span><CalendarOutlined /> 巡逻排班表</span>,
            children: (
              <Card
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
            )
          },
          {
            key: 'coverage',
            label: <span><TeamOutlined /> 警力覆盖视图</span>,
            children: (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="总班次"
                        value={coverageStats.totalShifts}
                        prefix={<TeamOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="已覆盖班次"
                        value={coverageStats.filledShifts}
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<SafetyOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="空缺班次"
                        value={coverageStats.vacantShifts}
                        valueStyle={{ color: '#faad14' }}
                        prefix={<ExclamationCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card>
                      <Statistic
                        title="高风险空缺"
                        value={coverageStats.highRiskVacant}
                        valueStyle={{ color: '#ff4d4f' }}
                        prefix={<WarningOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card
                  title="辖区警力覆盖详情"
                  extra={
                    <Select
                      style={{ width: 180 }}
                      value={coverageDate}
                      onChange={setCoverageDate}
                    >
                      {dates.map(d => (
                        <Option key={d} value={d}>
                          {d} ({dayjs(d).format('dddd')})
                        </Option>
                      ))}
                    </Select>
                  }
                >
                  <Row gutter={[16, 16]}>
                    {areas.map(area => {
                      const data = coverageData[area.id] || { morning: 0, afternoon: 0, night: 0 }
                      const hasVacant = data.morning === 0 || data.afternoon === 0 || data.night === 0
                      const isHighRisk = area.riskLevel === 'high'
                      return (
                        <Col xs={24} sm={12} md={8} lg={6} key={area.id}>
                          <Card
                            size="small"
                            style={{
                              borderLeft: `4px solid ${isHighRisk ? '#ff4d4f' :
                                area.riskLevel === 'medium' ? '#faad14' : '#52c41a'}`
                            }}
                          >
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600 }}>{area.name}</span>
                              <Space size={4}>
                                {isHighRisk && <Badge status="error" text="高风险" />}
                                {hasVacant && <Badge status="warning" text="有空缺" />}
                              </Space>
                            </Space>
                            <Divider style={{ margin: '8px 0' }} />
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#666' }}>早班</span>
                                <span style={{
                                  fontWeight: 500,
                                  color: data.morning > 0 ? '#52c41a' : '#ff4d4f'
                                }}>
                                  {data.morning} 人 {data.morning === 0 && '⚠ 空缺'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#666' }}>中班</span>
                                <span style={{
                                  fontWeight: 500,
                                  color: data.afternoon > 0 ? '#52c41a' : '#ff4d4f'
                                }}>
                                  {data.afternoon} 人 {data.afternoon === 0 && '⚠ 空缺'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: '#666' }}>晚班</span>
                                <span style={{
                                  fontWeight: 500,
                                  color: data.night > 0 ? '#52c41a' : '#ff4d4f'
                                }}>
                                  {data.night} 人 {data.night === 0 && '⚠ 空缺'}
                                </span>
                              </div>
                            </Space>
                            <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                              犯罪率：{Math.round(area.crimeRate * 100)}%
                            </div>
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                </Card>

                <Divider />

                <Card title="高风险辖区重点监控">
                  <Row gutter={[16, 16]}>
                    {highRiskAreas.map(area => {
                      const data = coverageData[area.id] || { morning: 0, afternoon: 0, night: 0 }
                      const allCovered = data.morning > 0 && data.afternoon > 0 && data.night > 0
                      return (
                        <Col xs={24} sm={12} key={area.id}>
                          <Card
                            size="small"
                            style={{ borderColor: '#ff4d4f', background: '#fff1f0' }}
                          >
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Space>
                                <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                                <span style={{ fontWeight: 600, color: '#cf1322' }}>{area.name}</span>
                              </Space>
                              <Tag color={allCovered ? 'green' : 'red'}>
                                {allCovered ? '全覆盖' : '有缺口'}
                              </Tag>
                            </Space>
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                              <Space>
                                <span>早班: {data.morning}人</span>
                                <span>中班: {data.afternoon}人</span>
                                <span>晚班: {data.night}人</span>
                              </Space>
                            </div>
                            {!allCovered && (
                              <div style={{ marginTop: 6, fontSize: 12, color: '#cf1322' }}>
                                ⚠ 请及时补充高风险区域警力
                              </div>
                            )}
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                </Card>
              </>
            )
          }
        ]}
      />

      <Modal
        title="申请调班"
        open={changeModal}
        onCancel={() => setChangeModal(false)}
        onOk={handleChangeRequest}
        okText="提交申请"
        width={600}
      >
        <Form form={changeForm} layout="vertical">
          <Divider orientation="left" style={{ margin: '8px 0', fontSize: 13 }}>
            <span style={{ color: '#faad14' }}>原排班信息</span>
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="原排班日期" name="date">
                <DatePicker style={{ width: '100%' }} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="原班次" name="shift">
                <Select disabled>
                  <Option value="morning">{SHIFT_LABELS.morning}</Option>
                  <Option value="afternoon">{SHIFT_LABELS.afternoon}</Option>
                  <Option value="night">{SHIFT_LABELS.night}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="原巡逻区域" name="areaId">
                <Select disabled>
                  {areas.map(a => (
                    <Option key={a.id} value={a.id}>{a.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0', fontSize: 13 }}>
            <span style={{ color: '#52c41a' }}>目标排班信息（请选择）</span>
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="目标日期"
                name="targetDate"
                rules={[{ required: true, message: '请选择目标日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="目标班次"
                name="targetShift"
                rules={[{ required: true, message: '请选择目标班次' }]}
              >
                <Select placeholder="选择班次">
                  <Option value="morning">{SHIFT_LABELS.morning}</Option>
                  <Option value="afternoon">{SHIFT_LABELS.afternoon}</Option>
                  <Option value="night">{SHIFT_LABELS.night}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="目标辖区"
                name="targetAreaId"
                rules={[{ required: true, message: '请选择目标辖区' }]}
              >
                <Select placeholder="选择辖区">
                  {areas.map(a => (
                    <Option key={a.id} value={a.id}>
                      {a.name} (<Tag color={riskColor(a.riskLevel)} style={{ margin: 0 }}>{riskLabel(a.riskLevel)}</Tag>)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="调班原因" name="reason" rules={[{ required: true, message: '请选择调班原因' }]}>
            <Select placeholder="选择原因">
              <Option value="personal">个人事务</Option>
              <Option value="swap">与同事换班</Option>
              <Option value="training">培训学习</Option>
              <Option value="other">其他原因</Option>
            </Select>
          </Form.Item>
          <div style={{ color: '#888', fontSize: 12 }}>
            ⚠️ 调班申请需经指挥长审批后方可生效，批准后排班表将直接更新为目标安排，紧急情况请直接致电指挥中心。
          </div>
        </Form>
      </Modal>
    </div>
  )
}
