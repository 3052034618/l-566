import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, Select, Divider, Descriptions, List,
  Steps, Progress, Empty, message, Table, Timeline, Statistic, Tooltip, Alert
} from 'antd'
import {
  TeamOutlined, FileTextOutlined, DownloadOutlined,
  ClockCircleOutlined, CheckCircleOutlined, WarningOutlined,
  SwapOutlined, EnvironmentOutlined, UserOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ColumnsType } from 'antd/es/table'
import type { Incident, JointDisposalUnit, DisposalNode } from '../types'

const { Option } = Select

export default function JointReview() {
  const incidents = usePoliceStore(s => s.incidents)
  const vehicles = usePoliceStore(s => s.vehicles)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>()

  const jointIncidents = useMemo(() => {
    return incidents.filter(i => i.isJointOperation)
  }, [incidents])

  const selectedIncident = useMemo(() => {
    return incidents.find(i => i.id === selectedIncidentId)
  }, [incidents, selectedIncidentId])

  const primaryUnits = useMemo(() => {
    return selectedIncident?.jointUnits?.filter(u => u.role === 'primary') || []
  }, [selectedIncident])

  const reinforcementUnits = useMemo(() => {
    return selectedIncident?.jointUnits?.filter(u => u.role === 'reinforcement') || []
  }, [selectedIncident])

  const sortedUnitsByArrival = useMemo(() => {
    const units = [...(selectedIncident?.jointUnits || [])]
    return units.sort((a, b) => {
      if (a.role === 'primary') return -1
      if (b.role === 'primary') return 1
      const aTime = a.arrivedAt ? dayjs(a.arrivedAt).unix() : (a.eta || 99999)
      const bTime = b.arrivedAt ? dayjs(b.arrivedAt).unix() : (b.eta || 99999)
      return aTime - bTime
    })
  }, [selectedIncident])

  const nodeDuration = (node: DisposalNode) => {
    if (!node.startedAt) return { minutes: 0, seconds: 0, text: '未开始' }
    const end = node.completedAt ? dayjs(node.completedAt) : dayjs()
    const totalSec = end.diff(dayjs(node.startedAt), 'second')
    const minutes = Math.floor(totalSec / 60)
    const seconds = totalSec % 60
    let text = `${minutes}分${seconds}秒`
    if (node.expectedDurationMin && minutes > node.expectedDurationMin) {
      text += '（超时）'
    }
    return { minutes, seconds, text }
  }

  const unitArrivalInfo = (unit: JointDisposalUnit) => {
    if (unit.arrivedAt) {
      return {
        text: dayjs(unit.arrivedAt).format('HH:mm:ss'),
        delay: unit.eta ? Math.max(0, dayjs(unit.arrivedAt).diff(dayjs(selectedIncident?.dispatchedAt || selectedIncident?.reportedAt), 'minute') - unit.eta) : 0,
        arrived: true
      }
    }
    return { text: `预计 ${unit.eta || '-'} 分钟`, delay: 0, arrived: false }
  }

  const nodeColumns: ColumnsType<DisposalNode> = [
    {
      title: '节点名称', dataIndex: 'name', width: 140,
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v) => {
        const map: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待开始' },
          in_progress: { color: 'processing', text: '进行中' },
          completed: { color: 'success', text: '已完成' }
        }
        return <Tag color={map[v].color}>{map[v].text}</Tag>
      }
    },
    {
      title: '开始时间', dataIndex: 'startedAt', width: 160,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '完成时间', dataIndex: 'completedAt', width: 160,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '预期耗时', dataIndex: 'expectedDurationMin', width: 100,
      render: (v) => v ? `${v} 分钟` : '-'
    },
    {
      title: '实际耗时', width: 140,
      render: (_, r) => {
        const d = nodeDuration(r)
        const isOver = r.expectedDurationMin && d.minutes > r.expectedDurationMin
        return (
          <span style={{ color: isOver ? '#cf1322' : '#52c41a', fontWeight: 500 }}>
            {isOver && <WarningOutlined />} {d.text}
          </span>
        )
      }
    },
    {
      title: '操作人', dataIndex: 'completedBy', width: 120,
      render: (v) => v || '-'
    },
    {
      title: '备注', dataIndex: 'notes',
      ellipsis: true,
      render: (v) => v || '-'
    }
  ]

  const unitColumns: ColumnsType<JointDisposalUnit> = [
    {
      title: '到场顺序', width: 90,
      render: (_, __, idx) => (
        <Tag color={idx === 0 ? 'gold' : idx === 1 ? 'blue' : 'default'}>
          第 {idx + 1} 位
        </Tag>
      )
    },
    {
      title: '单位', dataIndex: 'unitName', width: 140,
      render: (v, r) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{v}</span>
          {r.role === 'primary' && <Tag color="red">主责</Tag>}
          {r.role === 'reinforcement' && <Tag color="blue">增援</Tag>}
        </Space>
      )
    },
    {
      title: '警员', dataIndex: 'officerNames', width: 180,
      render: (v) => (
        <Space size={[4, 4]} wrap>
          {v.map((n: string, i: number) => (
            <Tag key={i} icon={<UserOutlined />}>{n}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '车辆', dataIndex: 'vehiclePlate', width: 130,
      render: (v, r) => {
        const vh = vehicles.find(x => x.id === r.vehicleId)
        const typeText = vh?.type === 'patrol_car' ? '巡逻车' :
          vh?.type === 'swat_vehicle' ? '特警车' :
            vh?.type === 'fire_vehicle' ? '消防车' : '其他'
        return (
          <Space>
            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>
            <Tag>{typeText}</Tag>
          </Space>
        )
      }
    },
    {
      title: '任务', dataIndex: 'task', width: 180, ellipsis: true
    },
    {
      title: '到场时间', width: 180,
      render: (_, r) => {
        const info = unitArrivalInfo(r)
        return (
          <Space direction="vertical" size={2}>
            <span style={{ fontWeight: 500, color: info.arrived ? '#52c41a' : '#faad14' }}>
              {info.arrived ? <CheckCircleOutlined /> : <ClockCircleOutlined />} {info.text}
            </span>
            {info.delay > 0 && (
              <Tag color="red">延误 {info.delay} 分钟</Tag>
            )}
          </Space>
        )
      }
    }
  ]

  const handleExportReport = () => {
    if (!selectedIncident) {
      message.warning('请先选择一个联合处置警情')
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('联合协同处置报告', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`报告编号: JR-${selectedIncident.id}-${dayjs().format('YYYYMMDDHHmmss')}`, 14, 32)
    doc.text(`生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 40)

    autoTable(doc, {
      startY: 48,
      head: [['项目', '内容']],
      body: [
        ['案件编号', selectedIncident.id],
        ['案发地点', selectedIncident.location],
        ['案件类型', selectedIncident.type === 'criminal' ? '刑事案件' :
          selectedIncident.type === 'public_order' ? '治安事件' : '群众求助'],
        ['优先级', `P${selectedIncident.priority}`],
        ['接警时间', dayjs(selectedIncident.reportedAt).format('YYYY-MM-DD HH:mm:ss')],
        ['派警时间', selectedIncident.dispatchedAt ? dayjs(selectedIncident.dispatchedAt).format('YYYY-MM-DD HH:mm:ss') : '-'],
        ['到场时间', selectedIncident.arrivedAt ? dayjs(selectedIncident.arrivedAt).format('YYYY-MM-DD HH:mm:ss') : '-'],
        ['当前状态', selectedIncident.status === 'closed' ? '已结案' : '处置中'],
        ['主责单位数', `${primaryUnits.length} 个`],
        ['增援单位数', `${reinforcementUnits.length} 个`]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 119, 255] }
    })

    autoTable(doc, {
      head: [['到场顺序', '单位名称', '角色', '警员', '车辆', '到场时间', '延误情况']],
      body: sortedUnitsByArrival.map((u, idx) => {
        const info = unitArrivalInfo(u)
        return [
          `第 ${idx + 1} 位`,
          u.unitName,
          u.role === 'primary' ? '主责' : '增援',
          u.officerNames.join('、'),
          u.vehiclePlate,
          info.text,
          info.delay > 0 ? `延误 ${info.delay} 分钟` : '准时'
        ]
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [82, 196, 26] }
    })

    autoTable(doc, {
      head: [['节点名称', '状态', '开始时间', '完成时间', '预期', '实际耗时', '超时情况']],
      body: (selectedIncident.disposalNodes || []).map(n => {
        const d = nodeDuration(n)
        const status = n.status === 'pending' ? '待开始' :
          n.status === 'in_progress' ? '进行中' : '已完成'
        const isOver = n.expectedDurationMin && d.minutes > n.expectedDurationMin
        return [
          n.name,
          status,
          n.startedAt ? dayjs(n.startedAt).format('HH:mm:ss') : '-',
          n.completedAt ? dayjs(n.completedAt).format('HH:mm:ss') : '-',
          n.expectedDurationMin ? `${n.expectedDurationMin} 分钟` : '-',
          d.text,
          isOver ? '超时' : '正常'
        ]
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [250, 173, 20] }
    })

    if (selectedIncident.onSiteDivisionHistory && selectedIncident.onSiteDivisionHistory.length > 0) {
      autoTable(doc, {
        head: [['变更时间', '操作人', '变更前', '变更后']],
        body: selectedIncident.onSiteDivisionHistory.map(h => [
          dayjs(h.changedAt).format('HH:mm:ss'),
          h.changedBy,
          h.beforeContent.length > 50 ? h.beforeContent.slice(0, 50) + '...' : h.beforeContent,
          h.afterContent.length > 50 ? h.afterContent.slice(0, 50) + '...' : h.afterContent
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [114, 46, 209] }
      })
    }

    doc.save(`协同处置报告_${selectedIncident.id}_${dayjs().format('YYYYMMDDHHmmss')}.pdf`)
    message.success('协同处置报告导出成功')
  }

  return (
    <div>
      <Card
        title={<Space><TeamOutlined style={{ color: '#1677ff', fontSize: 18 }} /><span>联合协同处置复盘</span></Space>}
        extra={
          <Space>
            <Select
              style={{ width: 420 }}
              placeholder="选择一个联合处置警情进行复盘"
              value={selectedIncidentId}
              onChange={setSelectedIncidentId}
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {jointIncidents.map(i => (
                <Option
                  key={i.id}
                  value={i.id}
                  label={`${i.id} - ${i.location}`}
                >
                  <Space>
                    <Tag color="red">P{i.priority}</Tag>
                    <span style={{ fontWeight: 500 }}>{i.location}</span>
                    <span style={{ color: '#999', fontSize: 12 }}>
                      {dayjs(i.reportedAt).format('MM-DD HH:mm')}
                    </span>
                    <Tag color={i.status === 'closed' ? 'default' : 'green'}>
                      {i.status === 'closed' ? '已结案' : '处置中'}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
              disabled={!selectedIncident}
            >
              导出协同处置报告
            </Button>
          </Space>
        }
      >
        {jointIncidents.length === 0 ? (
          <Empty description="暂无联合处置警情，请先在警情详情中升级为联合处置模式" />
        ) : !selectedIncident ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请从上方下拉框选择一个联合处置警情查看复盘详情"
          />
        ) : (
          <>
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="案发地点">
                <Space><EnvironmentOutlined />{selectedIncident.location}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="案件类型">
                {selectedIncident.type === 'criminal' ? '刑事案件' :
                  selectedIncident.type === 'public_order' ? '治安事件' : '群众求助'}
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color="red">P{selectedIncident.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="接警时间">
                {dayjs(selectedIncident.reportedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="派警时间">
                {selectedIncident.dispatchedAt
                  ? dayjs(selectedIncident.dispatchedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="到场时间">
                {selectedIncident.arrivedAt
                  ? dayjs(selectedIncident.arrivedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="主责单位"
                    value={primaryUnits.length}
                    suffix="个"
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="增援单位"
                    value={reinforcementUnits.length}
                    suffix="个"
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="处置节点"
                    value={(selectedIncident.disposalNodes || []).filter(n => n.status === 'completed').length}
                    suffix={` / ${selectedIncident.disposalNodes?.length || 0}`}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="分工变更"
                    value={selectedIncident.onSiteDivisionHistory?.length || 0}
                    suffix="次"
                    prefix={<SwapOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              size="small"
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#faad14' }} />
                  <span>处置节点耗时分析</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Steps
                direction="vertical"
                size="small"
                current={(selectedIncident.disposalNodes || []).findIndex(n => n.status !== 'completed')}
                items={(selectedIncident.disposalNodes || []).map(n => {
                  const d = nodeDuration(n)
                  const isOver = n.expectedDurationMin && d.minutes > n.expectedDurationMin
                  return {
                    title: (
                      <Space>
                        <span style={{ fontWeight: 500 }}>{n.name}</span>
                        {isOver && <Tag color="red">超时</Tag>}
                      </Space>
                    ),
                    status: n.status === 'completed' ? 'finish' :
                      n.status === 'in_progress' ? 'process' : 'wait',
                    description: (
                      <Space direction="vertical" size={2} style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: '#666' }}>
                          预期: {n.expectedDurationMin || '-'} 分钟 · 实际: {d.text}
                        </span>
                        {n.completedBy && (
                          <span style={{ fontSize: 12, color: '#888' }}>操作人: {n.completedBy}</span>
                        )}
                        {n.notes && (
                          <span style={{ fontSize: 12, color: '#999' }}>备注: {n.notes}</span>
                        )}
                      </Space>
                    )
                  }
                })}
              />
              <Divider />
              <Table
                size="small"
                columns={nodeColumns}
                dataSource={selectedIncident.disposalNodes || []}
                rowKey="id"
                pagination={false}
              />
            </Card>

            <Card
              size="small"
              title={
                <Space>
                  <TeamOutlined style={{ color: '#1677ff' }} />
                  <span>力量到场时序</span>
                  <Tag color="blue">{sortedUnitsByArrival.length} 组力量</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Table
                size="small"
                columns={unitColumns}
                dataSource={sortedUnitsByArrival}
                rowKey="id"
                pagination={false}
              />
              <Divider orientation="left">力量到场合计</Divider>
              <Timeline
                items={sortedUnitsByArrival.map((u, idx) => {
                  const info = unitArrivalInfo(u)
                  return {
                    color: u.role === 'primary' ? 'red' : 'blue',
                    dot: idx === 0 ? <CheckCircleOutlined /> : undefined,
                    children: (
                      <div>
                        <Space>
                          <strong>{u.unitName}</strong>
                          {u.role === 'primary' && <Tag color="red">主责</Tag>}
                          {u.role === 'reinforcement' && <Tag color="blue">增援</Tag>}
                          {info.delay > 0 && <Tag color="red">延误 {info.delay} 分钟</Tag>}
                        </Space>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          <Space size={16}>
                            <span>👮 {u.officerNames.join('、')}</span>
                            <span>🚓 {u.vehiclePlate}</span>
                            <span>⏰ {info.text}</span>
                          </Space>
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                          任务：{u.task}
                        </div>
                      </div>
                    )
                  }
                })}
              />
            </Card>

            <Card
              size="small"
              title={
                <Space>
                  <SwapOutlined style={{ color: '#722ed1' }} />
                  <span>现场分工变更记录</span>
                </Space>
              }
            >
              {!selectedIncident.onSiteDivisionHistory || selectedIncident.onSiteDivisionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                  暂无现场分工变更记录
                </div>
              ) : (
                <>
                  <Alert
                    style={{ marginBottom: 12 }}
                    message="当前分工"
                    description={selectedIncident.onSiteDivision || '(无)'}
                    type="info"
                    showIcon
                  />
                  <Timeline
                    items={[...selectedIncident.onSiteDivisionHistory].reverse().map(h => ({
                      color: 'purple',
                      children: (
                        <div>
                          <Space>
                            <span style={{ fontWeight: 500 }}>{h.changedBy}</span>
                            <span style={{ fontSize: 12, color: '#666' }}>
                              {dayjs(h.changedAt).format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                          </Space>
                          <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                            <Col xs={24} md={12}>
                              <div style={{
                                padding: 8, background: '#fff2e8', borderRadius: 4,
                                borderLeft: '3px solid #faad14'
                              }}>
                                <div style={{ fontSize: 11, color: '#faad14', marginBottom: 4 }}>变更前</div>
                                <div style={{ fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
                                  {h.beforeContent}
                                </div>
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div style={{
                                padding: 8, background: '#f6ffed', borderRadius: 4,
                                borderLeft: '3px solid #52c41a'
                              }}>
                                <div style={{ fontSize: 11, color: '#52c41a', marginBottom: 4 }}>变更后</div>
                                <div style={{ fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
                                  {h.afterContent}
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </div>
                      )
                    }))}
                  />
                </>
              )}
            </Card>
          </>
        )}
      </Card>
    </div>
  )
}
