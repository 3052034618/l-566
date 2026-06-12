export type IncidentType = 'criminal' | 'public_order' | 'assistance'
export type IncidentStatus = 'pending' | 'dispatched' | 'en_route' | 'handling' | 'closed'
export type PriorityLevel = 1 | 2 | 3 | 4 | 5
export type CaseStatus = 'accepted' | 'investigating' | 'solved' | 'transferred'
export type TransferStatus = 'pending' | 'approved' | 'rejected'
export type ScheduleChangeStatus = 'pending' | 'approved' | 'rejected'

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
  acknowledgedAt: string
  acknowledgedBy: string
  notes?: string
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
