import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'

function normalizeCategories(rows) {
  return (rows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    nominees: (c.category_nominees ?? []).map((cn) => ({
      nomineeId: cn.nominees?.id,
      nomineeName: cn.nominees?.name,
      votes: cn.votes_count ?? 0,
    })),
  }))
}

export function ResultsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setError(supabaseConfigError)
          setIsLoading(false)
        }
        return
      }

      const { data, error: qError } = await supabase
        .from('categories')
        .select('id,name,created_at,category_nominees(votes_count,nominees(id,name))')
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (qError) {
        setError(qError.message)
        setIsLoading(false)
        return
      }

      setCategories(normalizeCategories(data))
      setIsLoading(false)
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const { most, least, totalNominees } = useMemo(() => {
    const totals = new Map()

    for (const category of categories) {
      for (const n of category.nominees ?? []) {
        if (!n.nomineeId) continue
        const prev = totals.get(n.nomineeId)
        const nextVotes = (prev?.votes ?? 0) + (n.votes ?? 0)
        totals.set(n.nomineeId, { id: n.nomineeId, name: n.nomineeName ?? '', votes: nextVotes })
      }
    }

    const all = Array.from(totals.values()).filter((x) => x.name)
    if (all.length === 0) {
      return { most: [], least: [], totalNominees: 0 }
    }

    let maxVotes = all[0].votes
    let minVotes = all[0].votes

    for (const item of all) {
      if (item.votes > maxVotes) maxVotes = item.votes
      if (item.votes < minVotes) minVotes = item.votes
    }

    const mostTies = all.filter((x) => x.votes === maxVotes).sort((a, b) => a.name.localeCompare(b.name))
    const leastTies = all.filter((x) => x.votes === minVotes).sort((a, b) => a.name.localeCompare(b.name))

    return { most: mostTies, least: leastTies, totalNominees: all.length }
  }, [categories])

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Cargando resultados…</div>
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
        <h1 className="text-2xl font-semibold">Resultados</h1>
        <p className="mt-1 text-sm text-zinc-400">Nombrados con más y menos votos (total acumulado).</p>
      </div>

      {totalNominees === 0 ? (
        <div className="rounded-xl border bg-zinc-950 p-4 text-sm text-zinc-400">
          No hay votos / nominados para calcular resultados.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Más votos</h2>
            <div className="mt-3 grid gap-2">
              {most.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-xl border bg-zinc-900/20 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{n.name}</div>
                  </div>
                  <div className="shrink-0 text-sm text-zinc-200">{n.votes}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Menos votos</h2>
            <div className="mt-3 grid gap-2">
              {least.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-xl border bg-zinc-900/20 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{n.name}</div>
                  </div>
                  <div className="shrink-0 text-sm text-zinc-200">{n.votes}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
