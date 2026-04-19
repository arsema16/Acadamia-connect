# Task Tick and AI Chat Fix — Bugfix Design

## Overview

Two independent bugs affect the student-facing interface.

**Bug 1 — Task completion tick corrupts task data**: The `PUT /api/student/tasks/:id` route in `routes/student.js` destructures all task fields from `req.body` and passes them directly into the SQL UPDATE. When the frontend sends only `{ completed: 1 }`, every other column (title, subject, due_date, due_time, priority, notes) is bound as `undefined`, which SQLite stores as `null`, permanently destroying the task record. The fix is to use `COALESCE` in the SQL so each field falls back to its existing stored value when the request body omits it.

**Bug 2 — AI chatbot button never opens**: `initDraggableAIButton()` in `public/js/ai.js` calls `document.getElementById('ai-fab')`, but the element in `public/index.html` has `id="ai-btn"`. The lookup returns `null`, no event listeners are attached, and the button is permanently inert. The fix is to rename the HTML id from `ai-btn` to `ai-fab` to match the JS.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers a bug — either a partial PUT request body (Bug 1) or the id mismatch between HTML and JS (Bug 2).
- **Property (P)**: The desired correct behavior — existing task fields are preserved on partial update (Bug 1); the AI button opens the panel on click/tap (Bug 2).
- **Preservation**: Existing behaviors that must remain unchanged after the fix — full task updates, gamification rewards, streak tracking, drag-and-snap, and Athena chat functionality.
- **putTask (F)**: The original (unfixed) `PUT /api/student/tasks/:id` handler in `routes/student.js`.
- **putTask' (F')**: The fixed handler using `COALESCE` to protect existing field values.
- **initDraggableAIButton (F)**: The original function in `public/js/ai.js` that looks up `id="ai-fab"`.
- **initDraggableAIButton' (F')**: The fixed version after the HTML id is corrected to `ai-fab`.
- **COALESCE(a, b)**: SQL function that returns `a` if it is not null, otherwise `b`. Used to fall back to the stored column value when the request body omits a field.

---

## Bug Details

### Bug 1 — Task Completion Tick Corrupts Task Data

The bug manifests when the frontend sends a partial PUT body (e.g. only `{ completed: 1 }`). The handler destructures all fields from `req.body`, receiving `undefined` for every omitted field, then passes those `undefined` values directly into the SQL UPDATE, overwriting the stored data with `null`.

**Formal Specification:**

```
FUNCTION isBugCondition_TaskTick(request)
  INPUT: request of type PutTaskRequest
  OUTPUT: boolean

  RETURN request.body does NOT contain all of
         {title, subject, due_date, due_time, priority, notes}
END FUNCTION
```

**Examples:**

- Student ticks "Math homework" complete → frontend sends `{ completed: 1 }` → title, subject, due_date, due_time, priority, notes all become `null` in the DB. Expected: only `completed` changes.
- Student sends `{ completed: 1, notes: "done" }` → title, subject, due_date, due_time, priority all become `null`. Expected: only `completed` and `notes` change.
- Student sends all fields → no data loss. Expected: all fields updated correctly (this is the non-buggy path).
- Student sends `{ completed: 0 }` to un-complete a task → same corruption occurs. Expected: only `completed` changes.

---

### Bug 2 — AI Chatbot Button Never Opens

The bug manifests on every page load. `initDraggableAIButton()` calls `document.getElementById('ai-fab')`, which returns `null` because the HTML element has `id="ai-btn"`. With `btn === null`, the function returns immediately and no listeners are registered.

**Formal Specification:**

```
FUNCTION isBugCondition_AIButton(doc)
  INPUT: doc of type HTMLDocument
  OUTPUT: boolean

  RETURN doc.getElementById('ai-fab') = null
    AND  doc.getElementById('ai-btn') ≠ null
END FUNCTION
```

**Examples:**

- Page loads → `initDraggableAIButton()` runs → `getElementById('ai-fab')` returns `null` → function exits → clicking the button does nothing. Expected: panel toggles open.
- User taps the button on mobile → no touchstart listener → nothing happens. Expected: panel toggles open.
- After fix, `id="ai-fab"` exists → listeners attach → click toggles panel. Expected: panel opens.
- After fix, drag gesture → snap-to-edge fires correctly. Expected: button snaps to nearest edge.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Full task updates (all fields provided) must continue to update every supplied field correctly.
- Marking a task complete must continue to award 10 points and 30 reward minutes and fire the completion notification.
- Marking a task complete must continue to update the student's streak via `recordStudyActivity`.
- Requests for tasks not belonging to the authenticated student must continue to return 404.
- When the AI panel is open, sending messages and receiving Athena responses must continue to work.
- Dragging the AI button and snapping to the nearest edge must continue to work.
- The draggable button must continue to initialise correctly once the DOM is ready.

**Scope:**

