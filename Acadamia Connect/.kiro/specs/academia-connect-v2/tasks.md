# Implementation Plan: Academia Connect V2

## Overview

This implementation plan transforms the existing Academia Connect PWA into a comprehensive educational platform with enterprise-grade features. The plan addresses 48 requirements covering critical bug fixes, deep portal enhancements, TikTok-style video feed, Telegram-style messaging, expanded gamification, school isolation, and multi-language support.

The implementation builds on the existing Node.js/Express + SQLite (better-sqlite3) + Socket.IO + vanilla JS architecture, maintaining backward compatibility while introducing new subsystems for enhanced validation, subject assignment workflow, per-subject notebooks, soft-copy materials, motivational content delivery, focus mode, rewards marketplace, live video sessions, parent group chat, teacher attendance tracking, and comprehensive school isolation.

## Tasks

- [x] 1. Critical Bug Fixes and Enhanced Validation
  - [x] 1.1 Implement enhanced input validation system
    - Create comprehensive validation functions for phone (Ethiopian format), email, and password strength
    - Add client-side and server-side validation with real-time feedback
    - Implement password strength indicator with four levels (weak, fair, good, strong)
    - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5_

  - [ ]* 1.2 Write property tests for validation functions
    - **Property 1: Phone validation rejects invalid Ethiopian formats**
    - **Validates: Requirements 1.1-1.5**

  - [x] 1.3 Fix role-based login enforcement
    - Implement strict role-based authentication that queries only the correct table
    - Add employee_id requirement for teacher login
    - Ensure generic error messages that don't reveal which field is incorrect
    - _Requirements: 4.1-4.6_

  - [ ]* 1.4 Write property tests for role-based authentication
    - **Property 4: Role-based login queries only the correct table**
    - **Property 5: Teacher login requires employee_id match**
    - **Validates: Requirements 4.1-4.6**

- [x] 2. School Isolation Architecture
  - [x] 2.1 Implement school isolation middleware
    - Create enforceSchoolIsolation middleware for all API routes
    - Ensure all database queries include school_id filtering
    - Add school_id validation to prevent cross-school data access
    - _Requirements: 41.1-41.5_

  - [ ]* 2.2 Write property tests for school isolation
    - **Property 6: Subject assignment creates school-isolated record**
    - **Property 23: School verification prevents cross-school data access**
    - **Validates: Requirements 41.1-41.5_

  - [x] 2.3 Update all existing API routes with school isolation
    - Apply school isolation to student, teacher, parent, and admin routes
    - Ensure all queries filter by authenticated user's school_id
    - _Requirements: 41.1-41.5_

- [x] 3. Enhanced Database Schema
  - [x] 3.1 Create new database tables for V2 features
    - Add student_subjects table for teacher-driven subject assignment
    - Add materials table for file uploads per subject
    - Add teacher_attendance table for admin tracking
    - Add live_sessions table for teacher video sessions
    - Add reward_redemptions table for marketplace
    - Add video_views table for tracking
    - _Requirements: 5.1-5.5, 27.1-27.5, 31.1-31.5, 38.1-38.5_

  - [x] 3.2 Modify existing tables for V2 enhancements
    - Add theme and language columns to students table
    - Add is_motivational column to videos table
    - Ensure messages table supports Telegram-style features
    - _Requirements: 26.1-26.4, 43.1-43.5_

- [x] 4. Subject Assignment System (Teacher-Driven)
  - [x] 4.1 Implement teacher subject assignment functionality
    - Create API endpoints for teachers to assign/remove subjects to students
    - Remove subject selection from student registration
    - Display "No subjects assigned yet" message for students without assignments
    - _Requirements: 5.1-5.5_

  - [ ]* 4.2 Write property tests for subject assignment
    - **Property 7: Student portal displays only assigned subjects**
    - **Validates: Requirements 5.1-5.5**

  - [x] 4.3 Update student portal to show only assigned subjects
    - Modify student dashboard to display teacher-assigned subjects only
    - Update all subject-related features to use assigned subjects
    - _Requirements: 5.1-5.5_

