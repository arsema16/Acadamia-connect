# Design Document — Academia Connect

## Overview

Academia Connect is a Progressive Web App (PWA) that connects students, teachers, and parents through three distinct role-based portals, all sharing a Dark Academia aesthetic. The platform is built on an existing Node.js/Express backend with SQLite (via `better-sqlite3`), Socket.IO for real-time messaging, and a single-page frontend architecture.

The design goal is to formalise and complete the existing implementation: filling gaps in the authentication flow, hardening RBAC, completing the notification pipeline, and ensuring all three portals deliver their full feature sets as described in the requirements. No new runtime dependencies are introduced beyond what is already declared in `package.json`.

---

## Architecture

The system follows a classic **MVC-adjacent monolith** pattern suited to a single-server Node.js deployment:

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (SPA)                       │
│  public/index.html + public/js/*.js + public/css/*.js   │
│  Service Worker (sw.js) — offline cache                 │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  server.js (Express + Socket.IO)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │/api/auth │ │/api/stud │ │/api/teach│ │/api/par  │  │
│  │routes/   │ │ent       │ │er        │ │ent       │  │
│  │auth.js   │ │routes/   │ │routes/   │ │routes/   │  │
│  └──────────┘ │student.js│ │teacher.js│ │parent.js │  │
│               └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                             │
│  │/api/admin│ │/api/comm │                             │
│  │routes/   │ │on        │                             │
│  │admin.js  │ │routes/   │                             │
│  └──────────┘ │common.js │                             │
│               └──────────┘                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Socket.IO Event Bus                   │   │
│  │  join · send_message · typing · announcement    │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ better-sqlite3 (synchronous)
┌────────────────────▼────────────────────────────────────┐
│                  db/database.js                         │
│  academia.db — SQLite file                              │
│  Tables: schools, students, teachers, parents, admins,  │
│  tasks, assessments, attendance, messages, notifications│
│  announcements, videos, quizzes, quiz_attempts,         │
│  competitions, leaderboard, notes, payments,            │
│  study_sessions, badges, events, challenge_progress,    │
│  portfolios, parent_groups, group_messages, video_likes │
│  video_comments, kudos, subjects                        │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Single-page frontend**: All portal views are rendered client-side via vanilla JS modules (`student.js`, `teacher.js`, `parent.js`, `admin.js`). Navigation is handled by `showPage()` / `switchXTab()` functions without full page reloads.
- **Session-based auth**: `express-session` stores role and user ID server-side. No JWT is used, keeping the implementation simple and stateful.
- **Synchronous SQLite**: `better-sqlite3` is used synchronously, which is appropriate for a single-server deployment and avoids callback/promise complexity in route handlers.
- **Socket.IO for real-time**: A single `connectedUsers` map (userId_role → socketId) routes messages and typing indicators to the correct recipient.
- **Multer for uploads**: File uploads (avatars, ID photos, videos) are handled by `multer` and stored under `uploads/`.

---

## Components and Interfaces

### Auth Module (`routes/auth.js`)

Responsible for registration, login, logout, session check, and password reset.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Multi-role registration |
| POST | `/api/auth/login` | Login with role selection |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Return current session user |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Set new password via token |

**Registration payload shape (student):**
```json
{
  "role": "student",
  "full_name": "...", "nickname": "...", "gender": "...",
  "email": "...", "phone": "...", "password": "...",
  "school_name": "...", "grade": "...", "section": "...",
  "parent_name": "...", "parent_contact": "...",
  "subjects": ["Mathematics", "English"],
  "avatar": "scholar"
}
```

**RBAC middleware** (`requireAuth(role)`): Checks `req.session.userId` and `req.session.role`. Returns HTTP 401 if unauthenticated, HTTP 403 if wrong role.

---

### Student Portal (`routes/student.js` + `public/js/student.js`)

**Backend endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/student/dashboard` | Dashboard data (student, tasks, assessments, badges, notifications, announcements) |
| GET/POST | `/api/student/tasks` | List / create tasks |
| PUT/DELETE | `/api/student/tasks/:id` | Update / delete task |
| GET | `/api/student/results` | Assessment results |
| GET | `/api/student/attendance` | Attendance records |
| GET/POST/PUT/DELETE | `/api/student/notes` | Notes CRUD |
| GET | `/api/student/videos` | School videos |
| GET | `/api/student/quizzes` | Available quizzes |
| POST | `/api/student/quiz-attempt` | Submit quiz answers |
| GET | `/api/student/leaderboard` | School leaderboard |
| GET | `/api/student/challenges` | Interest challenges |
| GET/POST | `/api/student/portfolio` | Portfolio items |
| GET | `/api/student/analytics` | Study analytics |

**Frontend tabs:** dashboard · tasks · results · attendance · notes · videos · challenges · quizzes · movies · chat · leaderboard · games · portfolio · timer · analytics

---

### Teacher Portal (`routes/teacher.js` + `public/js/teacher.js`)

**Backend endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/teacher/dashboard` | Dashboard data |
| GET | `/api/teacher/students` | Students in teacher's school |
| POST | `/api/teacher/assessment` | Create assessment |
| GET | `/api/teacher/assessments/:studentId` | Student's assessments |
| POST | `/api/teacher/attendance` | Bulk attendance save |
| GET/POST | `/api/teacher/subjects` | Subjects list / add |
| GET/POST | `/api/teacher/quizzes` | Quizzes list / create |
| POST | `/api/teacher/quiz` | Create quiz |
| GET/POST | `/api/teacher/videos` | Videos |
| GET/POST | `/api/teacher/materials` | Teaching materials |
| GET/POST | `/api/teacher/competitions` | Competitions |
| GET/POST | `/api/teacher/announcements` | Announcements |
| GET/POST | `/api/teacher/events` | Events |
| GET | `/api/teacher/messages` | Message threads |
| POST | `/api/teacher/messages` | Send message |

---

### Parent Portal (`routes/parent.js` + `public/js/parent.js`)

**Backend endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/parent/dashboard` | Dashboard data (parent, children, notifications, payments, announcements) |
| GET | `/api/parent/child/:id` | Child detail (results, tasks, badges, attendance) |
| GET | `/api/parent/teachers` | Teachers of linked children |
| GET/POST | `/api/parent/messages` | Message threads with teachers |
| GET | `/api/parent/payments` | Payment records |
| POST | `/api/parent/payment` | Confirm payment |
| PUT | `/api/parent/payment-reminders` | Toggle reminders |
| GET | `/api/parent/group-messages/:grade` | Grade group messages |
| POST | `/api/parent/group-messages/:grade` | Post to group |
| GET | `/api/parent/videos` | School videos |
| GET | `/api/parent/events` | School events |

---

### Notification Service

Notifications are created server-side and stored in the `notifications` table. Delivery channels:

1. **In-app**: Fetched on dashboard load; unread count shown in topbar badge.
2. **Email**: Via `nodemailer` (configured via `.env`). Triggered for: assessment results sent to parent, password reset, meeting confirmations.
3. **Browser Push**: Via Web Push API (VAPID keys in `.env`). Triggered for: task due-date reminders, new messages, new assessment results (parent), attendance alerts (parent).
4. **SMS**: Via Twilio (optional, configured via `.env`). Triggered for: assessment results sent to parent, critical attendance alerts.

**Notification creation helper** (server-side utility):
```js
function createNotification(userId, userRole, title, body, type) {
  db.prepare(`INSERT INTO notifications (user_id, user_role, title, body, type)
              VALUES (?, ?, ?, ?, ?)`).run(userId, userRole, title, body, type);
}
```

---

### AI Chatbot — Athena (`public/js/ai.js`)

- Floating action button accessible from all portal pages.
- Predefined knowledge base covering study techniques, time management, subject resources, and motivational content.
- Grade/subject context injected from `AppState.user` when available.
- "Escalate to Teacher" option posts a message via `/api/student/messages`.
- Fallback response when no relevant answer is found.

---

### PWA Infrastructure

- `public/manifest.json`: App name, icons (192px, 512px), theme colour `#2C1810`, display `standalone`.
- `public/sw.js`: Cache-first strategy for static assets; network-first for API calls.
- Service worker registered in `index.html` on `DOMContentLoaded`.

---

## Data Models

All tables are defined in `db/database.js`. Key models relevant to the requirements:

### `students`
```
id, full_name, nickname, gender, email, phone, password (bcrypt),
school_id, grade, section, parent_name, parent_contact,
avatar, id_photo, points, streak, last_study_date,
reward_minutes, reward_expires, interests, created_at
```

### `teachers`
```
id, full_name, email, phone, password (bcrypt), employee_id (UNIQUE),
school_id, subjects (JSON), classes (JSON), qualifications,
experience, availability, profile_image, bio, id_upload, created_at
```

### `parents`
```
id, full_name, parental_status, phone, email, password (bcrypt),
school_id, children (JSON array of email strings), payment_reminders, created_at
```

### `tasks`
```
id, student_id (FK), title, subject, due_date, due_time,
priority (Low/Medium/High), notes, recurring (none/daily/weekly),
completed (0/1), created_at
```

### `assessments`
```
id, student_id (FK), teacher_id (FK), subject, assessment_type,
date, max_marks, marks_obtained, percentage, grade,
comments, topics, sent_to_parent (0/1), created_at
```

### `attendance`
```
id, student_id (FK), teacher_id (FK), date, status (Present/Absent/Late/Excused),
notes, created_at
```

### `messages`
```
id, sender_id, sender_role, receiver_id, receiver_role,
content, media_url, media_type, read_status (0/1),
starred, pinned, reply_to, school_id, created_at
```

### `notifications`
```
id, user_id, user_role, title, body, type, read_status (0/1), created_at
```

### Grade Calculation Logic

The grade is derived from percentage using this scale (used in both frontend `calcGrade()` and backend assessment route):

| Percentage | Grade |
|-----------|-------|
| ≥ 90 | A+ |
| ≥ 80 | A |
| ≥ 70 | B+ |
| ≥ 60 | B |
| ≥ 50 | C |
| ≥ 40 | D |
| < 40 | F |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registration validation rejects incomplete payloads

*For any* registration payload where one or more required fields (full_name, email, phone, password, school_name, role) are absent or empty, the `/api/auth/register` endpoint SHALL return an error response and SHALL NOT insert a record into the corresponding role table.

**Validates: Requirements 1.5**

---

### Property 2: Passwords are always stored as bcrypt hashes

*For any* valid registration payload for any role (student, teacher, parent), the password value stored in the database SHALL be a bcrypt hash (matching the pattern `$2b$...`) and SHALL NOT equal the plaintext password submitted in the payload.

**Validates: Requirements 1.7, 1.8, 1.9**

---

### Property 3: Email uniqueness is enforced per role table

*For any* email address that already exists in a role's table, a second registration attempt with the same email and same role SHALL return an error response and SHALL NOT create a duplicate record.

**Validates: Requirements 1.10**

---

### Property 4: Invalid credentials produce a generic error message

*For any* login attempt where the email does not exist in the target role's table, or where the password does not match the stored hash, the response SHALL contain an error message that does not identify which specific field (email or password) was incorrect.

**Validates: Requirements 5.2**

---

### Property 5: RBAC prevents cross-role API access

*For any* authenticated session belonging to role R, a request to any protected API route belonging to a different role R' SHALL return HTTP 401 or HTTP 403, regardless of the specific route path or HTTP method.

**Validates: Requirements 5.6**

---

### Property 6: Unauthenticated requests to protected routes return HTTP 401

*For any* protected API route (student, teacher, parent, admin), a request made without an active session SHALL return HTTP 401.

**Validates: Requirements 5.7**

---

### Property 7: Task creation round-trip preserves all fields

*For any* valid task creation payload (title, subject, due_date, due_time, priority, notes, recurring), after the task is created and then retrieved, all submitted fields SHALL be present in the retrieved record with their original values.

**Validates: Requirements 9.3**

---

### Property 8: Marking a task complete updates the DB

*For any* existing task with `completed = 0`, after a PUT request setting `completed = 1`, a subsequent GET of that task SHALL return `completed = 1`.

**Validates: Requirements 9.5**

---

### Property 9: Grade calculation is consistent with the defined scale

*For any* pair (marks_obtained, max_marks) where `0 ≤ marks_obtained ≤ max_marks` and `max_marks > 0`, the calculated percentage SHALL equal `round((marks_obtained / max_marks) * 100)` and the assigned letter grade SHALL match the defined grading scale.

**Validates: Requirements 12.2**

---

### Property 10: Seed data is idempotent

*For any* number of calls to `seedData()` on a database that already contains school records, the count of rows in the `schools`, `students`, `teachers`, and `parents` tables SHALL remain unchanged after each subsequent call.

**Validates: Requirements 18.8**

---

## Error Handling

### Authentication Errors
- Missing session on protected route → HTTP 401 `{ success: false, message: "Unauthorized" }`
- Wrong role on protected route → HTTP 403 `{ success: false, message: "Forbidden" }`
- Invalid credentials → HTTP 401 `{ success: false, message: "Invalid credentials" }` (generic, no field hint)
- Duplicate email on registration → HTTP 409 `{ success: false, message: "Email already registered" }`
- Duplicate employee_id on teacher registration → HTTP 409 `{ success: false, message: "Employee ID already exists" }`

### Validation Errors
- Missing required field → HTTP 400 `{ success: false, message: "Field X is required" }`
- Password mismatch → HTTP 400 `{ success: false, message: "Passwords do not match" }`
- Password too short → HTTP 400 `{ success: false, message: "Password must be at least 8 characters" }`

### Database Errors
- SQLite constraint violations are caught and mapped to descriptive HTTP 409 responses.
- Unexpected DB errors return HTTP 500 `{ success: false, message: "Internal server error" }` without leaking stack traces.

### File Upload Errors
- Unsupported file type → HTTP 400 `{ success: false, message: "Unsupported file type" }`
- File too large (>100MB for video, >5MB for images) → HTTP 413

### Socket.IO
- If a target user is not connected, the message is stored in the DB only (no real-time delivery). The recipient will see it on next load.
- Socket errors are caught and logged server-side; the client degrades gracefully to polling-free operation.

### Frontend
- All API calls go through `public/js/api.js` which wraps `fetch`. On network error, a toast notification is shown.
- Session expiry (401 response) triggers automatic redirect to the login screen.

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and pure functions. Recommended framework: **Jest** (Node.js).

Focus areas:
- `calcGrade(marks, max)` — verify all grade boundary values
- `checkPwStrength(password)` — verify strength levels at each threshold
- Registration payload validation logic — verify each required field check
- `seedData()` idempotency — call twice, verify counts unchanged
- Notification creation helper — verify DB insertion

### Property-Based Tests

Property-based testing is applicable to this feature because it contains pure functions (grade calculation, password hashing), data round-trips (task creation/retrieval), and universal invariants (RBAC, email uniqueness). Recommended library: **fast-check** (JavaScript/Node.js).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: academia-connect, Property N: <property_text>`

**Property 1 — Registration validation rejects incomplete payloads**
- Generator: random registration payloads with one or more required fields set to `""` or `null`
- Assertion: response is an error; DB row count for the role table is unchanged
- `// Feature: academia-connect, Property 1: registration validation rejects incomplete payloads`

**Property 2 — Passwords are always stored as bcrypt hashes**
- Generator: random valid registration payloads with random password strings (length 8–64)
- Assertion: stored password starts with `$2b$`; `bcrypt.compareSync(plaintext, stored)` returns true; stored !== plaintext
- `// Feature: academia-connect, Property 2: passwords are always stored as bcrypt hashes`

**Property 3 — Email uniqueness is enforced per role table**
- Generator: random valid registration payload; register once; attempt again with same email
- Assertion: second attempt returns error; row count in role table is unchanged
- `// Feature: academia-connect, Property 3: email uniqueness is enforced per role table`

**Property 4 — Invalid credentials produce a generic error message**
- Generator: random email/password pairs not matching any seeded user
- Assertion: response message does not contain "email" or "password" as the identified wrong field; message is the same for non-existent email vs wrong password
- `// Feature: academia-connect, Property 4: invalid credentials produce a generic error message`

**Property 5 — RBAC prevents cross-role API access**
- Generator: authenticated session for role R; random selection of protected routes for role R' (R' ≠ R)
- Assertion: all responses return status 401 or 403
- `// Feature: academia-connect, Property 5: RBAC prevents cross-role API access`

**Property 6 — Unauthenticated requests to protected routes return HTTP 401**
- Generator: random selection from the set of all protected API route paths
- Assertion: all responses return status 401
- `// Feature: academia-connect, Property 6: unauthenticated requests to protected routes return HTTP 401`

**Property 7 — Task creation round-trip preserves all fields**
- Generator: random task payloads with valid title (non-empty string), random subject, random due_date (ISO date string), random priority from {Low, Medium, High}, random notes string, random recurring from {none, daily, weekly}
- Assertion: retrieved task contains all submitted fields with identical values
- `// Feature: academia-connect, Property 7: task creation round-trip preserves all fields`

**Property 8 — Marking a task complete updates the DB**
- Generator: random existing task IDs with `completed = 0`
- Assertion: after PUT with `completed: 1`, GET returns `completed = 1`
- `// Feature: academia-connect, Property 8: marking a task complete updates the DB`

**Property 9 — Grade calculation is consistent with the defined scale**
- Generator: random integer pairs (marks, max) where `0 ≤ marks ≤ max`, `1 ≤ max ≤ 1000`
- Assertion: `percentage === Math.round((marks / max) * 100)`; grade matches the defined scale boundaries
- `// Feature: academia-connect, Property 9: grade calculation is consistent with the defined scale`

**Property 10 — Seed data is idempotent**
- Generator: call `seedData()` N times (N drawn from 2–10)
- Assertion: counts of schools, students, teachers, parents are identical after each call beyond the first
- `// Feature: academia-connect, Property 10: seed data is idempotent`

### Integration Tests

Integration tests verify that the full request/response cycle works correctly end-to-end using a test SQLite database. Recommended: **supertest** with Jest.

- Login flow: valid credentials → session created → dashboard data returned
- Registration flow: complete multi-step payload → record in DB → login succeeds
- Assessment send-to-parent: teacher saves assessment with `sent_to_parent=1` → notification created for parent
- Attendance save: bulk attendance POST → records in `attendance` table → visible in parent portal
- Real-time messaging: Socket.IO `send_message` event → recipient receives `new_message` event

### Manual / Exploratory Tests

- Dark Academia theme consistency across all three portals on mobile, tablet, and desktop viewports
- PWA install prompt and offline page caching
- AI chatbot responses for each quick-suggestion topic
- Avatar selection and file upload flows
- Password strength indicator at each threshold
