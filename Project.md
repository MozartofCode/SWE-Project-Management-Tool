# ProjectFlow — Project Management Tool
## Full Project Specification & Technical Blueprint

---

## 1. Project Overview

ProjectFlow is a lightweight, self-hosted project management tool inspired by Redmine. It is built for small teams who want simple issue tracking, project organization, and automation via Slack and Claude AI.

The system is composed of three layers:
- A **React frontend** (Vite + Tailwind CSS)
- A **Node.js/Express backend** with a REST API
- A **Supabase (PostgreSQL)** database for storage and auth

Future phases will add a Slack bot and nightly Claude AI automations. **Phase 1 (this document) covers only the core web application.**

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Slack Bot | @slack/bolt (Phase 2) |
| AI Automation | @anthropic-ai/sdk (Phase 2) |
| Cron Jobs | node-cron (Phase 2) |
| Deployment | Railway or Render |

---

## 3. Pages & Frontend Routes

### Public Routes (no auth required)
- `GET /login` — Login page (email + password via Supabase Auth)
- `GET /register` — Register page

### Protected Routes (auth required)
- `GET /` — Dashboard
- `GET /projects` — All projects list
- `GET /projects/new` — Create new project form
- `GET /projects/:id` — Project detail page (shows issues list)
- `GET /projects/:id/edit` — Edit project form
- `GET /projects/:id/issues/new` — Create new issue form
- `GET /projects/:id/issues/:issueId` — Issue detail page
- `GET /projects/:id/issues/:issueId/edit` — Edit issue form
- `GET /users` — Team members list (admin only)

---

## 4. Page Descriptions & UI Functionality

### Dashboard (`/`)
- Welcome message with logged-in user's name
- Summary cards: Total Projects, Open Issues, In Progress, Closed Today
- Recent Activity feed (last 20 activity log entries across all projects)
- Quick links to each active project

### Projects List (`/projects`)
- Table/card list of all projects
- Columns: Name, Description, Status, Member Count, Open Issues, Created Date
- Button: "New Project"
- Click a project row → goes to Project Detail

### Project Detail (`/projects/:id`)
- Project name, description, status badge, dates
- Members section: list of assigned users with roles
- Issues table with filters:
  - Filter by Status (Open / In Progress / Closed)
  - Filter by Priority (Low / Medium / High / Critical)
  - Filter by Assignee
- Button: "New Issue"
- Activity log panel (right sidebar or bottom) showing recent events for this project

### Issue Detail (`/projects/:id/issues/:issueId`)
- Title, description, status badge, priority badge
- Assignee, reporter, due date, created date
- Status change dropdown (Open → In Progress → Closed)
- Edit and Delete buttons
- Activity log for this specific issue (status changes, edits)

### Create / Edit Forms
- Project form: Name (required), Description, Status, Start Date, End Date
- Issue form: Title (required), Description, Status, Priority, Assignee (dropdown of project members), Due Date

### Users Page (`/users`) — Admin Only
- List of all registered users
- Show name, email, role, joined date

---

## 5. Database Schema

### Table: `users`
> Managed by Supabase Auth. Extended with a `profiles` table.

```sql
-- Supabase handles the auth.users table automatically.
-- We extend it with a public profiles table:

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Table: `projects`

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'on_hold' | 'completed' | 'archived'
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Table: `project_members`

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'developer', -- 'manager' | 'developer' | 'viewer'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

---

### Table: `issues`

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'closed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  due_date DATE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Table: `activity_logs`

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'created_project' | 'updated_project' | 'created_issue' | 'updated_issue' | 'closed_issue' | 'assigned_issue' | 'added_member'
  description TEXT NOT NULL, -- Human readable: "John closed issue #12: Login bug"
  metadata JSONB, -- Optional extra data: { old_status: 'open', new_status: 'closed' }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Table: `reports` *(scaffold for Phase 2)*

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'nightly_summary' | 'code_scan'
  content TEXT NOT NULL, -- Full Claude-generated report text
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. API Endpoint Map

All endpoints are prefixed with `/api/v1`. All protected routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

---

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user, create profile | No |
| POST | `/api/v1/auth/login` | Login, returns JWT token | No |
| POST | `/api/v1/auth/logout` | Invalidate session | Yes |
| GET | `/api/v1/auth/me` | Get current logged-in user profile | Yes |

---

### Users / Profiles

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/users` | List all users (admin only) | Yes |
| GET | `/api/v1/users/:id` | Get a single user profile | Yes |
| PUT | `/api/v1/users/:id` | Update own profile (name, avatar) | Yes |

---

### Projects

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/projects` | List all projects the user is a member of | Yes |
| POST | `/api/v1/projects` | Create a new project | Yes |
| GET | `/api/v1/projects/:id` | Get project details | Yes |
| PUT | `/api/v1/projects/:id` | Update project (name, description, status, dates) | Yes |
| DELETE | `/api/v1/projects/:id` | Delete project (admin/manager only) | Yes |

---

### Project Members

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/projects/:id/members` | List all members of a project | Yes |
| POST | `/api/v1/projects/:id/members` | Add a member to a project | Yes |
| DELETE | `/api/v1/projects/:id/members/:userId` | Remove a member from a project | Yes |