- [x] 5. Enhanced Task Management System
  - [x] 5.1 Fix task CRUD operations
    - Implement reliable add, edit, complete, and delete functionality
    - Add proper validation and error handling
    - Ensure task completion awards exactly 10 points and 30 minutes reward time
    - _Requirements: 7.1-7.6_

  - [ ]* 5.2 Write property tests for task management
    - **Property 8: Task completion awards exactly 10 points and 30 minutes**
    - **Validates: Requirements 7.1-7.6**

  - [x] 5.3 Implement streak system with proper validation
    - Create calculateStreakUpdate function with consecutive day logic
    - Award streak badges at 5-day and 30-day milestones
    - Display streak count with flame icon on dashboard
    - _Requirements: 22.1-22.5_

  - [ ]* 5.4 Write property tests for streak system
    - **Property 14: Streak increments only on consecutive days**
    - **Validates: Requirements 22.1-22.5**

- [ ] 6. Checkpoint - Core Systems Validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. TikTok-Style Vertical Video Feed
  - [x] 7.1 Create video feed engine with swipe navigation
    - Implement full-screen vertical video player
    - Add swipe-up/down navigation between videos
    - Implement auto-play with muted audio by default
    - Add like, comment, and share controls
    - _Requirements: 18.1-18.9_

  - [ ]* 7.2 Write property tests for video feed
    - **Property 10: Video feed displays only school-specific videos**
    - **Property 29: Video auto-play is muted by default**
    - **Validates: Requirements 18.1-18.9**

  - [x] 7.3 Implement video interaction features
    - Create video like/unlike functionality with real-time updates
    - Add inline comment panel with real-time comments
    - Implement video save for offline viewing
    - _Requirements: 18.1-18.9_

  - [ ]* 7.4 Write property tests for video interactions
    - **Property 7: processVideoLike function**
    - **Validates: Requirements 18.1-18.9**

- [x] 8. Telegram-Style Chat System
  - [x] 8.1 Implement real-time messaging with Socket.IO
    - Create message delivery system with delivered/seen indicators
    - Add typing indicators with 3-second timeout
    - Support media attachments (images, files, audio)
    - _Requirements: 19.1-19.10_

  - [ ]* 8.2 Write property tests for chat system
    - **Property 11: Chat messages are school-isolated**
    - **Property 12: Typing indicator expires after 3 seconds**
    - **Property 13: Message read status transitions from 0 to 1 only**
    - **Validates: Requirements 19.1-19.10**

  - [x] 8.3 Add advanced chat features
    - Implement emoji picker panel
    - Add message reply, pin, star, and delete functionality
    - Create message search within conversations
    - Display pinned messages bar at conversation top
    - _Requirements: 19.1-19.10_

  - [x] 8.4 Implement conversation types
    - Support student-to-teacher messaging
    - Add teacher-to-parent communication
    - Create parent-to-parent grade-level groups
    - _Requirements: 19.1-19.10, 35.1-35.5_

- [x] 9. Enhanced AI Chatbot (Athena)
  - [x] 9.1 Implement varied and context-aware responses
    - Create response pools with at least 5 distinct responses per topic
    - Add grade-appropriate content filtering
    - Reference student's assigned subjects in responses
    - Suggest games for subjects with low scores (below 50%)
    - _Requirements: 8.1-8.7_

  - [ ]* 9.2 Write property tests for AI chatbot
    - **Property 9: AI chatbot never repeats immediately preceding response**
    - **Validates: Requirements 8.1-8.7**

  - [x] 9.3 Implement draggable AI button
    - Create draggable AI button that follows pointer
    - Add snap-to-edge functionality (left, right, top, bottom)
    - Ensure button doesn't obstruct content
    - _Requirements: 45.1-45.4_

  - [ ]* 9.4 Write property tests for draggable AI button
    - **Property 26: AI button is draggable and snaps to edge**
    - **Validates: Requirements 45.1-45.4**

