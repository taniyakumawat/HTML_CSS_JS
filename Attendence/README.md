# 🎓 Smart College Attendance Management System

A full-stack **MERN** application for managing college class attendance digitally —
replacing manual attendance registers with a modern, role-based web platform.

> Built for BCA, BBA, BCom and other departments with support for years, semesters,
> courses, subjects, timetables, reports and analytics.

---

## 1. Technology Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Frontend       | React 18 + Vite                     |
| Styling        | Tailwind CSS 3                      |
| Icons          | Lucide React                        |
| Charts         | Recharts                            |
| HTTP client    | Axios                               |
| Exports        | PDFKit (PDF) + ExcelJS (Excel)      |
| Routing        | React Router v6                     |
| Backend        | Node.js + Express.js                |
| Database       | MongoDB + Mongoose                  |
| Authentication | JWT + bcryptjs                      |
| API style      | REST (`/api/...`)                   |

---

## 2. Project Architecture

```
Attendence/
│
├── instuction.md               # Project requirements document
├── README.md                   # This file
├── package.json                # Root scripts (dev, install:all, build)
├── .gitignore
│
├── server/                     # ===== BACKEND (Express + MongoDB) =====
│   ├── package.json            # type: module (ESM)
│   ├── .env / .env.example     # Port, Mongo URI, JWT secret, CORS origin
│   ├── tests/                  # Jest + Supertest (Phase 9)
│   └── src/
│       ├── index.js            # Entry: load env → connect DB → listen
│       ├── app.js              # Express app: middleware, routes, errors
│       ├── config/
│       │   ├── env.js          # Centralised environment variables
│       │   └── db.js           # Mongoose connection
│       ├── routes/
│       │   ├── index.js        # API router (mounts /auth, /admin, /teacher, /attendance, /student, /reports, /notifications ✅)
│       │   ├── auth.routes.js  # Phase 3: login/register/me/password reset
│       │   ├── admin.routes.js # Phase 4: admin-only CRUD for all resources
│       │   ├── teacher.routes.js # Phase 5: scoped classes/subjects/timetable/stats
│       │   ├── attendance.routes.js # Phase 5: mark/session view/correction
│       │   ├── student.routes.js # Phase 6: read-only stats/history/calendar/timetable
│       │   ├── reports.routes.js # Phase 7: reports + trend + PDF/Excel export (admin|teacher)
│       │   └── notification.routes.js # Phase 8: my inbox + mark read/read-all (all roles)
│       ├── middleware/
│       │   ├── error.js        # ApiError + 404 + global handler ✅
│       │   ├── auth.js         # requireAuth / requireRole / JWT ✅
│       │   ├── validate.js     # express-validator wrapper ✅
│       │   ├── rateLimit.js    # Phase 9: global + login + reset limiters ✅
│       │   └── sanitizeQuery.js # Phase 9: NoSQL-injection guard ✅
│       ├── controllers/        # auth, academic CRUD, people, adminStats,
│       │                       # teacher, attendance, student, reports,
│       │                       # notification ✅
│       ├── models/             # Phase 2: 12 Mongoose schemas (see README)
│       ├── validations/        # auth + academic + people + attendance rules ✅
│       ├── services/           # report.service (4 report types + scope),
│       │                       # notification.service (marking/correction
│       │                       # fan-out to class students), pdf.js (PDFKit),
│       │                       # excel.js (ExcelJS) ✅
│       ├── utils/              # apiResponse, pagination, crudFactory, classAccess,
│       │                       # constants (75% threshold) ✅
│       └── seed/               # Default admin / demo data scripts
│
└── client/                     # ===== FRONTEND (React + Tailwind) =====
    ├── package.json
    ├── vite.config.js          # React plugin, @ alias, /api proxy → :5000
    ├── tailwind.config.js      # Navy palette, Inter font, card shadow
    ├── postcss.config.js
    ├── index.html              # Google Fonts (Inter), root div
    ├── .env / .env.example     # VITE_API_BASE_URL=/api
    └── src/
        ├── main.jsx            # React root
        ├── App.jsx             # BrowserRouter (AuthProvider in Phase 3)
        ├── index.css           # Tailwind + .btn/.input/.card utilities
        ├── api/
        │   └── client.js       # Axios instance + JWT interceptors ✅
        ├── routes/
        │   ├── AppRoutes.jsx   # /login, /admin/*, /teacher/*, /student/*, 404
        │   └── ProtectedRoute.jsx  # Role guard ✅
        ├── components/
        │   ├── layout/         # Sidebar, Topbar (quick search), DashboardLayout,
        │   │                   # NotificationBell (polling + badge),
        │   │                   # ProfileMenu (change password) ✅
        │   ├── ui/             # Button, Card, Input, Spinner, EmptyState,
        │   │                   # DataTable, Modal+ConfirmDialog, Select,
        │   │                   # TextArea, PageHeader, PageLoader ✅
        │   ├── admin/          # ResourcePage (config-driven CRUD),
        │   │                   # AssignmentsEditor ✅
        │   └── TimetableView.jsx # Shared weekly timetable (teacher+student) ✅
        ├── pages/
        │   ├── Login.jsx       # Login UI (wired in Phase 3)
        │   ├── ReportsPage.jsx # Reports section: filters, chart, PDF/Excel ✅
        │   ├── NotFound.jsx    # 404 page
        │   ├── admin/          # Dashboard, Students, Teachers, Timetable
        │   │                   # + resources.jsx (dept/course/sem/subj/class) ✅
        │   ├── teacher/        # TeacherDashboard, MarkAttendance (★ core),
        │   │                   # MyClasses, TeacherTimetable ✅
        │   └── student/        # StudentDashboard, MyAttendance (list+calendar),
        │                       # StudentTimetable ✅
        ├── utils/
        │   └── constants.js    # Roles, statuses, nav menus, threshold
        │   └── download.js     # Authenticated blob download (PDF/Excel) ✅
        ├── context/            # AuthContext ✅, ToastContext ✅
        ├── hooks/              # useResource (list + search + pagination) ✅
        └── assets/             # Images, logos
```

