# Requirements Document — Academia Connect V2

## Introduction

Academia Connect V2 is a major enhancement to the existing Academia Connect PWA. The existing platform already provides student, teacher, parent, and admin portals with basic authentication, tasks, assessments, attendance, messaging, an AI chatbot (Athena), quizzes, a leaderboard, challenges, a portfolio, a study timer, analytics, and PWA infrastructure.

This document defines requirements for: (1) critical bug fixes to authentication, validation, and core functionality; (2) deep enhancements to all four portals; (3) a new TikTok-style vertical video feed; (4) a Telegram-style real-time messaging system; (5) an expanded gamification and rewards system; (6) a school-isolation architecture; and (7) multi-language support including Amharic.

The platform is built on Node.js/Express + SQLite (better-sqlite3) + Socket.IO + vanilla JS frontend.

---

## Glossary

- **System**: The Academia Connect V2 PWA application as a whole
- **Student_Portal**: The authenticated dashboard accessible only to students
- **Teacher_Portal**: The authenticated dashboard accessible only to teachers
- **Parent_Portal**: The authenticated dashboard accessible only to parents
- **Admin_Portal**: The authenticated dashboard accessible only to admins
- **Auth_Module**: The registration and login subsystem
- **Validator**: The server-side and client-side input validation subsystem
- **AI_Chatbot**: The in-app conversational assistant named Athena
- **Notification_Service**: The subsystem delivering in-app, push, and email notifications
- **Task_Manager**: The student-facing to-do and calendar subsystem
- **Video_Feed**: The TikTok-style vertical short-video feed
- **Chat_System**: The Telegram-style real-time messaging subsystem
- **Reward_System**: The points, badges, and marketplace subsystem
- **Game_Engine**: The in-app educational games subsystem
- **Notebook**: The per-subject rich-text note editor for students
- **School_Isolator**: The subsystem ensuring complete data separation between schools
- **Payment_Tracker**: The fee management and reminder subsystem
- **Live_Session**: The teacher-initiated live video session subsystem
- **Focus_Mode**: The distraction-free study screen for students
- **DB**: The SQLite database managed via better-sqlite3
- **Session**: An authenticated server-side session managed by express-session
- **PWA**: Progressive Web App — installable with offline capability
- **RBAC**: Role-Based Access Control
- **Socket_IO**: The real-time WebSocket layer (socket.io)
- **XP_System**: The experience points subsystem tracking student game and learning progress
- **Coin_System**: The in-app token economy for unlocking features and rewards
- **Leaderboard_Engine**: The subsystem managing class and school leaderboards with weekly resets
- **Content_Moderator**: The AI-based subsystem filtering uploaded videos for inappropriate content
- **Payment_Gateway**: The external Ethiopian payment processor (Chapa or equivalent) integrated for fee collection
- **Challenge_Engine**: The Duolingo-style learning path subsystem with lessons, progress tracking, and achievements
- **Offline_Sync**: The service worker and IndexedDB subsystem that queues and syncs offline actions
- **Subject_Manager**: The subsystem managing school subjects including creation, editing, deletion, and default preloading

---

## Requirements

### Requirement 1: Input Validation — Phone Number

**User Story:** As a new user, I want the system to validate my phone number format during registration, so that only correctly formatted numbers are accepted.

#### Acceptance Criteria

1. WHEN a registration form is submitted, THE Validator SHALL check that the phone field matches the Ethiopian mobile format: +251 followed by 7 or 9 followed by 8 digits (e.g. +251912345678).
2. IF the phone field is empty, THEN THE Validator SHALL return a descriptive error: "Phone number is required".
3. IF the phone field does not match the required format, THEN THE Validator SHALL return a descriptive error: "Invalid phone number. Use format: +251XXXXXXXXX".
4. THE Validator SHALL perform phone validation on both the client side (inline, before submission) and the server side (POST /api/auth/register).
5. WHEN a phone number passes validation, THE Auth_Module SHALL store it in the DB without modification.

---

### Requirement 2: Input Validation — Email Address

**User Story:** As a new user, I want the system to validate my email address format during registration, so that only valid email addresses are accepted.

#### Acceptance Criteria

1. WHEN a registration form is submitted, THE Validator SHALL check that the email field contains exactly one "@" symbol and at least one "." after the "@".
2. IF the email field is empty, THEN THE Validator SHALL return a descriptive error: "Email is required".
3. IF the email field does not match a valid email pattern, THEN THE Validator SHALL return a descriptive error: "Invalid email format".
4. THE Validator SHALL perform email validation on both the client side and the server side.
5. IF the email already exists in any role table in the DB, THEN THE Auth_Module SHALL return HTTP 409 with the message "Email already registered".

---

### Requirement 3: Input Validation — Password Strength and Confirmation

**User Story:** As a new user, I want real-time feedback on my password strength and a confirmation check, so that I create a secure and correctly entered password.

#### Acceptance Criteria

1. WHILE a user types in the password field during registration, THE Validator SHALL display a real-time password strength indicator with four levels: Weak (fewer than 8 characters), Fair (8+ characters, letters only), Good (8+ characters, mixed case or letters + digits), Strong (8+ characters, mixed case + digits + special character).
2. IF the password field contains fewer than 8 characters on submission, THEN THE Validator SHALL prevent submission and display: "Password must be at least 8 characters".
3. IF the confirm-password field does not match the password field on submission, THEN THE Validator SHALL prevent submission and display: "Passwords do not match".
4. THE Validator SHALL perform password length validation on both the client side and the server side.
5. THE Auth_Module SHALL store only the bcrypt hash of the password; the plaintext password SHALL NOT be stored in the DB.

---

### Requirement 4: Role-Based Login Enforcement

**User Story:** As a registered user, I want the login system to enforce that I log in under my correct role, so that a student cannot log in as a teacher and vice versa.

#### Acceptance Criteria

1. WHEN a user submits login credentials with a selected role, THE Auth_Module SHALL query only the table corresponding to the selected role (students, teachers, parents, or admins).
2. IF a student's email is submitted with the role "teacher", THEN THE Auth_Module SHALL return "Invalid credentials" without revealing that the email exists in a different role table.
3. WHEN a teacher logs in, THE Auth_Module SHALL require that the submitted employee_id matches the stored employee_id for that teacher's account.
4. IF the employee_id field is absent or incorrect during teacher login, THEN THE Auth_Module SHALL return "Invalid credentials".
5. WHEN a parent logs in, THE Auth_Module SHALL verify credentials against the parents table only.
6. WHEN login succeeds, THE Auth_Module SHALL set req.session.role to the verified role and redirect the user to the corresponding portal.

---

### Requirement 5: Student Subject Assignment via Teacher

**User Story:** As a student, I want my subjects to be assigned by my teacher rather than selected at registration, so that my subject list accurately reflects my actual class assignments.

#### Acceptance Criteria