- [x] 10. Student Portal Enhancements
  - [x] 10.1 Implement per-subject notebook system
    - Create rich-text editor with formatting support (bold, italic, underline, lists, headings)
    - Add separate tabs for each assigned subject
    - Implement offline note viewing with cached data
    - Sort notes by last-updated date
    - _Requirements: 12.1-12.6_

  - [x] 10.2 Add soft-copy materials access
    - Display materials grouped by assigned subjects only
    - Support PDF in-app viewer and download functionality
    - Add offline material download capability
    - _Requirements: 13.1-13.5_

  - [ ]* 10.3 Write property tests for materials access
    - **Property 19: Student sees only materials for assigned subjects**
    - **Validates: Requirements 13.1-13.5**

  - [x] 10.4 Implement motivational videos section
    - Create dedicated section separate from main video feed
    - Display sender name and message with each video
    - Mark videos as viewed when watched
    - _Requirements: 14.1-14.4_

  - [x] 10.5 Add career interest and hobby-based content
    - Create career interest selection from predefined list
    - Filter challenges and content based on selected interests
    - Display "Career Path" widget on dashboard
    - Reference interests in AI chatbot responses
    - _Requirements: 15.1-15.5_

- [x] 11. Focus Mode and Study Features
  - [x] 11.1 Implement distraction-free focus mode
    - Hide sidebar, topbar notifications, and non-essential UI
    - Display only study content, Pomodoro timer, and exit button
    - Suppress notification popups while maintaining storage
    - _Requirements: 24.1-24.5_

  - [ ]* 11.2 Write property tests for focus mode
    - **Property 28: Focus mode suppresses notifications**
    - **Validates: Requirements 24.1-24.5**

  - [x] 11.3 Verify and enhance Pomodoro study timer
    - Ensure configurable work (25min) and break (5min) durations
    - Add MM:SS countdown display and audio alerts
    - Record study sessions with subject and duration
    - Display total daily study time
    - _Requirements: 20.1-20.6_

  - [x] 11.4 Implement weekly analytics dashboard
    - Create bar chart for daily task completion vs pending
    - Add line chart for 4-week completion rate trend
    - Display study time per subject for current week
    - Show current streak count and last update date
    - _Requirements: 21.1-21.5_

- [x] 12. Rewards and Gamification System
  - [x] 12.1 Create rewards marketplace
    - Implement reward types: 30-min game unlock, 30-min movie unlock, premium avatars, special badges
    - Add point deduction and reward activation logic
    - Display current point balance and redemption history
    - Handle insufficient points with proper error messages
    - _Requirements: 25.1-25.6_

  - [ ]* 12.2 Write property tests for rewards system
    - **Property 15: Reward redemption deducts exact points cost**
    - **Property 16: Insufficient points prevents redemption**
    - **Validates: Requirements 25.1-25.6**

  - [x] 12.3 Implement subject-based adaptive games
    - Create 7 game types: Word Scramble, Flashcards, Math Challenge, Memory Match, Spelling Bee, Science Trivia, Color Sort
    - Display game suggestions for subjects with average < 50%
    - Load subject-relevant content for each game
    - Award points based on game completion scores
    - _Requirements: 11.1-11.5_

  - [x] 12.4 Add expanded gamification features
    - Implement additional educational games for wider subject coverage
    - Create peer kudos/shout-outs system for student recognition
    - Ensure kudos are school-isolated
    - _Requirements: 47.1-47.5, 48.1-48.4_

  - [ ]* 12.5 Write property tests for gamification
    - **Property 27: Kudos are school-isolated**
    - **Validates: Requirements 48.1-48.4**

