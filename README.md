# Crepe

A minimalist project management app inspired by Monday.com, rebuilt with a calmer visual language.

## Features

- grouped task table with `To-Do` and `Completed`
- inline editing for task title, status, due date, priority, and timeline
- drag-and-drop across sections with automatic completion sync
- timeline view with draggable and resizable schedule bars
- optional Supabase backend with Google sign-in and per-user task storage
- admin view for user count and sign-in activity

## Local development

```bash
npm install
npm run dev
```

## Supabase setup (Google sign-in + backend)

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](/Users/chechangyuan/Desktop/Musashi/WedBot/supabase/schema.sql).
3. In Supabase Auth -> Providers, enable Google provider and add your OAuth credentials.
4. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS` (comma-separated admin emails)
   - `NEXT_PUBLIC_ADMIN_EMAILS` (same list for client-side admin link visibility)
5. In Supabase Auth settings, add site URL and redirect URL:
   - `https://crepe.to`
   - `http://localhost:3000`

If Supabase env vars are missing, Crepe falls back to local browser storage mode.

Admin page: `/admin` (allowed emails from `ADMIN_EMAILS` only).

## Testing

```bash
npm test
```
