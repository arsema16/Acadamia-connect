# Requirements Document

## Introduction

Academia Connect is a Progressive Web App (PWA) serving as a digital communication and academic management platform. It connects three distinct user groups — students, teachers, and parents — through separate role-based portals, all styled with a consistent Dark Academia aesthetic. The platform is built on an existing Node.js/Express backend with a SQLite database, Socket.IO for real-time messaging, and a single-page frontend architecture. This document defines the requirements for completing and formalising all features across the three portals, the authentication system, the AI chatbot, the notification system, and the PWA infrastructure.

---

## Glossary

- **System**: The Academia Connect PWA application as a whole
- **Student_Portal**: The authenticated dashboard and feature set accessible only to users registered as students
- **Teacher_Portal**: The authenticated dashboard and feature set accessible only to users registered as teachers
- **Parent_Portal**: The authenticated dashboard and feature set accessible only to users registered as parents
- **Auth_Module**: The registration and login subsystem responsible for identity verification and session management
- **AI_Chatbot**: The in-app conversational assistant named "Athena" (or "Socrates") available to students
- **Notification_Service**: The subsystem responsible for delivering in-app, email, browser push, and SMS notifications
- **Task_Manager**: The student-facing to-do and calendar subsystem for managing academic tasks
- **Mark_Sheet**: A digital assessment record created by a teacher for a specific student and subject
- **Attendance_Tracker**: The teacher-facing subsystem for recording and viewing daily student attendance
- **Message_Center**: The in-app real-time messaging subsystem connecting teachers and parents
- **Progress_Tracker**: The student-facing weekly academic progress visualisation subsystem
- **DB**: The SQLite database managed via `better-sqlite3`, initialised in `db/database.js`
- **Session**: An authenticated server-side session managed by `express-session`
- **PWA**: Progressive Web App — a web application installable on mobile and desktop with offline capability
- **RBAC**: Role-Based Access Control — the mechanism ensuring users can only access their own portal's features
- **Dark_Academia_Theme**: The visual design system using aged-leather browns, beige, antique brass, and Times New Roman typography

---

## Requirements

### Requirement 1: Role-Based Registration

**User Story:** As a new user, I want to register with a specific role (student, teacher, or parent), so that I am granted access only to the features relevant to my role.

#### Acceptance Criteria

1. THE Auth_Module SHALL present three distinct registration paths: Student, Teacher, and Parent.
2. WHEN a user selects the Student registration path, THE Auth_Module SHALL collect information across three sequential steps: Basic Information, Academic Information, and Profile & Identification.
3. WHEN a user selects the Teacher registration path, THE Auth_Module SHALL collect information across three sequential steps: Basic Information, Professional Information, and Profile Completion.
4. WHEN a user selects the Parent registration path, THE Auth_Module SHALL collect information across two sequential steps: Parent Information and Child Information.
5. WHEN a registration form is submitted, THE Auth_Module SHALL validate all required fields before persisting data to the DB.
6. IF a required field is empty or invalid during registration, THEN THE Auth_Module SHALL display a descriptive inline error message identifying the specific field.
7. WHEN a student completes registration, THE Auth_Module SHALL store the student record in the `students` table with a bcrypt-hashed password.
8. WHEN a teacher completes registration, THE Auth_Module SHALL store the teacher record in the `teachers` table with a bcrypt-hashed password.
9. WHEN a parent completes registration, THE Auth_Module SHALL store the parent record in the `parents` table with a bcrypt-hashed password.
10. THE Auth_Module SHALL enforce email uniqueness across each role's table and return a descriptive error if a duplicate email is submitted.

---

### Requirement 2: Student Registration — Step Details

**User Story:** As a prospective student, I want to provide my personal, academic, and profile information during registration, so that my account is fully configured from the start.

#### Acceptance Criteria