- [ ] 13. Checkpoint - Student Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Teacher Portal Enhancements
  - [x] 14.1 Implement materials upload system
    - Create upload form for PDFs, DOCs, images per subject
    - Store files under uploads/materials/ with proper organization
    - Display materials list grouped by subject with metadata
    - Add file deletion functionality
    - _Requirements: 27.1-27.5_

  - [ ]* 14.2 Write property tests for materials upload
    - **Property 18: Material upload creates school-isolated record**
    - **Validates: Requirements 27.1-27.5**

  - [x] 14.3 Create and assign quizzes system
    - Build quiz creation form with questions and multiple choice answers
    - Add time limits and reward minutes configuration
    - Implement quiz assignment to specific students or whole class
    - Display quiz attempts and results
    - _Requirements: 28.1-28.6_

  - [x] 14.4 Add competitions with leaderboard
    - Create subject-based competition system
    - Implement leaderboard with student rankings
    - Add competition creation, management, and deletion
    - _Requirements: 29.1-29.5_

  - [x] 14.5 Implement weekly performance reports
    - Generate automated weekly summaries for parents
    - Include tasks completed, study time, streak, assessments, and badges
    - Send reports via email or in-app messaging
    - _Requirements: 30.1-30.4_

  - [x] 14.6 Create live video session system
    - Add live session creation with meeting URL integration
    - Implement student invitation system (school-isolated)
    - Add session status management (scheduled, live, ended)
    - _Requirements: 31.1-31.5_

  - [ ]* 14.7 Write property tests for live sessions
    - **Property 20: Live session invitations are school-isolated**
    - **Validates: Requirements 31.1-31.5**

  - [x] 14.8 Fix assessment subject selection
    - Add dropdown for existing subjects with option to add new subjects
    - Ensure teachers aren't blocked by missing subjects
    - _Requirements: 32.1-32.4_

  - [x] 14.9 Add file attachments in chat
    - Support document and image attachments in teacher-parent messaging
    - Implement file upload with proper validation and storage
    - _Requirements: 33.1-33.5_

- [x] 15. Parent Portal Enhancements
  - [x] 15.1 Implement payment reminder system
    - Create configurable payment reminder preferences
    - Add payment confirmation with receipt numbers
    - Display payment history and status tracking
    - _Requirements: 34.1-34.5_

  - [x] 15.2 Create parent-to-parent group chat
    - Implement grade-level parent groups (school-isolated)
    - Add group messaging functionality
    - Display group members and message history
    - _Requirements: 35.1-35.5_

  - [ ]* 15.3 Write property tests for parent groups
    - **Property 21: Parent group chat is grade-specific and school-isolated**
    - **Validates: Requirements 35.1-35.5**

  - [x] 15.4 Add weekly child summary
    - Generate comprehensive weekly reports for each child
    - Include tasks, progress, streaks, and achievements
    - Provide summary without requiring daily login
    - _Requirements: 36.1-36.4_

  - [x] 15.5 Implement push notifications for parents
    - Add notifications for child achievements and low performance alerts
    - Include school event notifications
    - Ensure parents stay informed of important updates
    - _Requirements: 37.1-37.5_

- [x] 16. Admin Portal Enhancements
  - [x] 16.1 Implement teacher attendance monitoring
    - Create attendance tracking system for teachers (present/absent/late/excused)
    - Add admin interface for marking and viewing attendance
    - Ensure attendance records are school-isolated
    - _Requirements: 38.1-38.5_

  - [ ]* 16.2 Write property tests for teacher attendance
    - **Property 22: Teacher attendance is school-isolated**
    - **Validates: Requirements 38.1-38.5**

  - [x] 16.3 Create announcements system for all roles
    - Implement school-wide announcement creation
    - Add targeting by role (students, teachers, parents, or all)
    - Display announcements across all portals
    - _Requirements: 39.1-39.5_

  - [x] 16.4 Add comprehensive user management
    - Create user listing, activation, and deactivation functionality
    - Add user deletion with proper data cleanup
    - Implement role-based user filtering
    - _Requirements: 40.1-40.5_

  - [x] 16.5 Implement payment schedule management
    - Create school-wide payment schedule system
    - Add automatic payment record creation for all students
    - Manage fee types, amounts, and due dates
    - _Requirements: 42.1-42.5_

