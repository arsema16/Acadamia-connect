# Implementation Plan: Academia Connect

## Overview

Incremental implementation of the Academia Connect PWA — filling gaps in the existing Node.js/Express + SQLite codebase. Each task builds on the previous, starting with the auth/RBAC foundation, then completing each portal's backend routes, then wiring the frontend, and finishing with the notification pipeline and PWA infrastructure.

## Tasks

- [x] 1. Harden the Auth module and RBAC middleware
  - [x] 1.1 Implement `requireAuth(role)` middleware in `routes/auth.js` (or a shared `middleware/auth.js`) that returns HTTP 401 when no session exists and HTTP 403 when the session role does not match the required role; apply it to all existing route files
    - Replace the inline `auth()` guard in each route file with the shared middleware
    - _Requirements: 5.6, 5.7_
  - [ ]* 1.2 Write property test — RBAC prevents cross-role API access
    - **Property 5: RBAC prevents cross-role API access**
    - **Validates: Requirements 5.6**
  - [ ]* 1.3 Write property test — Unauthenticated requests return HTTP 401
    - **Property 6: Unauthenticated requests to protected routes return HTTP 401**
    - **Validates: Requirements 5.7**

- [x] 2. Complete registration validation and password security
  - [x] 2.1 Add server-side validation in `POST /api/auth/register` for all required fields (full_name, email, phone, password, school_name, role); return HTTP 400 with a descriptive message for each missing/invalid field
    - Validate email format, phone format (`+251[79]\d{8}`), and password length ≥ 8
    - Return HTTP 409 on duplicate email or duplicate `employee_id`
    - _Requirements: 1.5, 1.6, 3.2_
  - [x] 2.2 Ensure all role registration paths (student, teacher, parent) hash passwords with `bcrypt` before DB insertion; confirm no plaintext password is stored
    - _Requirements: 1.7, 1.8, 1.9_
  - [ ]* 2.3 Write property test — Registration validation rejects incomplete payloads
    - **Property 1: Registration validation rejects incomplete payloads**
    - **Validates: Requirements 1.5**
  - [ ]* 2.4 Write property test — Passwords are always stored as bcrypt hashes
    - **Property 2: Passwords are always stored as bcrypt hashes**
    - **Validates: Requirements 1.7, 1.8, 1.9**
  - [ ]* 2.5 Write property test — Email uniqueness is enforced per role table
    - **Property 3: Email uniqueness is enforced per role table**
    - **Validates: Requirements 1.10**

- [x] 3. Complete login, session, and logout endpoints
  - [x] 3.1 Implement `POST /api/auth/login` to verify credentials with `bcrypt.compareSync`, set `req.session.userId`, `req.session.role`, and `req.session.schoolId`, and return the sanitised user object; return a generic error message on failure (no field hint)
    - _Requirements: 5.1, 5.2_
  - [x] 3.2 Implement `POST /api/auth/logout` to call `req.session.destroy()` and return success
    - _Requirements: 5.4_
  - [x] 3.3 Implement `GET /api/auth/me` to return the current session user or `{ success: false }` if unauthenticated
    - _Requirements: 5.1_
  - [ ]* 3.4 Write property test — Invalid credentials produce a generic error message
    - **Property 4: Invalid credentials produce a generic error message**
    - **Validates: Requirements 5.2**

- [ ] 4. Checkpoint — Ensure all auth tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Complete Student portal backend routes (`routes/student.js`)
  - [x] 5.1 Implement `GET /api/student/dashboard` returning student record, tasks, assessments, badges, notifications, and announcements for the authenticated student's school
    - _Requirements: 7.1, 7.4, 7.5_
  - [x] 5.2 Implement `GET /api/student/tasks` and `POST /api/student/tasks` for listing and creating tasks; `PUT /api/student/tasks/:id` for updating (including marking complete); `DELETE /api/student/tasks/:id` for deletion
    - On task completion (`completed = 1`), award +10 points and set `reward_minutes` / `reward_expires` on the student record
    - _Requirements: 9.3, 9.5, 9.7_
  - [ ]* 5.3 Write property test — Task creation round-trip preserves all fields
    - **Property 7: Task creation round-trip preserves all fields**
    - **Validates: Requirements 9.3**
  - [ ]* 5.4 Write property test — Marking a task complete updates the DB
    - **Property 8: Marking a task complete updates the DB**
    - **Validates: Requirements 9.5**
  - [x] 5.5 Implement `GET /api/student/results`, `GET /api/student/attendance`, `GET /api/student/notes`, `POST /api/student/notes`, `PUT /api/student/notes/:id`, `DELETE /api/student/notes/:id`
    - _Requirements: 10.1, 13.6_
  - [x] 5.6 Implement `GET /api/student/videos`, `GET /api/student/quizzes`, `POST /api/student/quiz-attempt`, `GET /api/student/leaderboard`, `GET /api/student/challenges`, `GET /api/student/portfolio`, `POST /api/student/portfolio`, `GET /api/student/analytics`
    - Quiz attempt: calculate score, award `reward_minutes` on the student record
    - _Requirements: 7.4, 7.5_