1. WHEN completing Step 1 of student registration, THE Auth_Module SHALL collect: full name, nickname, gender, email, phone number, password, and password confirmation.
2. WHILE a student types a password in Step 1, THE Auth_Module SHALL display a real-time password strength indicator reflecting the password's complexity.
3. IF the password and confirm-password fields do not match, THEN THE Auth_Module SHALL prevent form submission and display a mismatch error.
4. WHEN completing Step 2 of student registration, THE Auth_Module SHALL collect: parent(s) name(s), parent(s) contact number(s), grade level (K–12), and a multi-select list of subjects.
5. WHEN completing Step 3 of student registration, THE Auth_Module SHALL present ten academic-themed avatar options for selection (vintage scholar, graduation cap student, owl with spectacles, quill & inkwell, antique books, chalkboard, library lamp, globe, pocket watch, magnifying glass over manuscript).
6. WHERE a student chooses to upload a student ID photo in Step 3, THE Auth_Module SHALL accept image file uploads and store the file path in the `id_photo` column of the `students` table.

---

### Requirement 3: Teacher Registration — Step Details

**User Story:** As a prospective teacher, I want to provide my personal, professional, and profile information during registration, so that my account reflects my qualifications and availability.

#### Acceptance Criteria

1. WHEN completing Step 1 of teacher registration, THE Auth_Module SHALL collect: full name, email, contact number, password, employee ID, and an optional ID document upload.
2. THE Auth_Module SHALL enforce uniqueness of the `employee_id` field and return a descriptive error if a duplicate is submitted.
3. WHEN completing Step 2 of teacher registration, THE Auth_Module SHALL collect: subjects taught (multi-select), classes taught (K–12 with sections), qualifications, teaching experience, availability for consultation, and optional linked professional profile URLs.
4. WHEN completing Step 3 of teacher registration, THE Auth_Module SHALL allow upload of a profile image and entry of a brief bio.

---

### Requirement 4: Parent Registration — Step Details

**User Story:** As a prospective parent, I want to register and link my children to my account, so that I can monitor their academic progress from a single dashboard.

#### Acceptance Criteria

1. WHEN completing Step 1 of parent registration, THE Auth_Module SHALL collect: full name, parental status (Mother / Father / Aunt / Uncle / Grandmother / Grandfather / Legal Guardian / Other), phone number, email, and password.
2. WHEN completing Step 2 of parent registration, THE Auth_Module SHALL collect for each child: child's full name, grade level, school name, and relationship confirmation.
3. THE Auth_Module SHALL allow a parent to add multiple children during Step 2 via an "Add Another Child" control.
4. WHEN a parent submits registration, THE Auth_Module SHALL store child references in the `children` JSON column of the `parents` table.

---

### Requirement 5: Authentication and Session Management

**User Story:** As a registered user, I want to log in securely and remain authenticated across sessions, so that I do not need to re-enter credentials on every visit.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Auth_Module SHALL create a server-side Session and redirect the user to their role-specific portal.
2. IF a user submits invalid credentials, THEN THE Auth_Module SHALL return an error message without revealing which field (email or password) was incorrect.
3. WHERE a user selects "Remember Me" during login, THE Auth_Module SHALL extend the Session cookie lifetime to 30 days.
4. WHEN a user logs out, THE Auth_Module SHALL destroy the Session and redirect to the landing page.
5. THE Auth_Module SHALL provide a password reset flow: the user enters their email, THE Auth_Module SHALL send a reset link via email, and WHEN the link is followed, THE Auth_Module SHALL allow the user to set a new password.
6. WHILE a Session is active, THE System SHALL enforce RBAC so that a student cannot access Teacher_Portal or Parent_Portal routes, a teacher cannot access Student_Portal or Parent_Portal routes, and a parent cannot access Student_Portal or Teacher_Portal routes.
7. IF an unauthenticated request is made to a protected API route, THEN THE System SHALL return HTTP 401 and redirect the frontend to the login screen.

---

### Requirement 6: Dark Academia Design System

**User Story:** As a user of any portal, I want a consistent, visually cohesive Dark Academia aesthetic, so that the platform feels scholarly, warm, and intellectually engaging.

#### Acceptance Criteria

