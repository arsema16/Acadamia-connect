# New User Empty Dashboard Bugfix Design

## Overview

New users who register on Academia Connect are placed in isolated, empty schools because the registration flow always creates a new school record — even when a school with the same (or similar) name already exists. This leaves every new user staring at a blank dashboard with no students, teachers, quizzes, or videos, and no explanation of why.

The fix has two parts:
1. **Registration**: Replace the free-text school name input with a searchable dropdown that fetches existing schools from `GET /api/auth/schools`. Users can select an existing school or explicitly choose to create a new one.
2. **Empty-state messaging**: Add contextual empty-state messages in the student, teacher, and parent dashboards so that users who genuinely join a new school understand why content is missing and what to do next.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a new user types a school name during registration and the system always creates a new school record, even when a matching school already exists.
- **Property (P)**: The desired behavior — when a user selects an existing school from the dropdown, they are assigned to that school's `school_id`; when they create a new school, a new record is created as before.
- **Preservation**: Existing login flows, school isolation, field validation, default subject insertion, and all dashboard rendering for schools that already have content must remain unchanged.
- **`renderRegStep1()`**: The function in `public/js/auth.js` that renders Step 1 of the registration form, currently containing a plain text input for school name.
- **`handleRegister()`**: The async function in `public/js/auth.js` that POSTs the registration payload to `/api/auth/register`.
- **`regNext()`**: The function in `public/js/auth.js` that validates and advances registration steps, collecting `school_name` from the plain text input.
- **`/api/auth/register`**: The POST endpoint in `routes/auth.js` that finds-or-creates a school by name and inserts the new user.
- **`/api/auth/schools`**: The existing GET endpoint in `routes/auth.js` that returns `{ id, name, code, verified }` for all schools.
- **`school_id`**: The foreign key stored on every user record that determines which school's data they can see (enforced by `middleware/schoolIsolation.js`).
- **`authState.data.school_name`**: The field in the client-side auth state that carries the school name to the registration payload.
- **`renderStudentDashboard()`**: Function in `public/js/student.js` that renders the student home tab.
- **`renderTeacherDashboard()`**: Function in `public/js/teacher.js` that renders the teacher home tab.
- **`renderParentDashboard()`**: Function in `public/js/parent.js` that renders the parent home tab.

## Bug Details

### Bug Condition

The bug manifests when a new user registers and types a school name. The `regNext()` function collects the raw text value from `#reg-school` and stores it in `authState.data.school_name`. The server-side `/api/auth/register` handler then does a case-sensitive exact match (`SELECT id FROM schools WHERE name = ?`). Any variation in casing, spacing, or spelling causes a new school record to be created, isolating the user.

**Formal Specification:**
```
FUNCTION isBugCondition(registrationInput)
  INPUT: registrationInput of type RegistrationFormData
  OUTPUT: boolean

  schoolTypedByUser   := registrationInput.school_name
  existingSchoolNames := SELECT name FROM schools

  RETURN schoolTypedByUser IS NOT NULL
         AND existingSchoolNames IS NOT EMPTY
         AND NOT (schoolTypedByUser IN existingSchoolNames)   -- user typed a variant
         AND a school semantically matching schoolTypedByUser EXISTS in existingSchoolNames
END FUNCTION
```

### Examples

- User types "Addis High School"; DB has "Addis High school" → new duplicate school created, user sees empty dashboard.
- User types "St. Mary's Academy" with a trailing space; DB has "St. Mary's Academy" → new school created, user isolated.
- User types "Bole Primary" at a genuinely new school → new school created correctly (NOT a bug condition).
- User selects "Addis High School" from the dropdown → assigned to existing `school_id`, sees real data (correct behavior after fix).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Existing users who log in to schools that already have content continue to see all students, teachers, announcements, quizzes, and videos exactly as before.
- School isolation enforced by `middleware/schoolIsolation.js` remains fully intact — users only see data from their own school.
- All registration field validation (email format, phone format, password strength, required fields) continues to work.
- When a user explicitly creates a new school, default subjects are still inserted as today.
- Teacher login with `employee_id` continues to work correctly.
- `GET /api/auth/schools` continues to return `{ id, name, code, verified }` for all schools.

**Scope:**
All inputs that do NOT involve the school selection step during registration should be completely unaffected. This includes:
- Login flows for all roles.
- All dashboard tabs beyond the initial empty-state areas.
- Any registration path where the user is creating a genuinely new school.

## Hypothesized Root Cause

Based on the bug description and code review:

1. **Case-sensitive exact match on school name**: `routes/auth.js` uses `SELECT id FROM schools WHERE name = ?` which is case-sensitive in SQLite by default. "Addis High School" and "Addis High school" produce two separate records.

2. **No school selection UI**: `renderRegStep1()` in `public/js/auth.js` renders a plain `<input type="text">` for school name. There is no mechanism for the user to browse or select from existing schools, so every registration is effectively a "create new school" operation unless the user types the name with perfect precision.

3. **No empty-state guidance in dashboards**: `renderStudentDashboard()`, `renderTeacherDashboard()`, and `renderParentDashboard()` already have generic `<div class="empty-state">` fallbacks for individual sections (e.g., "No students found"), but none of them detect the "brand-new school" scenario and provide actionable guidance explaining why everything is empty.

4. **`authState.data.school_name` carries raw text**: The client sends whatever the user typed; the server has no way to distinguish "user wants to join existing school" from "user wants to create new school" because both arrive as a plain string.

## Correctness Properties

Property 1: Bug Condition - School Selection Assigns Correct school_id