**Conventions**

- Frontend alias: `@` → `client/src` (e.g. `import Sidebar from '@/components/layout/Sidebar'`)
- Backend uses **ESM** (`import/export`) everywhere
- Every API response follows: `{ success, message, data?, errors? }`

---

## 3. Installation Commands (explained)

**Prerequisites:** Node.js ≥ 18, npm ≥ 9, MongoDB running locally (or an Atlas URI).

```bash
# 1. Enter the project folder
cd Attendence

# 2. Install ALL dependencies at once (server + client + root tooling)
npm run install:all
#    → runs: npm install --prefix server
#            npm install --prefix client
#            npm install            (concurrently, for running both together)

# 3. Configure environment variables
copy server\.env.example server\.env      # Windows  (or: cp server/.env.example server/.env)
copy client\.env.example client\.env      # Windows  (or: cp client/.env.example client/.env)
#    Then edit server\.env → set JWT_SECRET and MONGO_URI.

# 4. Start MongoDB (skip if already running / using Atlas)
mongod
```

### Running the app

```bash
# Option A - run backend + frontend together (recommended)
npm run dev
#    → server: http://localhost:5000  (API + health check)
#    → client: http://localhost:5173  (Vite dev server, proxies /api → :5000)

# Option B - run separately, in two terminals
npm run server     # nodemon auto-restarts on backend changes
npm run client     # Vite HMR for frontend

# Production
npm run build      # builds client/dist
npm start          # starts Express server
```

### Useful endpoints

| Method | Endpoint        | Purpose                        |
| ------ | --------------- | ------------------------------ |
| GET    | `/api/health`   | Verify the API is running      |
| GET    | `/`             | API welcome message            |

Open **http://localhost:5173** → redirected to the login page, with buttons to
preview the Admin / Teacher / Student dashboards.

---

## 4. Development Roadmap (per instructions)

| Phase | Scope                                                             | Status        |
| ----- | ----------------------------------------------------------------- | ------------- |
| **1** | Project setup, folder structure, runnable skeleton                | ✅ Done       |
| **2** | MongoDB connection + 12 database schemas                          | ✅ Done       |
| **3** | JWT authentication + role-based authorization                     | ✅ Done       |
| **4** | Admin dashboard & management modules (students, teachers, courses) | ✅ Done       |
| **5** | Teacher dashboard & attendance marking system                     | ✅ Done       |
| **6** | Student dashboard & attendance viewing                            | ✅ Done       |
| **7** | Reports, analytics, PDF/Excel export                              | ✅ Done       |
| **8** | Responsive design, notifications, profile & search                | ✅ Done       |
| **9** | Testing, security hardening, bug fixes                            | ✅ Done       |
| **10**| Deployment                                                        | ✅ Done       |

All 10 phases complete. See **§7 Deployment** below for going live.

---

## 4b. Test & verification commands (from `server/`)