1. THE System SHALL apply the following colour palette globally: primary background `#2C1810`, secondary background `#3D2319`, card/text-background `#F5E6D3`, accent `#C49A6C`, dark text `#1A1A1A`, light text `#F5F5F5`, sepia accent `#704214`.
2. THE System SHALL use Times New Roman as the typeface for all body text and headings, with italic style applied to all titles, headers, and section names.
3. THE System SHALL render all buttons with background colour `#C49A6C`, 4px border radius, a subtle box shadow, and a visible hover state.
4. THE System SHALL render all cards with a beige (`#F5E6D3`) background, dark brown border, and a subtle inner shadow.
5. THE System SHALL render all input fields with a beige background and dark brown border.
6. THE System SHALL use line-style icons in `#C49A6C` on dark backgrounds and in `#F5F5F5` on light backgrounds.
7. THE System SHALL be fully responsive, adapting layout for mobile (single-column), tablet (two-column), and desktop (multi-column) viewports.
8. THE System SHALL be installable as a PWA, with a valid `manifest.json` and a registered service worker (`sw.js`) enabling offline access to previously loaded pages.

---

### Requirement 7: Student Dashboard

**User Story:** As a student, I want a personalised dashboard that greets me and surfaces my most important academic information, so that I can stay organised and motivated.

#### Acceptance Criteria

1. WHEN a student accesses the Student_Portal, THE Student_Portal SHALL display a welcome message using the student's nickname.
2. THE Student_Portal SHALL display an animated smiley face element (✿◠‿◠) on the dashboard.
3. THE Student_Portal SHALL display a daily motivational quote in italic Times New Roman that changes each calendar day.
4. THE Student_Portal SHALL display the student's current task summary (total tasks, completed tasks, overdue tasks) on the dashboard.
5. THE Student_Portal SHALL display the student's current streak count and earned badges on the dashboard.

---

### Requirement 8: AI Chatbot — Athena

**User Story:** As a student, I want access to an AI study assistant, so that I can get guidance on study tips, time management, subject advice, homework help, and motivation at any time.

#### Acceptance Criteria

1. THE AI_Chatbot SHALL be accessible from all pages of the Student_Portal via a floating action button.
2. WHEN a student opens the AI_Chatbot panel, THE AI_Chatbot SHALL display the full conversation history from the current session.
3. THE AI_Chatbot SHALL provide quick-suggestion buttons for common topics: "Study tips", "Feeling overwhelmed", "Exam prep", and "Time management".
4. WHEN a student submits a query, THE AI_Chatbot SHALL return a contextually relevant response drawing from a predefined knowledge base covering study techniques, time management, subject resources, and motivational content.
5. WHERE the student's grade level and enrolled subjects are known, THE AI_Chatbot SHALL tailor responses to be appropriate for that grade and subject context.
6. THE AI_Chatbot SHALL provide an "Escalate to Teacher" option that initiates a message to the student's teacher via the Message_Center.
7. IF the AI_Chatbot cannot determine a relevant response, THEN THE AI_Chatbot SHALL acknowledge the limitation and suggest the student contact their teacher.

---

### Requirement 9: Academic Calendar and Task Manager

**User Story:** As a student, I want to manage my homework, projects, tests, and other academic tasks in a calendar and to-do list, so that I never miss a deadline.

#### Acceptance Criteria

1. THE Task_Manager SHALL display tasks in three calendar views: month, week, and day, toggled by the student.
2. THE Task_Manager SHALL display a sidebar to-do list categorised by type: homework, projects, tests, events, clubs, extracurriculars, and study schedule.
3. WHEN a student creates a task, THE Task_Manager SHALL collect: title, subject, due date, due time, priority (Low / Medium / High), notes, and an optional recurring schedule.
4. THE Task_Manager SHALL colour-code tasks by subject on the calendar view.
5. WHEN a student marks a task as complete, THE Task_Manager SHALL update the task's `completed` field in the DB and visually distinguish it from pending tasks.
6. THE Task_Manager SHALL provide a snooze option that postpones a task's due date by one day.
7. THE Task_Manager SHALL provide a delete option that removes a task from the DB.
8. WHEN a task's due date is within 30 minutes, 1 hour, or 24 hours, THE Notification_Service SHALL deliver a push notification to the student's browser.
9. WHERE a student has enabled alarm sounds, THE Notification_Service SHALL play a classical bell or chime sound alongside the push notification.

