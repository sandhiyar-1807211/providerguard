import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import WorkQueue from './pages/WorkQueue'
import AuditTrail from './pages/AuditTrail'
import AdminConfig from './pages/AdminConfig'

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/queue" element={<WorkQueue />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/admin" element={<AdminConfig />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}