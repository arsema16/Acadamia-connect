# Bugfix Requirements Document

## Introduction

Chat message timestamps display incorrect relative times. When a message is sent, the UI shows something like "3 hrs ago" instead of "just now". The root cause is a timezone mismatch: SQLite's `CURRENT_TIMESTAMP` stores time as a UTC string without a timezone indicator (e.g., `"2024-01-15 10:30:00"`), but the browser's `new Date(d)` parses such strings as local time. Since `Date.now()` is always UTC-based, the computed difference is inflated by the local timezone offset — matching the reported symptom of messages appearing hours old immediately after being sent.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a chat message is sent and its `created_at` value is a UTC datetime string without a timezone suffix (e.g., `"2024-01-15 10:30:00"`), THEN the system parses it as local time, producing a `Date` object that is offset from UTC by the user's timezone offset

1.2 WHEN `timeAgo(created_at)` is called with a UTC-naive timestamp string, THEN the system returns an incorrect relative time (e.g., "3h ago" instead of "just now") because `Date.now()` is UTC-based while `new Date(d)` treats the string as local time

1.3 WHEN a message is received via Socket.IO in real time and rendered with `renderMessageBubble`, THEN the system displays the wrong time in the `msg-time` span because the same `new Date(msg.created_at)` parsing is used

### Expected Behavior (Correct)

2.1 WHEN a chat message's `created_at` value is a UTC datetime string without a timezone suffix, THEN the system SHALL interpret it as UTC (e.g., by appending `"Z"` before parsing) so that the resulting `Date` object correctly represents the UTC moment

2.2 WHEN `timeAgo(created_at)` is called with a UTC-naive timestamp string, THEN the system SHALL return the correct relative time (e.g., "just now" for a message sent seconds ago) by computing the diff against a correctly parsed UTC date

2.3 WHEN a message is rendered in `renderMessageBubble` using `new Date(msg.created_at)`, THEN the system SHALL display the correct wall-clock time in the user's local timezone by first correctly parsing the UTC timestamp

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `timeAgo` is called with a timestamp string that already includes a timezone indicator (e.g., an ISO 8601 string ending in `"Z"` or `"+00:00"`), THEN the system SHALL CONTINUE TO compute and return the correct relative time without regression

3.2 WHEN messages are loaded from history via `GET /api/common/messages/:conversationId`, THEN the system SHALL CONTINUE TO display them in ascending chronological order with correct relative timestamps

3.3 WHEN `timeAgo` is called with a timestamp representing a message sent more than 1 hour ago, THEN the system SHALL CONTINUE TO return the correct hours-ago or days-ago string

3.4 WHEN `formatTime` is called with any valid timestamp, THEN the system SHALL CONTINUE TO return the correctly formatted HH:MM local time string

3.5 WHEN notifications use `timeAgo(n.created_at)` to display relative time, THEN the system SHALL CONTINUE TO show correct relative times after the fix is applied

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type string (datetime value from SQLite CURRENT_TIMESTAMP)
  OUTPUT: boolean

  // Returns true when the timestamp string lacks a timezone indicator
  RETURN NOT (X ends with 'Z' OR X contains '+' OR X contains 'T...+' OR X contains 'T...Z')
END FUNCTION
```

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← timeAgo'(X)   // timeAgo using fixed Date parsing
  ASSERT result = timeAgo(X + 'Z')  // equivalent to treating X as UTC
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT timeAgo(X) = timeAgo'(X)
END FOR
```