1. THE Auth_Module SHALL NOT require students to select subjects during registration.
2. WHEN a teacher assigns a subject to a student, THE Teacher_Portal SHALL create a record in the student_subjects table linking the student_id, subject_id, and teacher_id.
3. WHEN a student views their portal, THE Student_Portal SHALL display only the subjects assigned to them by their teachers.
4. WHEN a teacher removes a subject assignment, THE Teacher_Portal SHALL delete the corresponding record from student_subjects.
5. THE Student_Portal SHALL display a message "No subjects assigned yet" when no teacher has assigned subjects to the student.

---

### Requirement 6: Display Registered Name Throughout the App

**User Story:** As a user, I want my registered name (nickname for students, full name for teachers and parents) to appear consistently throughout the app, so that the interface feels personalised.

#### Acceptance Criteria

1. WHEN a student is logged in, THE Student_Portal SHALL display the student's nickname (or first name if no nickname is set) in all greeting messages, sidebar headers, and profile displays.
2. WHEN a teacher is logged in, THE Teacher_Portal SHALL display the teacher's full_name in all greeting messages, sidebar headers, and profile displays.
3. WHEN a parent is logged in, THE Parent_Portal SHALL display the parent's full_name in all greeting messages, sidebar headers, and profile displays.
4. THE System SHALL use the registered name (not a generic "User") in all notification messages, chat sender labels, and leaderboard entries.
5. WHEN a user updates their profile name, THE System SHALL reflect the updated name immediately across all active views.

---

### Requirement 7: Task Management — Fully Functional Add/Edit/Delete

**User Story:** As a student, I want to add, edit, complete, and delete tasks reliably, so that I can manage my academic workload without encountering errors.

#### Acceptance Criteria

1. WHEN a student submits the Add Task form, THE Task_Manager SHALL validate that the title field is non-empty and return an inline error if it is empty.
2. WHEN a valid task is submitted, THE Task_Manager SHALL call POST /api/student/tasks, persist the record to the DB, and refresh the task list without a full page reload.
3. WHEN a student clicks the edit button on a task, THE Task_Manager SHALL pre-populate the task form with the existing values and call PUT /api/student/tasks/:id on submission.
4. WHEN a student marks a task as complete, THE Task_Manager SHALL call PUT /api/student/tasks/:id with completed=1, award 10 points to the student, and unlock 30 minutes of reward time.
5. WHEN a student deletes a task, THE Task_Manager SHALL call DELETE /api/student/tasks/:id and remove the task from the view immediately.
6. IF any task API call fails, THEN THE Task_Manager SHALL display a descriptive error toast and leave the task list unchanged.

---

### Requirement 8: AI Chatbot — Varied and Context-Aware Responses

**User Story:** As a student, I want the AI chatbot Athena to give varied, context-aware answers rather than repeating the same response, so that conversations feel helpful and natural.

#### Acceptance Criteria

1. THE AI_Chatbot SHALL maintain a response pool of at least 5 distinct responses per topic category (study tips, exam prep, time management, motivation, subject help).
2. WHEN a student submits the same query twice in a session, THE AI_Chatbot SHALL return a different response from the pool on the second submission.
3. WHERE the student's grade level is known, THE AI_Chatbot SHALL include grade-appropriate content in its responses (e.g. primary vs secondary level advice).
4. WHERE the student has subjects assigned, THE AI_Chatbot SHALL reference those subjects when responding to subject-related queries.
5. WHEN a student asks about a subject in which they have a recent low score (below 50%), THE AI_Chatbot SHALL suggest a relevant game or study resource for that subject.
6. IF no relevant response is found in the knowledge base, THEN THE AI_Chatbot SHALL respond with a fallback message and offer to escalate to the teacher.
7. THE AI_Chatbot SHALL never return an identical response to the immediately preceding response in the same session.

---

### Requirement 9: Student Score Visibility

**User Story:** As a student, I want to see my scores and grades posted by my teacher, so that I can track my academic performance.

#### Acceptance Criteria

1. WHEN a teacher saves an assessment for a student, THE DB SHALL make that assessment record immediately queryable by the student's GET /api/student/results endpoint.
2. WHEN a student views the Results tab, THE Student_Portal SHALL display all assessments grouped by subject, showing: assessment type, date, marks obtained, maximum marks, percentage, letter grade, teacher name, and teacher feedback.
3. THE Student_Portal SHALL display a subject average percentage for each subject group.
4. WHEN a new assessment is posted by a teacher, THE Notification_Service SHALL create an in-app notification for the student with the title "New result posted" and the subject and grade in the body.
5. THE Student_Portal SHALL display a progress bar per assessment showing the percentage visually.

---

### Requirement 10: Text and Button Contrast

**User Story:** As a user, I want all text and interactive elements to have sufficient contrast against their backgrounds, so that the interface is readable in all lighting conditions.

#### Acceptance Criteria

1. THE System SHALL ensure all body text on dark backgrounds uses a minimum colour value of rgba(245,245,245,0.85) or equivalent.
2. THE System SHALL ensure all button labels use a colour that contrasts with the button background by a ratio sufficient for readability (dark text on light buttons, light text on dark buttons).
3. THE System SHALL ensure all form labels use a colour of at least rgba(245,245,245,0.8) on dark form backgrounds.
4. THE System SHALL ensure all placeholder text in input fields uses a colour of at least rgba(245,245,245,0.45).
5. THE System SHALL ensure all badge and status label text is legible against the badge background colour.

---

### Requirement 11: Subject-Based Adaptive Games

**User Story:** As a student, I want the system to suggest educational games for subjects where I am performing poorly, so that I can improve my understanding in a fun way.

#### Acceptance Criteria

1. WHEN a student's average score in a subject falls below 50%, THE Student_Portal SHALL display a suggestion banner recommending a game for that subject.
2. THE Game_Engine SHALL provide at least 7 game types: Word Scramble, Flashcards, Math Challenge, Memory Match, Spelling Bee, Science Trivia, and Color Sort.
3. WHEN a student launches a subject-based game, THE Game_Engine SHALL load questions or content relevant to the student's assigned subject.
4. WHEN a student completes a game, THE Reward_System SHALL award points based on the score achieved.
5. THE Student_Portal SHALL display a "Play to Improve" button on the Results tab next to any subject with an average below 50%.

---

### Requirement 12: Per-Subject Notebook

**User Story:** As a student, I want a rich-text notebook for each of my subjects, so that I can keep organised notes per subject.

#### Acceptance Criteria

1. THE Notebook SHALL display a separate tab or section for each subject assigned to the student.
2. WHEN a student creates a note, THE Notebook SHALL collect: title, subject (pre-selected from the active tab), and rich-text content.
3. THE Notebook SHALL support rich-text formatting: bold, italic, underline, bullet lists, numbered lists, and headings.
4. WHEN a student saves a note, THE Notebook SHALL call POST /api/student/notes and persist the record to the DB.
5. WHEN a student is offline, THE Notebook SHALL allow viewing of previously loaded notes using cached data.
6. THE Notebook SHALL display notes sorted by last-updated date, most recent first.

---

### Requirement 13: Soft-Copy Reading Materials per Subject

