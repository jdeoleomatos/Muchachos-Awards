import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const COOLDOWN_MS = 45 * 60 * 1000
const LS_COOLDOWNS = 'mawards.cooldowns'

function readCooldowns() {
  try {
    const raw = localStorage.getItem(LS_COOLDOWNS)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

function writeCooldowns(next) {
  localStorage.setItem(LS_COOLDOWNS, JSON.stringify(next))
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function normalizeCategories(rows) {
  return (rows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    nominees: (c.category_nominees ?? []).map((cn) => ({
      id: cn.nominees?.id,
      name: cn.nominees?.name,
      votes_count: cn.votes_count ?? 0,
    })),
  }))
}

export function VotePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)

  const [isVoting, setIsVoting] = useState(false)
  const [toast, setToast] = useState(null)

  const [cooldowns, setCooldowns] = useState(() => readCooldowns())
  const [now, setNow] = useState(() => Date.now())

  const [open, setOpen] = useState(() => ({}))

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      const baseSelect = 'id,name,category_nominees(votes_count,nominees(id,name))'
      let { data, error: qError } = await supabase
        .from('categories')
        .select(`id,name,description,category_nominees(votes_count,nominees(id,name))`)
        .order('created_at', { ascending: true })

      // Fallback if DB lacks categories.description
      if (qError?.message?.toLowerCase?.().includes('categories.description') &&
          qError?.message?.toLowerCase?.().includes('does not exist')) {
        ;({ data, error: qError } = await supabase
          .from('categories')
          .select(baseSelect)
          .order('created_at', { ascending: true }))
      }

      if (!isMounted) return

      if (qError) {
        setError(qError.message)
        setIsLoading(false)
        return
      }

      setCategories(normalizeCategories(data ?? []))
      setOpen((prev) => {
        if (Object.keys(prev).length > 0) return prev
        const next = {}
        for (const c of data ?? []) next[c.id] = true
        return next
      })
      setIsLoading(false)
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  function remainingMsForCategory(categoryId) {
    const last = cooldowns?.[categoryId]
    if (!last) return 0
    const remaining = Number(last) + COOLDOWN_MS - now
    return remaining > 0 ? remaining : 0
  }

  async function vote(categoryId, nomineeId) {
    setToast(null)
    setIsVoting(true)
    try {
      const { error: rpcError } = await supabase.rpc('cast_vote', {
        p_category_id: categoryId,
        p_nominee_id: nomineeId,
      })
      if (rpcError) throw rpcError

      const nextCooldowns = { ...cooldowns, [categoryId]: Date.now() }
      setCooldowns(nextCooldowns)
      writeCooldowns(nextCooldowns)

      setToast({
        type: 'success',
        message: 'Voto registrado. Puedes volver a votar en 45 minutos para esta categoría.',
      })
    } catch (err) {
      setToast({ type: 'error', message: err?.message ?? 'No se pudo votar' })
    } finally {
      setIsVoting(false)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Cargando categorías…</div>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Votaciones</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Puedes votar en anónimo. Cada categoría tiene un cooldown de 45 minutos por dispositivo.
        </p>
      </div>

      {toast ? (
        <div
          className={
            toast.type === 'success'
              ? 'rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200'
              : 'rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200'
          }
        >
          {toast.message}
        </div>
      ) : null}

      {categories.length === 0 ? (
        <div className="rounded-xl border bg-zinc-950 p-4 text-sm text-zinc-400">
          No hay categorías aún.
        </div>
      ) : null}

      <div className="grid gap-4">
        {categories.map((c) => (
          <section key={c.id} className="rounded-2xl border bg-zinc-950 p-5">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                {c.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                {remainingMsForCategory(c.id) > 0 ? (
                  <span className="text-xs text-zinc-400">
                    Disponible en {formatRemaining(remainingMsForCategory(c.id))}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">Listo</span>
                )}
                <div className="mt-1 text-xs text-zinc-500">
                  {open[c.id] ? 'Ocultar' : 'Ver'}
                </div>
              </div>
            </button>

            {open[c.id] ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(c.nominees ?? []).map((n) => (
                  <button
                    key={n.id}
                    disabled={isVoting || remainingMsForCategory(c.id) > 0}
                    onClick={() => vote(c.id, n.id)}
                    className="flex items-center justify-between rounded-xl border bg-zinc-900/30 px-4 py-3 text-left text-sm hover:bg-zinc-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="font-medium">{n.name}</span>
                    <span className="text-xs text-zinc-400">
                      {remainingMsForCategory(c.id) > 0
                        ? 'Cooldown'
                        : isVoting
                          ? 'Enviando…'
                          : 'Votar'}
                    </span>
                  </button>
                ))}

                {(c.nominees ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
                    Sin nominados
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
