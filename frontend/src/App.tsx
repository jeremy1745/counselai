import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import CaseList from './components/CaseList'
import CaseDetail from './components/CaseDetail'
import LoginPage from './components/LoginPage'
import ChangePasswordPage from './components/ChangePasswordPage'
import AdminUsersPage from './components/AdminUsersPage'

function AppRoutes() {
  const { user, loading, forcePasswordChange } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (forcePasswordChange) {
    return <ChangePasswordPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CaseList />} />
        <Route path="/cases/:caseId/*" element={<CaseDetail />} />
        {user.role === 'superadmin' && (
          <Route path="/admin/users" element={<AdminUsersPage />} />
        )}
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