- [x] 17. Multi-Language Support and Accessibility
  - [x] 17.1 Implement English and Amharic language support
    - Create i18n system with language switching
    - Add Amharic translations for all UI text
    - Persist language selection to localStorage
    - Apply selected language consistently across all portals
    - _Requirements: 43.1-43.5_

  - [ ]* 17.2 Write property tests for language support
    - **Property 24: Language selection applies to all UI text**
    - **Validates: Requirements 43.1-43.5**

  - [x] 17.3 Improve text and button contrast
    - Ensure all text meets minimum contrast ratios
    - Fix button labels for proper readability
    - Update form labels and placeholder text colors
    - Verify badge and status label legibility
    - _Requirements: 10.1-10.5_

  - [x] 17.4 Add theme customization system
    - Implement 4 theme options: Dark Academia, Ocean Blue, Forest Green, Sunset Orange
    - Add immediate theme application without page reload
    - Persist theme selection to localStorage
    - Apply themes consistently across all pages
    - _Requirements: 26.1-26.4_

  - [ ]* 17.5 Write property tests for theme system
    - **Property 17: Theme selection persists to localStorage**
    - **Validates: Requirements 26.1-26.4**

- [x] 18. PWA and Offline Capabilities
  - [x] 18.1 Enhance PWA functionality
    - Ensure app is installable with proper manifest
    - Implement offline capability for core features
    - Add service worker caching for content and data
    - Display install prompt on supported devices
    - _Requirements: 44.1-44.5_

  - [ ]* 18.2 Write property tests for PWA features
    - **Property 25: PWA is installable and offline-capable**
    - **Validates: Requirements 44.1-44.5**

  - [x] 18.3 Add home/dashboard navigation
    - Create home button for returning to landing page without logout
    - Ensure proper navigation flow between portals
    - _Requirements: 46.1-46.3_

- [x] 19. Enhanced Notification System
  - [x] 19.1 Implement comprehensive notification system
    - Create notifications for task deadlines (24h and 1h warnings)
    - Add notifications for new announcements, assessment results, and quizzes
    - Display unread notification count badge
    - Support both in-app and browser push notifications
    - _Requirements: 17.1-17.6_

  - [x] 19.2 Ensure consistent name display
    - Display registered names (nickname for students, full name for others) throughout app
    - Use registered names in notifications, chat labels, and leaderboards
    - Update names immediately when profile is changed
    - _Requirements: 6.1-6.5_

- [x] 20. Data Privacy and Security
  - [x] 20.1 Implement student account privacy
    - Ensure students can only access their own data (results, notes, attendance, tasks)
    - Return HTTP 403 for unauthorized data access attempts
    - Prevent students from viewing other students' personal information
    - Display only rank, points, and first name on leaderboard
    - _Requirements: 16.1-16.5_

  - [x] 20.2 Add portfolio verification system
    - Display portfolio items with proper categorization
    - Support multiple file types (images, PDFs, links)
    - Add portfolio item creation and deletion functionality
    - _Requirements: 23.1-23.5_

  - [x] 20.3 Verify student score visibility
    - Ensure assessment results are immediately queryable after teacher saves
    - Group results by subject with comprehensive details
    - Display subject averages and progress bars
    - Create notifications for new results
    - _Requirements: 9.1-9.5_

