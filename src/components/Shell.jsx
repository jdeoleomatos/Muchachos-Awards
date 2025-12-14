import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function Shell({ children }) {
  const { pathname } = useLocation()
  const { user, isAdmin, logout } = useAuth()

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-sm font-semibold tracking-wide">
            Muchachos Awards
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cx(
                  'rounded-md px-3 py-1.5 hover:bg-zinc-900',
                  isActive ? 'bg-zinc-900' : 'text-zinc-300',
                )
              }
            >
              Votar
            </NavLink>

            <NavLink
              to="/resultados"
              className={({ isActive }) =>
                cx(
                  'rounded-md px-3 py-1.5 hover:bg-zinc-900',
                  isActive ? 'bg-zinc-900' : 'text-zinc-300',
                )
              }
            >
              Resultados
            </NavLink>

            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-3 py-1.5 hover:bg-zinc-900',
                    isActive ? 'bg-zinc-900' : 'text-zinc-300',
                  )
                }
              >
                Admin
              </NavLink>
            ) : null}

            {user ? (
              <button
                type="button"
                onClick={logout}
                className="rounded-md px-3 py-1.5 text-zinc-300 hover:bg-zinc-900"
              >
                Salir
              </button>
            ) : pathname !== '/login' ? (
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-zinc-300 hover:bg-zinc-900"
              >
                Entrar
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>

      <footer className="border-t border-zinc-900 py-6">
        <div className="mx-auto w-full max-w-5xl px-4 text-xs text-zinc-500">
          {user ? (
            <span>
              Sesión: <span className="text-zinc-300">{user.username}</span>
              {isAdmin ? ' (admin)' : ''}
            </span>
          ) : (
            <span>Modo: anónimo</span>
          )}
        </div>
      </footer>
    </div>
  )
}
