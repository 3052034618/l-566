import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout'
import Dashboard from './pages/Dashboard'
import IncidentEntry from './pages/IncidentEntry'
import IncidentList from './pages/IncidentList'
import Dispatch from './pages/Dispatch'
import IncidentTracking from './pages/IncidentTracking'
import VideoMonitor from './pages/VideoMonitor'
import Schedule from './pages/Schedule'
import CaseManagement from './pages/CaseManagement'
import Statistics from './pages/Statistics'
import JointReview from './pages/JointReview'
import { usePoliceStore } from './store/policeStore'

export default function App() {
  const checkOverdueIncidents = usePoliceStore(s => s.checkOverdueIncidents)
  const checkOverdueCases = usePoliceStore(s => s.checkOverdueCases)
  const initialize = usePoliceStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const t1 = setInterval(checkOverdueIncidents, 30000)
    const t2 = setInterval(checkOverdueCases, 60000)
    checkOverdueIncidents()
    checkOverdueCases()
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [checkOverdueIncidents, checkOverdueCases])

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="incidents/new" element={<IncidentEntry />} />
        <Route path="incidents" element={<IncidentList />} />
        <Route path="dispatch" element={<Dispatch />} />
        <Route path="tracking" element={<IncidentTracking />} />
        <Route path="video" element={<VideoMonitor />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="cases" element={<CaseManagement />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="joint-review" element={<JointReview />} />
      </Route>
    </Routes>
  )
}
