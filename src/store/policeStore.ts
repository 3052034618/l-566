import { create } from 'zustand'
import {
  Incident, PoliceVehicle, PoliceOfficer, Camera, Case, Schedule, Area, Alert, TaskAssignment,
  IncidentType, PriorityLevel, IncidentStatus, CaseStatus, CameraAlertLog,
  JointDisposalUnit, DisposalNode, AssignmentLog, AssignmentLogType
} from '../types'
import {
  mockAreas, mockOfficers, mockVehicles, mockCameras, mockIncidents, mockCases, mockAlerts,
  generateInitialSchedules
} from '../data/mockData'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import {
  saveToStorage, loadFromStorage, saveFileToIndexedDB, playAlertSound
} from '../utils/persistence'

interface PoliceStore {
  incidents: Incident[]
  vehicles: PoliceVehicle[]
  officers: PoliceOfficer[]
  cameras: Camera[]
  cases: Case[]
  schedules: Schedule[]
  areas: Area[]
  alerts: Alert[]
  assignments: TaskAssignment[]
  cameraAlertLogs: CameraAlertLog[]
  alertSoundEnabled: boolean
  isInitialized: boolean

  initialize: () => void
  persist: () => void

  addIncident: (data: Omit<Incident, 'id' | 'reportedAt' | 'status' | 'assignedOfficerIds' | 'notes' | 'cameraIds' | 'type' | 'priority'>) => Incident
  classifyIncident: (description: string, location: string) => { type: IncidentType; priority: PriorityLevel }
  updateIncidentStatus: (id: string, status: IncidentStatus) => void
  assignTask: (incidentId: string, excludeVehicleId?: string, excludeOfficerIds?: string[]) => TaskAssignment | null
  confirmAssignment: (assignmentId: string) => void
  requestTransfer: (assignmentId: string, reason: string) => void
  approveTransfer: (assignmentId: string, approve: boolean) => void
  addNoteToIncident: (incidentId: string, note: string) => void
  closeIncident: (incidentId: string) => void

  upgradeToJointOperation: (incidentId: string) => void
  addReinforcementUnit: (incidentId: string, unit: Omit<JointDisposalUnit, 'id'>) => void
  updateDisposalNode: (incidentId: string, nodeId: string, status: DisposalNode['status'], notes?: string) => void
  updateOnSiteDivision: (incidentId: string, division: string) => void
  addAssignmentLog: (incidentId: string, log: Omit<AssignmentLog, 'id' | 'operatedAt'>) => void
  verifyTransfer: (incidentId: string, passed: boolean, comments?: string) => void
  addDisposalNode: (incidentId: string, nodeName: string) => void

  addCase: (data: Omit<Case, 'id' | 'transcripts' | 'evidences' | 'isOverdue'>) => Case
  updateCaseStatus: (id: string, status: CaseStatus) => void
  addTranscript: (caseId: string, transcript: Omit<Case['transcripts'][0], 'id'>, file?: File) => Promise<void>
  addEvidence: (caseId: string, evidence: Omit<Case['evidences'][0], 'id'>, file?: File) => Promise<void>

  generateSchedules: () => void
  requestScheduleChange: (scheduleId: string, target: {
    date: string; shift: Schedule['shift']; areaId: string; areaName: string; reason: string
  }) => void
  approveScheduleChange: (scheduleId: string, approve: boolean) => void

  markAlertRead: (alertId: string) => void
  acknowledgeCameraAlert: (cameraId: string, notes?: string) => void
  toggleAlertSound: (enabled: boolean) => void

  checkOverdueIncidents: () => void
  checkOverdueCases: () => void
  getStatistics: () => any
}

