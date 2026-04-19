# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing fixes)
  - **Property 1: Bug Condition** - Partial PUT Corrupts Task Fields & AI Button ID Mismatch
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist

  **Bug 1 — Task Tick (routes/student.js)**
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: a PUT request body containing only `{ completed: 1 }` (isBugCondition_TaskTick returns true when any of title/subject/due_date/due_time/priority/notes is absent from the request body)
  - Seed the test DB with a task that has all fields populated (title, subject, due_date, due_time, priority, notes)
  - Call the unfixed `PUT /api/student/tasks/:id` handler with body `{ completed: 1 }` only
  - Assert `task.title = original_task.title` — EXPECT FAILURE (title will be null)
  - Assert `task.subject = original_task.subject` — EXPECT FAILURE
  - Assert `task.due_date = original_task.due_date` — EXPECT FAILURE
  - Assert `task.due_time = original_task.due_time` — EXPECT FAILURE
  - Assert `task.priority = original_task.priority` — EXPECT FAILURE
  - Assert `task.notes = original_task.notes` — EXPECT FAILURE
  - Assert `task.completed = 1` — this will pass (completed is set correctly)
  - Document counterexample: "PUT { completed: 1 } → title=null, subject=null, due_date=null, etc."

  **Bug 2 — AI Button (public/index.html + public/js/ai.js)**
  - **Scoped PBT Approach**: Scope to the concrete failing case: document has `id="ai-btn"` but JS calls `getElementById('ai-fab')` (isBugCondition_AIButton returns true)
  - In a JSDOM environment, create a document with `<div id="ai-btn" class="ai-fab">` (the unfixed HTML)
  - Call `initDraggableAIButton()` against this document
  - Assert `document.getElementById('ai-fab') !== null` — EXPECT FAILURE (returns null)
  - Assert the button element has a mousedown listener — EXPECT FAILURE (no listeners attached)
  - Document counterexample: "getElementById('ai-fab') returns null → no listeners → button inert"

  - Run both tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both tests FAIL (this is correct — it proves the bugs exist)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Full PUT Behavior & AI Button Non-Bug Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs first

  **Bug 1 Preservation — Full PUT request (routes/student.js)**
  - Observe: `PUT /api/student/tasks/:id` with all fields provided updates every field correctly on unfixed code
  - Observe: completing a task with all fields awards 10 points and 30 reward_minutes on unfixed code
  - Observe: completing a task with all fields fires the completion notification on unfixed code
  - Observe: a request for a task not belonging to the authenticated student returns 404 on unfixed code
  - Write property-based test: for all full PUT requests (all of title/subject/due_date/due_time/priority/notes/completed present), the handler produces the same DB outcome before and after the fix
  - Generate random full task payloads and verify COALESCE does not alter full-body update behavior
  - Verify gamification: points +10, reward_minutes +30, notification inserted when completed=1
  - Verify streak: `recordStudyActivity` is called on completion
  - Verify authorization: mismatched student_id returns 404
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)

  **Bug 2 Preservation — AI button non-bug path (public/js/ai.js)**
  - Observe: when `id="ai-fab"` already exists in the document, `initDraggableAIButton()` attaches listeners correctly on unfixed code
  - Observe: drag-and-snap behavior works when the element is found on unfixed code
  - Observe: `initDraggableAIButton()` defers to `DOMContentLoaded` when `document.readyState === 'loading'` on unfixed code
  - Write property-based test: for all documents where `getElementById('ai-fab')` returns non-null, the function attaches mousedown and touchstart listeners identically before and after the fix
  - Verify drag positions: generate random drag coordinates and assert snap-to-edge always places button within viewport bounds
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)

  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix task completion tick and AI chat button

  - [x] 3.1 Apply COALESCE fix to PUT /api/student/tasks/:id in routes/student.js
    - Rewrite the UPDATE statement to use COALESCE for every non-key field so omitted fields fall back to existing stored values
    - New SQL: `UPDATE tasks SET title=COALESCE(?,title), subject=COALESCE(?,subject), due_date=COALESCE(?,due_date), due_time=COALESCE(?,due_time), priority=COALESCE(?,priority), notes=COALESCE(?,notes), completed=? WHERE id=? AND student_id=?`
    - Pass each destructured field (title, subject, due_date, due_time, priority, notes) as the first COALESCE argument — JS `undefined` is treated as `null` by SQLite, so COALESCE falls back to the stored column value automatically
    - Keep `completed` outside COALESCE — it is always explicitly provided by the caller
    - Leave gamification, streak (`recordStudyActivity`), and notification logic completely untouched
    - _Bug_Condition: isBugCondition_TaskTick(request) — request.body omits one or more of {title, subject, due_date, due_time, priority, notes}_
    - _Expected_Behavior: every omitted field retains its previously stored value; only explicitly provided fields are updated_
    - _Preservation: full PUT requests (all fields present) must continue to update every supplied field correctly; gamification, streak, and 404 authorization behavior must remain unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Rename id="ai-btn" to id="ai-fab" in public/index.html
    - Change `<div id="ai-btn" class="ai-fab" draggable="false">` to `<div id="ai-fab" class="ai-fab" draggable="false">`
    - No changes to public/js/ai.js are required — the JS already uses the correct selector `getElementById('ai-fab')`
    - The CSS class `ai-fab` is separate from the id and is unaffected
    - _Bug_Condition: isBugCondition_AIButton(doc) — getElementById('ai-fab') returns null while getElementById('ai-btn') is non-null_
    - _Expected_Behavior: initDraggableAIButton() locates the element, attaches mousedown and touchstart listeners, and clicking/tapping toggles the Athena AI panel_
    - _Preservation: drag-and-snap, panel toggle, Athena chat responses, and DOM-ready initialization must remain unchanged_
    - _Requirements: 2.3, 2.4, 3.5, 3.6, 3.7_

  - [x] 3.3 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Partial PUT Preserves Fields & AI Button Listeners Attached
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Re-run Bug 1 exploration test: PUT `{ completed: 1 }` → assert all omitted fields retain original values
    - Re-run Bug 2 exploration test: document with `id="ai-fab"` → assert mousedown and touchstart listeners are attached
    - **EXPECTED OUTCOME**: Both tests PASS (confirms both bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Full PUT Behavior & AI Non-Bug Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Re-run Bug 1 preservation tests: full PUT requests, gamification, streak, and 404 authorization
    - Re-run Bug 2 preservation tests: drag-and-snap, panel toggle, DOM-ready initialization
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm every test passes
  - Verify end-to-end: create a task → tick complete → reload task list → confirm title/subject/due_date intact and completed=1
  - Verify end-to-end: load page → click AI button → confirm Athena panel opens → send a message → confirm response appears
  - Verify gamification flow: tick task complete → confirm points +10, reward_minutes +30, and notification in DB
  - Ask the user if any questions arise before closing the spec