---

### Requirement 10: Weekly Progress Tracking

**User Story:** As a student, I want to see a visual summary of my weekly academic progress, so that I can identify patterns and stay motivated.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL display a "Scholar's Progress Report" section showing a bar chart of tasks completed versus tasks pending for each day of the current week.
2. THE Progress_Tracker SHALL display a line chart showing the student's task completion rate over the past four weeks.
3. THE Progress_Tracker SHALL render progress visualisations in a vintage academic report card style consistent with the Dark_Academia_Theme.
4. THE Progress_Tracker SHALL award the "Gold Scroll" badge when a student achieves 100% task completion in a week.
5. THE Progress_Tracker SHALL award the "Ink Pot" badge when a student maintains a 5-day consecutive task completion streak.
6. THE Progress_Tracker SHALL award the "Early Bird" badge when a student completes all tasks before their due time on three consecutive days.
7. WHERE a student chooses to share their progress report, THE Progress_Tracker SHALL generate a shareable summary that can be sent to the student's linked parent account.

---

### Requirement 11: Teacher Dashboard and Student Management

**User Story:** As a teacher, I want to search for students and access their records, so that I can efficiently manage assessments and communications.

#### Acceptance Criteria

1. THE Teacher_Portal SHALL provide a search bar that filters students by name, grade, or section within the teacher's school.
2. WHEN a search query is entered, THE Teacher_Portal SHALL display matching results showing each student's full name, grade, section, and linked parent name.
3. WHEN a teacher selects a student from search results, THE Teacher_Portal SHALL open a detailed student record showing assessments, attendance, and contact information.

---

### Requirement 12: Digital Mark Sheet

**User Story:** As a teacher, I want to create and manage digital mark sheets for my students, so that assessment records are stored accurately and can be shared with parents.

#### Acceptance Criteria

1. WHEN a teacher creates a Mark_Sheet, THE Teacher_Portal SHALL collect: assessment type (Test 1 / Test 2 / Test 3 / Midterm / Final / Assignment 1 / Assignment 2 / Project / Class Participation), subject, date, maximum marks, marks obtained, comments, and topics covered.
2. WHEN marks obtained and maximum marks are entered, THE Teacher_Portal SHALL automatically calculate and display the percentage and letter grade.
3. WHEN a teacher saves a Mark_Sheet, THE Teacher_Portal SHALL persist the record to the `assessments` table in the DB.
4. WHEN a teacher selects "Send to Parent" on a Mark_Sheet, THE Teacher_Portal SHALL retrieve the linked parent's contact information, display a confirmation popup with an optional personal message field, and send the assessment summary via email and/or SMS.
5. WHEN a Mark_Sheet is sent to a parent, THE Teacher_Portal SHALL set the `sent_to_parent` flag to 1 in the `assessments` table and create a Notification for the parent.

---

### Requirement 13: Daily Attendance Tracking

**User Story:** As a teacher, I want to record daily attendance for my students, so that parents and administrators have an accurate attendance record.

#### Acceptance Criteria

1. THE Attendance_Tracker SHALL display a class roster for the teacher's assigned classes.
2. WHEN recording attendance, THE Attendance_Tracker SHALL allow the teacher to set each student's status to one of: Present, Absent, Late, or Excused.
3. THE Attendance_Tracker SHALL provide a "Mark All Present" control that sets all students in the current class to Present in a single action.
4. THE Attendance_Tracker SHALL allow the teacher to add a free-text note per student per attendance record.
5. WHEN an attendance record is saved, THE Attendance_Tracker SHALL persist the record to the `attendance` table in the DB.
6. WHEN an attendance record is saved, THE Attendance_Tracker SHALL make the record visible to the linked parent(s) in the Parent_Portal.

---

### Requirement 14: Teacher–Parent Messaging

**User Story:** As a teacher, I want to send and receive messages with parents, so that I can communicate about student progress in a structured, documented way.

#### Acceptance Criteria

