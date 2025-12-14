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

function winnersForCategory(category) {
  const list = (category?.nominees ?? []).filter((n) => n.nomineeId && n.nomineeName)
  if (list.length === 0) return { totalVotes: 0, winners: [] }

  let maxVotes = list[0].votes
  let totalVotes = 0
  for (const n of list) {
    totalVotes += n.votes
    if (n.votes > maxVotes) maxVotes = n.votes
  }

  const winners = list
    .filter((n) => n.votes === maxVotes)
    .sort((a, b) => String(a.nomineeName).localeCompare(String(b.nomineeName)))

  return { totalVotes, winners }
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

  const { topCategories, perCategory } = useMemo(() => {
    const per = (categories ?? []).map((c) => {
      const r = winnersForCategory(c)
      return {
        categoryId: c.id,
        categoryName: c.name,
        totalVotes: r.totalVotes,
        winners: r.winners,
      }
    })

    const withVotes = per.filter((x) => x.winners.length > 0)
    if (withVotes.length === 0) return { topCategories: [], perCategory: per }

    let maxTotal = withVotes[0].totalVotes
    for (const item of withVotes) {
      if (item.totalVotes > maxTotal) maxTotal = item.totalVotes
    }

    const top = withVotes
      .filter((x) => x.totalVotes === maxTotal)
      .sort((a, b) => String(a.categoryName).localeCompare(String(b.categoryName)))

    return { topCategories: top, perCategory: per }
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
        <p className="mt-1 text-sm text-zinc-400">
          Categoría con más votos y ganadores por categoría.
        </p>
      </div>

      {perCategory.every((c) => (c.winners ?? []).length === 0) ? (
        <div className="rounded-xl border bg-zinc-950 p-4 text-sm text-zinc-400">
          No hay votos / nominados para calcular resultados.
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Categoría con más votos</h2>
            <div className="mt-3 grid gap-3">
              {topCategories.map((c) => (
                <div key={c.categoryId} className="rounded-xl border bg-zinc-900/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.categoryName}</div>
                      <div className="text-xs text-zinc-400">Ganador(es)</div>
                    </div>
                    <div className="shrink-0 text-sm text-zinc-200">{c.totalVotes} votos</div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {c.winners.map((w) => (
                      <div key={w.nomineeId} className="flex items-center justify-between rounded-lg border bg-zinc-950 px-3 py-2">
                        <div className="truncate text-sm">{w.nomineeName}</div>
                        <div className="text-sm text-zinc-200">{w.votes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold">Ganadores por categoría</h2>
            <div className="mt-3 grid gap-3">
              {perCategory.map((c) => (
                <div key={c.categoryId} className="rounded-xl border bg-zinc-900/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold">{c.categoryName}</div>
                    <div className="shrink-0 text-xs text-zinc-400">{c.totalVotes} votos totales</div>
                  </div>

                  {c.winners.length === 0 ? (
                    <div className="mt-2 text-sm text-zinc-500">Sin nominados</div>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {c.winners.map((w) => (
                        <div key={w.nomineeId} className="flex items-center justify-between rounded-lg border bg-zinc-950 px-3 py-2">
                          <div className="truncate text-sm">{w.nomineeName}</div>
                          <div className="text-sm text-zinc-200">{w.votes}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