---

### Issues

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/projects/:id/issues` | List issues for a project (supports filters) | Yes |
| POST | `/api/v1/projects/:id/issues` | Create a new issue | Yes |
| GET | `/api/v1/projects/:id/issues/:issueId` | Get a single issue | Yes |
| PUT | `/api/v1/projects/:id/issues/:issueId` | Update issue (title, status, priority, assignee, etc.) | Yes |
| DELETE | `/api/v1/projects/:id/issues/:issueId` | Delete an issue | Yes |

**Query parameters for `GET /issues`:**
- `?status=open` — Filter by status (open / in_progress / closed)
- `?priority=high` — Filter by priority
- `?assignee_id=<uuid>` — Filter by assignee
- `?sort=created_at&order=desc` — Sort options

---

### Activity Logs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/activity` | Get recent activity across all user's projects | Yes |
| GET | `/api/v1/projects/:id/activity` | Get activity log for a specific project | Yes |

---

### Reports *(scaffold only in Phase 1 — full implementation Phase 2)*

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/reports` | List all generated reports | Yes |
| GET | `/api/v1/reports/:id` | Get a specific report | Yes |

---

## 7. Request & Response Examples

### POST `/api/v1/projects`
```json
// Request body
{
  "name": "Website Redesign",
  "description": "Full redesign of the marketing website",
  "status": "active",
  "start_date": "2026-03-21",
  "end_date": "2026-06-01"
}

// Response 201
{
  "id": "abc123...",
  "name": "Website Redesign",
  "description": "Full redesign of the marketing website",
  "status": "active",
  "start_date": "2026-03-21",
  "end_date": "2026-06-01",
  "created_by": "user-uuid",
  "created_at": "2026-03-21T12:00:00Z"
}
```

### POST `/api/v1/projects/:id/issues`
```json
// Request body
{
  "title": "Login page broken on mobile",
  "description": "The login button does not respond on iOS Safari",
  "status": "open",
  "priority": "high",
  "assignee_id": "user-uuid-here",
  "due_date": "2026-03-28"
}

// Response 201
{
  "id": "issue-uuid",
  "project_id": "project-uuid",
  "title": "Login page broken on mobile",
  "status": "open",
  "priority": "high",
  "assignee_id": "user-uuid-here",
  "reporter_id": "current-user-uuid",
  "due_date": "2026-03-28",
  "created_at": "2026-03-21T12:00:00Z"
}
```

### PUT `/api/v1/projects/:id/issues/:issueId` (close an issue)
```json
// Request body
{
  "status": "closed"
}

// Response 200
{
  "id": "issue-uuid",
  "status": "closed",
  "closed_at": "2026-03-21T14:30:00Z",
  "updated_at": "2026-03-21T14:30:00Z"
}
```

---

## 8. Backend Folder Structure

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
    /middleware
      auth.js          -- JWT verification middleware
      errorHandler.js  -- Global error handler
    /services
      supabase.js      -- Supabase client singleton
      activity.js      -- Helper to write activity log entries
    /automations       -- (Phase 2 - scaffold files only)
      nightlyReport.js
      codeScan.js
      slackBot.js
    index.js           -- Express app entry point
  .env
  package.json
```

---

## 9. Frontend Folder Structure

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
      ProtectedRoute.jsx
    /context
      AuthContext.jsx   -- Global auth state
    /services
      api.js            -- Axios instance with base URL + auth headers
    App.jsx
    main.jsx
  .env
  package.json
```

---

## 10. Environment Variables

### Backend `.env`
```
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

# Phase 2 only - leave blank for now
ANTHROPIC_API_KEY=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

### Frontend `.env`
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 11. Phase 2 Preview (Do Not Build Yet)

These features will be added after the core app is fully working:

**Slack Bot**
- Create a Slack App with Events API enabled
- When a message is posted in a designated channel, Slack sends a webhook to `POST /api/v1/slack/events`
- The backend passes the message to Claude API to determine intent (create issue / close issue / status check)
- Claude responds back to Slack with a confirmation

**Nightly Project Report**
- A `node-cron` job runs at 11pm every night
- Queries all projects and their issue activity from that day
- Sends the data to Claude API with a summarization prompt
- Posts the report to Slack and/or saves it to the `reports` table

**Nightly Code Scan**
- A second cron job that sends key source files to Claude API
- Claude reviews for broken patterns, missing error handling, or inconsistencies
- Output is appended to the nightly report above

---

## 12. Build Order for Phase 1

Follow this order strictly to avoid dependency issues:

1. Set up Supabase project, run all SQL schema migrations
2. Scaffold Node.js/Express backend, connect to Supabase
3. Build and test all API routes (use Postman or curl)
4. Scaffold React frontend with Vite
5. Build auth pages (Login, Register) and wire up Supabase Auth
6. Build Dashboard page
7. Build Projects List + Project Detail pages
8. Build Issue Detail + Issue Form pages
9. Build Activity Feed component and wire it up everywhere
10. Final QA: test all CRUD flows end to end

---

*End of Phase 1 Specification*
