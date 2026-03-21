# CLAUDE.md — ProjectFlow

## Who You Are Working With
The developer on this project is advanced and writes code regularly. You do not need to explain basic concepts, add
excessive comments, or ask for permission on routine decisions. Be autonomous. Make smart architectural decisions and
build. Only check in when something fundamentally changes the data model, API contract, or project scope.

---

## Project Overview
ProjectFlow is a lightweight project management tool (Redmine-inspired) with:
- A React + Vite + Tailwind CSS frontend (`/frontend`)
- A Node.js + Express REST API backend (`/backend`)
- Supabase (PostgreSQL) for database and auth
- Full details in `PROJECT.md` at the root

---

## Architecture Pattern

### Backend — MVC with Service Layer
```
Request → Router → Controller → Service → Supabase → Response
```
- **Routes** (`/routes`) — URL definitions only, delegate to controllers immediately
- **Controllers** (`/controllers`) — HTTP layer only: parse req, call service, send res. Zero business logic.
- **Services** (`/services`) — all business logic, all Supabase queries. Reusable and testable.
- **Middleware** (`/middleware`) — auth (JWT), input validation, error handling

**Rule: Controllers never query Supabase directly. Always go through a service.**

### Frontend — MVVM (Pages + Components + Services)
```
Page (ViewModel) → api.js (Service/Model) → UI Components (View)
```
- **Pages** (`/pages`) — own state, orchestrate data fetching, pass props down
- **Components** (`/components`) — stateless/dumb UI pieces, no direct API calls
- **Services** (`/services/api.js`) — single Axios instance, all API calls live here exclusively
- **Context** (`/context`) — global state for auth only

**Rule: Components never call the API directly. All calls go through `/services/api.js`.**

### Overarching Rule
> Fat services, thin controllers, dumb components.

---

## Folder Structure

### Backend
```
/backend
  /src
    /routes
      auth.js
      users.js
      projects.js
      members.js
      issues.js
      activity.js
      reports.js
    /controllers
      authController.js
      usersController.js
      projectsController.js
      membersController.js
      issuesController.js
      activityController.js
    /services
      authService.js
      usersService.js
      projectsService.js
      membersService.js
      issuesService.js
      activityService.js
    /middleware
      auth.js           — JWT verification, attaches req.user
      validate.js       — Input validation middleware (use express-validator)
      errorHandler.js   — Global error handler, always last middleware
    /automations        — Phase 2 scaffolds only, do not implement
      nightlyReport.js
      codeScan.js
      slackBot.js
    index.js
  /tests
    /unit
      /services
    /integration
      /routes
    setup.js
  .env
  package.json
```

### Frontend
```
/frontend
  /src
    /pages
      Login.jsx
      Register.jsx
      Dashboard.jsx
      ProjectsList.jsx
      ProjectDetail.jsx
      ProjectForm.jsx
      IssueDetail.jsx
      IssueForm.jsx
      Users.jsx
    /components
      Navbar.jsx
      Sidebar.jsx
      IssueTable.jsx
      ActivityFeed.jsx
      StatusBadge.jsx
      PriorityBadge.jsx
      PriorityBadge.jsx
      FilterBar.jsx
      ProtectedRoute.jsx
    /context
      AuthContext.jsx
    /services
      api.js            — Axios instance with base URL + auth header injection
    /hooks
      useAuth.js
      useProjects.js
      useIssues.js
    App.jsx
    main.jsx
  .env
  package.json
```

---

## Commands

```bash
# Root (uses concurrently to run both)
npm run dev

# Backend only
cd backend && npm run dev       # nodemon
cd backend && npm test          # Jest

# Frontend only
cd frontend && npm run dev      # Vite dev server
cd frontend && npm run build    # Production build
```

---

## Environment Variables

### `/backend/.env`
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=

# Phase 2 — leave blank, do not implement
ANTHROPIC_API_KEY=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

### `/frontend/.env`
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Coding Standards

### General
- TypeScript is NOT used — plain JavaScript throughout
- ES Modules (`import/export`) on frontend, CommonJS (`require`) on backend
- `async/await` everywhere — never `.then()` chains
- No `var` — use `const` by default, `let` only when reassignment is needed
- No unused variables, no dead code

### Error Handling (strict)
- Every async function in services must be wrapped in try/catch
- Controllers pass errors to `next(err)` — never handle errors in controllers directly
- The global `errorHandler.js` middleware catches everything and returns:
```json
{ "error": { "message": "Human readable message", "code": "ERROR_CODE" } }
```
- Never expose stack traces or raw Supabase errors to the client in production
- Use HTTP status codes correctly: 400 (bad input), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)