**User Story:** As a student, I want to access digital books and reading materials for each subject, so that I can study without physical textbooks.

#### Acceptance Criteria

1. WHEN a teacher uploads a material (PDF, DOC, or image) for a subject, THE Teacher_Portal SHALL store the file under uploads/materials/ and create a record in the materials table with: title, subject, file_url, file_type, and uploader_id.
2. WHEN a student views the Materials section, THE Student_Portal SHALL display only materials for subjects assigned to that student.
3. THE Student_Portal SHALL allow students to open PDF materials in an in-app viewer or download them.
4. WHERE the student's device supports offline storage, THE Student_Portal SHALL allow the student to mark a material for offline download.
5. THE Student_Portal SHALL display materials grouped by subject.

---

### Requirement 14: Motivational Videos for Students

**User Story:** As a student, I want to receive motivational videos sent by my teacher or admin, so that I stay inspired and engaged.

#### Acceptance Criteria

1. WHEN a teacher or admin uploads a video tagged as "motivational", THE Video_Feed SHALL make it available in the student's Motivational Videos section.
2. THE Student_Portal SHALL display motivational videos in a dedicated section separate from the main TikTok-style feed.
3. WHEN a student watches a motivational video, THE Notification_Service SHALL mark the video as viewed for that student.
4. THE Student_Portal SHALL display the sender's name and a short message alongside each motivational video.

---

### Requirement 15: Hobby and Career-Based Content

**User Story:** As a student, I want to receive content tailored to my hobby or career interest, so that I stay motivated by learning things relevant to my goals.

#### Acceptance Criteria

1. WHEN a student sets a career interest (e.g. Scientist, Engineer, Doctor, Artist, Athlete), THE Student_Portal SHALL store the interest in the student's interests field in the DB.
2. WHEN a student views the Challenges section, THE Student_Portal SHALL display challenge tracks and content filtered to match the student's career interest.
3. THE Student_Portal SHALL display a "Career Path" widget on the dashboard showing the student's selected interest and recommended next steps.
4. WHEN a student has not set a career interest, THE Student_Portal SHALL prompt the student to select one from a predefined list.
5. THE AI_Chatbot SHALL reference the student's career interest when providing motivational or subject-related responses.

---

### Requirement 16: Student Account Privacy

**User Story:** As a student, I want my account data to be private from other students, so that no other student can view my grades, notes, or personal information.

#### Acceptance Criteria

1. THE RBAC SHALL ensure that GET /api/student/results, GET /api/student/notes, GET /api/student/attendance, and GET /api/student/tasks return data only for the authenticated student's own records.
2. IF a student attempts to access another student's data by manipulating the URL or request parameters, THEN THE System SHALL return HTTP 403.
3. THE Student_Portal SHALL NOT display any other student's grades, notes, or personal contact information.
4. THE Leaderboard SHALL display only the student's rank, points, and first name — no full personal details.
5. THE Chat_System SHALL prevent students from initiating direct messages to other students unless the feature is explicitly enabled by the admin.

---

### Requirement 17: Student Notifications

**User Story:** As a student, I want to receive timely notifications for tasks, homework, study reminders, exams, and announcements, so that I never miss important deadlines.

#### Acceptance Criteria

1. WHEN a task's due date is within 24 hours, THE Notification_Service SHALL create an in-app notification for the student.
2. WHEN a task's due date is within 1 hour, THE Notification_Service SHALL deliver a browser push notification if permission has been granted.
3. WHEN a new announcement is posted by a teacher or admin, THE Notification_Service SHALL create an in-app notification for all students in the same school.
4. WHEN a teacher posts a new assessment result for a student, THE Notification_Service SHALL create an in-app notification for that student.
5. WHEN a new quiz is created by a teacher, THE Notification_Service SHALL create an in-app notification for all students in the teacher's school.
6. THE Notification_Service SHALL display the unread notification count as a badge on the notification bell icon.

---

### Requirement 18: TikTok-Style Vertical Video Feed

**User Story:** As a student or parent, I want a vertical swipe-based video feed showing school-specific content, so that I can consume educational and activity videos in an engaging format.

#### Acceptance Criteria

1. THE Video_Feed SHALL display videos in a full-screen vertical layout, one video at a time, with swipe-up to advance and swipe-down to go back.
2. WHEN a video comes into view, THE Video_Feed SHALL auto-play it with sound muted by default.
3. WHEN a video reaches its end, THE Video_Feed SHALL automatically advance to the next video.
4. THE Video_Feed SHALL display only videos belonging to the authenticated user's school (school_id isolation).
5. THE Video_Feed SHALL display like, comment, and share controls on each video.
6. WHEN a student taps the like button, THE Video_Feed SHALL toggle the like state and update the like count via POST /api/common/video-like.
7. WHEN a student taps the comment button, THE Video_Feed SHALL open an inline comment panel.
8. THE Video_Feed SHALL allow students to save a video for offline viewing where device storage permits.
9. WHERE admin approval is enabled for the school, THE Video_Feed SHALL only display videos with approved=1.

---

### Requirement 19: Telegram-Style Chat System

**User Story:** As any user, I want a real-time messaging system with seen/delivered indicators, media support, emoji, pinned messages, reply threads, and searchable history, so that communication feels modern and reliable.

#### Acceptance Criteria

1. THE Chat_System SHALL deliver messages in real time via Socket_IO; if the recipient is offline, the message SHALL be stored in the DB and delivered on next connection.
2. THE Chat_System SHALL display a "Delivered" indicator when a message is stored in the DB and a "Seen" indicator when the recipient opens the conversation.
3. WHEN a user is typing, THE Chat_System SHALL emit a typing indicator to the recipient via Socket_IO, visible for up to 3 seconds.
4. THE Chat_System SHALL support sending images, files (PDF, DOC), and audio notes as attachments via multer upload.
5. THE Chat_System SHALL support emoji input via an emoji picker panel.
6. WHEN a user long-presses or right-clicks a message, THE Chat_System SHALL display options: Reply, Pin, Star, Delete.
7. WHEN a message is pinned, THE Chat_System SHALL display it in a pinned-messages bar at the top of the conversation.
8. WHEN a user replies to a message, THE Chat_System SHALL display the quoted original message above the reply bubble.
9. THE Chat_System SHALL provide a search bar that filters messages in the current conversation by keyword.
10. THE Chat_System SHALL support the following conversation types: student-to-teacher, teacher-to-parent, parent-to-teacher, and parent-to-parent grade-level groups.

---

### Requirement 20: Pomodoro Study Timer Verification

**User Story:** As a student, I want the Pomodoro study timer to work correctly, so that I can manage focused study sessions with breaks.

#### Acceptance Criteria

1. THE Student_Portal SHALL display a Pomodoro timer with configurable work duration (default 25 minutes) and break duration (default 5 minutes).
2. WHEN the timer is started, THE Student_Portal SHALL count down from the configured duration and display the remaining time in MM:SS format.
3. WHEN the work period ends, THE Student_Portal SHALL play an audio alert and automatically switch to break mode.
4. WHEN the break period ends, THE Student_Portal SHALL play an audio alert and return to work mode.
5. WHEN a study session is completed, THE Student_Portal SHALL call POST /api/student/study-session to record the session duration and subject.
6. THE Student_Portal SHALL display the total study time for the current day on the timer screen.

