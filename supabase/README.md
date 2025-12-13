# Supabase setup (sin Supabase Auth)

1) Abre tu proyecto Supabase → **SQL Editor**.
2) Copia/pega y ejecuta el archivo:

- [supabase/schema.sql](supabase/schema.sql)

3) Cambia el seed del admin:
- Busca `CAMBIA_ESTA_PASSWORD` y reemplázalo por una contraseña real.
- Luego ejecuta solo ese bloque (o re-ejecuta todo; el `on conflict do nothing` evita duplicados).

## Notas de seguridad
- El login es **custom** (tabla `app_users` + `app_sessions`).
- Los writes están bloqueados por RLS y se hacen por RPC `SECURITY DEFINER`.
- La votación anónima se identifica por `voter_token` guardado en `localStorage`. No es antifraude fuerte (se puede borrar/alterar), pero cumple el flujo "anónimo".

## Cooldown
- El cooldown de 45 minutos es **por dispositivo** y **por categoría**, aplicado en el frontend.
- La tabla `votes` permite `insert` anónimo; no expone `select` (para no filtrar `voter_token`).
