import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '../types'
import * as api from '../api/client'

interface AuthContextValue {
  user: User | null
  loading: boolean
  forcePasswordChange: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [forcePasswordChange, setForcePasswordChange] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api.getMe()
      .then((u) => {
        setUser(u)
        setForcePasswordChange(u.force_password_change)
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem('token', res.access_token)
    setUser(res.user)
    setForcePasswordChange(res.force_password_change)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.register(email, password)
    localStorage.setItem('token', res.access_token)
    setUser(res.user)
    setForcePasswordChange(false)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    setForcePasswordChange(false)
  }, [])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await api.changePassword(oldPassword, newPassword)
    setForcePasswordChange(false)
    if (user) {
      setUser({ ...user, force_password_change: false })
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, forcePasswordChange, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
