export type IncidentType = 'criminal' | 'public_order' | 'assistance'
export type IncidentStatus = 'pending' | 'dispatched' | 'en_route' | 'handling' | 'closed'
export type PriorityLevel = 1 | 2 | 3 | 4 | 5
export type CaseStatus = 'accepted' | 'investigating' | 'solved' | 'transferred'
export type TransferStatus = 'pending' | 'approved' | 'rejected'
export type ScheduleChangeStatus = 'pending' | 'approved' | 'rejected'
export type UnitRole = 'primary' | 'reinforcement'
export type AssignmentLogType = 'dispatch' | 'transfer_request' | 'transfer_approved' | 'transfer_rejected' | 'acceptance' | 'reinforcement'
export type CommandStatus = 'sent' | 'received' | 'in_progress' | 'completed'
export type CommandPriority = 'normal' | 'urgent' | 'critical'
export type UnitCategory = 'patrol' | 'swat' | 'traffic' | 'tech' | 'fire' | 'medical' | 'other'

export interface Incident {
  id: string
  callerName: string
  callerPhone: string
  location: string
  coordinates: [number, number]
  description: string
  type: IncidentType
  priority: PriorityLevel
  status: IncidentStatus
  reportedAt: string
  dispatchedAt?: string
  arrivedAt?: string
  closedAt?: string
  assignedVehicleId?: string
  assignedOfficerIds: string[]
  notes: string[]
  isOverdue?: boolean
  escalated?: boolean
  cameraIds: string[]
  isJointOperation?: boolean
  jointUnits?: JointDisposalUnit[]
  disposalNodes?: DisposalNode[]
  assignmentLogs?: AssignmentLog[]
  onSiteDivision?: string
  onSiteDivisionHistory?: OnSiteDivisionChange[]
  commands?: CollaborationCommand[]
}

export interface OnSiteDivisionChange {
  id: string
  changedAt: string
  changedBy: string
  beforeContent: string
  afterContent: string
}

export interface PoliceVehicle {
  id: string
  plateNumber: string
  type: 'patrol_car' | 'swat_vehicle' | 'fire_vehicle' | 'ambulance'
  currentCoordinates: [number, number]
  capacity: number
  currentLoad: number
  status: 'available' | 'on_duty' | 'maintenance'
  currentIncidentId?: string
  trafficIndex: number
}

export interface PoliceOfficer {
  id: string
  name: string
  badgeNumber: string
  rank: string
  skills: string[]
  currentLoad: number
  status: 'on_duty' | 'off_duty' | 'on_leave'
  assignedVehicleId?: string
  currentIncidentIds: string[]
  contact: string
}

export interface TaskAssignment {
  id: string
  incidentId: string
  vehicleId: string
  officerIds: string[]
  eta: number
  createdAt: string
  confirmed: boolean
  transferRequested?: boolean
  transferStatus?: TransferStatus
  transferReason?: string
}

export interface Camera {
  id: string
  name: string
  location: string
  coordinates: [number, number]
  status: 'online' | 'offline'
  hasAlert: boolean
  alertType?: string
  alertStartedAt?: string
  alertSoundEnabled?: boolean
}

export interface Schedule {
  id: string
  officerId: string
  date: string
  shift: 'morning' | 'afternoon' | 'night'
  areaId: string
  areaName: string
  riskLevel: 'low' | 'medium' | 'high'
  changeRequested?: boolean
  changeStatus?: ScheduleChangeStatus
  changeTargetDate?: string
  changeTargetShift?: 'morning' | 'afternoon' | 'night'
  changeTargetAreaId?: string
  changeTargetAreaName?: string
  changeReason?: string
  originalSchedule?: { date: string; shift: string; areaName: string }
}

export interface Area {
  id: string
  name: string
  riskLevel: 'low' | 'medium' | 'high'
  crimeRate: number
}

export interface Case {
  id: string
  caseNumber: string
  title: string
  type: string
  status: CaseStatus
  relatedIncidentId?: string
  officerInCharge: string
  acceptedAt: string
  solvedAt?: string
  transferredAt?: string
  transcripts: Transcript[]
  evidences: Evidence[]
  notes: string
  isOverdue?: boolean
}

export interface Transcript {
  id: string
  title: string
  content: string
  uploadedAt: string
  uploadedBy: string
  fileId?: string
  fileName?: string
  fileType?: string
  fileSize?: number
}

export interface Evidence {
  id: string
  name: string
  type: 'document' | 'image' | 'video' | 'audio' | 'physical'
  description: string
  uploadedAt: string
  fileId?: string
  fileName?: string
  fileType?: string
  fileSize?: number
}

export interface CameraAlertLog {
  id: string
  cameraId: string
  alertType: string
  alertStartedAt: string
  acknowledgedAt: string
  acknowledgedBy: string
  notes?: string
  processingNotes?: string
}

export interface Alert {
  id: string
  type: 'overdue_incident' | 'abnormal_behavior' | 'overdue_case' | 'escalation'
  title: string
  message: string
  severity: 'warning' | 'error' | 'info'
  relatedId: string
  createdAt: string
  read: boolean
}

export interface Statistics {
  totalIncidents: number
  incidentsByType: Record<IncidentType, number>
  incidentsByTime: Record<string, number>
  avgResponseTime: number
  solvedCases: number
  totalCases: number
  solveRate: number
}

export interface JointDisposalUnit {
  id: string
  unitName: string
  role: UnitRole
  unitCategory: UnitCategory
  vehicleId: string
  vehiclePlate: string
  officerIds: string[]
  officerNames: string[]
  status: 'en_route' | 'arrived' | 'handling' | 'completed'
  eta?: number
  arrivedAt?: string
  confirmedArrivedAt?: string
  confirmedArrivedBy?: string
  task: string
  lastFeedback?: string
  lastFeedbackAt?: string
}

export interface DisposalNode {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  startedAt?: string
  completedAt?: string
  completedBy?: string
  notes?: string
  expectedDurationMin?: number
}

export interface AssignmentLog {
  id: string
  incidentId: string
  type: AssignmentLogType
  operator: string
  operatedAt: string
  beforeVehicle?: { id: string; plate: string }
  afterVehicle?: { id: string; plate: string }
  beforeOfficers?: Array<{ id: string; name: string }>
  afterOfficers?: Array<{ id: string; name: string }>
  reason?: string
  approvalComments?: string
  approvedBy?: string
}

export interface CollaborationCommand {
  id: string
  incidentId: string
  unitId: string
  unitName: string
  unitCategory: UnitCategory
  content: string
  priority: CommandPriority
  status: CommandStatus
  issuedBy: string
  issuedAt: string
  deadline?: string
  feedbacks: CommandFeedback[]
}

export interface CommandFeedback {
  id: string
  commandId: string
  status: CommandStatus
  content: string
  providedBy: string
  providedAt: string
  attachments?: Array<{ name: string; type: string; url: string }>
}