function calcDistance([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const usePoliceStore = create<PoliceStore>((set, get) => ({
  incidents: [],
  vehicles: [],
  officers: [],
  cameras: [],
  cases: [],
  schedules: [],
  areas: [...mockAreas],
  alerts: [],
  assignments: [],
  cameraAlertLogs: [],
  alertSoundEnabled: true,
  isInitialized: false,

  initialize: () => {
    if (get().isInitialized) return

    const persisted = loadFromStorage()
    if (persisted) {
      set({
        incidents: persisted.incidents || [...mockIncidents],
        vehicles: persisted.vehicles || [...mockVehicles],
        officers: persisted.officers || [...mockOfficers],
        cameras: persisted.cameras || [...mockCameras],
        cases: persisted.cases || [...mockCases],
        schedules: persisted.schedules || generateInitialSchedules(),
        alerts: persisted.alerts || [...mockAlerts],
        assignments: persisted.assignments || [],
        cameraAlertLogs: (persisted as any).cameraAlertLogs || [],
        isInitialized: true
      })
    } else {
      set({
        incidents: [...mockIncidents],
        vehicles: [...mockVehicles],
        officers: [...mockOfficers],
        cameras: [...mockCameras],
        cases: [...mockCases],
        schedules: generateInitialSchedules(),
        alerts: [...mockAlerts],
        assignments: [],
        cameraAlertLogs: [],
        isInitialized: true
      })
    }
    get().persist()
  },

  persist: () => {
    const state = get()
    saveToStorage({
      incidents: state.incidents,
      vehicles: state.vehicles,
      officers: state.officers,
      cameras: state.cameras,
      cases: state.cases,
      schedules: state.schedules,
      alerts: state.alerts,
      assignments: state.assignments,
      cameraAlertLogs: state.cameraAlertLogs
    })
  },

  classifyIncident: (description, location) => {
    const text = description + location
    let type: IncidentType = 'assistance'
    let priority: PriorityLevel = 2

    const criminalKeywords = ['盗', '抢', '偷', '杀', '伤', '诈', '骗', '威胁', '恐吓', '毒品', '纵火', '爆炸']
    const publicOrderKeywords = ['打架', '斗殴', '赌', '黄', '聚众', '闹事', '醉酒', '扰民', '纠纷', '争执', '噪音']
    const assistanceKeywords = ['走失', '迷路', '求助', '救', '病', '车', '老人', '儿童', '咨询']

    if (criminalKeywords.some(k => text.includes(k))) type = 'criminal'
    else if (publicOrderKeywords.some(k => text.includes(k))) type = 'public_order'
    else if (assistanceKeywords.some(k => text.includes(k))) type = 'assistance'

    if (['杀', '伤', '爆炸', '纵火', '绑架', '劫持'].some(k => text.includes(k))) priority = 5
    else if (type === 'criminal') priority = 4
    else if (type === 'public_order') priority = 3
    else if (['病', '救', '走失', '儿童'].some(k => text.includes(k))) priority = 4
    else if (type === 'assistance') priority = 2

    return { type, priority }
  },

  addIncident: (data) => {
    const { classifyIncident } = get()
    const { type, priority } = classifyIncident(data.description, data.location)
    const nearbyCameras = get().cameras
      .filter(c => calcDistance(data.coordinates, c.coordinates) < 1)
      .map(c => c.id)
    const newIncident: Incident = {
      ...data,
      id: uuidv4(),
      reportedAt: dayjs().format(),
      status: 'pending',
      assignedOfficerIds: [],
      notes: [],
      cameraIds: nearbyCameras,
      type, priority
    }
    set(state => ({ incidents: [newIncident, ...state.incidents] }))
    get().persist()
    return newIncident
  },

  updateIncidentStatus: (id, status) => {
    set(state => ({
      incidents: state.incidents.map(inc => {
        if (inc.id !== id) return inc
        const updated: Incident = { ...inc, status }
        if (status === 'dispatched') updated.dispatchedAt = dayjs().format()
        if (status === 'en_route') updated.dispatchedAt = inc.dispatchedAt || dayjs().format()
        if (status === 'handling') updated.arrivedAt = dayjs().format()
        if (status === 'closed') updated.closedAt = dayjs().format()
        return updated
      })
    }))
    get().persist()
  },

  assignTask: (incidentId, excludeVehicleId, excludeOfficerIds) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return null

    let availableVehicles = state.vehicles.filter(v => v.status === 'available')
    if (excludeVehicleId) {
      availableVehicles = availableVehicles.filter(v => v.id !== excludeVehicleId)
    }
    if (availableVehicles.length === 0) return null

    const skillMap: Record<IncidentType, string[]> = {
      criminal: ['刑事侦查', '现场勘查', '射击'],
      public_order: ['治安管理', '群体性事件', '特警', '格斗'],
      assistance: ['求助服务', '急救', '调解', '社区警务']
    }
    const requiredSkills = skillMap[incident.type] || []

    const scoredVehicles = availableVehicles.map(v => {
      const distance = calcDistance(incident.coordinates, v.currentCoordinates)
      const trafficPenalty = v.trafficIndex * 0.5
      const capacityScore = v.capacity >= 4 ? 0 : 1
      let score = distance * 2 + trafficPenalty + capacityScore

      if (incident.priority >= 4 && v.type === 'swat_vehicle') score -= 2
      if (incident.type === 'assistance' && v.type === 'patrol_car') score -= 0.5

      return { vehicle: v, score }
    }).sort((a, b) => a.score - b.score)

    const bestVehicle = scoredVehicles[0].vehicle
    const vehicleOfficers = state.officers.filter(o => o.assignedVehicleId === bestVehicle.id && o.status === 'on_duty')
    let otherOfficers = state.officers.filter(o =>
      o.status === 'on_duty' && !o.assignedVehicleId && o.currentLoad < 2
    )
    if (excludeOfficerIds && excludeOfficerIds.length > 0) {
      otherOfficers = otherOfficers.filter(o => !excludeOfficerIds.includes(o.id))
    }

    const allCandidates = [...vehicleOfficers, ...otherOfficers].map(o => {
      const skillMatch = requiredSkills.filter(s => o.skills.includes(s)).length
      const loadPenalty = o.currentLoad * 2
      return { officer: o, score: -skillMatch * 2 + loadPenalty }
    }).sort((a, b) => a.score - b.score)

    const selectedOfficers = allCandidates.slice(0, Math.min(2, allCandidates.length)).map(x => x.officer)
    if (selectedOfficers.length === 0) return null
    const eta = Math.round(scoredVehicles[0].score * 3 + 5)

    const assignment: TaskAssignment = {
      id: uuidv4(),
      incidentId,
      vehicleId: bestVehicle.id,
      officerIds: selectedOfficers.map(o => o.id),
      eta,
      createdAt: dayjs().format(),
      confirmed: false
    }

    set(state => ({
      assignments: [...state.assignments, assignment],
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i, status: 'dispatched', dispatchedAt: dayjs().format(),
        assignedVehicleId: bestVehicle.id, assignedOfficerIds: selectedOfficers.map(o => o.id)
      } : i),
      vehicles: state.vehicles.map(v => v.id === bestVehicle.id ? {
        ...v, status: 'on_duty', currentIncidentId: incidentId,
        currentLoad: v.currentLoad + selectedOfficers.length
      } : v),
      officers: state.officers.map(o => selectedOfficers.some(so => so.id === o.id) ? {
        ...o, currentLoad: o.currentLoad + 1, currentIncidentIds: [...o.currentIncidentIds, incidentId]
      } : o)
    }))

    const log: Omit<AssignmentLog, 'id' | 'operatedAt'> = {
      incidentId,
      type: 'dispatch',
      operator: '系统自动派警',
      afterVehicle: { id: bestVehicle.id, plate: bestVehicle.plateNumber },
      afterOfficers: selectedOfficers.map(o => ({ id: o.id, name: o.name })),
      reason: `智能调度：距离 ${(calcDistance(incident.coordinates, bestVehicle.currentCoordinates) * 1000).toFixed(0)}m`
    }
    setTimeout(() => {
      get().addAssignmentLog(incidentId, log)
    }, 50)

    get().persist()
    return assignment
  },

  confirmAssignment: (assignmentId) => {
    const state = get()
    const assignment = state.assignments.find(a => a.id === assignmentId)
    if (!assignment) return
    set(state => ({
      assignments: state.assignments.map(a => a.id === assignmentId ? { ...a, confirmed: true } : a),
      incidents: state.incidents.map(i => i.id === assignment.incidentId ? { ...i, status: 'en_route' } : i)
    }))
    get().persist()
  },

  requestTransfer: (assignmentId, reason) => {
    const state = get()
    const assignment = state.assignments.find(a => a.id === assignmentId)
    if (!assignment) return

    const vehicle = state.vehicles.find(v => v.id === assignment.vehicleId)
    const officers = state.officers.filter(o => assignment.officerIds.includes(o.id))

    set(state => ({
      assignments: state.assignments.map(a => a.id === assignmentId ? {
        ...a, transferRequested: true, transferStatus: 'pending', transferReason: reason
      } : a)
    }))

    const log: Omit<AssignmentLog, 'id' | 'operatedAt'> = {
      incidentId: assignment.incidentId,
      type: 'transfer_request',
      operator: officers[0]?.name || '执勤警员',
      beforeVehicle: vehicle ? { id: vehicle.id, plate: vehicle.plateNumber } : undefined,
      beforeOfficers: officers.map(o => ({ id: o.id, name: o.name })),
      reason
    }
    get().addAssignmentLog(assignment.incidentId, log)

    get().persist()
  },

  approveTransfer: (assignmentId, approve) => {
    const state = get()
    const assignment = state.assignments.find(a => a.id === assignmentId)
    if (!assignment) return

    const oldVehicle = state.vehicles.find(v => v.id === assignment.vehicleId)
    const oldOfficers = state.officers.filter(o => assignment.officerIds.includes(o.id))
    const incidentId = assignment.incidentId

    if (approve) {
      const oldVehicleId = assignment.vehicleId
      const oldOfficerIds = [...assignment.officerIds]

      const log: Omit<AssignmentLog, 'id' | 'operatedAt'> = {
        incidentId,
        type: 'transfer_approved',
        operator: '指挥长',
        beforeVehicle: oldVehicle ? { id: oldVehicle.id, plate: oldVehicle.plateNumber } : undefined,
        beforeOfficers: oldOfficers.map(o => ({ id: o.id, name: o.name })),
        approvedBy: '指挥长',
        approvalComments: '同意转派，已调度新警力前往增援'
      }
      get().addAssignmentLog(incidentId, log)

      set(state => ({
        assignments: state.assignments.filter(a => a.id !== assignmentId),
        vehicles: state.vehicles.map(v => v.id === oldVehicleId ? {
          ...v, status: 'available' as const, currentIncidentId: undefined,
          currentLoad: Math.max(0, v.currentLoad - oldOfficerIds.length)
        } : v),
        officers: state.officers.map(o => oldOfficerIds.includes(o.id) ? {
          ...o, currentLoad: Math.max(0, o.currentLoad - 1),
          currentIncidentIds: o.currentIncidentIds.filter(id => id !== incidentId)
        } : o),
        incidents: state.incidents.map(i => i.id === incidentId ? {
          ...i, status: 'pending' as const, assignedVehicleId: undefined, assignedOfficerIds: []
        } : i)
      }))
      get().persist()

      setTimeout(() => {
        get().assignTask(incidentId, oldVehicleId, oldOfficerIds)
      }, 300)
    } else {
      set(state => ({
        assignments: state.assignments.map(a => a.id === assignmentId ? {
          ...a, transferRequested: false, transferStatus: 'rejected' as const
        } : a)
      }))

      const log: Omit<AssignmentLog, 'id' | 'operatedAt'> = {
        incidentId,
        type: 'transfer_rejected',
        operator: '指挥长',
        beforeVehicle: oldVehicle ? { id: oldVehicle.id, plate: oldVehicle.plateNumber } : undefined,
        beforeOfficers: oldOfficers.map(o => ({ id: o.id, name: o.name })),
        approvedBy: '指挥长',
        approvalComments: '驳回转派申请，请继续执行任务'
      }
      get().addAssignmentLog(incidentId, log)

      get().persist()
    }
  },

  addNoteToIncident: (incidentId, note) => {
    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i, notes: [...i.notes, note]
      } : i)
    }))
    get().persist()
  },

  closeIncident: (incidentId) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return
    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i, status: 'closed', closedAt: dayjs().format()
      } : i),
      assignments: state.assignments.filter(a => a.incidentId !== incidentId),
      vehicles: state.vehicles.map(v => v.currentIncidentId === incidentId ? {
        ...v, status: 'available', currentIncidentId: undefined,
        currentLoad: Math.max(0, v.currentLoad - (incident.assignedOfficerIds.length || 2))
      } : v),
      officers: state.officers.map(o => incident.assignedOfficerIds.includes(o.id) ? {
        ...o, currentLoad: Math.max(0, o.currentLoad - 1),
        currentIncidentIds: o.currentIncidentIds.filter(id => id !== incidentId)
      } : o)
    }))
    get().persist()
  },

  upgradeToJointOperation: (incidentId) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return

    const primaryVehicle = state.vehicles.find(v => v.id === incident.assignedVehicleId)
    const primaryOfficers = state.officers.filter(o => incident.assignedOfficerIds.includes(o.id))

    const primaryUnit: JointDisposalUnit = {
      id: uuidv4(),
      unitName: '主责处置组',
      role: 'primary',
      vehicleId: incident.assignedVehicleId || '',
      vehiclePlate: primaryVehicle?.plateNumber || '',
      officerIds: [...incident.assignedOfficerIds],
      officerNames: primaryOfficers.map(o => o.name),
      status: incident.status === 'en_route' || incident.status === 'handling' ? 'handling' : 'en_route',
      eta: 0,
      arrivedAt: incident.arrivedAt,
      task: '现场指挥与主要处置'
    }

    const defaultNodes: DisposalNode[] = [
      { id: uuidv4(), name: '接警响应', status: 'completed', completedAt: incident.reportedAt, completedBy: '指挥中心' },
      { id: uuidv4(), name: '警力部署', status: 'in_progress', completedBy: '指挥长' },
      { id: uuidv4(), name: '现场控制', status: 'pending' },
      { id: uuidv4(), name: '调查取证', status: 'pending' },
      { id: uuidv4(), name: '人员移交', status: 'pending' },
      { id: uuidv4(), name: '现场清理', status: 'pending' }
    ]

    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i,
        isJointOperation: true,
        jointUnits: [primaryUnit],
        disposalNodes: defaultNodes,
        assignmentLogs: i.assignmentLogs || [],
        onSiteDivision: i.onSiteDivision || ''
      } : i)
    }))
    get().persist()
  },

  addReinforcementUnit: (incidentId, unit) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident || !incident.isJointOperation) return

    const reinforcementVehicle = state.vehicles.find(v => v.id === unit.vehicleId)
    if (reinforcementVehicle) {
      set(state => ({
        vehicles: state.vehicles.map(v => v.id === unit.vehicleId ? {
          ...v, status: 'on_duty', currentIncidentId: incidentId,
          currentLoad: v.currentLoad + unit.officerIds.length
        } : v),
        officers: state.officers.map(o => unit.officerIds.includes(o.id) ? {
          ...o, currentLoad: o.currentLoad + 1, currentIncidentIds: [...o.currentIncidentIds, incidentId]
        } : o)
      }))
    }

    const newUnit: JointDisposalUnit = {
      ...unit,
      id: uuidv4(),
      role: 'reinforcement'
    }

    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i,
        jointUnits: [...(i.jointUnits || []), newUnit]
      } : i)
    }))
    get().persist()
  },

  updateDisposalNode: (incidentId, nodeId, status, notes) => {
    set(state => ({
      incidents: state.incidents.map(i => {
        if (i.id !== incidentId) return i
        return {
          ...i,
          disposalNodes: (i.disposalNodes || []).map(n => {
            if (n.id !== nodeId) return n
            const updated: DisposalNode = { ...n, status }
            if (status === 'completed') {
              updated.completedAt = dayjs().format()
              updated.completedBy = '指挥长'
            }
            if (notes) updated.notes = notes
            return updated
          })
        }
      })
    }))
    get().persist()
  },

  addDisposalNode: (incidentId, nodeName) => {
    set(state => ({
      incidents: state.incidents.map(i => {
        if (i.id !== incidentId) return i
        const newNode: DisposalNode = {
          id: uuidv4(),
          name: nodeName,
          status: 'pending'
        }
        return {
          ...i,
          disposalNodes: [...(i.disposalNodes || []), newNode]
        }
      })
    }))
    get().persist()
  },

  updateOnSiteDivision: (incidentId, division) => {
    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i, onSiteDivision: division
      } : i)
    }))
    get().persist()
  },

  addAssignmentLog: (incidentId, log) => {
    const newLog: AssignmentLog = {
      ...log,
      id: uuidv4(),
      operatedAt: dayjs().format()
    }
    set(state => ({
      incidents: state.incidents.map(i => i.id === incidentId ? {
        ...i,
        assignmentLogs: [...(i.assignmentLogs || []), newLog]
      } : i)
    }))
    get().persist()
  },

  verifyTransfer: (incidentId, passed, comments) => {
    const state = get()
    const incident = state.incidents.find(i => i.id === incidentId)
    if (!incident) return

    if (passed) {
      const log: Omit<AssignmentLog, 'id' | 'operatedAt'> = {
        incidentId,
        type: 'acceptance',
        operator: '指挥长',
        afterVehicle: incident.assignedVehicleId ? {
          id: incident.assignedVehicleId,
          plate: state.vehicles.find(v => v.id === incident.assignedVehicleId)?.plateNumber || ''
        } : undefined,
        afterOfficers: incident.assignedOfficerIds.map(id => ({
          id,
          name: state.officers.find(o => o.id === id)?.name || ''
        })),
        approvalComments: comments || '验收通过，新警力已到位'
      }
      get().addAssignmentLog(incidentId, log)
    }
    get().persist()
  },

  addCase: (data) => {
    const newCase: Case = {
      ...data, id: uuidv4(),
      transcripts: [], evidences: [], notes: '', isOverdue: false
    }
    set(state => ({ cases: [newCase, ...state.cases] }))
    get().persist()
    return newCase
  },

  updateCaseStatus: (id, status) => {
    set(state => ({
      cases: state.cases.map(c => {
        if (c.id !== id) return c
        const updated: Case = { ...c, status }
        if (status === 'solved') updated.solvedAt = dayjs().format()
        if (status === 'transferred') updated.transferredAt = dayjs().format()
        return updated
      })
    }))
    get().persist()
  },

  addTranscript: async (caseId, transcript, file) => {
    const extra: any = {}
    if (file) {
      const fileInfo = await saveFileToIndexedDB(file)
      extra.fileId = fileInfo.id
      extra.fileName = fileInfo.name
      extra.fileType = fileInfo.type
      extra.fileSize = fileInfo.size
    }
    set(state => ({
      cases: state.cases.map(c => c.id === caseId ? {
        ...c, transcripts: [...c.transcripts, { ...transcript, id: uuidv4(), ...extra }]
      } : c)
    }))
    get().persist()
  },

  addEvidence: async (caseId, evidence, file) => {
    const extra: any = {}
    if (file) {
      const fileInfo = await saveFileToIndexedDB(file)
      extra.fileId = fileInfo.id
      extra.fileName = fileInfo.name
      extra.fileType = fileInfo.type
      extra.fileSize = fileInfo.size
    }
    set(state => ({
      cases: state.cases.map(c => c.id === caseId ? {
        ...c, evidences: [...c.evidences, { ...evidence, id: uuidv4(), ...extra }]
      } : c)
    }))
    get().persist()
  },

  generateSchedules: () => {
    set({ schedules: generateInitialSchedules() })
    get().persist()
  },

  requestScheduleChange: (scheduleId, target) => {
    const state = get()
    const schedule = state.schedules.find(s => s.id === scheduleId)
    if (!schedule) return

    set(state => ({
      schedules: state.schedules.map(s => s.id === scheduleId ? {
        ...s,
        changeRequested: true,
        changeStatus: 'pending',
        changeTargetDate: target.date,
        changeTargetShift: target.shift,
        changeTargetAreaId: target.areaId,
        changeTargetAreaName: target.areaName,
        changeReason: target.reason,
        originalSchedule: { date: s.date, shift: s.shift, areaName: s.areaName }
      } : s)
    }))
    get().persist()
  },

  approveScheduleChange: (scheduleId, approve) => {
    const state = get()
    const schedule = state.schedules.find(s => s.id === scheduleId)
    if (!schedule) return

    if (approve && schedule.changeTargetDate && schedule.changeTargetShift && schedule.changeTargetAreaId) {
      const targetArea = state.areas.find(a => a.id === schedule.changeTargetAreaId)
      set(state => ({
        schedules: state.schedules.map(s => s.id === scheduleId ? {
          ...s,
          date: schedule.changeTargetDate!,
          shift: schedule.changeTargetShift!,
          areaId: schedule.changeTargetAreaId!,
          areaName: schedule.changeTargetAreaName!,
          riskLevel: targetArea?.riskLevel || s.riskLevel,
          changeRequested: false,
          changeStatus: 'approved',
          changeTargetDate: undefined,
          changeTargetShift: undefined,
          changeTargetAreaId: undefined,
          changeTargetAreaName: undefined,
          changeReason: undefined,
          originalSchedule: undefined
        } : s)
      }))
    } else {
      set(state => ({
        schedules: state.schedules.map(s => s.id === scheduleId ? {
          ...s,
          changeRequested: false,
          changeStatus: 'rejected',
          changeTargetDate: undefined,
          changeTargetShift: undefined,
          changeTargetAreaId: undefined,
          changeTargetAreaName: undefined,
          changeReason: undefined,
          originalSchedule: undefined
        } : s)
      }))
    }
    get().persist()
  },

  markAlertRead: (alertId) => {
    set(state => ({
      alerts: state.alerts.map(a => a.id === alertId ? { ...a, read: true } : a)
    }))
    get().persist()
  },

  acknowledgeCameraAlert: (cameraId, notes) => {
    const camera = get().cameras.find(c => c.id === cameraId)
    const log: CameraAlertLog = {
      id: uuidv4(),
      cameraId,
      alertType: camera?.alertType || 'unknown',
      alertStartedAt: camera?.alertStartedAt || dayjs().format(),
      acknowledgedAt: dayjs().format(),
      acknowledgedBy: '指挥长·系统管理员',
      notes,
      processingNotes: notes || '已确认报警，通知附近巡逻警员前往处置'
    }
    set(state => ({
      cameras: state.cameras.map(c => c.id === cameraId ? {
        ...c, hasAlert: false, alertType: undefined, alertStartedAt: undefined
      } : c),
      alerts: state.alerts.filter(a => !(a.type === 'abnormal_behavior' && a.relatedId === cameraId)),
      cameraAlertLogs: [...state.cameraAlertLogs, log]
    }))
    get().persist()
  },

  toggleAlertSound: (enabled) => {
    set({ alertSoundEnabled: enabled })
  },

  checkOverdueIncidents: () => {
    const state = get()
    const now = dayjs()
    state.incidents.forEach(inc => {
      if (inc.status === 'dispatched' && inc.dispatchedAt) {
        const diff = now.diff(dayjs(inc.dispatchedAt), 'minute')
        if (diff > 10 && !inc.isOverdue) {
          if (state.alertSoundEnabled) {
            playAlertSound()
          }
          const newAlert: Alert = {
            id: uuidv4(), type: 'overdue_incident', title: '出警超时预警',
            message: `警情【${inc.location}】派警${diff}分钟仍未到场，请关注！`,
            severity: 'error', relatedId: inc.id, createdAt: now.format(), read: false
          }
          set(s => ({
            incidents: s.incidents.map(i => i.id === inc.id ? { ...i, isOverdue: true, escalated: true } : i),
            alerts: [newAlert, ...s.alerts]
          }))
          get().persist()
        }
      }
    })

    state.cameras.forEach(cam => {
      if (cam.hasAlert && state.alertSoundEnabled) {
        playAlertSound()
      }
    })
  },

  checkOverdueCases: () => {
    const state = get()
    const now = dayjs()
    state.cases.forEach(c => {
      if (c.status === 'investigating' || c.status === 'accepted') {
        const diff = now.diff(dayjs(c.acceptedAt), 'day')
        if (diff > 30 && !c.isOverdue) {
          const newAlert: Alert = {
            id: uuidv4(), type: 'overdue_case', title: '案件超期预警',
            message: `案件【${c.caseNumber} ${c.title}】已受理${diff}天未破案，请关注！`,
            severity: 'warning', relatedId: c.id, createdAt: now.format(), read: false
          }
          set(s => ({
            cases: s.cases.map(cc => cc.id === c.id ? { ...cc, isOverdue: true } : cc),
            alerts: [newAlert, ...s.alerts]
          }))
          get().persist()
        }
      }
    })
  },

  getStatistics: () => {
    const state = get()
    const now = dayjs()
    const thisMonth = now.format('YYYY-MM')

    const monthIncidents = state.incidents.filter(i => dayjs(i.reportedAt).format('YYYY-MM') === thisMonth)
    const monthCases = state.cases.filter(c => dayjs(c.acceptedAt).format('YYYY-MM') === thisMonth)

    const incidentsByType = { criminal: 0, public_order: 0, assistance: 0 }
    monthIncidents.forEach(i => { incidentsByType[i.type]++ })

    const incidentsByTime: Record<string, number> = {}
    for (let h = 0; h < 24; h++) {
      incidentsByTime[`${h.toString().padStart(2, '0')}:00`] = 0
    }
    monthIncidents.forEach(i => {
      const hour = dayjs(i.reportedAt).format('HH') + ':00'
      incidentsByTime[hour] = (incidentsByTime[hour] || 0) + 1
    })

    const responseTimes = monthIncidents
      .filter(i => i.dispatchedAt && i.arrivedAt)
      .map(i => dayjs(i.arrivedAt).diff(dayjs(i.dispatchedAt), 'minute'))
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0

    const solvedCases = monthCases.filter(c => c.status === 'solved' || c.status === 'transferred').length

    return {
      totalIncidents: monthIncidents.length,
      incidentsByType,
      incidentsByTime,
      avgResponseTime,
      solvedCases,
      totalCases: monthCases.length,
      solveRate: monthCases.length > 0 ? Math.round((solvedCases / monthCases.length) * 100) : 0
    }
  }
}))
