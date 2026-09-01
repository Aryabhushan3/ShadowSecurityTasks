# Shadow Security COO OS

A shared, no-login operating workspace for Shadow Security. It combines COO attention management, tasks, projects, team workload, content planning, calendars, notes, and weekly review.

## Important behavior

- There is no login, signup, password, or authentication.
- “Continue as” only personalises My Work and records who made a change.
- All profiles use the same central SQLite database.
- The local service listens only on `127.0.0.1:4181`; it is not available to the team over the internet yet.
- Shastra remains the primary product in seeded plans. Suraksha is tracked separately and does not replace Shastra.

## Technology

React + TypeScript + Vite frontend, Node + TypeScript backend, SQLite database. The browser calls a central API, so SQLite can later be replaced with PostgreSQL without turning each person's computer into a separate copy.

## Commands

- `npm run dev` — development frontend and backend
- `npm run check` — typecheck, tests, and production build
- `npm start` — run the built local application on `127.0.0.1:4181`

## Data

- Live database: `D:\ShadowSecurity\COO-OS\data\coo-os.db`
- Backups: `D:\ShadowSecurity\COO-OS\backups`
- Restore validates the backup and creates a pre-restore safety snapshot.

## Online future

When Arya approves deployment: host the built frontend behind HTTPS, run the Node API as a managed service, replace SQLite with managed PostgreSQL, then add real access controls before exposing the workspace publicly. Do not publish the current no-login build directly to the internet.