```bash
npm run validate:models   # offline schema check .............. 32/32 ✅
npm run test:auth         # offline JWT/roles/validation tests . 18/18 ✅
npm run smoke-test        # LIVE DB: indexes, dupes, hashing ... 21/21 ✅
npm run test:e2e          # LIVE HTTP: full auth workflow ....... 25/25 ✅
npm run test:admin        # LIVE HTTP: admin CRUD + RBAC ........ 45/45 ✅
npm run test:teacher      # LIVE HTTP: teacher scoping + marking  39/39 ✅
npm run test:student      # LIVE HTTP: student view + isolation   40/40 ✅
npm run test:reports      # LIVE HTTP: reports + PDF/Excel export  49/49 ✅
npm run test:notifications # LIVE HTTP: bell inbox + read states   24/24 ✅
npm run test:security     # LIVE HTTP: headers, injection, JWT, RBAC,
                          #            rate limits, leakage ....... 39/39 ✅
npm run test:prod         # PRODUCTION mode: SPA serving + API .... 12/12 ✅
npm run seed              # create default admin (admin@college.edu / Admin@123)
```

- `smoke-test`, `test:e2e`, `test:admin`, `test:teacher`, `test:student`, `test:reports`,
  `test:notifications` and `test:security` connect to the real MongoDB
  (`MONGO_URI` in `server/.env`) and clean up all test data afterwards
  (including notifications created by marking).
- The E2E suites boot the Express app in-process, so they need no running server.

---

## 5. Database Models (Phase 2)

`User` · `Student` · `Teacher` · `Department` · `Course` · `Subject` ·
`Semester` · `Class` · `Timetable` · `Attendance` · `LeaveRequest` · `Notification`

See `server/src/models/README.md` for the file list.

---

## 6. Key Rules baked into the architecture

- ⛔ Students can **never** mark/edit attendance (enforced on API, Phase 3)
- 🔒 Teachers only access **their assigned** subjects and classes
- 📝 Attendance corrections keep an **audit history**
- 🔐 Passwords hashed with **bcrypt**, secrets in `.env` (git-ignored)
- 🛡️ Phase 9 hardening: helmet headers, CORS allow-list, per-IP rate limits
  (global / failed-login / password-reset), NoSQL-injection query guard,
  sort-field whitelist, production 500 masking
- 📊 Attendance % = `(Present / Conducted) × 100`, computed **per subject**

---

## 7. Deployment (Phase 10)

The app supports two shapes. In **both**, MongoDB runs on **Atlas** and the
server reads everything from `.env` (see `server/.env.example`).

### Option A — single service (simplest)

Express serves the built React app from `client/dist`, so one process hosts
the whole product (verified by `npm run test:prod`):

```bash
# local production run
npm run install:all          # root: install server + client deps
npm run build                # root: vite build -> client/dist
NODE_ENV=production npm start  # root: Express on :5000 (SPA + API)
# PowerShell:  $env:NODE_ENV="production"; npm start
```

**Render** (web service):

| Setting    | Value                                             |
| ---------- | ------------------------------------------------- |
| Root dir   | `Attendence/` (repo root)                         |
| Build      | `npm run install:all && npm run build`            |
| Start      | `npm start`                                       |
| Health     | `/api/health`                                     |

### Option B — split hosting

- **Frontend → Vercel/Netlify**: `client/` (SPA rewrites ship in
  `client/vercel.json`). Set `VITE_API_BASE_URL=https://<api-host>/api`.
- **Backend → Render/Railway**: `server/` with start `npm start`.
  Set `CLIENT_URL=https://<frontend-host>` for the CORS allow-list.

### Environment variables (server)

| Var                | Required | Notes                                                     |
| ------------------ | -------- | --------------------------------------------------------- |
| `MONGO_URI`        | ✅       | Atlas connection string → `/college_attendance`            |
| `JWT_SECRET`       | ✅       | long random string; required when `NODE_ENV=production`   |
| `NODE_ENV`         | ✅       | `production` enables SPA serving + 500-masking            |
| `CLIENT_URL`       | ✅       | frontend origin for CORS                                  |
| `PORT`             | ⬜       | defaults to `5000`                                        |
| `TRUST_PROXY`      | ⬜       | `true` behind nginx/Render so rate-limits see real IPs    |
| `LOGIN_RATE_LIMIT` | ⬜       | failed-login budget per 15 min (default `20`)             |
| `JWT_EXPIRES_IN`   | ⬜       | default `1d`                                              |

### Production checklist

- [x] `npm run build` (client), `NODE_ENV=production` (server)
- [x] Health endpoint `/api/health` for uptime checks
- [x] Graceful shutdown on SIGTERM (drains connections, closes Mongo)
- [x] Security headers + CSP (Google Fonts allow-listed), rate limits
- [x] `engines.node >= 18`, no secrets in the repo (`.env` git-ignored)
- [x] Full suite green: **344 checks** across 11 commands
