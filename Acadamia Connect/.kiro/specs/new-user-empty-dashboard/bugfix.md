# Bugfix Requirements Document

## Introduction

New users who register on the platform see completely empty dashboards because the registration flow always creates a new school record when a school name is entered, even if that school already exists under a slightly different spelling. This isolates every new user in their own empty school with no students, teachers, announcements, quizzes, or videos. The fix introduces a school search-and-select step during registration so users can join an existing school, and adds empty-state guidance for dashboards that genuinely have no content yet.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a new user registers and types a school name that already exists in the database THEN the system creates a duplicate school record instead of matching the existing one, placing the user in an isolated empty school

1.2 WHEN two users from the same school type the school name with different casing or minor spelling differences (e.g., "Addis High School" vs "Addis High school") THEN the system creates separate school records, preventing those users from seeing each other's data

1.3 WHEN a student registers at a brand-new school THEN the student dashboard shows zero teachers, zero quizzes, and zero videos with no guidance on why the content is missing

1.4 WHEN a teacher registers at a brand-new school THEN the teacher dashboard shows zero students with no guidance on why the list is empty

1.5 WHEN a parent registers at a brand-new school THEN the parent dashboard shows no linked children or school activity with no explanation

### Expected Behavior (Correct)

2.1 WHEN a new user registers THEN the system SHALL present a searchable list of existing schools fetched from GET /api/auth/schools so the user can select their school before submitting the form

2.2 WHEN a user selects an existing school from the list THEN the system SHALL assign the user to that school's existing school_id instead of creating a new school record

2.3 WHEN a user cannot find their school in the list and explicitly chooses to create a new one THEN the system SHALL create a new school record and assign the user to it

2.4 WHEN a student's dashboard loads and the school has no teachers, quizzes, or videos yet THEN the system SHALL display an empty-state message explaining that content will appear once teachers and admins add it

2.5 WHEN a teacher's dashboard loads and the school has no students yet THEN the system SHALL display an empty-state message explaining that students will appear once they register and join the school

2.6 WHEN a parent's dashboard loads and no children are linked yet THEN the system SHALL display an empty-state message guiding the parent to link their child's account

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an existing user logs in to a school that already has content THEN the system SHALL CONTINUE TO display all students, teachers, announcements, quizzes, and videos as before

3.2 WHEN a user registers and selects an existing school THEN the system SHALL CONTINUE TO enforce school isolation so that data from other schools remains invisible to that user

3.3 WHEN the registration form is submitted with valid data THEN the system SHALL CONTINUE TO validate all required fields and reject incomplete or malformed input

3.4 WHEN a user registers and creates a new school THEN the system SHALL CONTINUE TO insert default subjects for that school as it does today

3.5 WHEN a teacher logs in with a valid employee_id THEN the system SHALL CONTINUE TO authenticate the teacher and load their dashboard correctly

3.6 WHEN the GET /api/auth/schools endpoint is called THEN the system SHALL CONTINUE TO return the full list of schools with id, name, code, and verified fields