1. THE Message_Center SHALL display a list of conversation threads between the teacher and parents of the teacher's students.
2. WHEN a teacher sends a message, THE Message_Center SHALL deliver it in real time via Socket.IO to the recipient if they are online.
3. THE Message_Center SHALL display read receipts indicating whether a message has been seen by the recipient.
4. WHEN a new message is received, THE Notification_Service SHALL create an in-app notification for the recipient.

---

### Requirement 15: Parent Dashboard

**User Story:** As a parent, I want a unified dashboard showing all my children's academic activity, so that I can stay informed without contacting the school directly.

#### Acceptance Criteria

1. WHEN a parent has multiple linked children, THE Parent_Portal SHALL display a child selection toggle or dropdown allowing the parent to switch between children's views.
2. THE Parent_Portal SHALL display a main feed showing a reverse-chronological timeline of recent updates for the selected child: test results, grades, attendance records, and teacher messages.
3. THE Parent_Portal SHALL display a detailed academic results table showing all assessments for the selected child, organised by subject, with percentage and grade.
4. THE Parent_Portal SHALL display performance graphs comparing the selected child's grades to the class average.
5. THE Parent_Portal SHALL display an attendance summary with a monthly calendar view where each day is colour-coded: green (Present), red (Absent), yellow (Late/Excused).
6. THE Parent_Portal SHALL display the attendance percentage for the selected child for the current month.

---

### Requirement 16: Parent–Teacher Communication

**User Story:** As a parent, I want to message my child's teachers and schedule meetings, so that I can stay engaged with the school community.

#### Acceptance Criteria

1. THE Parent_Portal SHALL display a list of the selected child's teachers with their subjects and availability.
2. WHEN a parent selects a teacher, THE Parent_Portal SHALL open the conversation thread with that teacher in the Message_Center.
3. WHEN a parent sends a message, THE Message_Center SHALL deliver it in real time via Socket.IO to the teacher if they are online.
4. THE Parent_Portal SHALL allow a parent to request a meeting with a teacher by selecting a proposed date and time.
5. WHEN a meeting request is submitted, THE Notification_Service SHALL notify the teacher via an in-app notification.

---

### Requirement 17: Notification System

**User Story:** As any user, I want to receive timely notifications about events relevant to my role, so that I never miss important updates.

#### Acceptance Criteria

1. THE Notification_Service SHALL maintain an in-app notification centre accessible from all portal pages, displaying unread notification count.
2. WHEN a notification is created, THE Notification_Service SHALL persist it to the `notifications` table in the DB.
3. WHEN a user opens the notification centre, THE Notification_Service SHALL mark all displayed notifications as read.
4. THE Notification_Service SHALL send email notifications for: new assessment results sent to parents, password reset requests, and meeting confirmations.
5. WHERE browser push notification permission has been granted, THE Notification_Service SHALL deliver push notifications for: task due-date reminders (student), new messages (all roles), new assessment results (parent), and attendance alerts (parent).
6. WHERE SMS capability is configured (via Twilio or equivalent), THE Notification_Service SHALL send SMS notifications for: assessment results sent to parents and critical attendance alerts.

---

### Requirement 18: Sample Data and Initial Setup

**User Story:** As a developer or administrator setting up the platform, I want pre-populated sample data, so that the application is demonstrable immediately after installation.

#### Acceptance Criteria

1. THE System SHALL seed the DB with at least 5 student accounts across different grade levels on first initialisation.
2. THE System SHALL seed the DB with at least 3 teacher accounts covering different subjects on first initialisation.
3. THE System SHALL seed the DB with at least 3 parent accounts, each linked to at least one seeded student, on first initialisation.
4. THE System SHALL seed the DB with sample tasks for each seeded student on first initialisation.
5. THE System SHALL seed the DB with sample assessments with grades for seeded students on first initialisation.
6. THE System SHALL seed the DB with sample messages between seeded teachers and parents on first initialisation.
7. THE System SHALL seed the DB with sample attendance records covering the past 30 days for seeded students on first initialisation.
8. IF the DB already contains seeded data (schools table is non-empty), THEN THE System SHALL skip the seed process to prevent duplicate records.