All inputs that do NOT satisfy the bug conditions above are completely unaffected by these fixes. This includes:
- Full PUT requests that supply every task field.
- Mouse clicks and touch events on the AI button after the id is corrected.
- All other keyboard and UI interactions unrelated to task completion or the AI button.

---

## Hypothesized Root Cause

### Bug 1

1. **Missing COALESCE / fallback in SQL**: The UPDATE statement binds JS variables directly. When a variable is `undefined` (field absent from request body), SQLite receives `null` and overwrites the stored value. No guard exists to fall back to the existing column value.

2. **No server-side field defaulting**: The handler does not merge `req.body` with the existing task record before running the UPDATE, so omitted fields are never populated from the DB.

3. **No input validation**: There is no check that required fields are present before executing the UPDATE, allowing partial payloads to reach the database unchanged.

### Bug 2

1. **HTML id does not match JS selector**: `public/index.html` declares `id="ai-btn"` while `public/js/ai.js` queries `id="ai-fab"`. The mismatch means `getElementById` always returns `null`.

2. **Silent early return on null**: `initDraggableAIButton()` checks `if (!btn) return;` and exits silently, so the failure is invisible in the UI — the button renders but is completely inert.

---

## Correctness Properties

Property 1: Bug Condition — Partial PUT Preserves Existing Task Fields

_For any_ PUT request where the bug condition holds (isBugCondition_TaskTick returns true — i.e. one or more task fields are absent from the request body), the fixed `putTask'` handler SHALL leave every omitted field at its previously stored value, updating only the fields explicitly provided in the request body.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Full PUT Behavior Unchanged

_For any_ PUT request where the bug condition does NOT hold (all task fields are present in the request body), the fixed `putTask'` handler SHALL produce exactly the same database outcome as the original `putTask` handler, preserving all existing update, gamification, streak, and authorization behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 3: Bug Condition — AI Button Listeners Attached After Fix

_For any_ document where the bug condition holds (isBugCondition_AIButton returns true — i.e. `getElementById('ai-fab')` returns null and `getElementById('ai-btn')` is non-null), the fixed `initDraggableAIButton'` SHALL successfully locate the button element and attach mousedown and touchstart event listeners so that clicking or tapping the button toggles the Athena AI panel.

**Validates: Requirements 2.3, 2.4**

Property 4: Preservation — AI Button Non-Bug Behavior Unchanged

_For any_ document where the bug condition does NOT hold (the button element is found correctly), the fixed `initDraggableAIButton'` SHALL produce exactly the same behavior as the original function, preserving drag-and-snap, panel toggle, and DOM-ready initialization.

**Validates: Requirements 3.5, 3.6, 3.7**

---

## Fix Implementation

### Bug 1 — COALESCE in SQL UPDATE

**File**: `routes/student.js`

**Function**: `router.put("/tasks/:id", ...)`

**Specific Changes:**

1. **Use COALESCE for every non-key field**: Rewrite the UPDATE statement so each field uses `COALESCE(?, existing_value)` — pass the request body value as the first argument; if it is `null`/`undefined`, SQLite falls back to the current column value.

   ```sql
   UPDATE tasks
   SET title    = COALESCE(?, title),
       subject  = COALESCE(?, subject),
       due_date = COALESCE(?, due_date),
       due_time = COALESCE(?, due_time),
       priority = COALESCE(?, priority),
       notes    = COALESCE(?, notes),
       completed = ?
   WHERE id = ? AND student_id = ?
   ```

2. **Pass `undefined`-safe values**: In the `.run()` call, pass each destructured field (which may be `undefined`) as the first COALESCE argument. SQLite treats JS `undefined` as `null`, so COALESCE will fall back to the stored value automatically.

3. **Keep `completed` outside COALESCE**: `completed` is always explicitly set (the caller always sends it), so it does not need a fallback.

4. **No change to gamification, streak, or notification logic**: Those blocks are correct and must remain untouched.

### Bug 2 — Rename HTML id to Match JS

**File**: `public/index.html`

**Element**: `<div id="ai-btn" class="ai-fab" draggable="false">`

**Specific Changes:**

1. **Rename `id="ai-btn"` to `id="ai-fab"`**: This makes the element id match the selector used in `initDraggableAIButton()`. No changes to `public/js/ai.js` are required.

   ```html
   <!-- Before -->
   <div id="ai-btn" class="ai-fab" draggable="false">

   <!-- After -->
   <div id="ai-fab" class="ai-fab" draggable="false">
   ```

2. **No other HTML or JS changes needed**: The class `ai-fab` (used for CSS styling) is separate from the id and is unaffected.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on the unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis.

**Bug 1 — Test Plan**: Send a partial PUT request `{ completed: 1 }` to the unfixed handler and inspect the resulting DB row. Expect to observe null values for all omitted fields.