- [x] 21. Final Integration and Testing
  - [x] 21.1 Wire all components together
    - Integrate all new subsystems with existing infrastructure
    - Ensure proper data flow between video feed, chat system, and portals
    - Connect notification system with all user actions
    - Verify school isolation across all features
    - _Requirements: All requirements integration_

  - [ ]* 21.2 Write integration tests for complete system
    - Test end-to-end workflows across all portals
    - Verify school isolation in multi-school scenarios
    - Test real-time features with multiple concurrent users
    - _Requirements: All requirements validation_

  - [x] 21.3 Performance optimization and cleanup
    - Optimize database queries with proper indexing
    - Implement efficient caching strategies
    - Clean up unused code and optimize bundle sizes
    - _Requirements: Performance and maintainability_

- [x] 22. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Video Feed Safety and Moderation
  - [x] 23.1 Implement AI content filter for uploaded videos
    - Integrate an AI/rule-based content moderation check on video upload
    - Reject flagged videos before they enter the approval queue and notify the uploader
    - _Requirements: 49.2_

  - [x] 23.2 Build teacher/admin video approval workflow
    - Add moderation queue in Teacher_Portal and Admin_Portal listing pending videos
    - Implement approve/reject controls that set approved=1 or delete the record
    - _Requirements: 49.3, 49.4, 49.5_

  - [x] 23.3 Enforce school-only feed and licensed audio
    - Confirm school_id isolation on all video feed queries (no cross-school content)
    - Add audio_approved flag to videos table; only display videos with approved audio
    - _Requirements: 49.1, 49.6_

  - [x] 23.4 Create club/class mini video feed spaces
    - Add club_id / class_id columns to videos table
    - Create isolated feed views per club or class accessible only to members
    - _Requirements: 49.7_

  - [x] 23.5 Add educational snippet and school campaign support
    - Allow teachers to tag videos as "educational snippet" for class/subject feeds
    - Allow admins to create school campaigns/challenges with a challenge banner and student submission flow
    - _Requirements: 49.8, 49.9_

- [x] 24. Enhanced Gamification System
  - [x] 24.1 Implement XP and coins/tokens economy
    - Add xp_points and coins columns to students table
    - Award XP on game win; award coins through game wins and redeemable actions
    - _Requirements: 50.1, 50.2_

  - [x] 24.2 Add named badges and daily login streak bonuses
    - Implement "Math Master", "Quiz Champion" badge logic
    - Award daily login streak bonuses at 3, 7, 14, and 30 days
    - _Requirements: 50.3_

  - [x] 24.3 Implement game levels with progression
    - Add difficulty levels (easy, medium, hard) to Game_Engine
    - Unlock next level when score threshold is reached; display progress bar to next level
    - _Requirements: 50.4, 50.5_

  - [x] 24.4 Build class and school leaderboards with weekly reset
    - Create class leaderboard and school leaderboard views
    - Schedule weekly reset every Monday at 00:00 via a cron/scheduler
    - _Requirements: 50.6_

  - [x] 24.5 Implement coin spending: post/video boost and feature unlock
    - Allow students to spend coins to boost post/video visibility
    - Allow coins to unlock avatars, themes, chat stickers, and special quizzes
    - _Requirements: 50.2, 50.7_

  - [x] 24.6 Add teacher-approved digital certificates
    - Allow teachers to approve student achievements and issue digital certificates
    - Display certificates on student profile
    - _Requirements: 50.8_

  - [x] 24.7 Expand game types
    - Add puzzle games, watercolor sorting puzzle, and multiplayer challenges to Game_Engine
    - _Requirements: 50.9_

  - [x] 24.8 Implement game invite in chat and share result in feed
    - Allow students to send game invites via Chat_System; start multiplayer session on acceptance
    - Allow students to share game results in the video feed
    - _Requirements: 50.11, 50.12_