---

### Requirement 21: Weekly Analytics Dashboard Verification

**User Story:** As a student, I want my weekly analytics dashboard to show accurate data about my study habits and task completion, so that I can identify patterns.

#### Acceptance Criteria

1. THE Student_Portal SHALL display a bar chart showing tasks completed vs tasks pending for each day of the current week.
2. THE Student_Portal SHALL display a line chart showing task completion rate over the past 4 weeks.
3. THE Student_Portal SHALL display total study time per subject for the current week.
4. THE Student_Portal SHALL display the student's current streak count and the date the streak was last updated.
5. WHEN the analytics data is loaded, THE Student_Portal SHALL call GET /api/student/analytics and render the charts using the returned data.

---

### Requirement 22: Streak System Verification

**User Story:** As a student, I want my study streak to be tracked and displayed accurately, so that I am motivated to study consistently.

#### Acceptance Criteria

1. WHEN a student completes at least one task or study session on a given calendar day, THE System SHALL increment the student's streak counter by 1.
2. IF a student does not complete any task or study session on a calendar day, THEN THE System SHALL reset the streak counter to 0 the following day.
3. THE Student_Portal SHALL display the current streak count with a flame icon on the dashboard.
4. WHEN a student reaches a 5-day streak, THE Reward_System SHALL award the "5-Day Streak" badge.
5. WHEN a student reaches a 30-day streak, THE Reward_System SHALL award the "30-Day Scholar" badge.

---

### Requirement 23: Portfolio Verification

**User Story:** As a student, I want my portfolio to display my uploaded work and achievements, so that I can showcase my academic progress.

#### Acceptance Criteria

1. THE Student_Portal SHALL display a Portfolio tab showing all portfolio items for the authenticated student.
2. WHEN a student adds a portfolio item, THE Student_Portal SHALL collect: title, description, file upload (image, PDF, or link), and type (project, artwork, essay, certificate, other).
3. WHEN a portfolio item is saved, THE Student_Portal SHALL call POST /api/student/portfolio and persist the record.
4. THE Student_Portal SHALL display portfolio items as cards with title, type badge, description preview, and creation date.
5. WHEN a student deletes a portfolio item, THE Student_Portal SHALL call DELETE /api/student/portfolio/:id and remove it from the view.

---

### Requirement 24: Focus Mode

**User Story:** As a student, I want a distraction-free focus mode that hides the sidebar and non-essential UI, so that I can study without interruptions.

#### Acceptance Criteria

1. THE Student_Portal SHALL provide a "Focus Mode" button accessible from the dashboard and timer screens.
2. WHEN Focus Mode is activated, THE Student_Portal SHALL hide the sidebar, topbar notifications, and all non-essential UI elements.
3. WHILE Focus Mode is active, THE Student_Portal SHALL display only the current study content, the Pomodoro timer, and a "Exit Focus Mode" button.
4. WHEN Focus Mode is deactivated, THE Student_Portal SHALL restore the full UI layout.
5. WHILE Focus Mode is active, THE Notification_Service SHALL suppress all in-app notification popups (they SHALL still be stored and shown when Focus Mode ends).

---

### Requirement 25: Rewards Marketplace

**User Story:** As a student, I want to redeem my earned points in a rewards marketplace for game time, movie time, avatars, and badges, so that I am motivated to earn more points.

#### Acceptance Criteria

1. THE Reward_System SHALL maintain a marketplace with at least the following reward types: 30-minute game unlock, 30-minute movie unlock, premium avatar, and special badge.
2. WHEN a student redeems a reward, THE Reward_System SHALL deduct the required points from the student's balance and activate the reward.
3. IF a student has insufficient points to redeem a reward, THEN THE Reward_System SHALL display an error: "Not enough points".
4. WHEN a game or movie time reward is redeemed, THE Reward_System SHALL set reward_expires on the student record to the current time plus the reward duration.
5. WHEN the reward_expires time passes, THE Student_Portal SHALL automatically lock the games and movies sections again.
6. THE Reward_System SHALL display the student's current point balance and a history of redeemed rewards.

---

### Requirement 26: Color and Theme Customization

**User Story:** As a user, I want to choose a color theme for my portal, so that I can personalise my experience.

#### Acceptance Criteria

1. THE System SHALL provide at least 4 theme options: Dark Academia (default), Ocean Blue, Forest Green, and Sunset Orange.
2. WHEN a user selects a theme, THE System SHALL apply the theme's CSS variables immediately without a page reload.
3. WHEN a user selects a theme, THE System SHALL persist the selection to localStorage so it is restored on next visit.
4. THE System SHALL apply the selected theme consistently across all portal pages and modals.

---

### Requirement 27: Teacher — Upload Notes and Materials

**User Story:** As a teacher, I want to upload notes, PDFs, and images per subject, so that students can access study materials digitally.

#### Acceptance Criteria

