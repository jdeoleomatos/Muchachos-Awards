import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { AdminPage } from './pages/Admin.jsx'
import { LoginPage } from './pages/Login.jsx'
import { ResultsPage } from './pages/Results.jsx'
import { VotePage } from './pages/Vote.jsx'

function AdminRoute({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user?.is_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/resultados" element={<ResultsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
