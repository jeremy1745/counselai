import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-slate-900 px-6 py-3 flex items-center gap-3">
        <Link to="/" className="text-xl font-bold text-white">CAISE</Link>
        <span className="text-sm text-slate-400">AI Legal Assistant</span>
        {user && (
          <div className="ml-auto flex items-center gap-3">
            {user.role === 'superadmin' && (
              <Link
                to="/admin/users"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Manage Users
              </Link>
            )}
            <span className="text-sm text-slate-300">{user.email}</span>
            {user.role === 'superadmin' && (
              <span className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full font-medium">
                superadmin
              </span>
            )}
            <button
              onClick={logout}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