1. THE Teacher_Portal SHALL provide an upload form collecting: title, subject (select from teacher's subjects), file (PDF, DOC, DOCX, or image), and optional description.
2. WHEN a file is uploaded, THE Teacher_Portal SHALL call POST /api/teacher/materials with multipart form data, store the file under uploads/materials/, and create a record in the materials table.
3. THE Teacher_Portal SHALL display all uploaded materials in a list grouped by subject.
4. WHEN a teacher deletes a material, THE Teacher_Portal SHALL call DELETE /api/teacher/materials/:id and remove the file from the server.
5. THE Teacher_Portal SHALL display the file type, upload date, and download count for each material.

---

### Requirement 28: Teacher — Create and Assign Quizzes

**User Story:** As a teacher, I want to create quizzes and assign them to specific students or the whole class, so that I can assess understanding interactively.

#### Acceptance Criteria

1. WHEN a teacher creates a quiz, THE Teacher_Portal SHALL collect: title, subject, time limit, reward minutes, and a list of questions each with: question text, four answer options, and the correct answer index.
2. THE Teacher_Portal SHALL allow the teacher to assign the quiz to: all students in the school, a specific grade, or individual students.
3. WHEN a quiz is assigned, THE Notification_Service SHALL create an in-app notification for each assigned student.
4. THE Teacher_Portal SHALL display quiz results showing each student's score and completion time after the quiz deadline.
5. WHEN a student completes a quiz, THE Reward_System SHALL award the configured reward_minutes to the student.

---

### Requirement 29: Teacher — Competitions with Leaderboard

**User Story:** As a teacher, I want to create subject-based competitions with a leaderboard, so that students are motivated through friendly rivalry.

#### Acceptance Criteria

1. WHEN a teacher creates a competition, THE Teacher_Portal SHALL collect: title, subject, description, start date, end date, and reward points.
2. WHEN a competition is active, THE Student_Portal SHALL display it in the Challenges section with a countdown timer.
3. THE Student_Portal SHALL display a competition leaderboard showing student rank, name, and score for the active competition.
4. WHEN a competition ends, THE Reward_System SHALL award the configured reward_points to the top 3 ranked students and create a notification for each winner.
5. THE Teacher_Portal SHALL display competition results after the end date.

---

### Requirement 30: Teacher — Weekly Performance Report to Parents

**User Story:** As a teacher, I want to send a weekly performance summary to parents, so that parents stay informed about their child's progress.

#### Acceptance Criteria

1. THE Teacher_Portal SHALL provide a "Send Weekly Report" action that generates a summary for each student including: tasks completed, assessments this week, attendance rate, and current streak.
2. WHEN a weekly report is sent, THE Notification_Service SHALL create an in-app notification for each linked parent with the summary content.
3. WHERE email is configured, THE Notification_Service SHALL also send the report via email to the parent.
4. THE Teacher_Portal SHALL display the date of the last report sent for each student.

---

### Requirement 31: Teacher — Live Video Session

**User Story:** As a teacher, I want to start a live video session and invite specific students to join, so that I can conduct remote lessons.

#### Acceptance Criteria

1. THE Teacher_Portal SHALL provide a "Start Live Session" button that generates a unique session room ID.
2. WHEN a live session is started, THE Teacher_Portal SHALL allow the teacher to select which students can join the session.
3. WHEN a live session is started, THE Notification_Service SHALL send an in-app notification to selected students with a "Join Now" link.
4. WHEN a student clicks "Join Now", THE Student_Portal SHALL open the live session room (using a WebRTC-based or iframe-embedded solution).
5. WHEN the teacher ends the session, THE Live_Session SHALL close the room and notify all participants.

---

### Requirement 32: Teacher — Assessment Subject Selection Fix

**User Story:** As a teacher, I want to either select a subject from a dropdown or type a new subject name when creating an assessment, so that I am not blocked by a missing subject.

#### Acceptance Criteria

1. THE Teacher_Portal assessment form SHALL display a subject dropdown populated from the teacher's assigned subjects.
2. THE Teacher_Portal assessment form SHALL display a text input alongside the dropdown allowing the teacher to type a new subject name.
3. WHEN a teacher types a new subject name and submits the assessment, THE Teacher_Portal SHALL create the subject in the subjects table if it does not already exist for that school.
4. WHEN a new subject is created via the assessment form, THE Teacher_Portal SHALL add it to the dropdown for future assessments in the same session.

---

### Requirement 33: Teacher — File Attachments in Chat

**User Story:** As a teacher, I want to send file attachments in chat conversations, so that I can share documents and images with parents and students.

#### Acceptance Criteria

1. THE Chat_System SHALL display a file attachment button in the teacher's chat input area.
2. WHEN a teacher selects a file, THE Chat_System SHALL upload it via POST /api/teacher/chat-upload and display a preview in the message bubble.
3. THE Chat_System SHALL support attachment types: images (JPG, PNG, GIF), documents (PDF, DOC, DOCX), and audio files (MP3, WAV).
4. WHEN a recipient receives a message with an attachment, THE Chat_System SHALL display a download link or inline preview.
5. IF a file exceeds 20MB, THEN THE Chat_System SHALL reject the upload and display: "File too large. Maximum size is 20MB".

---

### Requirement 34: Parent — Payment Reminder System

**User Story:** As a parent, I want to receive configurable payment reminders, so that I never miss a school fee deadline.

#### Acceptance Criteria

1. THE Payment_Tracker SHALL display all payment records for the parent's linked children, showing: fee type, amount, due date, and status (paid/pending/overdue).
2. WHEN a payment's due date is within 7 days and the status is pending, THE Notification_Service SHALL create an in-app notification for the parent.
3. WHEN a payment's due date has passed and the status is still pending, THE Payment_Tracker SHALL update the status to "overdue".
4. THE Parent_Portal SHALL display a toggle to enable or disable payment reminders; the preference SHALL be stored in the payment_reminders column of the parents table.
5. WHERE the admin has configured a school-wide payment schedule, THE Payment_Tracker SHALL automatically create payment records for all students on the configured dates.

---

### Requirement 35: Parent — Parent-to-Parent Group Chat by Grade

**User Story:** As a parent, I want to chat with other parents of children in the same grade, so that I can share information and support.

#### Acceptance Criteria

1. THE Parent_Portal SHALL display a "Parent Groups" section listing one group per grade level for the parent's linked children.
2. WHEN a parent opens a grade group, THE Chat_System SHALL load the group message history from the group_messages table.
3. WHEN a parent sends a message to a group, THE Chat_System SHALL broadcast it in real time to all online parents in the same group via Socket_IO.
4. THE Chat_System SHALL display the sender's name and timestamp for each group message.
5. THE School_Isolator SHALL ensure that parent groups are isolated by school_id; parents from different schools SHALL NOT share a group.

---

### Requirement 36: Parent — Weekly Child Summary

**User Story:** As a parent, I want to receive a weekly summary of my child's tasks, progress, and streaks, so that I can stay engaged without logging in daily.

#### Acceptance Criteria

1. THE Notification_Service SHALL create a weekly in-app notification for each parent summarising: tasks completed this week, new assessment results, current streak, and attendance rate.
2. WHERE email is configured, THE Notification_Service SHALL also send the weekly summary via email.
3. THE Parent_Portal SHALL display the most recent weekly summary on the dashboard.
4. THE Parent_Portal SHALL display a "View Full Report" button that opens the child's detailed progress view.

---

### Requirement 37: Parent — Push Notifications

**User Story:** As a parent, I want to receive push notifications for my child's achievements, low performance alerts, and school events, so that I am always informed.

#### Acceptance Criteria

1. WHERE browser push notification permission has been granted, THE Notification_Service SHALL deliver push notifications for: new assessment results, attendance alerts (absent/late), new announcements, and payment reminders.
2. WHEN a student earns a badge, THE Notification_Service SHALL create an in-app notification for the linked parent.
3. WHEN a student's average score in any subject falls below 40%, THE Notification_Service SHALL create an in-app notification for the linked parent with the subject name and average score.
4. THE Parent_Portal SHALL display a notification settings panel allowing the parent to toggle each notification type on or off.

---

### Requirement 38: Admin — Teacher Attendance Monitoring

**User Story:** As an admin, I want to track teacher attendance (present/absent), so that I have an accurate record of staff presence.

#### Acceptance Criteria

1. THE Admin_Portal SHALL display a teacher attendance section listing all teachers in the admin's school.
2. WHEN an admin records teacher attendance, THE Admin_Portal SHALL allow setting each teacher's status to Present or Absent for a selected date.
3. THE Admin_Portal SHALL display a monthly attendance summary per teacher showing present days, absent days, and attendance rate.
4. WHEN a teacher is absent, THE Admin_Portal SHALL create an in-app notification for the admin.
5. THE Admin_Portal SHALL allow the admin to export the teacher attendance report.

---

### Requirement 39: Admin — Announcements for All Roles

**User Story:** As an admin, I want to post announcements visible to all roles (students, teachers, parents), so that school-wide information reaches everyone.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide an announcement creation form collecting: title, content, and target roles (all, students only, teachers only, parents only).
2. WHEN an announcement is posted, THE Notification_Service SHALL create an in-app notification for all users of the targeted roles in the admin's school.
3. THE Admin_Portal SHALL display all posted announcements with edit and delete controls.
4. WHEN an announcement is deleted, THE Admin_Portal SHALL remove it from all portal views immediately.
5. THE Admin_Portal SHALL display the read count for each announcement.

---

### Requirement 40: Admin — User Management

**User Story:** As an admin, I want to view, activate, and deactivate user accounts, so that I can manage school membership.

#### Acceptance Criteria

1. THE Admin_Portal SHALL display a user management section listing all students, teachers, and parents in the admin's school.
2. THE Admin_Portal SHALL display each user's: full name, role, email, registration date, and active status.
3. WHEN an admin deactivates a user, THE Admin_Portal SHALL set an active=0 flag on the user's record and prevent that user from logging in.
4. WHEN an admin reactivates a user, THE Admin_Portal SHALL set active=1 and restore login access.
5. THE Auth_Module SHALL check the active flag on login and return "Account deactivated. Contact your school admin." if active=0.

---

### Requirement 41: Admin — School Verification and Isolation

**User Story:** As an admin, I want to verify schools and ensure complete data isolation between schools, so that no school can access another school's data.

#### Acceptance Criteria

1. WHEN a new school is created during registration, THE System SHALL set verified=0 on the school record.
2. THE Admin_Portal SHALL display a list of unverified schools and allow the admin to approve or reject them.
3. WHEN a school is verified, THE Admin_Portal SHALL set verified=1 on the school record.
4. THE School_Isolator SHALL ensure that all DB queries for students, teachers, parents, assessments, attendance, messages, videos, announcements, and payments include a school_id filter matching the authenticated user's school_id.
5. IF a user attempts to access data belonging to a different school_id, THEN THE System SHALL return HTTP 403.
6. THE School_Isolator SHALL be enforced at the route handler level for all portal API routes.

---

### Requirement 42: Admin — Payment Schedule Management

**User Story:** As an admin, I want to set school-wide payment schedules, so that payment records are automatically created for all students.

#### Acceptance Criteria

1. THE Admin_Portal SHALL provide a payment schedule form collecting: fee type, amount, due date, and recurrence (one-time, monthly, termly).
2. WHEN a payment schedule is saved, THE Payment_Tracker SHALL create payment records for all active students in the school.
3. THE Admin_Portal SHALL display all active payment schedules with edit and delete controls.
4. WHEN a payment schedule is deleted, THE Admin_Portal SHALL NOT delete existing payment records already created from that schedule.
5. THE Admin_Portal SHALL display a payment collection summary showing total collected, total pending, and total overdue amounts.

---

### Requirement 43: Multi-Language Support (English and Amharic)

**User Story:** As a user, I want to switch the interface language between English and Amharic, so that the platform is accessible to Amharic-speaking users.

#### Acceptance Criteria

1. THE System SHALL provide a language toggle button (EN / አማ) accessible from all portal pages.
2. WHEN a user selects Amharic, THE System SHALL replace all UI labels, button text, navigation items, and placeholder text with their Amharic translations.
3. WHEN a user selects English, THE System SHALL restore all UI text to English.
4. THE System SHALL persist the selected language to localStorage and restore it on next visit.
5. THE System SHALL provide Amharic translations for at least: dashboard, tasks, results, attendance, notes, messages, notifications, settings, logout, welcome, and all common action buttons (save, cancel, delete, add, submit).

---

### Requirement 44: PWA — Installable and Offline-Capable

**User Story:** As a user, I want to install the app on my device and use it offline, so that I can access my data without an internet connection.

#### Acceptance Criteria

1. THE PWA SHALL have a valid manifest.json with: name, short_name, start_url, display: standalone, theme_color: #2C1810, background_color: #2C1810, and references to 192px and 512px icons.
2. THE PWA SHALL register a service worker that caches static assets (CSS, JS, icons) using a cache-first strategy.
3. THE PWA SHALL use a network-first strategy for all /api/ routes, falling back to a cached response if the network is unavailable.
4. WHEN the app is installed on a mobile device, THE PWA SHALL display a full-screen standalone experience without browser chrome.
5. WHEN the user is offline, THE PWA SHALL display a cached version of the last loaded portal page with a banner indicating offline status.

---

### Requirement 45: Draggable AI Button

**User Story:** As a student, I want the AI chatbot button to be draggable and snap to the nearest edge of the screen, so that it does not obstruct my content.

#### Acceptance Criteria

1. THE AI_Chatbot floating action button SHALL be draggable by touch and mouse on all portal pages.
2. WHEN the user releases the button after dragging, THE AI_Chatbot button SHALL snap to the nearest vertical edge (left or right) of the viewport.
3. THE AI_Chatbot button SHALL maintain its vertical position after snapping.
4. THE AI_Chatbot button position SHALL be persisted to localStorage and restored on next visit.
5. THE AI_Chatbot button SHALL remain visible and accessible at all times, including when the sidebar is open.

---

### Requirement 46: Home/Dashboard Navigation Button

**User Story:** As a user, I want a home button that returns me to the main landing page without logging me out, so that I can navigate freely.

#### Acceptance Criteria

1. THE System SHALL display a Home button in the sidebar footer of all portals (student, teacher, parent, admin).
2. WHEN a user clicks the Home button, THE System SHALL navigate to the landing page without destroying the active Session.
3. WHEN a user navigates back to their portal from the landing page, THE System SHALL restore the portal without requiring re-login.
4. THE System SHALL display the Home button with a house icon and the label "Home" (or Amharic equivalent when Amharic is selected).

---

### Requirement 47: Expanded Gamification — Additional Games

**User Story:** As a student, I want access to more educational games, so that learning through play covers a wider range of subjects.

#### Acceptance Criteria

1. THE Game_Engine SHALL provide the following games: Word Scramble, Flashcards, Math Challenge, Memory Match, Spelling Bee, Science Trivia, and Color Sort.
2. WHEN a student launches a game, THE Game_Engine SHALL load subject-relevant content if the game was triggered from a subject suggestion.
3. WHEN a student completes a game session, THE Reward_System SHALL award points based on the score: 1 point per correct answer.
4. THE Game_Engine SHALL display a high score for each game type on the student's profile.
5. THE Game_Engine SHALL support multiplayer competition mode where two students in the same school can compete in real time via Socket_IO.

---

### Requirement 48: Peer Kudos / Shout-Outs Verification

**User Story:** As a student, I want to send kudos to classmates to recognise their achievements, so that the school community feels supportive.

#### Acceptance Criteria

1. THE Student_Portal SHALL display a Kudos section where students can send a short appreciation message to another student in the same school.
2. WHEN a kudos is sent, THE Notification_Service SHALL create an in-app notification for the recipient.
3. THE Student_Portal SHALL display received kudos on the student's dashboard.
4. THE Student_Portal SHALL limit each student to sending a maximum of 5 kudos per day to prevent spam.
5. THE School_Isolator SHALL ensure students can only send kudos to students in the same school.


---

### Requirement 49: Video Feed Safety and Moderation

**User Story:** As a school admin, I want all videos in the feed to be safe, school-appropriate, and approved before being shown, so that students are protected from inappropriate content.

#### Acceptance Criteria

1. THE Video_Feed SHALL display only videos belonging to the authenticated user's school (school_id isolation); no cross-school content SHALL appear.
2. WHEN a video is uploaded, THE System SHALL pass it through an AI content filter before it is made available; IF the filter flags the video as inappropriate, THEN THE Video_Feed SHALL NOT display it and SHALL notify the uploader.
3. WHEN a video is uploaded by any user, THE Video_Feed SHALL set approved=0 and require a teacher or admin to explicitly approve it before it is shown.
4. THE Teacher_Portal AND Admin_Portal SHALL display a moderation queue listing all pending videos with approve and reject controls.
5. WHEN a video is approved, THE Video_Feed SHALL make it visible to students in the same school immediately.
6. THE Video_Feed SHALL only allow audio tracks that are either licensed or explicitly marked as school-approved by an admin.
7. WHEN a club or class is created, THE System SHALL create a dedicated mini video feed space for that club or class, isolated to its members.
8. WHEN a teacher posts a video tagged as "educational snippet", THE Video_Feed SHALL display it in the relevant class or subject feed.
9. WHEN an admin creates a school campaign or challenge (science, art, sports), THE Video_Feed SHALL display a challenge banner and allow students to submit response videos.

---

### Requirement 50: Enhanced Gamification System

**User Story:** As a student, I want a rich gamification system with XP, coins, badges, levels, leaderboards, and varied game types, so that learning feels rewarding and competitive.

#### Acceptance Criteria

1. WHEN a student wins a game, THE Reward_System SHALL award XP points to the student's xp_points balance.
2. THE Reward_System SHALL maintain a coins/tokens balance per student; coins SHALL be earnable through game wins and redeemable to unlock avatars, themes, chat stickers, and special quizzes.
3. THE Reward_System SHALL award named badges for achievements: "Math Master" (10 consecutive correct math answers), "Quiz Champion" (win 5 quizzes), and daily login streak bonuses at 3, 7, 14, and 30 days.
4. THE Game_Engine SHALL implement game levels: easy, medium, and hard; WHEN a student reaches a score threshold at the current level, THE Game_Engine SHALL unlock the next difficulty level.
5. THE Student_Portal SHALL display a progress bar showing the percentage of XP earned toward the next level.
6. THE Student_Portal SHALL display a class leaderboard and a school leaderboard; both leaderboards SHALL reset weekly every Monday at 00:00.
7. THE Reward_System SHALL allow students to spend coins to boost posts or videos (increase visibility) and to unlock premium features.
8. WHEN a teacher approves a student achievement, THE Reward_System SHALL issue a digital certificate visible on the student's profile.
9. THE Game_Engine SHALL provide the following game types: quick quizzes, puzzle games, memory games, watercolor sorting puzzle, and multiplayer challenges.
10. WHEN a student wins a game, THE Student_Portal SHALL display the earned points on the student's profile and allow the student to use points to boost posts or videos.
11. THE Chat_System SHALL allow a student to challenge a friend to a game by sending a game invite in chat; WHEN the invite is accepted, THE Game_Engine SHALL start a multiplayer session.
12. WHEN a student completes a game, THE Student_Portal SHALL allow the student to share the result in the video feed.

---

### Requirement 51: Subject Management System Fix

**User Story:** As a teacher, I want the Subject dropdown in the New Assessment form to be populated and manageable, so that I can assign assessments to the correct subject without errors.

#### Acceptance Criteria

1. WHEN a teacher opens the New Assessment form, THE Teacher_Portal SHALL fetch all subjects for the teacher's school from GET /api/teacher/subjects and populate the Subject dropdown.
2. IF no subjects exist for the school, THEN THE Teacher_Portal SHALL display the empty state message: "No subjects available. Please add a subject to continue."
3. THE Teacher_Portal SHALL display a "+ Add Subject" button inside the Subject dropdown that opens a modal for entering a new subject name.
4. WHEN a new school is created, THE System SHALL preload the following default subjects into the subjects table for that school: Mathematics, Physics, Chemistry, Biology, English, History, Geography, Art, Music, PE, Computer Science, Amharic.
5. WHEN a subject is added via the modal, THE Teacher_Portal SHALL call POST /api/teacher/subjects, persist the record, and update the dropdown immediately without a page reload.
6. THE subjects table SHALL enforce a unique constraint on (name, school_id) to prevent duplicate subject names within the same school.
7. IF a teacher attempts to add a subject name that already exists for the school, THEN THE System SHALL return HTTP 409 with the message "Subject already exists".
8. THE Admin_Portal AND Teacher_Portal SHALL allow editing and deleting subjects; only admin and teacher roles SHALL have access to these controls.
9. WHEN a subject is deleted, THE System SHALL check for dependent records (assessments, materials, student_subjects) and return a descriptive error if dependencies exist.

---

### Requirement 52: Portal Enhancements

**User Story:** As a parent, teacher, or admin, I want richer portal features so that I can manage school activities more effectively.

#### Acceptance Criteria

1. THE Parent_Portal SHALL display an attendance calendar view showing the child's daily attendance status for the current month.
2. THE Parent_Portal SHALL display child progress charts showing assessment score trends per subject over time.
3. THE Parent_Portal SHALL allow direct messaging with all of the child's teachers via the Chat_System.
4. THE Parent_Portal SHALL display school events with an RSVP button; WHEN a parent RSVPs, THE System SHALL record the response and notify the admin.
5. THE Parent_Portal SHALL display a school fee payment history showing all payments with date, amount, fee type, and status.
6. THE Teacher_Portal SHALL display a class schedule management section where teachers can create and edit their weekly timetable.
7. THE Teacher_Portal SHALL display student performance analytics showing per-student and per-subject score trends with charts.
8. THE Teacher_Portal SHALL provide a bulk attendance marking interface allowing the teacher to mark all students present or absent in one action.
9. THE Teacher_Portal SHALL include a resource library where teachers can browse and download shared teaching materials.
10. THE Admin_Portal SHALL display a school analytics dashboard showing: total students, total teachers, average attendance rate, average assessment score, and active users this week.
11. THE Admin_Portal SHALL include a staff management section for adding, editing, and deactivating teacher accounts.
12. THE Admin_Portal SHALL display a school calendar where admins can add, edit, and delete school events visible to all roles.
13. THE Admin_Portal SHALL include a system settings section for configuring: school name, logo, contact details, and feature toggles (enable/disable video feed, chat, games).

---

### Requirement 53: Landing Page and UI Improvements

**User Story:** As a parent visiting the landing page, I want an attractive, professional, and informative page, so that I understand the platform's value and feel confident using it.

#### Acceptance Criteria

1. THE System SHALL display interactive flip cards on the landing page for each major feature; WHEN a user hovers over a card, THE System SHALL rotate it to reveal the feature description on the back.
2. THE System SHALL display a simple step-by-step guide for parents on the homepage explaining how to register, link a child, and use the portal.
3. THE System SHALL replace all decorative emoji icons in the UI with SVG-based professional icons.
4. THE System SHALL apply a professional, minimal design language across all pages: consistent typography, spacing, and colour palette.

---

### Requirement 54: Amharic Translation Fix

**User Story:** As an Amharic-speaking user, I want the entire app to be correctly translated into Amharic, so that I can use all features in my preferred language.

#### Acceptance Criteria

1. THE System SHALL provide correct Amharic translations for all navigation items, buttons, form labels, dashboard headings, and portal sections across all four portals.
2. WHEN a user switches to Amharic, THE System SHALL update every visible text element including dynamically rendered content (notifications, chat labels, error messages).
3. THE System SHALL provide Amharic translations for all features added in Requirements 49–60.
4. IF a translation key is missing, THEN THE System SHALL fall back to the English text and log the missing key to the console.

---

### Requirement 55: Student Portal Enhancements

**User Story:** As a student, I want additional learning tools including a movie section, a notebook editor, grade-differentiated content, and a Duolingo-style learning path, so that my portal supports diverse learning styles.

#### Acceptance Criteria

1. THE Student_Portal SHALL display a Movie section where students can watch school-approved movies; this section SHALL be separate from the educational video feed.
2. THE Notebook SHALL render with a lined-paper visual style and support rich-text editing including bold, italic, underline, bullet lists, numbered lists, and headings.
3. WHEN a student's grade is 1–6 (primary), THE Student_Portal SHALL display simplified UI complexity, primary-level content, and easy game difficulty by default.
4. WHEN a student's grade is 7–12 (secondary), THE Student_Portal SHALL display full UI complexity, secondary-level content, and medium/hard game difficulty by default.
5. THE Student_Portal SHALL include a Challenge section styled similarly to Duolingo: students select interests, follow learning paths, complete short lessons with embedded educational videos, track progress, and earn levels and achievements.
6. WHEN a student completes a lesson in the Challenge section, THE Reward_System SHALL award XP and update the student's learning path progress.

---

### Requirement 56: Authentication and Session Management

**User Story:** As a system administrator, I want strict authentication rules so that accounts are unique, sessions are secure, and Ethiopian phone formats are enforced everywhere.

#### Acceptance Criteria

1. THE Auth_Module SHALL enforce globally unique emails across all role tables (students, teachers, parents, admins); IF an email is already registered in any role table, THEN THE Auth_Module SHALL return HTTP 409 with "Email already registered".
2. THE Auth_Module SHALL NOT persist login sessions across app restarts; WHEN a user closes and reopens the app, THE Auth_Module SHALL require re-authentication.
3. THE Auth_Module SHALL provide explicit login and logout flows for all roles; WHEN a user logs out, THE Auth_Module SHALL destroy the server-side session and clear client-side storage.
4. THE Validator SHALL enforce Ethiopian phone number format (+251 followed by 7 or 9 followed by 8 digits) in all registration and profile update forms across all portals.

---

### Requirement 57: In-App Demo and Tutorial

**User Story:** As a new user, I want an in-app demo and tutorial, so that I can learn how to use the platform without external help.

#### Acceptance Criteria

1. THE System SHALL display a "Watch Demo" button on the landing page and in the Help section of all portals.
2. WHEN a user clicks "Watch Demo", THE System SHALL play an in-app tutorial video explaining the platform's main features.
3. THE System SHALL display a step-by-step guide for parents on the landing page, covering: registration, linking a child, viewing results, and messaging teachers.
4. THE System SHALL provide the demo video and step-by-step guide in both English and Amharic.

---

### Requirement 58: Payment Integration

**User Story:** As a parent, I want to pay school fees directly inside the app using a local Ethiopian payment gateway, so that I can manage all school finances in one place.

#### Acceptance Criteria

1. THE Payment_Tracker SHALL integrate with Chapa or an equivalent Ethiopian payment gateway to process real school fee payments.
2. THE Parent_Portal SHALL display all outstanding fees with a "Pay Now" button for each; WHEN clicked, THE Payment_Tracker SHALL initiate a payment session with the gateway.
3. WHEN a payment is completed successfully, THE Payment_Tracker SHALL update the payment record status to "paid" and generate a downloadable receipt.
4. THE Payment_Tracker SHALL display payment statuses: paid, pending, and overdue for each fee record.
5. THE Parent_Portal SHALL display a full payment history showing date, amount, fee type, status, and receipt link.
6. THE Admin_Portal SHALL display a payments dashboard showing: all student payment records, total collected, total pending, total overdue, and a download report button.
7. THE Admin_Portal SHALL allow admins to add or update fee records, mark payments as manually paid, and track overdue accounts.
8. IF a payment gateway transaction fails, THEN THE Payment_Tracker SHALL display a descriptive error and leave the payment status unchanged.

---

### Requirement 59: Full PWA Offline Support

**User Story:** As a user in a low-connectivity environment, I want the app to work fully offline and sync when I reconnect, so that I can continue using it without interruption.

#### Acceptance Criteria

1. THE PWA SHALL cache all critical pages (dashboard, tasks, results, attendance, notes, materials) using a service worker so they are accessible offline.
2. WHEN the user is offline, THE PWA SHALL serve cached data for all critical pages and display an offline status banner.
3. WHEN the user performs a write action (add task, save note, mark attendance) while offline, THE PWA SHALL queue the action locally.
4. WHEN the network connection is restored, THE PWA SHALL automatically sync all queued actions to the server and notify the user of successful sync.
5. THE PWA SHALL use IndexedDB or Cache API to store critical data locally for offline access.

---

### Requirement 60: Glossary Additions for New Features

**User Story:** As a developer or reviewer, I want all new system terms defined in the glossary, so that requirements are unambiguous.

#### Acceptance Criteria

1. THE Requirements Document SHALL define the following terms in the Glossary:
   - **XP_System**: The experience points subsystem tracking student game and learning progress
   - **Coin_System**: The in-app token economy for unlocking features and rewards
   - **Leaderboard_Engine**: The subsystem managing class and school leaderboards with weekly resets
   - **Content_Moderator**: The AI-based subsystem filtering uploaded videos for inappropriate content
   - **Payment_Gateway**: The external Ethiopian payment processor (Chapa or equivalent) integrated for fee collection
   - **Challenge_Engine**: The Duolingo-style learning path subsystem with lessons, progress tracking, and achievements
   - **Offline_Sync**: The service worker and IndexedDB subsystem that queues and syncs offline actions
   - **Subject_Manager**: The subsystem managing school subjects including creation, editing, deletion, and default preloading