**Bug 1 — Test Cases:**
1. **Partial body (completed only)**: Send `{ completed: 1 }` → assert title/subject/due_date/due_time/priority/notes are null in DB (will fail on unfixed code — demonstrates the bug).
2. **Partial body (completed + notes)**: Send `{ completed: 1, notes: "done" }` → assert title/subject/due_date/due_time/priority are null (will fail on unfixed code).
3. **Full body**: Send all fields → assert all fields updated correctly (should pass on both unfixed and fixed code — baseline).
4. **Un-complete task**: Send `{ completed: 0 }` → assert other fields are preserved (will fail on unfixed code).

**Bug 2 — Test Plan**: Call `initDraggableAIButton()` against a document where `id="ai-btn"` exists but `id="ai-fab"` does not. Assert that no listeners are attached (demonstrates the bug).

**Bug 2 — Test Cases:**
1. **id mismatch**: Document has `id="ai-btn"` → call `initDraggableAIButton()` → assert button has no mousedown listener (will fail/demonstrate bug on unfixed code).
2. **id correct**: Document has `id="ai-fab"` → call `initDraggableAIButton'()` → assert mousedown and touchstart listeners are attached (will pass on fixed code).
3. **Click toggle**: After fix, simulate click → assert AI panel loses `hidden` class.
4. **Drag then snap**: After fix, simulate drag → assert button position updates and snap fires.

**Expected Counterexamples:**
- Bug 1: DB row shows `title = null`, `subject = null`, etc. after a partial PUT.
- Bug 2: `btn.hasEventListener('mousedown')` is false / panel never opens on click.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**

```
// Bug 1
FOR ALL request WHERE isBugCondition_TaskTick(request) DO
  result := putTask'(request)
  ASSERT task.title    = original_task.title
  ASSERT task.subject  = original_task.subject
  ASSERT task.due_date = original_task.due_date
  ASSERT task.due_time = original_task.due_time
  ASSERT task.priority = original_task.priority
  ASSERT task.notes    = original_task.notes
  ASSERT task.completed = request.body.completed
END FOR

// Bug 2
FOR ALL doc WHERE isBugCondition_AIButton(doc) DO
  initDraggableAIButton'(doc)
  ASSERT resolvedElement ≠ null
  ASSERT resolvedElement.hasEventListener('mousedown') = true
  ASSERT resolvedElement.hasEventListener('touchstart') = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**

```
// Bug 1
FOR ALL request WHERE NOT isBugCondition_TaskTick(request) DO
  ASSERT putTask(request) = putTask'(request)
END FOR

// Bug 2
FOR ALL doc WHERE NOT isBugCondition_AIButton(doc) DO
  ASSERT initDraggableAIButton(doc) = initDraggableAIButton'(doc)
END FOR
```

**Testing Approach**: Property-based testing is recommended for Bug 1 preservation checking because:
- It generates many random combinations of task field subsets automatically.
- It catches edge cases (e.g. empty string vs null, zero vs undefined) that manual tests miss.
- It provides strong guarantees that COALESCE does not accidentally alter full-body updates.

**Bug 1 Preservation Test Cases:**
1. **Full update preservation**: Generate random full task objects → verify fixed handler produces identical DB state to original.
2. **Gamification preservation**: Send `{ completed: 1, ...allFields }` → verify points +10, reward_minutes +30, notification inserted.
3. **Streak preservation**: Send completion request → verify `recordStudyActivity` is called and streak updates.
4. **Authorization preservation**: Send request with mismatched student_id → verify 404 returned.

**Bug 2 Preservation Test Cases:**
1. **Panel message preservation**: After fix, open panel, send message → verify Athena responds.
2. **Drag-and-snap preservation**: After fix, simulate drag → verify snap-to-edge fires correctly.
3. **DOM-ready preservation**: Verify `initDraggableAIButton'` still defers to `DOMContentLoaded` when `document.readyState === 'loading'`.

### Unit Tests

- Test `PUT /api/student/tasks/:id` with only `{ completed: 1 }` — verify no field is nulled.
- Test `PUT /api/student/tasks/:id` with all fields — verify all fields updated.
- Test `PUT /api/student/tasks/:id` with a subset of fields — verify only provided fields change.
- Test that `initDraggableAIButton()` attaches listeners when `id="ai-fab"` exists.
- Test that `initDraggableAIButton()` exits cleanly when the element is absent.
- Test that clicking the button (after fix) calls `toggleAI()`.

### Property-Based Tests

- Generate random subsets of task fields and verify COALESCE preserves all omitted fields across many combinations.
- Generate random full task payloads and verify the fixed handler produces the same outcome as the original for non-buggy inputs.
- Generate random drag positions and verify snap-to-edge always places the button within viewport bounds.

### Integration Tests

- Full student flow: create task → tick complete → reload task list → verify task title/subject/due_date intact and `completed = 1`.
- Full AI flow: load page → click AI button → verify panel opens → send message → verify response appears.
- Gamification flow: tick task complete → verify points, reward_minutes, and notification in DB.
