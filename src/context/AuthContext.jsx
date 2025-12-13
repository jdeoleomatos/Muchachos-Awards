import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const LS_ADMIN = 'mawards.admin'

function readStoredAdmin() {
  try {
    const raw = localStorage.getItem(LS_ADMIN)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.username || !parsed?.password) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredAdmin(admin) {
  if (!admin) {
    localStorage.removeItem(LS_ADMIN)
    return
  }
  localStorage.setItem(LS_ADMIN, JSON.stringify(admin))
}

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true)
  const [admin, setAdmin] = useState(() => readStoredAdmin())
  const [user, setUser] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function hydrate() {
      const stored = readStoredAdmin()
      if (!stored?.username || !stored?.password) {
        if (isMounted) {
          setAdmin(null)
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      const { data, error } = await supabase.rpc('admin_login', {
        p_username: stored.username,
        p_password: stored.password,
      })

      if (!isMounted) return

      if (error || !data?.ok) {
        setAdmin(null)
        setUser(null)
        writeStoredAdmin(null)
        setIsLoading(false)
        return
      }

      setAdmin(stored)
      setUser({ id: data.id, username: data.username, is_admin: data.is_admin })
      setIsLoading(false)
    }

    hydrate()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo(() => {
    return {
      isLoading,
      admin,
      user,
      isAdmin: Boolean(user?.is_admin),
      async login({ username, password }) {
        const { data, error } = await supabase.rpc('admin_login', {
          p_username: username,
          p_password: password,
        })
        if (error) throw error

        if (!data?.ok) {
          throw new Error('Usuario o contraseña inválidos')
        }

        const nextAdmin = { username: username.trim(), password }
        setAdmin(nextAdmin)
        writeStoredAdmin(nextAdmin)
        setUser({ id: data.id, username: data.username, is_admin: data.is_admin })
      },
      logout() {
        setAdmin(null)
        setUser(null)
        writeStoredAdmin(null)
      },
    }
  }, [isLoading, admin, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
