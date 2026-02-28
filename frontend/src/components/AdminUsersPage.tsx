import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/client'
import type { User } from '../types'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.listUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleDisable = async (userId: string) => {
    setActionLoading(true)
    try {
      const updated = await api.disableUser(userId)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  const handleEnable = async (userId: string) => {
    setActionLoading(true)
    try {
      const updated = await api.enableUser(userId)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleForcePasswordChange = async (userId: string) => {
    setActionLoading(true)
    try {
      const updated = await api.forcePasswordChange(userId)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force password change')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Loading users...</div>
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Manage Users</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">dismiss</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id
              return (
                <tr key={u.id} className={u.is_disabled ? 'bg-red-50/50' : ''}>
                  <td className="px-4 py-3 text-slate-900">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'superadmin'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_disabled ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">disabled</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">active</span>
                    )}
                    {u.force_password_change && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">pw change</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">you</span>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        {u.is_disabled ? (
                          <button
                            onClick={() => handleEnable(u.id)}
                            disabled={actionLoading}
                            className="text-xs px-3 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({ userId: u.id, action: 'disable' })}
                            disabled={actionLoading}
                            className="text-xs px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Disable
                          </button>
                        )}
                        {!u.force_password_change && !u.is_disabled && (
                          <button
                            onClick={() => handleForcePasswordChange(u.id)}
                            disabled={actionLoading}
                            className="text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                          >
                            Force PW Change
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm disable dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Disable User?</h2>
            <p className="text-sm text-slate-600 mb-4">
              This will immediately revoke all API access for this user. They will not be able to log in until re-enabled.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisable(confirmAction.userId)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