- [x] 25. Subject Management System Fix
  - [x] 25.1 Fix Subject dropdown in New Assessment form
    - Fetch subjects from GET /api/teacher/subjects and populate dropdown on form open
    - Display empty state: "No subjects available. Please add a subject to continue."
    - _Requirements: 51.1, 51.2_

  - [x] 25.2 Add "+ Add Subject" modal inside dropdown
    - Implement modal triggered from dropdown for entering a new subject name
    - Call POST /api/teacher/subjects and update dropdown immediately on success
    - _Requirements: 51.3, 51.5_

  - [x] 25.3 Preload default subjects on school creation
    - On new school creation, insert default subjects: Mathematics, Physics, Chemistry, Biology, English, History, Geography, Art, Music, PE, Computer Science, Amharic
    - _Requirements: 51.4_

  - [x] 25.4 Enforce unique subject names and school-based separation
    - Add UNIQUE constraint on (name, school_id) in subjects table
    - Return HTTP 409 "Subject already exists" on duplicate
    - _Requirements: 51.6, 51.7_

  - [x] 25.5 Add subject edit and delete for admin/teacher
    - Implement edit and delete subject endpoints with role guard (admin/teacher only)
    - Check for dependent records before deletion and return descriptive error if found
    - _Requirements: 51.8, 51.9_

- [x] 26. Portal Enhancements
  - [x] 26.1 Enhance Parent Portal
    - Add attendance calendar view (monthly, per child)
    - Add child progress charts (score trends per subject)
    - Enable direct messaging with all child's teachers
    - Add school event RSVP with admin notification
    - Display school fee payment history
    - _Requirements: 52.1–52.5_

  - [x] 26.2 Enhance Teacher Portal
    - Add class schedule management (weekly timetable create/edit)
    - Add student performance analytics with charts
    - Implement bulk attendance marking interface
    - Add resource library for shared teaching materials
    - _Requirements: 52.6–52.9_

  - [x] 26.3 Enhance Admin Portal
    - Add school analytics dashboard (students, teachers, attendance rate, avg score, active users)
    - Add staff management section (add/edit/deactivate teachers)
    - Add school calendar with event management visible to all roles
    - Add system settings (school name, logo, contact, feature toggles)
    - _Requirements: 52.10–52.13_

- [x] 27. Landing Page and UI Improvements
  - [x] 27.1 Implement interactive flip cards on landing page
    - Create CSS flip card components for each major feature (front: name, back: description)
    - Trigger rotation on hover (desktop) and tap (mobile)
    - _Requirements: 53.1_

  - [x] 27.2 Add parent guide on homepage
    - Add a step-by-step guide section for parents (register, link child, view results, message teachers)
    - _Requirements: 53.2_

  - [x] 27.3 Replace emoji icons with SVG icons
    - Audit all decorative emoji usage across all pages
    - Replace with SVG-based professional icons
    - _Requirements: 53.3_

  - [x] 27.4 Apply professional minimal design language
    - Standardise typography, spacing, and colour palette across all pages
    - _Requirements: 53.4_

- [x] 28. Amharic Translation Fix
  - [x] 28.1 Audit and fix all existing Amharic translations
    - Review all i18n keys across navigation, buttons, forms, dashboards, and all portals
    - Correct mistranslations and fill missing keys
    - _Requirements: 54.1, 54.2_

  - [x] 28.2 Add Amharic translations for new features (Requirements 49–60)
    - Add i18n keys for all new UI text introduced by new requirements
    - _Requirements: 54.3_

  - [x] 28.3 Implement missing-key fallback and logging
    - Fall back to English text when a translation key is missing
    - Log missing keys to the browser console
    - _Requirements: 54.4_

- [x] 29. Student Portal Enhancements (New)
  - [x] 29.1 Add Movie section for students
    - Create a dedicated Movie section separate from the educational video feed
    - Display only school-approved movies
    - _Requirements: 55.1_

  - [x] 29.2 Implement notebook-style lined-paper editor
    - Apply lined-paper CSS styling to the Notebook component
    - Ensure rich-text editing (bold, italic, underline, lists, headings) is preserved
    - _Requirements: 55.2_

  - [x] 29.3 Implement grade-level differentiation (primary vs secondary)
    - Detect student grade (1–6 = primary, 7–12 = secondary)
    - Serve simplified UI and easy games for primary; full UI and medium/hard games for secondary
    - _Requirements: 55.3, 55.4_

  - [x] 29.4 Build Duolingo-style Challenge section
    - Allow students to select interests and follow learning paths
    - Implement short lessons with embedded educational videos and progress tracking
    - Award XP and update learning path progress on lesson completion
    - _Requirements: 55.5, 55.6_