- [x] 6. Complete Teacher portal backend routes (`routes/teacher.js`)
  - [x] 6.1 Implement `GET /api/teacher/dashboard` and `GET /api/teacher/students` returning all students in the teacher's school
    - _Requirements: 11.1, 11.2_
  - [x] 6.2 Implement `POST /api/teacher/assessment` to insert into `assessments`, calculate `percentage` and `grade` using the defined scale, and optionally create a parent notification when `sent_to_parent = 1`
    - Grade scale: ≥90→A+, ≥80→A, ≥70→B+, ≥60→B, ≥50→C, ≥40→D, <40→F
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ]* 6.3 Write property test — Grade calculation is consistent with the defined scale
    - **Property 9: Grade calculation is consistent with the defined scale**
    - **Validates: Requirements 12.2**
  - [x] 6.4 Implement `GET /api/teacher/assessments/:studentId`, `POST /api/teacher/attendance` (bulk), `GET /api/teacher/subjects`, `POST /api/teacher/subjects`
    - _Requirements: 12.3, 13.1, 13.2, 13.3, 13.5_
  - [x] 6.5 Implement `GET /api/teacher/quizzes`, `POST /api/teacher/quiz`, `GET /api/teacher/videos`, `POST /api/teacher/videos` (with multer), `GET /api/teacher/materials`, `POST /api/teacher/materials`, `GET /api/teacher/competitions`, `POST /api/teacher/competitions`
    - _Requirements: 11.3_
  - [x] 6.6 Implement `GET /api/teacher/announcements`, `POST /api/teacher/announcements`, `GET /api/teacher/events`, `POST /api/teacher/events`, `GET /api/teacher/messages`, `POST /api/teacher/messages`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 7. Complete Parent portal backend routes (`routes/parent.js`)
  - [x] 7.1 Implement `GET /api/parent/dashboard` returning parent record, linked children, notifications, payments, and announcements
    - Resolve children from the `children` JSON column (array of email strings) to full student records
    - _Requirements: 15.1, 15.2_
  - [x] 7.2 Implement `GET /api/parent/child/:id` returning the child's assessments, tasks, badges, and attendance records
    - _Requirements: 15.3, 15.4, 15.5, 15.6_
  - [x] 7.3 Implement `GET /api/parent/teachers`, `GET /api/parent/messages`, `POST /api/parent/messages`, `GET /api/parent/payments`, `POST /api/parent/payment`, `PUT /api/parent/payment-reminders`
    - Payment confirmation: set `status = 'paid'`, `paid_date = today`, generate `receipt_no`
    - _Requirements: 16.1, 16.2, 16.3_
  - [x] 7.4 Implement `GET /api/parent/group-messages/:grade`, `POST /api/parent/group-messages/:grade`, `GET /api/parent/videos`, `GET /api/parent/events`
    - Group messages: resolve `group_id` from `parent_groups` by school + grade, create group if absent
    - _Requirements: 15.1_

- [ ] 8. Checkpoint — Ensure all portal route tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Complete common routes (`routes/common.js`)
  - [x] 9.1 Implement `GET /api/common/videos` (approved videos for the school), `POST /api/common/video-like`, `GET /api/common/video-comments/:id`, `POST /api/common/video-comment`, `GET /api/common/announcements`
    - Video like: toggle entry in `video_likes`; update `videos.likes` count
    - _Requirements: 17.1_
  - [x] 9.2 Implement `PUT /api/common/notifications/read-all` to mark all notifications as read for the current user
    - _Requirements: 17.3_

- [x] 10. Implement the Notification Service helpers
  - [x] 10.1 Create a `utils/notifications.js` module exporting `createNotification(userId, userRole, title, body, type)` that inserts into the `notifications` table; import and use it in assessment, attendance, message, and payment routes
    - _Requirements: 17.1, 17.2_
  - [x] 10.2 Add `nodemailer` email dispatch in `createNotification` for the types: `assessment_result`, `password_reset`, `meeting_confirmation`; read SMTP config from `process.env`
    - _Requirements: 17.4_
  - [x] 10.3 Add Web Push dispatch (using the `web-push` package or the existing push subscription table if present) for types: `task_reminder`, `new_message`, `assessment_result` (parent), `attendance_alert` (parent)
    - _Requirements: 17.5_

- [x] 11. Implement password reset flow
  - [x] 11.1 Implement `POST /api/auth/forgot-password`: look up user by email across all role tables, generate a time-limited token (store in a `password_resets` table or in-memory map), and send a reset link via email
    - _Requirements: 5.5_
  - [x] 11.2 Implement `POST /api/auth/reset-password`: validate token, hash the new password with bcrypt, update the correct role table, and invalidate the token
    - _Requirements: 5.5_

