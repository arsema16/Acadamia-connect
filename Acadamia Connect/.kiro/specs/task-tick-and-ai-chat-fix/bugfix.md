# Bugfix Requirements Document

## Introduction

Two bugs affect the student-facing interface. First, ticking a task as complete corrupts the task record because the backend PUT handler overwrites all task fields with whatever is sent in the request body — when only `{ completed: 1 }` is sent, every other column (title, subject, due_date, etc.) is set to null. Second, the Athena AI floating action button is completely non-functional because the JavaScript initialisation function looks up the element by the wrong id (`ai-fab` instead of `ai-btn`), so no click or touch listeners are ever attached.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Task completion tick corrupts task data**

1.1 WHEN a student ticks a task as complete and the frontend sends `PUT /api/student/tasks/:id` with only `{ completed: 1 }`, THEN the system overwrites all other task columns (title, subject, due_date, due_time, priority, notes) with `null` or `undefined`, corrupting the task record.

1.2 WHEN the corrupted UPDATE query runs, THEN the system persists null values for every field not included in the partial request body, permanently destroying the task's original data.

**Bug 2 — AI chat button does nothing**

1.3 WHEN `initDraggableAIButton()` executes in `public/js/ai.js`, THEN the system calls `document.getElementById('ai-fab')` which returns `null` because the element's actual id in `public/index.html` is `ai-btn`.

1.4 WHEN the element lookup returns `null`, THEN the system attaches no mouse or touch event listeners to the button, so clicking or tapping the AI button does nothing and the Athena panel never opens.

---

### Expected Behavior (Correct)

**Bug 1 — Task completion tick**

2.1 WHEN a student sends `PUT /api/student/tasks/:id` with only `{ completed: 1 }`, THEN the system SHALL preserve all existing task field values (title, subject, due_date, due_time, priority, notes) for any field not included in the request body.

2.2 WHEN the UPDATE query runs for a partial payload, THEN the system SHALL use each provided field value if present, or fall back to the existing stored value (e.g. via COALESCE), so no column is ever set to null unintentionally.

**Bug 2 — AI chat button**

2.3 WHEN `initDraggableAIButton()` executes, THEN the system SHALL successfully locate the AI floating action button element (whether by correcting the id lookup to `ai-btn` or by renaming the HTML id to `ai-fab`).

2.4 WHEN the element is found, THEN the system SHALL attach mouse and touch event listeners so that clicking or tapping the button toggles the Athena AI panel open and closed.

---

### Unchanged Behavior (Regression Prevention)

**Bug 1 — Task completion tick**

3.1 WHEN a student sends a full task update (all fields provided), THEN the system SHALL CONTINUE TO update all supplied fields correctly.

3.2 WHEN a task is marked complete, THEN the system SHALL CONTINUE TO award 10 points and 30 reward minutes to the student and fire the completion notification.

3.3 WHEN a task is marked complete, THEN the system SHALL CONTINUE TO update the student's streak via `recordStudyActivity`.

3.4 WHEN a task update request is made for a task that does not belong to the authenticated student, THEN the system SHALL CONTINUE TO return a 404 error.

**Bug 2 — AI chat button**

3.5 WHEN the AI panel is open, THEN the system SHALL CONTINUE TO allow the user to send messages and receive responses from Athena.

3.6 WHEN the AI button is dragged, THEN the system SHALL CONTINUE TO support drag-and-snap-to-edge behaviour.

3.7 WHEN the page loads, THEN the system SHALL CONTINUE TO initialise the draggable button correctly once the DOM is ready.

---

## Bug Condition Pseudocode

### Bug 1 — Task Completion Tick

```pascal
FUNCTION isBugCondition_TaskTick(request)
  INPUT: request of type PutTaskRequest
  OUTPUT: boolean

  // Bug triggers when the request body omits one or more task fields
  RETURN request.body does NOT contain all of {title, subject, due_date, due_time, priority, notes}
END FUNCTION

// Property: Fix Checking
FOR ALL request WHERE isBugCondition_TaskTick(request) DO
  result ← putTask'(request)
  ASSERT task.title = original_task.title
  ASSERT task.subject = original_task.subject
  ASSERT task.due_date = original_task.due_date
  ASSERT task.due_time = original_task.due_time
  ASSERT task.priority = original_task.priority
  ASSERT task.notes = original_task.notes
  ASSERT task.completed = request.body.completed
END FOR

// Property: Preservation Checking
FOR ALL request WHERE NOT isBugCondition_TaskTick(request) DO
  ASSERT putTask(request) = putTask'(request)
END FOR
```

### Bug 2 — AI Button ID Mismatch

```pascal
FUNCTION isBugCondition_AIButton(doc)
  INPUT: doc of type HTMLDocument
  OUTPUT: boolean

  // Bug triggers when the id used in JS does not match the id in HTML
  RETURN doc.getElementById('ai-fab') = null
    AND doc.getElementById('ai-btn') ≠ null
END FUNCTION

// Property: Fix Checking
FOR ALL doc WHERE isBugCondition_AIButton(doc) DO
  initDraggableAIButton'(doc)
  btn ← resolvedElement
  ASSERT btn ≠ null
  ASSERT btn.hasEventListener('mousedown') = true
  ASSERT btn.hasEventListener('touchstart') = true
END FOR

// Property: Preservation Checking
FOR ALL doc WHERE NOT isBugCondition_AIButton(doc) DO
  ASSERT initDraggableAIButton(doc) = initDraggableAIButton'(doc)
END FOR
```
