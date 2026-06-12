import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Tag, Space, Button, Select, Divider, Descriptions, List,
  Steps, Progress, Empty, message, Table, Timeline, Statistic, Tooltip, Alert,
  Tabs, Badge
} from 'antd'
import {
  TeamOutlined, FileTextOutlined, DownloadOutlined,
  ClockCircleOutlined, CheckCircleOutlined, WarningOutlined,
  SwapOutlined, EnvironmentOutlined, UserOutlined,
  SendOutlined, MessageOutlined, CarOutlined, VideoCameraOutlined,
  RadarChartOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { usePoliceStore } from '../store/policeStore'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ColumnsType } from 'antd/es/table'
import type {
  Incident, JointDisposalUnit, DisposalNode,
  CollaborationCommand, CommandFeedback, UnitCategory
} from '../types'

const { Option } = Select

const getUnitCategoryLabel = (c: string) => {
  const map: Record<string, string> = {
    patrol: '巡警', swat: '特警', traffic: '交警', tech: '技侦',
    fire: '消防', medical: '医疗', other: '其他'
  }
  return map[c] || c
}

const getUnitCategoryColor = (c: string) => {
  const map: Record<string, string> = {
    patrol: 'blue', swat: 'red', traffic: 'orange', tech: 'purple',
    fire: 'volcano', medical: 'green', other: 'default'
  }
  return map[c] || 'default'
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

export default function JointReview() {
  const incidents = usePoliceStore(s => s.incidents)
  const vehicles = usePoliceStore(s => s.vehicles)
  const cameras = usePoliceStore(s => s.cameras)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>()
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>()

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
      const aTime = a.confirmedArrivedAt ? dayjs(a.confirmedArrivedAt).unix() :
                   a.arrivedAt ? dayjs(a.arrivedAt).unix() :
                   (a.eta || 99999)
      const bTime = b.confirmedArrivedAt ? dayjs(b.confirmedArrivedAt).unix() :
                   b.arrivedAt ? dayjs(b.arrivedAt).unix() :
                   (b.eta || 99999)
      return aTime - bTime
    })
  }, [selectedIncident])

  const selectedUnit = useMemo(() => {
    return selectedIncident?.jointUnits?.find(u => u.id === selectedUnitId)
  }, [selectedIncident, selectedUnitId])

  const nearbyCameras = useMemo(() => {
    if (!selectedIncident) return []
    return cameras.filter(c => {
      const dist = Math.abs(c.coordinates[0] - selectedIncident.coordinates[0]) +
                   Math.abs(c.coordinates[1] - selectedIncident.coordinates[1])
      return dist < 0.05
    })
  }, [selectedIncident, cameras])

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
    const actualTime = unit.confirmedArrivedAt || unit.arrivedAt
    if (actualTime) {
      return {
        text: dayjs(actualTime).format('HH:mm:ss'),
        confirmedBy: unit.confirmedArrivedBy,
        delay: unit.eta ? Math.max(0, dayjs(actualTime).diff(dayjs(selectedIncident?.dispatchedAt || selectedIncident?.reportedAt), 'minute') - unit.eta) : 0,
        arrived: true
      }
    }
    return { text: `预计 ${unit.eta || '-'} 分钟`, confirmedBy: undefined, delay: 0, arrived: false }
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
      title: '单位类别', width: 100,
      render: (_, r) => (
        <Tag color={getUnitCategoryColor(r.unitCategory || 'other')}>
          {getUnitCategoryLabel(r.unitCategory || 'other')}
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
          {v.length > 0 ? v.map((n: string, i: number) => (
            <Tag key={i} icon={<UserOutlined />}>{n}</Tag>
          )) : <span style={{ color: '#999' }}>待指派</span>}
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
      title: '到场时间', width: 200,
      render: (_, r) => {
        const info = unitArrivalInfo(r)
        return (
          <Space direction="vertical" size={2}>
            <span style={{ fontWeight: 500, color: info.arrived ? '#52c41a' : '#faad14' }}>
              {info.arrived ? <CheckCircleOutlined /> : <ClockCircleOutlined />} {info.text}
            </span>
            {info.confirmedBy && (
              <span style={{ fontSize: 12, color: '#999' }}>
                {info.confirmedBy} 确认
              </span>
            )}
            {info.delay > 0 && (
              <Tag color="red">延误 {info.delay} 分钟</Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: '最近反馈', width: 200, ellipsis: true,
      render: (_, r) => {
        if (!r.lastFeedback) return <span style={{ color: '#999' }}>暂无</span>
        return (
          <Tooltip title={r.lastFeedback}>
            <div>
              <span>{r.lastFeedback}</span>
              {r.lastFeedbackAt && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {dayjs(r.lastFeedbackAt).format('HH:mm:ss')}
                </div>
              )}
            </div>
          </Tooltip>
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
    let yPos = 20

    doc.setFontSize(18)
    doc.text('联合协同处置报告', 105, yPos, { align: 'center' })
    yPos += 12
    doc.setFontSize(12)
    doc.text(`报告编号: JR-${selectedIncident.id}-${dayjs().format('YYYYMMDDHHmmss')}`, 14, yPos)
    yPos += 8
    doc.text(`生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, yPos)
    yPos += 8

    autoTable(doc, {
      startY: yPos,
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
        ['增援单位数', `${reinforcementUnits.length} 个`],
        ['指令总数', `${selectedIncident.commands?.length || 0} 条`],
        ['分工变更次数', `${selectedIncident.onSiteDivisionHistory?.length || 0} 次`]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 119, 255] }
    })

    doc.setFontSize(14)
    doc.text('一、力量到场时序表', 14, (doc as any).lastAutoTable.finalY + 15)

    autoTable(doc, {
      head: [['到场顺序', '单位类别', '单位名称', '角色', '警员', '车辆', '到场时间', '确认人', '延误情况']],
      body: sortedUnitsByArrival.map((u, idx) => {
        const info = unitArrivalInfo(u)
        return [
          `第 ${idx + 1} 位`,
          getUnitCategoryLabel(u.unitCategory || 'other'),
          u.unitName,
          u.role === 'primary' ? '主责' : '增援',
          u.officerNames.length > 0 ? u.officerNames.join('、') : '待指派',
          u.vehiclePlate,
          info.text,
          info.confirmedBy || '-',
          info.delay > 0 ? `延误 ${info.delay} 分钟` : '准时'
        ]
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [82, 196, 26] }
    })

    doc.setFontSize(14)
    doc.text('二、处置节点耗时表', 14, (doc as any).lastAutoTable.finalY + 15)

    autoTable(doc, {
      head: [['节点名称', '状态', '开始时间', '完成时间', '预期耗时', '实际耗时', '超时情况']],
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

    doc.setFontSize(14)
    doc.text('三、协作指令流明细表', 14, (doc as any).lastAutoTable.finalY + 15)

    const commandRows: any[][] = []
    ;(selectedIncident.commands || []).forEach((cmd, cIdx) => {
      commandRows.push([
        `指令 ${cIdx + 1}`,
        getUnitCategoryLabel(cmd.unitCategory),
        cmd.unitName,
        cmd.priority === 'critical' ? '特急' : cmd.priority === 'urgent' ? '紧急' : '普通',
        getCommandStatusLabel(cmd.status),
        cmd.content,
        cmd.issuedBy,
        dayjs(cmd.issuedAt).format('HH:mm:ss'),
        cmd.deadline ? dayjs(cmd.deadline).format('HH:mm') : '-'
      ])
      if (cmd.feedbacks.length > 0) {
        cmd.feedbacks.forEach((fb: CommandFeedback, fIdx: number) => {
          commandRows.push([
            `  ↳ 反馈 ${fIdx + 1}`,
            '', '', '',
            getCommandStatusLabel(fb.status),
            fb.content,
            fb.providedBy,
            dayjs(fb.providedAt).format('HH:mm:ss'),
            ''
          ])
        })
      }
    })

    autoTable(doc, {
      head: [['序号', '单位类别', '接收单位', '优先级', '状态', '内容', '操作人', '时间', '截止时间']],
      body: commandRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 144, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    })

    if (selectedIncident.onSiteDivisionHistory && selectedIncident.onSiteDivisionHistory.length > 0) {
      doc.setFontSize(14)
      doc.text('四、现场分工变更记录', 14, (doc as any).lastAutoTable.finalY + 15)

      autoTable(doc, {
        head: [['序号', '变更时间', '操作人', '变更前分工', '变更后分工']],
        body: selectedIncident.onSiteDivisionHistory.map((h, idx) => [
          `第 ${idx + 1} 次`,
          dayjs(h.changedAt).format('YYYY-MM-DD HH:mm:ss'),
          h.changedBy,
          h.beforeContent.length > 40 ? h.beforeContent.slice(0, 40) + '...' : h.beforeContent,
          h.afterContent.length > 40 ? h.afterContent.slice(0, 40) + '...' : h.afterContent
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [114, 46, 209] }
      })
    }

    if (selectedIncident.onSiteDivision) {
      doc.setFontSize(14)
      doc.text('五、最终现场分工', 14, (doc as any).lastAutoTable.finalY + 15)

      autoTable(doc, {
        head: [['现场分工内容']],
        body: [[selectedIncident.onSiteDivision]],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [19, 194, 194] }
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
                  <RadarChartOutlined style={{ color: '#13c2c2' }} />
                  <span>资源调度沙盘</span>
                  <Badge count={sortedUnitsByArrival.length} showZero style={{ marginLeft: 8 }} />
                </Space>
              }
              extra={
                <Space size="small">
                  <Tag icon={<CarOutlined />} color="blue">车辆 {sortedUnitsByArrival.length}</Tag>
                  <Tag icon={<VideoCameraOutlined />} color="purple">摄像头 {nearbyCameras.length}</Tag>
                  <Tag icon={<TeamOutlined />} color="green">
                    警员 {sortedUnitsByArrival.reduce((sum, u) => sum + u.officerIds.length, 0)}
                  </Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={16}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                    border: '1px solid #91d5ff',
                    borderRadius: 4,
                    padding: 16,
                    minHeight: 400,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#cf1322',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold',
                      boxShadow: '0 0 20px rgba(207, 19, 34, 0.4)',
                      zIndex: 10,
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}>
                      <div>
                        <EnvironmentOutlined style={{ fontSize: 20 }} />
                        <div style={{ fontSize: 10, marginTop: 2 }}>事发现场</div>
                      </div>
                    </div>

                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 200,
                      height: 200,
                      borderRadius: '50%',
                      border: '2px dashed rgba(207, 19, 34, 0.3)',
                      animation: 'pulse 2s infinite'
                    }} />

                    {sortedUnitsByArrival.map((unit, idx) => {
                      const angle = (idx * 360 / sortedUnitsByArrival.length) * (Math.PI / 180)
                      const radius = 130
                      const x = 50 + Math.cos(angle) * radius / 4
                      const y = 50 + Math.sin(angle) * radius / 4
                      const isSelected = selectedUnitId === unit.id
                      const info = unitArrivalInfo(unit)

                      return (
                        <div
                          key={unit.id}
                          onClick={() => setSelectedUnitId(isSelected ? undefined : unit.id)}
                          style={{
                            position: 'absolute',
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: 'pointer',
                            zIndex: isSelected ? 20 : 5
                          }}
                        >
                          <div style={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            background: info.arrived
                              ? (unit.role === 'primary' ? '#fff1f0' : '#f6ffed')
                              : '#fff7e6',
                            border: `3px solid ${isSelected ? '#1890ff' :
                              info.arrived
                                ? (unit.role === 'primary' ? '#cf1322' : '#52c41a')
                                : '#faad14'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isSelected ? '0 4px 12px rgba(24, 144, 255, 0.4)' : '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'all 0.3s'
                          }}>
                            <span style={{ fontSize: 20 }}>
                              {unit.role === 'primary' ? '🚨' :
                               unit.unitCategory === 'swat' ? '🚓' :
                               unit.unitCategory === 'traffic' ? '🚦' :
                               unit.unitCategory === 'tech' ? '📡' :
                               unit.unitCategory === 'medical' ? '🚑' :
                               unit.unitCategory === 'fire' ? '🚒' : '🚔'}
                            </span>
                          </div>
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: 4,
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            fontWeight: 500,
                            color: info.arrived ? '#52c41a' : '#faad14',
                            background: '#fff',
                            padding: '2px 8px',
                            borderRadius: 10,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                          }}>
                            {unit.unitName}
                          </div>
                        </div>
                      )
                    })}

                    {nearbyCameras.map((cam, idx) => {
                      const angle = ((idx + 0.5) * 360 / Math.max(nearbyCameras.length, 1) + 45) * (Math.PI / 180)
                      const radius = 180
                      const x = 50 + Math.cos(angle) * radius / 4
                      const y = 50 + Math.sin(angle) * radius / 4
                      return (
                        <div
                          key={cam.id}
                          style={{
                            position: 'absolute',
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 3
                          }}
                        >
                          <Tooltip title={`${cam.name} - ${cam.location}`}>
                            <div style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: cam.hasAlert ? '#fff1f0' : '#f0f5ff',
                              border: `2px solid ${cam.hasAlert ? '#cf1322' : '#1890ff'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14
                            }}>
                              📹
                            </div>
                          </Tooltip>
                        </div>
                      )
                    })}
                  </div>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    size="small"
                    title={
                      <Space>
                        <InfoCircleOutlined />
                        <span>{selectedUnit ? selectedUnit.unitName : '点击左侧查看详情'}</span>
                      </Space>
                    }
                    style={{ height: '100%' }}
                  >
                    {selectedUnit ? (
                      <div>
                        <Space style={{ marginBottom: 12 }}>
                          <Tag color={getUnitCategoryColor(selectedUnit.unitCategory || 'other')}>
                            {getUnitCategoryLabel(selectedUnit.unitCategory || 'other')}
                          </Tag>
                          <Tag color={selectedUnit.role === 'primary' ? 'red' : 'blue'}>
                            {selectedUnit.role === 'primary' ? '主责单位' : '增援单位'}
                          </Tag>
                          <Tag color={
                            selectedUnit.status === 'arrived' ? 'green' :
                            selectedUnit.status === 'handling' ? 'blue' :
                            selectedUnit.status === 'completed' ? 'default' : 'orange'
                          }>
                            {selectedUnit.status === 'en_route' ? '赶赴中' :
                             selectedUnit.status === 'arrived' ? '已到场' :
                             selectedUnit.status === 'handling' ? '处置中' : '已完成'}
                          </Tag>
                        </Space>

                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="警员">
                            {selectedUnit.officerNames.length > 0
                              ? selectedUnit.officerNames.join('、')
                              : '待指派'}
                          </Descriptions.Item>
                          <Descriptions.Item label="车辆">
                            {selectedUnit.vehiclePlate}
                          </Descriptions.Item>
                          <Descriptions.Item label="任务">
                            {selectedUnit.task}
                          </Descriptions.Item>
                          <Descriptions.Item label="到场状态">
                            {(() => {
                              const info = unitArrivalInfo(selectedUnit)
                              return (
                                <Space direction="vertical" size={2}>
                                  <span style={{
                                    fontWeight: 500,
                                    color: info.arrived ? '#52c41a' : '#faad14'
                                  }}>
                                    {info.arrived ? <CheckCircleOutlined /> : <ClockCircleOutlined />} {info.text}
                                  </span>
                                  {info.confirmedBy && (
                                    <span style={{ fontSize: 12, color: '#999' }}>
                                      {info.confirmedBy} 确认
                                    </span>
                                  )}
                                  {info.delay > 0 && (
                                    <Tag color="red">延误 {info.delay} 分钟</Tag>
                                  )}
                                </Space>
                              )
                            })()}
                          </Descriptions.Item>
                        </Descriptions>

                        {selectedUnit.lastFeedback && (
                          <div style={{
                            marginTop: 12, padding: 12, background: '#f6ffed',
                            borderRadius: 4, borderLeft: '3px solid #52c41a'
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#52c41a', marginBottom: 4 }}>
                              最近反馈
                              {selectedUnit.lastFeedbackAt && (
                                <span style={{ color: '#999', marginLeft: 8 }}>
                                  {dayjs(selectedUnit.lastFeedbackAt).format('HH:mm:ss')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12 }}>{selectedUnit.lastFeedback}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Empty
                        description="点击左侧单位图标查看详细信息"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>

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
                  <SendOutlined style={{ color: '#1890ff' }} />
                  <span>协作指令流</span>
                  <Tag color="blue">{selectedIncident.commands?.length || 0} 条</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              {(selectedIncident.commands && selectedIncident.commands.length > 0) ? (
                <Timeline
                  mode="left"
                  items={[...selectedIncident.commands].reverse().map(cmd => ({
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
                            <Tag color={cmd.priority === 'critical' ? 'red' : cmd.priority === 'urgent' ? 'orange' : 'default'}>
                              {cmd.priority === 'critical' ? '特急' : cmd.priority === 'urgent' ? '紧急' : '普通'}
                            </Tag>
                            <Tag color={getUnitCategoryColor(cmd.unitCategory)}>
                              {getUnitCategoryLabel(cmd.unitCategory)}
                            </Tag>
                            <span style={{ fontWeight: 500 }}>{cmd.unitName}</span>
                          </Space>
                          <Tag color={getCommandStatusColor(cmd.status)}>
                            {getCommandStatusLabel(cmd.status)}
                          </Tag>
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
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#52c41a', marginBottom: 6 }}>
                              反馈记录（{cmd.feedbacks.length} 条）
                            </div>
                            {cmd.feedbacks.map((fb: CommandFeedback, idx: number) => (
                              <div key={fb.id} style={{
                                fontSize: 12,
                                marginBottom: idx < cmd.feedbacks.length - 1 ? 8 : 0,
                                paddingBottom: idx < cmd.feedbacks.length - 1 ? 8 : 0,
                                borderBottom: idx < cmd.feedbacks.length - 1 ? '1px dashed #d9f7be' : 'none'
                              }}>
                                <Space style={{ marginBottom: 2 }}>
                                  <Tag color={getCommandStatusColor(fb.status)}>
                                    {getCommandStatusLabel(fb.status)}
                                  </Tag>
                                  <span style={{ color: '#666' }}>{fb.content}</span>
                                </Space>
                                <div style={{ color: '#999' }}>
                                  {fb.providedBy} · {dayjs(fb.providedAt).format('YYYY-MM-DD HH:mm:ss')}
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
                <Empty description="暂无协作指令" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
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
