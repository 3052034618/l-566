import { useState, useMemo } from 'react'
import {
  Card, Row, Col, DatePicker, Button, Select, Space, Tag, Statistic, Progress, Table, message
} from 'antd'
import {
  FilePdfOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined,
  SafetyOutlined, AlertOutlined, SafetyCertificateOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { usePoliceStore } from '../store/policeStore'
import { INCIDENT_TYPE_LABELS } from '../data/mockData'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { Option } = Select

export default function Statistics() {
  const getStatistics = usePoliceStore(s => s.getStatistics)
  const incidents = usePoliceStore(s => s.incidents)
  const cases = usePoliceStore(s => s.cases)
  const officers = usePoliceStore(s => s.officers)
  const [period, setPeriod] = useState('month')
  const stats = getStatistics()

  const typePieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c} ({d}%)' },
      data: [
        { value: stats.incidentsByType.criminal, name: '刑事', itemStyle: { color: '#ef4444' } },
        { value: stats.incidentsByType.public_order, name: '治安', itemStyle: { color: '#f59e0b' } },
        { value: stats.incidentsByType.assistance, name: '求助', itemStyle: { color: '#22c55e' } }
      ]
    }]
  }), [stats])

  const timeBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.incidentsByTime),
      axisLabel: { fontSize: 11 }
    },
    yAxis: { type: 'value', name: '接警量' },
    series: [{
      type: 'bar',
      data: Object.values(stats.incidentsByTime),
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '60%'
    }]
  }), [stats])

  const officerWorkloadData = useMemo(() => {
    return officers
      .filter(o => o.status === 'on_duty')
      .map(o => ({
        key: o.id,
        name: o.name,
        rank: o.rank,
        currentLoad: o.currentLoad,
        skills: o.skills.join('、'),
        incidentsCount: o.currentIncidentIds.length
      }))
  }, [officers])

  const exportPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('City Police Department Monthly Report', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`Report Period: ${dayjs().format('YYYY-MM')}`, 105, 30, { align: 'center' })
    doc.setFontSize(14)
    doc.text('1. Overview Statistics', 14, 45)

    const overviewData = [
      ['Total Incidents', stats.totalIncidents.toString()],
      ['Criminal Cases', stats.incidentsByType.criminal.toString()],
      ['Public Order Cases', stats.incidentsByType.public_order.toString()],
      ['Assistance Cases', stats.incidentsByType.assistance.toString()],
      ['Avg Response Time', `${stats.avgResponseTime} min`],
      ['Total Cases', stats.totalCases.toString()],
      ['Solved Cases', stats.solvedCases.toString()],
      ['Solve Rate', `${stats.solveRate}%`]
    ]

    autoTable(doc, {
      startY: 52,
      head: [['Metric', 'Value']],
      body: overviewData,
      theme: 'grid',
      headStyles: { fillColor: [22, 119, 255] }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 100
    doc.setFontSize(14)
    doc.text('2. Hourly Incident Distribution', 14, finalY + 15)

    const timeData = Object.entries(stats.incidentsByTime).map(([time, count]) => [time, (count as number).toString()])
    autoTable(doc, {
      startY: finalY + 22,
      head: [['Time Period', 'Incident Count']],
      body: timeData,
      theme: 'striped'
    })

    const finalY2 = (doc as any).lastAutoTable.finalY || 200
    doc.setFontSize(14)
    doc.text('3. Incidents by Type', 14, finalY2 + 15)

    const typeData = [
      ['Criminal', stats.incidentsByType.criminal.toString(), `${((stats.incidentsByType.criminal / (stats.totalIncidents || 1)) * 100).toFixed(1)}%`],
      ['Public Order', stats.incidentsByType.public_order.toString(), `${((stats.incidentsByType.public_order / (stats.totalIncidents || 1)) * 100).toFixed(1)}%`],
      ['Assistance', stats.incidentsByType.assistance.toString(), `${((stats.incidentsByType.assistance / (stats.totalIncidents || 1)) * 100).toFixed(1)}%`]
    ]

    autoTable(doc, {
      startY: finalY2 + 22,
      head: [['Type', 'Count', 'Percentage']],
      body: typeData,
      theme: 'grid'
    })

    doc.setFontSize(10)
    doc.text(
      `Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')} | Police Command System`,
      105, 285, { align: 'center' }
    )

    doc.save(`警务月报_${dayjs().format('YYYYMM')}.pdf`)
    message.success('月度警务报告已导出成功')
  }

  const columns = [
    { title: '警员姓名', dataIndex: 'name', width: 100 },
    { title: '警衔', dataIndex: 'rank', width: 100 },
    {
      title: '当前负载', dataIndex: 'currentLoad', width: 150,
      render: (v: number) => (
        <Progress
          percent={Math.min(v * 30, 100)}
          size="small"
          status={v >= 3 ? 'exception' : v >= 2 ? 'active' : 'normal'}
        />
      )
    },
    { title: '处理中警情', dataIndex: 'incidentsCount', width: 100 },
    { title: '技能标签', dataIndex: 'skills' }
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>警务数据统计分析</span>
            <Tag color="blue">{dayjs().format('YYYY年MM月')}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Select value={period} onChange={setPeriod} style={{ width: 140 }}>
              <Option value="week">本周</Option>
              <Option value="month">本月</Option>
              <Option value="quarter">本季度</Option>
              <Option value="year">本年</Option>
            </Select>
            <DatePicker picker="month" placeholder="选择月份" />
            <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPDF}>
              导出PDF报告
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <div className="stat-card">
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总接警量</span>}
                value={stats.totalIncidents}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#fff' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card criminal">
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>刑事警情</span>}
                value={stats.incidentsByType.criminal}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: '#fff' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card public-order">
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>治安警情</span>}
                value={stats.incidentsByType.public_order}
                prefix={<AlertOutlined />}
                valueStyle={{ color: '#fff' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="stat-card assistance">
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>求助警情</span>}
                value={stats.incidentsByType.assistance}
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: '#fff' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={8}>
            <div className="stat-card response">
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>平均出警响应时间</span>}
                value={stats.avgResponseTime}
                suffix="分钟"
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#fff' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={8}>
            <Card style={{ height: '100%' }}>
              <Statistic
                title="破案数 / 立案数"
                value={stats.solvedCases}
                suffix={`/ ${stats.totalCases}`}
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress
                percent={stats.solveRate}
                style={{ marginTop: 12 }}
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ height: '100%' }}>
              <Statistic title="在勤警员" value={officers.filter(o => o.status === 'on_duty').length} suffix="人" />
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  <Tag color="green">待命: {officers.filter(o => o.status === 'on_duty' && o.currentLoad === 0).length}</Tag>
                  <Tag color="blue">工作中: {officers.filter(o => o.status === 'on_duty' && o.currentLoad > 0).length}</Tag>
                  <Tag color="default">休假: {officers.filter(o => o.status !== 'on_duty').length}</Tag>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={10}>
            <Card title={<Space><PieChartOutlined /><span>警情类型分布</span></Space>}>
              <ReactECharts option={typePieOption} style={{ height: 320 }} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title={<Space><BarChartOutlined /><span>24小时接警时段分布</span></Space>}>
              <ReactECharts option={timeBarOption} style={{ height: 320 }} />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title={<Space><LineChartOutlined /><span>警员工作负载统计</span></Space>}
        style={{ marginTop: 16 }}
      >
        <Table
          columns={columns}
          dataSource={officerWorkloadData}
          pagination={{ pageSize: 8 }}
          size="middle"
        />
      </Card>
    </div>
  )
}
