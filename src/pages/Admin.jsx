import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext.jsx'

export function AdminPage() {
  const { admin } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [cloneFromCategoryId, setCloneFromCategoryId] = useState('')
  const [nomineeDrafts, setNomineeDrafts] = useState({})

  const [open, setOpen] = useState(() => ({}))

  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editDescription, setEditDescription] = useState('')

  const username = admin?.username
  const password = admin?.password

  const canCreateCategory = useMemo(() => {
    return Boolean(username && password) && newCategoryName.trim().length > 0
  }, [username, password, newCategoryName])

  function normalize(rows) {
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

  async function load() {
    setIsLoading(true)
    setError(null)

    const baseSelect = 'id,name,created_at,category_nominees(votes_count,nominees(id,name))'
    let { data, error: qError } = await supabase
      .from('categories')
      .select('id,name,description,created_at,category_nominees(votes_count,nominees(id,name))')
      .order('created_at', { ascending: true })

    // Fallback if DB lacks categories.description
    if (
      qError?.message?.toLowerCase?.().includes('categories.description') &&
      qError?.message?.toLowerCase?.().includes('does not exist')
    ) {
      ;({ data, error: qError } = await supabase
        .from('categories')
        .select(baseSelect)
        .order('created_at', { ascending: true }))
    }

    if (qError) {
      setError(qError.message)
      setIsLoading(false)
      return
    }

    setCategories(normalize(data))
    setOpen((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const next = {}
      for (const c of data ?? []) next[c.id] = true
      return next
    })
    setIsLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createCategory() {
    setError(null)
    const name = newCategoryName.trim()
    const description = newCategoryDescription.trim()
    const sourceId = cloneFromCategoryId || null

    setNewCategoryName('')
    setNewCategoryDescription('')
    setCloneFromCategoryId('')

    const { error: rpcError } = sourceId
      ? await supabase.rpc('admin_clone_category', {
          p_username: username,
          p_password: password,
          p_source_category_id: sourceId,
          p_new_name: name,
          p_new_description: description,
        })
      : await supabase.rpc('admin_create_category', {
          p_username: username,
          p_password: password,
          p_name: name,
          p_description: description,
        })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await load()
  }

  async function deleteCategory(categoryId) {
    setError(null)

    const { error: rpcError } = await supabase.rpc('admin_delete_category', {
      p_username: username,
      p_password: password,
      p_category_id: categoryId,
    })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await load()
  }

  function startEditDescription(category) {
    setEditingCategoryId(category.id)
    setEditDescription(category.description ?? '')
  }

  function cancelEditDescription() {
    setEditingCategoryId(null)
    setEditDescription('')
  }

  async function saveEditDescription(categoryId) {
    setError(null)

    const { error: rpcError } = await supabase.rpc('admin_update_category_description', {
      p_username: username,
      p_password: password,
      p_category_id: categoryId,
      p_description: editDescription.trim(),
    })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    cancelEditDescription()
    await load()
  }

  async function addNominee(categoryId) {
    setError(null)
    const raw = nomineeDrafts[categoryId] ?? ''
    const name = raw.trim()
    if (!name) return

    setNomineeDrafts((prev) => ({ ...prev, [categoryId]: '' }))

    const { error: rpcError } = await supabase.rpc('admin_add_nominee', {
      p_username: username,
      p_password: password,
      p_category_id: categoryId,
      p_nominee_name: name,
    })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await load()
  }

  async function deleteNominee(categoryId, nomineeId) {
    setError(null)

    const { error: rpcError } = await supabase.rpc('admin_remove_nominee', {
      p_username: username,
      p_password: password,
      p_category_id: categoryId,
      p_nominee_id: nomineeId,
    })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await load()
  }

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Cargando admin…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel Admin</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Crea categorías, agrega nominados, y gestiona el contenido.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border bg-zinc-950 p-5">
        <h2 className="text-lg font-semibold">Nueva categoría</h2>
        <div className="mt-3 grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="w-full rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
            placeholder="Ej: Mejor Jugador"
          />
          <button
            type="button"
            disabled={!canCreateCategory}
            onClick={createCategory}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Crear
          </button>
          </div>

          <textarea
            value={newCategoryDescription}
            onChange={(e) => setNewCategoryDescription(e.target.value)}
            className="w-full resize-none rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
            placeholder="Descripción (opcional)"
            rows={3}
          />

          <label className="block">
            <span className="text-xs text-zinc-400">Clonar nominados desde (opcional)</span>
            <select
              value={cloneFromCategoryId}
              onChange={(e) => setCloneFromCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
            >
              <option value="">(No clonar)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-4">
        {categories.map((c) => (
          <section key={c.id} className="rounded-2xl border bg-zinc-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                className="min-w-0 text-left"
              >
                <h3 className="text-lg font-semibold">{c.name}</h3>
                {c.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">{c.id}</p>
                )}
                <p className="mt-1 text-xs text-zinc-500">{open[c.id] ? 'Ocultar' : 'Ver'}</p>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (editingCategoryId === c.id ? cancelEditDescription() : startEditDescription(c))}
                  className="rounded-lg border bg-transparent px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                >
                  {editingCategoryId === c.id ? 'Cancelar' : 'Editar'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(c.id)}
                  className="rounded-lg border bg-transparent px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {editingCategoryId === c.id ? (
              <div className="mt-4 grid gap-2">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full resize-none rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
                  placeholder="Descripción (opcional)"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => saveEditDescription(c.id)}
                    className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
                  >
                    Guardar descripción
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditDescription}
                    className="rounded-lg border bg-transparent px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {open[c.id] ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(c.nominees ?? []).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-xl border bg-zinc-900/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{n.name}</div>
                    <div className="truncate text-xs text-zinc-500">
                      {n.votes_count} votos
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNominee(c.id, n.id)}
                    className="rounded-lg border bg-transparent px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              <div className="rounded-xl border border-dashed bg-zinc-950 px-4 py-3">
                <div className="text-sm font-semibold">Agregar nominado</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={nomineeDrafts[c.id] ?? ''}
                    onChange={(e) =>
                      setNomineeDrafts((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200/20"
                    placeholder="Ej: Messi"
                  />
                  <button
                    type="button"
                    onClick={() => addNominee(c.id)}
                    className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950"
                  >
                    Agregar
                  </button>
                </div>
              </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