### Input Validation (defensive)
- Use `express-validator` on every POST and PUT route
- Validate and sanitize all inputs before they reach the controller
- Reject unknown fields — do not pass `req.body` directly to Supabase
- UUIDs must be validated as valid UUID format before any DB query

### API Response Shape
All responses follow this consistent shape:
```json
// Success
{ "data": { ... } }

// Success, list
{ "data": [ ... ], "count": 42 }

// Error
{ "error": { "message": "...", "code": "..." } }
```

### React
- Functional components only — no class components
- Custom hooks for all data fetching logic (`/hooks`)
- No inline styles — Tailwind utility classes only
- No direct `fetch()` calls — always use the `api.js` Axios instance
- Loading and error states must be handled on every data-fetching page

### Naming Conventions
- Files: `camelCase.js` for backend, `PascalCase.jsx` for React components
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case` (match Supabase schema exactly)
- API routes: `kebab-case` (e.g. `/project-members`)

---

## Testing Standards

### Backend — Jest + Supertest
- **Unit tests**: every service function gets a unit test, Supabase is mocked
- **Integration tests**: every route gets an integration test using Supertest with a real test DB or mocked Supabase
- Test file naming: `serviceName.test.js`, colocated under `/tests/unit/services/` and `/tests/integration/routes/`
- Aim for >80% coverage on services
- Test happy path AND all error/edge cases (invalid input, not found, forbidden)

### Frontend — Vitest + React Testing Library
- Unit test all custom hooks
- Smoke test all page components (renders without crashing)
- Test critical user flows: login, create project, create issue, close issue

### Rules
- Never commit code that breaks existing tests
- Tests run in CI before any merge
- Mock all external services (Supabase, future: Slack, Anthropic)

---

## Database Rules
- Never modify the Supabase schema by hand in the dashboard
- All schema changes go through SQL migration files in `/backend/migrations/`
- Always use parameterized queries via the Supabase JS client — never string interpolation
- `updated_at` must be updated on every UPDATE operation
- Always write to `activity_logs` when: creating a project, updating a project, creating an issue, updating an issue status, closing an issue, assigning an issue, adding a project member

---

## Authentication Flow
- Frontend: Supabase Auth SDK handles login/register, stores JWT in memory (not localStorage)
- Backend: Every protected route goes through `middleware/auth.js` which verifies the JWT using `SUPABASE_SERVICE_ROLE_KEY`
- `req.user` is attached by the auth middleware and contains `{ id, email, role }`
- Never trust user-supplied IDs for ownership checks — always derive from `req.user.id`

---

## Security Rules
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend under any circumstances
- Sanitize all text inputs to prevent XSS
- Enforce Row Level Security (RLS) in Supabase as a secondary defense layer
- Project members can only see/edit issues in projects they belong to — enforce this in the service layer, not just RLS
- Admin-only routes must check `req.user.role === 'admin'` in middleware, not in the controller

---

## What NOT To Build (Phase 2 — Off Limits)
Do not implement any of the following until explicitly told to start Phase 2:
- Slack bot or any Slack integration (`/automations/slackBot.js` is a scaffold only)
- Nightly report generation (`/automations/nightlyReport.js` is a scaffold only)
- Code scanning automation (`/automations/codeScan.js` is a scaffold only)
- Any calls to the Anthropic API
- Email notifications
- File attachments on issues
- Gantt charts, time tracking, or wikis

---

## Build Order (Phase 1)
Follow this sequence strictly. Do not skip ahead.

1. Initialize repo structure (monorepo root with `/frontend` and `/backend`)
2. Set up Supabase project, run all SQL migrations from `PROJECT.md`
3. Scaffold Express backend: index.js, middleware, route stubs, error handler
4. Implement Supabase client singleton and auth middleware
5. Build and test all API routes in order: auth → users → projects → members → issues → activity
6. Write backend tests alongside each route (not after)
7. Scaffold React frontend with Vite, set up Tailwind, configure Axios in `api.js`
8. Build AuthContext and ProtectedRoute
9. Build pages in order: Login → Register → Dashboard → ProjectsList → ProjectDetail → IssueDetail → Forms → Users
10. Wire up all custom hooks
11. Write frontend tests
12. End-to-end smoke test of all CRUD flows

---

*Phase 1 only. See PROJECT.md for full specification and Phase 2 preview.*