_For any_ registration input where the user selects an existing school from the searchable dropdown (isBugCondition returns true — i.e., a matching school exists), the fixed registration flow SHALL assign the user to that school's existing `school_id` rather than creating a new school record, so that the user's dashboard immediately shows the school's existing content.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - New School Creation and Existing User Flows Unchanged

_For any_ registration input where the user explicitly chooses to create a new school (isBugCondition returns false), and for all existing login and dashboard flows, the fixed code SHALL produce exactly the same behavior as the original code — creating a new school record with default subjects, enforcing school isolation, and rendering all dashboard content identically.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `public/js/auth.js`

**Function**: `renderRegStep1()`

**Specific Changes**:
1. **Fetch schools on render**: Call `GET /api/auth/schools` when Step 1 renders and populate a `<datalist>` or custom searchable dropdown with school names.
2. **Replace plain text input with school picker**: Replace `<input type="text" id="reg-school">` with a combo-box pattern — a text input bound to a `<datalist id="school-list">` populated with existing school names, plus a hidden `<input id="reg-school-id">` that stores the selected school's `id`.
3. **Add "Create new school" affordance**: When the user types a name not in the list, show a clear "Create new school: [name]" option so the intent is explicit. Set `reg-school-id` to empty string in this case.
4. **Update `regNext()` step 1 collection**: Read both `reg-school` (name) and `reg-school-id` (id) into `authState.data`. Store as `school_name` and `school_id` (nullable).

**File 2**: `routes/auth.js`

**Function**: `POST /api/auth/register`

**Specific Changes**:
5. **Prefer `school_id` over `school_name`**: If `req.body.school_id` is provided and non-empty, look up the school by id (`SELECT id FROM schools WHERE id = ?`) instead of by name. Only fall back to find-or-create by name when `school_id` is absent.

**File 3**: `public/js/student.js`

**Function**: `renderStudentDashboard()`

**Specific Changes**:
6. **Detect empty-school state**: When `students.length === 0 AND announcements.length === 0 AND (studentData.assessments||[]).length === 0`, render a prominent empty-state banner explaining the school is new and content will appear once teachers and admins add it.

**File 4**: `public/js/teacher.js`

**Function**: `renderTeacherDashboard()`

**Specific Changes**:
7. **Detect empty-school state**: When `students.length === 0`, render a helpful empty-state message in the student list area explaining that students will appear once they register and join the school, with a prompt to share the school name.

**File 5**: `public/js/parent.js`

**Function**: `renderParentDashboard()`

**Specific Changes**:
8. **Detect no-children state**: When `children.length === 0`, render an empty-state message guiding the parent to link their child's account by having the child register with the parent's contact number.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the registration flow with a school name that already exists in the database (with a casing variant) and assert that the user is assigned to the existing school's `school_id`. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Exact match test**: Register with `school_name` exactly matching an existing school → expect user's `school_id` to equal the existing school's id (will fail on unfixed code if casing differs).
2. **Case-variant test**: Register with `school_name = "addis high school"` when DB has `"Addis High School"` → expect same `school_id` (will fail on unfixed code).
3. **Trailing-space test**: Register with `school_name = "Bole Primary "` (trailing space) when DB has `"Bole Primary"` → expect same `school_id` (will fail on unfixed code).
4. **New school test**: Register with a school name that does not exist → expect a new school record to be created (should pass on both fixed and unfixed code).

**Expected Counterexamples**:
- User ends up with a new `school_id` different from the existing school's id.
- Possible causes: case-sensitive SQL match, no UI for school selection, raw string passed from client.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL registrationInput WHERE isBugCondition(registrationInput) DO
  result := register_fixed(registrationInput)
  ASSERT result.user.school_id = existingSchool.id
  ASSERT countSchools() = countSchools_before  -- no new school created
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL registrationInput WHERE NOT isBugCondition(registrationInput) DO
  ASSERT register_original(registrationInput).school_id = register_fixed(registrationInput).school_id
  ASSERT defaultSubjectsInserted(newSchool) = true
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for new-school registrations and existing-user logins, then write property-based tests capturing that behavior.

**Test Cases**:
1. **New school preservation**: Verify that registering with a brand-new school name still creates a new school record with default subjects after the fix.
2. **Login preservation**: Verify that existing users can still log in and see their dashboard data unchanged.
3. **School isolation preservation**: Verify that a user assigned to school A cannot see data from school B after the fix.
4. **Validation preservation**: Verify that invalid phone numbers, weak passwords, and missing required fields are still rejected.

### Unit Tests

- Test `regNext()` step 1 collects both `school_name` and `school_id` correctly when a school is selected from the dropdown.
- Test `regNext()` step 1 sets `school_id` to empty string when the user types a new school name not in the list.
- Test `POST /api/auth/register` uses `school_id` when provided and skips find-or-create by name.
- Test `POST /api/auth/register` falls back to find-or-create by name when `school_id` is absent.
- Test empty-state rendering in student dashboard when all content arrays are empty.
- Test empty-state rendering in teacher dashboard when `students.length === 0`.
- Test empty-state rendering in parent dashboard when `children.length === 0`.

### Property-Based Tests

- Generate random existing school names (with casing variants) and verify that selecting from the dropdown always assigns the correct `school_id`.
- Generate random new school names and verify that a new school record is always created with default subjects.
- Generate random existing user sessions and verify that dashboard data is identical before and after the fix.

### Integration Tests

- Full registration flow: select existing school → log in → verify dashboard shows existing school's content.
- Full registration flow: create new school → log in → verify empty-state messages appear.
- Existing user login after fix: verify no regression in data visibility or school isolation.
- Parent registration with no children linked: verify empty-state guidance is shown on dashboard.
