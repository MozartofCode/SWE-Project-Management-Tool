# frontend.md — ProjectFlow React Frontend Implementation Plan

## Context

The backend is 100% complete (128/128 tests passing, all API routes live, Supabase connected). This plan covers the
complete Phase 1 React frontend: scaffold → auth → all 9 pages → all components → all hooks → tests. The goal is a
polished, professional project management UI that wires cleanly against every backend endpoint.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Build / dev server |
| Tailwind CSS | 3 | Styling (utility-only, no inline styles) |
| React Router | v6 | Routing |
| Axios | 1.x | HTTP client (single instance via api.js) |
| @supabase/supabase-js | 2.x | Auth SDK (session restore only — no direct DB) |
| Vitest + RTL | 1.x | Tests |

---

## Color System

| Token | Tailwind class | Usage |
|---|---|---|
| Primary | `indigo-600` / `indigo-700` | Buttons, active links, focus rings |
| App background | `bg-slate-50` | Page background |
| Card background | `bg-white` | All cards, table rows |
| Sidebar | `bg-slate-900` | Fixed left nav |
| Text primary | `text-slate-800` | Headings, body |
| Text muted | `text-slate-500` | Secondary labels, placeholders |
| Success | `emerald` | Closed issues, active projects, success states |
| Warning | `amber` | High priority, in-progress, on-hold |
| Danger | `rose` | Critical priority, error states, delete actions |
| Status — Open | `bg-blue-100 text-blue-700` | Issue open badge |
| Status — In Progress | `bg-amber-100 text-amber-700` | Issue in_progress badge |
| Status — Closed | `bg-emerald-100 text-emerald-700` | Issue closed badge |
| Priority — Low | `bg-slate-100 text-slate-600` | |
| Priority — Medium | `bg-blue-100 text-blue-700` | |
| Priority — High | `bg-amber-100 text-amber-700` | |
| Priority — Critical | `bg-rose-100 text-rose-700 font-semibold` | |

---

## Layout

```
┌────────────────────────────────────────────────────────┐
│  Sidebar (w-64, bg-slate-900, fixed)  │  Navbar        │
│  - Logo: "ProjectFlow" white bold     │  (bg-white, h-16)│
│  - Nav: Dashboard, Projects, Users    ├────────────────┤
│  - Active link: bg-indigo-600         │                │
│  - User info at bottom                │  <Outlet />    │
└───────────────────────────────────────┴────────────────┘
```

---

## Key Architecture Decisions

1. **Token in memory** — stored in AuthContext state. Supabase `getSession()` on mount restores it across page refreshes.
2. **api.js module-level token store** — avoids circular dep with AuthContext. `setAuthToken()` / `clearAuthToken()` exported separately.
3. **Backend returns `{ data: { user, token } }`** — token at `response.data.data.token`, not `session.access_token`.
4. **Members/activity use `profiles` join key** (not `user`) — matches Supabase select alias in membersService.
5. **DELETE returns 204 (no body)** — never read `response.data` on delete calls.
6. **Add Member gated on admin+manager** — `GET /users` is admin-only, so only admins who are also managers can add members.

---

## Folder Structure

```
/frontend/src
  /pages       — Login, Register, Dashboard, ProjectsList, ProjectDetail,
                 ProjectForm, IssueDetail, IssueForm, Users
  /components  — AppLayout, Navbar, Sidebar, ProtectedRoute, IssueTable,
                 FilterBar, ActivityFeed, StatusBadge, PriorityBadge
  /context     — AuthContext.jsx
  /services    — api.js, supabaseClient.js, utils.js
  /hooks       — useAuth.js, useProjects.js, useIssues.js
  /test        — setup.js
```

---

## Tests: 29/29 passing

| Suite | Tests |
|---|---|
| useAuth.test.jsx | 6 — isLoading, login, login failure, register, logout |
| useProjects.test.js | 6 — fetchProjects, error, create, update, delete, isLoading |
| useIssues.test.js | 6 — fetchIssues, filter query params, setFilters, create, update, delete |
| Login.test.jsx | 3 — renders, error display, POST call |
| Dashboard.test.jsx | 3 — renders, empty state, project list |
| ProjectsList.test.jsx | 3 — renders headers, empty state, project names |
| Users.test.jsx | 2 — access denied for non-admin, renders |