- [x] 12. Wire the frontend — Student portal (`public/js/student.js`)
  - [x] 12.1 Ensure `renderStudentPortal()` calls `GET /api/student/dashboard` and populates all dashboard widgets: welcome banner with nickname, motivational quote, streak badge, task summary, recent results, and badges
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 12.2 Ensure task CRUD functions (`showAddTaskModal`, `saveTask`, `toggleTask`, `deleteTask`) call the correct student API endpoints and refresh the view on success; verify the reward timer appears after task completion
    - _Requirements: 9.3, 9.5, 9.7_
  - [x] 12.3 Ensure `renderStudentAnalytics` calls `GET /api/student/analytics` and renders the weekly bar chart and four-week line chart in the Dark Academia style
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 12.4 Ensure quiz flow (`startQuiz`, `submitQuiz`) calls `POST /api/student/quiz-attempt` and shows the score and reward minutes awarded
    - _Requirements: 7.4_
  - [x] 12.5 Ensure `renderStudentChat` connects to Socket.IO and sends/receives messages in real time; show typing indicator on `user_typing` event
    - _Requirements: 14.2, 14.3_

- [x] 13. Wire the frontend — Teacher portal (`public/js/teacher.js`)
  - [x] 13.1 Ensure `renderTeacherDashboard` populates the quick student search and recent announcements from dashboard API data
    - _Requirements: 11.1, 11.2_
  - [x] 13.2 Ensure `submitAssessment` calls `POST /api/teacher/assessment`, handles the "Submit & Notify Parent" path (sets `sent_to_parent = 1`), and reloads previous assessments on success
    - _Requirements: 12.1, 12.3, 12.4, 12.5_
  - [x] 13.3 Ensure `submitAttendance` calls `POST /api/teacher/attendance` with the full records array and shows a success toast
    - _Requirements: 13.5, 13.6_
  - [x] 13.4 Ensure `renderTeacherChat` and `openTeacherChatWith` connect to Socket.IO and send/receive messages in real time
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 14. Wire the frontend — Parent portal (`public/js/parent.js`)
  - [x] 14.1 Ensure `renderParentDashboard` populates child stats, recent notifications, payments, and announcements from dashboard API data; verify child selector renders when multiple children are linked
    - _Requirements: 15.1, 15.2_
  - [x] 14.2 Ensure `renderParentProgress` and `renderParentAttendance` call `GET /api/parent/child/:id` and render the results table and attendance calendar correctly
    - _Requirements: 15.3, 15.4, 15.5, 15.6_
  - [x] 14.3 Ensure `openParentChat` and `sendParentMsg` connect to Socket.IO and deliver messages in real time; ensure `renderParentGroups` and `openParentGroup` load and post group messages
    - _Requirements: 16.2, 16.3_
  - [x] 14.4 Ensure `confirmPayment` calls `POST /api/parent/payment` and displays the receipt number on success
    - _Requirements: 16.1_

- [ ] 15. Checkpoint — Ensure all frontend wiring tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement the AI Chatbot — Athena (`public/js/ai.js`)
  - [x] 16.1 Implement the floating action button toggle, draggable positioning, and panel open/close in `ai.js`; ensure the button is visible on all portal pages
    - _Requirements: 8.1, 8.2_
  - [x] 16.2 Implement `sendAI()` and `aiQuick()` to match the user's message against the predefined knowledge base (study tips, time management, exam prep, overwhelmed); inject grade/subject context from `AppState.user` when available
    - _Requirements: 8.3, 8.4, 8.5_
  - [x] 16.3 Implement the "Escalate to Teacher" response path that calls `POST /api/student/messages` with the chatbot conversation summary
    - _Requirements: 8.6, 8.7_

- [x] 17. Implement PWA infrastructure
  - [x] 17.1 Verify `public/manifest.json` contains: `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color: "#2C1810"`, `background_color: "#2C1810"`, and references to the 192px and 512px icons
    - _Requirements: 6.8_
  - [x] 17.2 Implement `public/sw.js` with a cache-first strategy for static assets (`/css/`, `/js/`, `/icons/`) and a network-first strategy for `/api/` routes; pre-cache the app shell on install
    - _Requirements: 6.8_
  - [x] 17.3 Verify the service worker registration script in `public/index.html` runs on `DOMContentLoaded` and handles registration errors silently
    - _Requirements: 6.8_

- [x] 18. Verify seed data idempotency
  - [x] 18.1 Review `db/database.js` `seedData()` to confirm all `INSERT` statements use `INSERT OR IGNORE` and that the early-return guard (`if (schoolCount.c > 0) return`) is in place; add any missing `OR IGNORE` clauses
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_
  - [ ]* 18.2 Write property test — Seed data is idempotent
    - **Property 10: Seed data is idempotent**
    - **Validates: Requirements 18.8**

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Property tests use **fast-check** (already compatible with the Node.js stack); unit/integration tests use **Jest** + **supertest**
- Each property test tag format: `// Feature: academia-connect, Property N: <property_text>`
- All API routes use `better-sqlite3` synchronously — no async/await needed in route handlers
- Socket.IO real-time delivery is best-effort; messages are always persisted to the DB first
- The grade calculation scale (A+/A/B+/B/C/D/F) must be identical in both `routes/teacher.js` and `public/js/teacher.js` (`calcGrade()`)
