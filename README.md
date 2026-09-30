# Shadow Security COO OS

The shared operating workspace for Shadow Security: attention management, tasks, projects, team workload, content pipeline and calendar, the Suraksha Labs board, notes and meetings, and a weekly review.

## How it works

- React + TypeScript + Vite frontend, deployed on Vercel.
- Supabase for the database, sign-in and file attachments.
- Sign-in is invite-only. An admin adds a person's email under Settings → Team, then that person signs up with the same email.
- Row-level security in `supabase/schema.sql` enforces access: admins can change everything, members can change their own work.
- The browser only ever uses the public anon key. Never put the `service_role` key in `.env`.

## Setup

1. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. In Supabase → SQL Editor, run `supabase/schema.sql`. It is safe to re-run; it also applies new features, such as the Labs tables, to an existing database.
3. For a fresh demo only: run `supabase/seed.sql`. It clears and reloads demo data, so never run it on the real workspace.

## Commands

- `npm run dev`: local development at http://127.0.0.1:5173
- `npm run typecheck`: TypeScript check
- `npm run build`: typecheck and production build into `dist/`

## Code map

- `src/App.tsx`: every screen (dashboard, tasks, labs, content, team and so on)
- `src/db.ts`: all reads and writes to Supabase
- `src/derive.ts`: computed views (attention, workload, project health, weekly review)
- `src/types.ts`: data shapes
- `src/auth.ts`: sign-in and session
- `supabase/schema.sql`: tables, access rules and storage bucket
