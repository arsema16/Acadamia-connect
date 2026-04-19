# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - School Selection Assigns Correct school_id
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — register with a casing variant of an existing school name (e.g., "addis high school" when DB has "Addis High School") and assert the user is assigned to the existing school's `school_id`
  - From Bug Condition in design: `isBugCondition(input)` is true when `input.school_name` is a casing/spacing variant of an existing school name and no `school_id` is provided
  - Test cases to cover:
    - Case-variant: POST `/api/auth/register` with `school_name = "addis high school"` when DB has `"Addis High School"` → assert `user.school_id === existingSchool.id` and no new school record created
    - Trailing-space: POST with `school_name = "Bole Primary "` when DB has `"Bole Primary"` → assert same `school_id`
    - Exact match via `school_id`: POST with `school_id = existingSchool.id` → assert user assigned to that school (expected behavior after fix)
  - Expected behavior from design: `result.user.school_id === existingSchool.id` AND `countSchools()` unchanged
  - Run test on UNFIXED code — **EXPECTED OUTCOME**: Test FAILS (proves the bug exists — case-sensitive SQL match creates a new school)
  - Document counterexamples found (e.g., "user ends up with school_id=5 instead of school_id=1 because a new school was created")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - New School Creation and Existing User Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where `isBugCondition` returns false):
    - Observe: POST `/api/auth/register` with a brand-new school name creates a new school record with default subjects
    - Observe: POST `/api/auth/login` with valid credentials returns the correct user and school data
    - Observe: GET `/api/auth/schools` returns `{ id, name, code, verified }` for all schools
    - Observe: Registration with invalid phone/email/password is rejected with a 400 error
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements in design:
    - For all new-school registrations (school name not in DB): a new school record is created AND default subjects are inserted
    - For all existing-user logins: authentication succeeds and `school_id` is unchanged
    - For all registrations with invalid fields: server returns 400 with validation error
    - For all GET `/api/auth/schools` calls: response includes `id`, `name`, `code`, `verified` for every school
  - Verify tests PASS on UNFIXED code before implementing the fix
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for new-user-empty-dashboard — school selection and empty-state messaging

  - [x] 3.1 Add searchable school dropdown to registration form (`public/js/auth.js`)
    - In `renderRegStep1()`, replace the plain `<input type="text" id="reg-school">` with a combo-box: a text input bound to a `<datalist id="school-list">` populated with existing school names, plus a hidden `<input id="reg-school-id">` that stores the selected school's `id`
    - Fetch `GET /api/auth/schools` when Step 1 renders and populate the `<datalist>` options with `{ id, name }` from the response
    - When the user selects a name from the datalist, set `document.getElementById('reg-school-id').value` to the matching school's `id`
    - When the user types a name not in the list, leave `reg-school-id` empty (signals "create new school")
    - In `regNext()` step 1 collection, read both `reg-school` (name) and `reg-school-id` (id) into `authState.data` as `school_name` and `school_id` (nullable)
    - Update the review summary in `renderRegStep3()` to display the selected school name
    - _Bug_Condition: `isBugCondition(input)` where `input.school_name` is a variant of an existing school and no `school_id` is provided_
    - _Expected_Behavior: user selects from dropdown → `authState.data.school_id` is set to the existing school's id_
    - _Preservation: all existing field validation (email, phone, password) and step navigation remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.3_

  - [x] 3.2 Prefer `school_id` over `school_name` in register route (`routes/auth.js`)
    - In the `POST /api/auth/register` handler, destructure `school_id` from `req.body` alongside `school_name`
    - If `school_id` is provided and non-empty, look up the school with `SELECT id FROM schools WHERE id = ?` instead of the current `WHERE name = ?` query; skip the find-or-create-by-name logic
    - Only fall back to the existing find-or-create-by-name logic when `school_id` is absent or empty
    - Ensure default subjects are still inserted when a genuinely new school is created (no change to that branch)
    - _Bug_Condition: `isBugCondition(input)` where `input.school_id` is absent and `input.school_name` matches an existing school with different casing_
    - _Expected_Behavior: `result.user.school_id === existingSchool.id` AND `countSchools()` unchanged_
    - _Preservation: new-school creation path (default subjects insertion) and all other register logic remain identical_
    - _Requirements: 2.2, 2.3, 3.2, 3.4_

  - [x] 3.3 Add empty-state message to student dashboard (`public/js/student.js`)
    - In `renderStudentDashboard()`, detect the empty-school state: when `students.length === 0 AND announcements.length === 0 AND (studentData.assessments||[]).length === 0`
    - Render a prominent empty-state banner explaining the school is new and content will appear once teachers and admins add it
    - The banner should be contextual and actionable (e.g., "Your school is all set up! Content will appear here once your teachers add lessons, quizzes, and announcements.")
    - _Requirements: 2.4_

  - [x] 3.4 Add empty-state message to teacher dashboard (`public/js/teacher.js`)
    - In `renderTeacherDashboard()`, detect when `students.length === 0`
    - Render a helpful empty-state message in the student list area explaining that students will appear once they register and join the school, with a prompt to share the school name
    - _Requirements: 2.5_

  - [x] 3.5 Add empty-state message to parent dashboard (`public/js/parent.js`)
    - In `renderParentDashboard()`, detect when `children.length === 0`
    - Render an empty-state message guiding the parent to link their child's account by having the child register with the parent's contact number
    - _Requirements: 2.6_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - School Selection Assigns Correct school_id
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: selecting an existing school via `school_id` assigns the user to that school without creating a new record
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `school_id` lookup now used when provided)
    - _Requirements: 2.1, 2.2_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - New School Creation and Existing User Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — new-school creation, login, validation, and school isolation all work as before)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass; ask the user if questions arise
  - Verify end-to-end: register selecting an existing school → log in → dashboard shows existing school content
  - Verify end-to-end: register creating a new school → log in → empty-state messages appear in student, teacher, and parent dashboards
  - Verify existing user login after fix shows no regression in data visibility or school isolation
