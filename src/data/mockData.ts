import {
  Incident, PoliceVehicle, PoliceOfficer, Camera, Case, Schedule, Area, Alert,
  JointDisposalUnit, DisposalNode, OnSiteDivisionChange, CollaborationCommand
} from '../types'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

export const mockAreas: Area[] = [
  { id: 'a1', name: '东城区', riskLevel: 'high', crimeRate: 0.35 },
  { id: 'a2', name: '西城区', riskLevel: 'medium', crimeRate: 0.22 },
  { id: 'a3', name: '南城区', riskLevel: 'low', crimeRate: 0.12 },
  { id: 'a4', name: '北城区', riskLevel: 'medium', crimeRate: 0.18 },
  { id: 'a5', name: '中心商务区', riskLevel: 'high', crimeRate: 0.42 },
  { id: 'a6', name: '工业园区', riskLevel: 'low', crimeRate: 0.08 }
]

export const mockOfficers: PoliceOfficer[] = [
  { id: 'o1', name: '张建国', badgeNumber: '10001', rank: '警司', skills: ['刑事侦查', '谈判', '射击'], currentLoad: 1, status: 'on_duty', assignedVehicleId: 'v1', currentIncidentIds: [], contact: '13800138001' },
  { id: 'o2', name: '李卫东', badgeNumber: '10002', rank: '警员', skills: ['治安管理', '巡逻'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v1', currentIncidentIds: [], contact: '13800138002' },
  { id: 'o3', name: '王建军', badgeNumber: '10003', rank: '警督', skills: ['刑事侦查', '法医', '现场勘查'], currentLoad: 2, status: 'on_duty', assignedVehicleId: 'v2', currentIncidentIds: [], contact: '13800138003' },
  { id: 'o4', name: '赵学峰', badgeNumber: '10004', rank: '警员', skills: ['交通管理', '急救'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v2', currentIncidentIds: [], contact: '13800138004' },
  { id: 'o5', name: '孙志强', badgeNumber: '10005', rank: '警司', skills: ['特警', '反恐', '射击'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v3', currentIncidentIds: [], contact: '13800138005' },
  { id: 'o6', name: '周明辉', badgeNumber: '10006', rank: '警员', skills: ['特警', '格斗'], currentLoad: 1, status: 'on_duty', assignedVehicleId: 'v3', currentIncidentIds: [], contact: '13800138006' },
  { id: 'o7', name: '吴振华', badgeNumber: '10007', rank: '警司', skills: ['求助服务', '社区警务', '调解'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v4', currentIncidentIds: [], contact: '13800138007' },
  { id: 'o8', name: '郑丽华', badgeNumber: '10008', rank: '警员', skills: ['求助服务', '心理咨询'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v4', currentIncidentIds: [], contact: '13800138008' },
  { id: 'o9', name: '陈海涛', badgeNumber: '10009', rank: '警督', skills: ['刑事侦查', '经济犯罪'], currentLoad: 1, status: 'on_duty', assignedVehicleId: 'v5', currentIncidentIds: [], contact: '13800138009' },
  { id: 'o10', name: '黄晓东', badgeNumber: '10010', rank: '警员', skills: ['网络安全', '电子取证'], currentLoad: 0, status: 'on_duty', assignedVehicleId: 'v5', currentIncidentIds: [], contact: '13800138010' },
  { id: 'o11', name: '刘云飞', badgeNumber: '10011', rank: '警司', skills: ['治安管理', '群体性事件'], currentLoad: 0, status: 'off_duty', currentIncidentIds: [], contact: '13800138011' },
  { id: 'o12', name: '马文龙', badgeNumber: '10012', rank: '警员', skills: ['交通管理', '事故处理'], currentLoad: 0, status: 'on_leave', currentIncidentIds: [], contact: '13800138012' }
]

export const mockVehicles: PoliceVehicle[] = [
  { id: 'v1', plateNumber: '京A·10001', type: 'patrol_car', currentCoordinates: [39.9087, 116.4074], capacity: 4, currentLoad: 2, status: 'available', trafficIndex: 2 },
  { id: 'v2', plateNumber: '京A·10002', type: 'patrol_car', currentCoordinates: [39.9187, 116.4174], capacity: 4, currentLoad: 2, status: 'on_duty', trafficIndex: 3, currentIncidentId: undefined },
  { id: 'v3', plateNumber: '京A·20001', type: 'swat_vehicle', currentCoordinates: [39.8987, 116.4274], capacity: 8, currentLoad: 2, status: 'available', trafficIndex: 1 },
  { id: 'v4', plateNumber: '京A·10003', type: 'patrol_car', currentCoordinates: [39.9287, 116.3974], capacity: 4, currentLoad: 2, status: 'available', trafficIndex: 4 },
  { id: 'v5', plateNumber: '京A·10004', type: 'patrol_car', currentCoordinates: [39.8887, 116.3874], capacity: 4, currentLoad: 2, status: 'available', trafficIndex: 2 },
  { id: 'v6', plateNumber: '京A·30001', type: 'fire_vehicle', currentCoordinates: [39.9387, 116.4074], capacity: 6, currentLoad: 0, status: 'available', trafficIndex: 1 }
]

export const mockCameras: Camera[] = [
  { id: 'c1', name: '王府井大街1号', location: '王府井大街与东长安街交口', coordinates: [39.9087, 116.4074], status: 'online', hasAlert: false },
  { id: 'c2', name: '王府井大街2号', location: '王府井大街北段', coordinates: [39.9137, 116.4084], status: 'online', hasAlert: true, alertType: '异常聚集', alertStartedAt: dayjs().subtract(8, 'minute').format() },
  { id: 'c3', name: '天安门东', location: '天安门广场东侧', coordinates: [39.9055, 116.3976], status: 'online', hasAlert: false },
  { id: 'c4', name: '西单路口', location: '西单北大街路口', coordinates: [39.9090, 116.3730], status: 'online', hasAlert: false },
  { id: 'c5', name: 'CBD国贸', location: '国贸桥西北角', coordinates: [39.9085, 116.4605], status: 'offline', hasAlert: false },
  { id: 'c6', name: '东三环北路', location: '三元桥南侧', coordinates: [39.9450, 116.4550], status: 'online', hasAlert: false },
  { id: 'c7', name: '北京站广场', location: '北京站出站口', coordinates: [39.9030, 116.4270], status: 'online', hasAlert: true, alertType: '可疑人员徘徊', alertStartedAt: dayjs().subtract(3, 'minute').format() },
  { id: 'c8', name: '中关村大街', location: '中关村海龙大厦前', coordinates: [39.9840, 116.3160], status: 'online', hasAlert: false }
]

export const mockIncidents: Incident[] = [
  {
    id: 'i1', callerName: '王女士', callerPhone: '13900001111', location: '王府井大街25号', coordinates: [39.9120, 116.4080],
    description: '店铺被盗，丢失现金约2万元，有监控录像', type: 'criminal', priority: 4, status: 'handling',
    reportedAt: dayjs().subtract(2, 'hour').format(), dispatchedAt: dayjs().subtract(118, 'minute').format(),
    arrivedAt: dayjs().subtract(105, 'minute').format(), assignedVehicleId: 'v2', assignedOfficerIds: ['o3', 'o4'],
    notes: ['嫌疑人已锁定', '正在调取周边监控'], cameraIds: ['c1', 'c2']
  },
  {
    id: 'i2', callerName: '匿名群众', callerPhone: '110', location: '东三环北路15号', coordinates: [39.9400, 116.4500],
    description: '两伙人发生口角，有聚众斗殴倾向', type: 'public_order', priority: 5, status: 'handling',
    reportedAt: dayjs().subtract(25, 'minute').format(), dispatchedAt: dayjs().subtract(23, 'minute').format(),
    arrivedAt: dayjs().subtract(18, 'minute').format(), assignedVehicleId: 'v3', assignedOfficerIds: ['o5', 'o6'],
    notes: ['双方约20人，已报警多次'], cameraIds: ['c6'],
    isJointOperation: true,
    jointUnits: [
      {
        id: 'u1', unitName: '主责处置组', role: 'primary', unitCategory: 'patrol',
        vehicleId: 'v3', vehiclePlate: '京A·20001',
        officerIds: ['o5', 'o6'], officerNames: ['孙志强', '周明辉'],
        status: 'handling', eta: 0,
        arrivedAt: dayjs().subtract(18, 'minute').format(),
        confirmedArrivedAt: dayjs().subtract(18, 'minute').format(),
        confirmedArrivedBy: '指挥中心',
        task: '现场控制与秩序维护',
        lastFeedback: '已到达现场，正在隔离双方',
        lastFeedbackAt: dayjs().subtract(15, 'minute').format()
      },
      {
        id: 'u2', unitName: '增援一组', role: 'reinforcement', unitCategory: 'swat',
        vehicleId: 'v6', vehiclePlate: '京A·30001',
        officerIds: ['o9'], officerNames: ['陈海涛'],
        status: 'arrived', eta: 5,
        arrivedAt: dayjs().subtract(10, 'minute').format(),
        confirmedArrivedAt: dayjs().subtract(10, 'minute').format(),
        confirmedArrivedBy: '指挥中心',
        task: '协助控制重点人员',
        lastFeedback: '已到现场，协助隔离'
      },
      {
        id: 'u3', unitName: '增援二组', role: 'reinforcement', unitCategory: 'traffic',
        vehicleId: 'v5', vehiclePlate: '京A·10004',
        officerIds: ['o10'], officerNames: ['黄晓东'],
        status: 'en_route', eta: 8,
        task: '周边交通疏导'
      },
      {
        id: 'u4', unitName: '技侦支援', role: 'reinforcement', unitCategory: 'tech',
        vehicleId: 'v2', vehiclePlate: '京A·10002',
        officerIds: ['o3', 'o4'], officerNames: ['王建军', '赵学峰'],
        status: 'en_route', eta: 12,
        task: '现场取证与视频提取'
      }
    ] as JointDisposalUnit[],
    disposalNodes: [
      { id: 'n1', name: '接警响应', status: 'completed', startedAt: dayjs().subtract(25, 'minute').format(), completedAt: dayjs().subtract(24, 'minute').format(), completedBy: '指挥中心', expectedDurationMin: 2 },
      { id: 'n2', name: '警力部署', status: 'completed', startedAt: dayjs().subtract(24, 'minute').format(), completedAt: dayjs().subtract(22, 'minute').format(), completedBy: '指挥长', expectedDurationMin: 5 },
      { id: 'n3', name: '现场控制', status: 'in_progress', startedAt: dayjs().subtract(18, 'minute').format(), completedBy: '孙志强', expectedDurationMin: 15 },
      { id: 'n4', name: '调查取证', status: 'pending', expectedDurationMin: 30 },
      { id: 'n5', name: '人员移交', status: 'pending', expectedDurationMin: 10 },
      { id: 'n6', name: '现场清理', status: 'pending', expectedDurationMin: 8 }
    ] as DisposalNode[],
    onSiteDivision: '主责组：现场控制隔离双方；增援一组：带离挑头人员；增援二组：周边交通疏导；技侦：视频提取与电子取证',
    onSiteDivisionHistory: [
      {
        id: 'd1', changedAt: dayjs().subtract(20, 'minute').format(), changedBy: '指挥长',
        beforeContent: '主责组：现场处置；增援：待命',
        afterContent: '主责组：现场控制隔离双方；增援一组：协助带离；增援二组：交通疏导；技侦：现场取证'
      }
    ] as OnSiteDivisionChange[],
    commands: [
      {
        id: 'cmd1', incidentId: 'i2', unitId: 'u1', unitName: '主责处置组', unitCategory: 'patrol',
        content: '立即前往现场，隔离冲突双方，避免事态升级', priority: 'critical', status: 'completed',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(23, 'minute').format(),
        feedbacks: [
          { id: 'f1', commandId: 'cmd1', status: 'received', content: '收到，立即出发', providedBy: '孙志强', providedAt: dayjs().subtract(22, 'minute').format() },
          { id: 'f2', commandId: 'cmd1', status: 'in_progress', content: '已到达现场，正在隔离双方', providedBy: '孙志强', providedAt: dayjs().subtract(18, 'minute').format() },
          { id: 'f3', commandId: 'cmd1', status: 'completed', content: '双方已隔离，无人员受伤', providedBy: '孙志强', providedAt: dayjs().subtract(15, 'minute').format() }
        ]
      },
      {
        id: 'cmd2', incidentId: 'i2', unitId: 'u2', unitName: '增援一组', unitCategory: 'swat',
        content: '立即前往现场增援，协助控制重点人员', priority: 'urgent', status: 'completed',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(20, 'minute').format(),
        feedbacks: [
          { id: 'f4', commandId: 'cmd2', status: 'received', content: '收到，正在前往', providedBy: '陈海涛', providedAt: dayjs().subtract(19, 'minute').format() },
          { id: 'f5', commandId: 'cmd2', status: 'completed', content: '已到现场，协助隔离中', providedBy: '陈海涛', providedAt: dayjs().subtract(10, 'minute').format() }
        ]
      },
      {
        id: 'cmd3', incidentId: 'i2', unitId: 'u3', unitName: '增援二组', unitCategory: 'traffic',
        content: '前往现场周边疏导交通，确保救援通道畅通', priority: 'urgent', status: 'in_progress',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(15, 'minute').format(),
        feedbacks: [
          { id: 'f6', commandId: 'cmd3', status: 'received', content: '收到，预计8分钟到达', providedBy: '黄晓东', providedAt: dayjs().subtract(14, 'minute').format() }
        ]
      },
      {
        id: 'cmd4', incidentId: 'i2', unitId: 'u4', unitName: '技侦支援', unitCategory: 'tech',
        content: '携带取证设备前往，提取现场周边监控视频', priority: 'normal', status: 'sent',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(10, 'minute').format(),
        feedbacks: []
      }
    ] as CollaborationCommand[]
  },
  {
    id: 'i3', callerName: '李大爷', callerPhone: '13700002222', location: '西城区幸福小区3号楼', coordinates: [39.9200, 116.3800],
    description: '老伴突发心脏病，需要协助送医', type: 'assistance', priority: 5, status: 'en_route',
    reportedAt: dayjs().subtract(5, 'minute').format(), dispatchedAt: dayjs().subtract(3, 'minute').format(),
    assignedVehicleId: 'v4', assignedOfficerIds: ['o7', 'o8'], notes: ['已通知120'], cameraIds: []
  },
  {
    id: 'i4', callerName: '赵经理', callerPhone: '13600003333', location: '中心商务区金融大厦A座', coordinates: [39.9085, 116.4600],
    description: '收到匿名恐吓邮件，声称放置爆炸物', type: 'criminal', priority: 5, status: 'en_route',
    reportedAt: dayjs().subtract(12, 'minute').format(), dispatchedAt: dayjs().subtract(10, 'minute').format(),
    assignedVehicleId: 'v1', assignedOfficerIds: ['o1', 'o2'], notes: ['已通知排爆组'], cameraIds: ['c5'],
    isJointOperation: true,
    jointUnits: [
      {
        id: 'u1', unitName: '主责处置组', role: 'primary', unitCategory: 'patrol',
        vehicleId: 'v1', vehiclePlate: '京A·10001',
        officerIds: ['o1', 'o2'], officerNames: ['张建国', '李卫东'],
        status: 'en_route', eta: 3,
        task: '人员疏散与现场警戒',
      },
      {
        id: 'u2', unitName: '排爆组', role: 'reinforcement', unitCategory: 'swat',
        vehicleId: 'v3', vehiclePlate: '京A·20001',
        officerIds: ['o5', 'o6'], officerNames: ['孙志强', '周明辉'],
        status: 'en_route', eta: 8,
        task: '爆炸物排查与处置'
      },
      {
        id: 'u3', unitName: '交警疏导', role: 'reinforcement', unitCategory: 'traffic',
        vehicleId: 'v4', vehiclePlate: '京A·10003',
        officerIds: ['o7', 'o8'], officerNames: ['吴振华', '郑丽华'],
        status: 'en_route', eta: 5,
        task: '周边交通管制与人员引导'
      },
      {
        id: 'u4', unitName: '技侦追踪', role: 'reinforcement', unitCategory: 'tech',
        vehicleId: 'v5', vehiclePlate: '京A·10004',
        officerIds: ['o9', 'o10'], officerNames: ['陈海涛', '黄晓东'],
        status: 'en_route', eta: 10,
        task: '邮件溯源与嫌疑人定位'
      },
      {
        id: 'u5', unitName: '医疗救护', role: 'reinforcement', unitCategory: 'medical',
        vehicleId: 'v6', vehiclePlate: '京A·30001',
        officerIds: [], officerNames: [],
        status: 'en_route', eta: 7,
        task: '医疗急救待命'
      }
    ] as JointDisposalUnit[],
    disposalNodes: [
      { id: 'n1', name: '接警响应', status: 'completed', startedAt: dayjs().subtract(12, 'minute').format(), completedAt: dayjs().subtract(11, 'minute').format(), completedBy: '指挥中心', expectedDurationMin: 2 },
      { id: 'n2', name: '警力部署', status: 'in_progress', startedAt: dayjs().subtract(11, 'minute').format(), completedBy: '指挥长', expectedDurationMin: 5 },
      { id: 'n3', name: '人员疏散', status: 'pending', expectedDurationMin: 15 },
      { id: 'n4', name: '爆炸物排查', status: 'pending', expectedDurationMin: 45 },
      { id: 'n5', name: '现场取证', status: 'pending', expectedDurationMin: 30 },
      { id: 'n6', name: '现场解封', status: 'pending', expectedDurationMin: 10 }
    ] as DisposalNode[],
    onSiteDivision: '主责组：警戒疏散；排爆组：爆炸物排查；交警：交通管制；技侦：邮件溯源；医疗：急救待命',
    commands: [
      {
        id: 'cmd1', incidentId: 'i4', unitId: 'u1', unitName: '主责处置组', unitCategory: 'patrol',
        content: '立即前往金融大厦，疏散楼内人员，设置警戒带', priority: 'critical', status: 'in_progress',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(10, 'minute').format(),
        feedbacks: [
          { id: 'f1', commandId: 'cmd1', status: 'received', content: '收到，正在前往', providedBy: '张建国', providedAt: dayjs().subtract(9, 'minute').format() }
        ]
      },
      {
        id: 'cmd2', incidentId: 'i4', unitId: 'u2', unitName: '排爆组', unitCategory: 'swat',
        content: '携带排爆设备前往，优先排查邮件提及区域', priority: 'critical', status: 'sent',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(9, 'minute').format(),
        feedbacks: []
      },
      {
        id: 'cmd3', incidentId: 'i4', unitId: 'u3', unitName: '交警疏导', unitCategory: 'traffic',
        content: '对周边道路实施临时交通管制，禁止无关车辆进入', priority: 'urgent', status: 'sent',
        issuedBy: '指挥长', issuedAt: dayjs().subtract(8, 'minute').format(),
        feedbacks: []
      }
    ] as CollaborationCommand[]
  },
  {
    id: 'i5', callerName: '张先生', callerPhone: '13500004444', location: '南城区菜市场东门', coordinates: [39.8800, 116.4000],
    description: '摊贩因摊位问题发生争执，已报警多次', type: 'public_order', priority: 2, status: 'pending',
    reportedAt: dayjs().subtract(1, 'minute').format(), assignedOfficerIds: [], notes: [], cameraIds: []
  },
  {
    id: 'i6', callerName: '陈女士', callerPhone: '13400005555', location: '北城区公园南门', coordinates: [39.9400, 116.4000],
    description: '儿童走失，男孩，5岁，穿红色上衣', type: 'assistance', priority: 4, status: 'closed',
    reportedAt: dayjs().subtract(5, 'hour').format(), dispatchedAt: dayjs().subtract(4, 'hour').subtract(55, 'minute').format(),
    arrivedAt: dayjs().subtract(4, 'hour').subtract(40, 'minute').format(), closedAt: dayjs().subtract(3, 'hour').format(),
    assignedVehicleId: 'v1', assignedOfficerIds: ['o1', 'o2'],
    notes: ['在公园内游乐设施旁找到孩子', '已安全交还给家长'], cameraIds: []
  },
  {
    id: 'i7', callerName: '刘先生', callerPhone: '13300006666', location: '工业园区仓库区', coordinates: [39.8700, 116.4500],
    description: '发现仓库门锁被破坏，怀疑有人入室盗窃', type: 'criminal', priority: 3, status: 'pending',
    reportedAt: dayjs().subtract(30, 'second').format(), assignedOfficerIds: [], notes: [], cameraIds: []
  }
]

export const mockCases: Case[] = [
  {
    id: 'case1', caseNumber: '2024-刑-001', title: '王府井珠宝店盗窃案', type: '盗窃罪',
    status: 'investigating', relatedIncidentId: 'i1', officerInCharge: '王建军',
    acceptedAt: dayjs().subtract(3, 'day').format(),
    transcripts: [
      { id: 't1', title: '被害人王女士笔录', content: '今天上午10点开门时发现店铺后门被撬开，柜台内的部分珠宝和收银台内的2万元现金不翼而飞。', uploadedAt: dayjs().subtract(2, 'day').format(), uploadedBy: '张建国' },
      { id: 't2', title: '隔壁店主证人笔录', content: '凌晨2点左右听到异常声响，看到两名穿黑衣男子从后门离开。', uploadedAt: dayjs().subtract(1, 'day').format(), uploadedBy: '张建国' }
    ],
    evidences: [
      { id: 'e1', name: '监控录像片段', type: 'video', description: '店内监控拍摄到嫌疑人影像，时长约15分钟', uploadedAt: dayjs().subtract(2, 'day').format() },
      { id: 'e2', name: '现场指纹提取报告', type: 'document', description: '在后门门把手上提取到3组陌生指纹', uploadedAt: dayjs().subtract(2, 'day').format() },
      { id: 'e3', name: '作案工具照片', type: 'image', description: '现场发现的撬棍和螺丝刀', uploadedAt: dayjs().subtract(1, 'day').format() }
    ],
    notes: '已锁定嫌疑人身份，正在布控抓捕。', isOverdue: false
  },
  {
    id: 'case2', caseNumber: '2024-刑-002', title: 'CBD敲诈勒索案', type: '敲诈勒索罪',
    status: 'accepted', relatedIncidentId: undefined, officerInCharge: '陈海涛',
    acceptedAt: dayjs().subtract(40, 'day').format(),
    transcripts: [],
    evidences: [],
    notes: '', isOverdue: true
  },
  {
    id: 'case3', caseNumber: '2024-治-003', title: '东三环聚众斗殴案', type: '寻衅滋事',
    status: 'solved', relatedIncidentId: 'i2', officerInCharge: '孙志强',
    acceptedAt: dayjs().subtract(10, 'day').format(), solvedAt: dayjs().subtract(2, 'day').format(),
    transcripts: [
      { id: 't3', title: '主犯李某笔录', content: '对聚众斗殴的犯罪事实供认不讳。', uploadedAt: dayjs().subtract(5, 'day').format(), uploadedBy: '孙志强' }
    ],
    evidences: [
      { id: 'e4', name: '斗殴现场视频', type: 'video', description: '路人拍摄的斗殴现场视频', uploadedAt: dayjs().subtract(8, 'day').format() }
    ],
    notes: '已移送检察院审查起诉。', isOverdue: false
  },
  {
    id: 'case4', caseNumber: '2024-刑-004', title: '网络诈骗系列案', type: '诈骗罪',
    status: 'transferred', officerInCharge: '黄晓东',
    acceptedAt: dayjs().subtract(60, 'day').format(), solvedAt: dayjs().subtract(30, 'day').format(), transferredAt: dayjs().subtract(15, 'day').format(),
    transcripts: [
      { id: 't4', title: '被害人询问笔录12份', content: '12名被害人共计被骗金额280万元。', uploadedAt: dayjs().subtract(50, 'day').format(), uploadedBy: '黄晓东' }
    ],
    evidences: [
      { id: 'e5', name: '银行流水记录', type: 'document', description: '涉案资金流水中涉及账户87个', uploadedAt: dayjs().subtract(45, 'day').format() },
      { id: 'e6', name: '电子数据鉴定报告', type: 'document', description: '从涉案服务器提取的诈骗话术模板、被害人信息', uploadedAt: dayjs().subtract(35, 'day').format() }
    ],
    notes: '案件已成功侦破，抓获犯罪嫌疑人11名，已移送检察机关。', isOverdue: false
  },
  {
    id: 'case5', caseNumber: '2024-治-005', title: '菜市场寻衅滋事案', type: '寻衅滋事',
    status: 'investigating', relatedIncidentId: 'i5', officerInCharge: '刘云飞',
    acceptedAt: dayjs().subtract(1, 'day').format(),
    transcripts: [], evidences: [], notes: '', isOverdue: false
  }
]

export function generateInitialSchedules(): Schedule[] {
  const schedules: Schedule[] = []
  const shifts: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night']
  const onDutyOfficers = mockOfficers.filter(o => o.status === 'on_duty')
  for (let i = 0; i < 7; i++) {
    const date = dayjs().add(i, 'day').format('YYYY-MM-DD')
    onDutyOfficers.forEach((officer, idx) => {
      const shift = shifts[(idx + i) % 3]
      const areaIdx = (idx + i) % mockAreas.length
      schedules.push({
        id: uuidv4(), officerId: officer.id, date, shift,
        areaId: mockAreas[areaIdx].id, areaName: mockAreas[areaIdx].name,
        riskLevel: mockAreas[areaIdx].riskLevel
      })
    })
  }
  return schedules
}

export const mockAlerts: Alert[] = [
  {
    id: 'al1', type: 'overdue_case', title: '案件超期预警',
    message: '案件【2024-刑-002 CBD敲诈勒索案】已受理超过30天未破案，请关注！',
    severity: 'error', relatedId: 'case2', createdAt: dayjs().subtract(2, 'hour').format(), read: false
  },
  {
    id: 'al2', type: 'abnormal_behavior', title: '视频异常行为报警',
    message: '摄像头【王府井大街2号】检测到异常聚集行为，请及时关注。',
    severity: 'warning', relatedId: 'c2', createdAt: dayjs().subtract(25, 'minute').format(), read: false
  },
  {
    id: 'al3', type: 'abnormal_behavior', title: '视频异常行为报警',
    message: '摄像头【北京站广场】检测到可疑人员长时间徘徊，请及时关注。',
    severity: 'warning', relatedId: 'c7', createdAt: dayjs().subtract(15, 'minute').format(), read: true
  }
]

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  criminal: '刑事',
  public_order: '治安',
  assistance: '求助'
}

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  pending: '待出警',
  dispatched: '已派警',
  en_route: '赶赴中',
  handling: '处置中',
  closed: '已结案'
}

export const CASE_STATUS_LABELS: Record<string, string> = {
  accepted: '受理',
  investigating: '侦查',
  solved: '破案',
  transferred: '移送'
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: '一般', 2: '较低', 3: '中等', 4: '较高', 5: '紧急'
}

export const SHIFT_LABELS: Record<string, string> = {
  morning: '早班(08:00-16:00)',
  afternoon: '午班(16:00-24:00)',
  night: '夜班(00:00-08:00)'
}
