import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !isSubmitting
  }, [username, password, isSubmitting])

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err?.message ?? 'No se pudo iniciar sesión')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-zinc-950/70 p-6 backdrop-blur">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Administra categorías y nominados, o vota.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-300">Correo</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
              placeholder="admin@admin"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-300">Contraseña</span>
            <div className="mt-1 flex w-full items-stretch overflow-hidden rounded-lg border bg-zinc-900/40 focus-within:ring-2 focus-within:ring-zinc-200/20">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-900/60"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Votar en anónimo
          </button>
        </form>
      </div>
    </div>
  )
}
