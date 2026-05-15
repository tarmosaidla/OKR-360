# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # TypeScript check + Vite production build
npm run preview   # Preview production build locally
```

TypeScript is enforced at build time via `tsc -b`. There are no unit tests configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run `supabase/schema.sql` in the Supabase SQL editor to create tables, triggers, RLS policies, and seed data (teams + cycles for 2025–2026).

## Architecture

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase JS v2 + React Router v6 + Lucide React

### Key Design Decisions

- **Two global contexts only:** `AuthContext` (session, user profile) and `CycleContext` (selected quarter, persisted to `localStorage`). Everything else is page-local state.
- **Supabase client is typed as `any`** (`createClient<any>`) — avoids manual Database type maintenance. Type safety for app domain types lives in `src/types/index.ts`.
- **Progress is computed, never stored.** `computeObjectiveProgress(keyResults)` in `lib/utils.ts` averages KR completion percentages. The DB trigger `checkin_syncs_kr_value` keeps `key_results.current_value` in sync when a check-in is inserted.
- **Services → Hooks → Components:** `src/services/` contains all Supabase calls with explicit return types. `src/hooks/` wraps services with `useState` + `useEffect`. Components call hooks, not services directly.
- **Optimistic updates for check-ins:** `ObjectiveCard` updates its local `keyResults` state immediately on check-in without waiting for a refetch.

### Data Flow

```
Supabase DB
  └── services/*.service.ts      (raw Supabase queries)
       └── hooks/use*.ts          (state management, CRUD wrappers)
            └── pages/*.tsx        (page-level state, orchestration)
                 └── components/   (presentational + local modals)
```

### Route → Page Mapping

| Path | Page | Notes |
|------|------|-------|
| `/dashboard` | `DashboardPage` | Company tab groups objectives by team; My OKRs tab shows owner-filtered objectives |
| `/my-okrs` | `MyOKRsPage` | Personal objectives with full CRUD |
| `/teams` | `TeamsPage` | Grid of teams with aggregate progress rings |
| `/teams/:teamId` | `TeamPage` | Objectives filtered by `team_id` |
| `/settings` | `SettingsPage` | Update `profiles.full_name` and `profiles.team_id` |

### Database Schema (Supabase)

Tables: `profiles` (extends `auth.users`), `teams`, `cycles`, `objectives`, `key_results`, `checkins`

Key triggers:
- `on_auth_user_created` → auto-creates `profiles` row on signup
- `checkin_syncs_kr_value` → updates `key_results.current_value` on every check-in insert
- `set_updated_at` → auto-updates `updated_at` on objectives and key_results

RLS: authenticated users can read all rows; write access is restricted to the row owner (objectives gated on `owner_id = auth.uid()`, key_results gated on parent objective ownership).

### Component Hierarchy

```
AppShell (sidebar + <Outlet>)
  Sidebar → CycleSelector (reads/writes CycleContext)
  Pages
    ObjectiveList
      ObjectiveCard
        ProgressRing (SVG, purely presentational, 0-100 progress prop)
        ObjectiveStatusBadge
        KeyResultRow
          KeyResultProgress (progress bar + value/target label)
          CheckinForm (modal)
          CheckinHistory (inline timeline, lazy-loaded per KR)
      ObjectiveForm (create/edit modal)
    KeyResultForm (modal, opened from ObjectiveCard)
```

### Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. Add a `<Route>` inside the protected `<AppShell>` block in `src/App.tsx`
3. Add a `NavLink` entry to `src/components/layout/Sidebar.tsx` if it needs sidebar navigation