- [x] 30. Authentication and Session Management Fixes
  - [x] 30.1 Enforce globally unique emails across all role tables
    - On registration, check email against students, teachers, parents, and admins tables
    - Return HTTP 409 "Email already registered" if found in any table
    - _Requirements: 56.1_

  - [x] 30.2 Disable persistent auto-login
    - Remove any "remember me" or persistent session tokens
    - Require re-authentication on every app return
    - _Requirements: 56.2_

  - [x] 30.3 Implement proper session handling and logout
    - Destroy server-side session and clear client-side storage on logout for all roles
    - _Requirements: 56.3_

  - [x] 30.4 Enforce Ethiopian phone format across all portals
    - Apply +251 phone validation to all registration and profile update forms in all portals
    - _Requirements: 56.4_

- [x] 31. In-App Demo and Tutorial
  - [x] 31.1 Add "Watch Demo" button and tutorial video
    - Place "Watch Demo" button on landing page and in Help section of all portals
    - Embed or link tutorial video that plays in-app
    - _Requirements: 57.1, 57.2_

  - [x] 31.2 Add parent step-by-step guide (bilingual)
    - Display step-by-step guide on landing page in English and Amharic
    - _Requirements: 57.3, 57.4_

- [x] 32. Payment Integration (Chapa)
  - [x] 32.1 Integrate Chapa payment gateway
    - Install and configure Chapa SDK or REST API integration
    - Implement payment initiation and webhook/callback handling
    - _Requirements: 58.1, 58.2_

  - [x] 32.2 Implement payment status and receipt generation
    - Update payment record to "paid" on successful transaction
    - Generate downloadable receipt (PDF or HTML)
    - _Requirements: 58.3, 58.4_

  - [x] 32.3 Build parent payment history view
    - Display full payment history with date, amount, fee type, status, and receipt link
    - _Requirements: 58.5_

  - [x] 32.4 Build admin payments dashboard
    - Show all student payment records, totals (collected/pending/overdue), and download report
    - Allow admins to add/update fees, mark manual payments, and track overdue accounts
    - _Requirements: 58.6, 58.7_

  - [x] 32.5 Handle payment gateway errors gracefully
    - Display descriptive error on transaction failure; leave payment status unchanged
    - _Requirements: 58.8_

- [x] 33. Full PWA Offline Support
  - [x] 33.1 Cache all critical pages and data
    - Update service worker to cache dashboard, tasks, results, attendance, notes, and materials pages
    - _Requirements: 59.1_

  - [x] 33.2 Serve cached data and show offline banner
    - Serve cached pages when offline; display offline status banner
    - _Requirements: 59.2_

  - [x] 33.3 Implement offline action queue with IndexedDB
    - Queue write actions (add task, save note, mark attendance) in IndexedDB when offline
    - _Requirements: 59.3, 59.5_

  - [x] 33.4 Implement background sync on reconnect
    - Automatically sync queued actions to server when network is restored
    - Notify user of successful sync
    - _Requirements: 59.4_

- [x] 34. Final Checkpoint — V2 Extended Features
  - Ensure all new tasks (23–33) are complete and all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing V1 codebase
- All new features are built on the existing Node.js/Express + SQLite + Socket.IO + vanilla JS architecture
- School isolation is enforced at the middleware level for complete data separation
- Real-time features use Socket.IO for immediate user feedback
- The system supports both online and offline usage through PWA capabilities