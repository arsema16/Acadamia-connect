# Chat Timestamp Fix Bugfix Design

## Overview

Chat message timestamps display incorrect relative times immediately after sending — e.g., "3h ago" instead of "just now". The root cause is a timezone mismatch: SQLite's `CURRENT_TIMESTAMP` stores UTC datetime strings without a timezone suffix (e.g., `"2024-01-15 10:30:00"`), but the browser's `new Date(d)` parses such strings as local time. Since `Date.now()` is always UTC-based, the computed diff is inflated by the user's local timezone offset.

The fix is minimal: before passing a UTC-naive timestamp string to `new Date()`, append `"Z"` to signal UTC. This affects two call sites in the frontend:
- `timeAgo(d)` in `public/js/api.js`
- `renderMessageBubble(msg)` in `public/js/chat.js`

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a timestamp string that lacks a timezone indicator (`Z`, `+HH:MM`, etc.), causing `new Date()` to misinterpret it as local time
- **Property (P)**: The desired behavior — timestamps are parsed as UTC, so relative time calculations and wall-clock displays are correct
- **Preservation**: Existing behaviors that must remain unchanged by the fix — correct handling of already-timezone-aware strings, message ordering, `formatTime`, notification timestamps
- **UTC-naive string**: A datetime string in the format `"YYYY-MM-DD HH:MM:SS"` with no timezone indicator, as produced by SQLite's `CURRENT_TIMESTAMP`
- **timeAgo(d)**: The function in `public/js/api.js` that computes a human-readable relative time string (e.g., "just now", "3m ago")
- **renderMessageBubble(msg)**: The function in `public/js/chat.js` that renders a single chat message bubble, including the wall-clock time display

## Bug Details

### Bug Condition

The bug manifests when a UTC-naive datetime string (produced by SQLite `CURRENT_TIMESTAMP`) is passed to `new Date()` in a browser. The browser treats the string as local time, producing a `Date` object that is offset from the true UTC moment by the user's timezone offset. When `timeAgo` then computes `Date.now() - new Date(d).getTime()`, the difference is inflated by that offset.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type string (datetime value from SQLite CURRENT_TIMESTAMP)
  OUTPUT: boolean

  // Returns true when the timestamp string lacks a timezone indicator
  RETURN NOT (
    X ends with 'Z'
    OR X contains '+' after the 'T' separator
    OR X contains '-' after position 10 (i.e., after the date portion)
  )
END FUNCTION
```

### Examples

- Input `"2024-01-15 10:30:00"` in UTC+3 timezone → `new Date("2024-01-15 10:30:00")` is parsed as 10:30 local = 07:30 UTC → `timeAgo` reports "3h ago" for a message just sent at 10:30 UTC
- Input `"2024-01-15 10:30:00"` in UTC-5 timezone → parsed as 10:30 local = 15:30 UTC → `timeAgo` reports a negative diff, potentially "just now" or a future time
- Input `"2024-01-15T10:30:00Z"` → already UTC-aware, parsed correctly → no bug
- Input `"2024-01-15T10:30:00+03:00"` → already timezone-aware, parsed correctly → no bug

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `timeAgo` called with a timestamp already ending in `"Z"` or containing a timezone offset must continue to return the correct relative time
- Messages loaded from history via `GET /api/common/messages/:conversationId` must continue to display in ascending chronological order with correct relative timestamps
- `timeAgo` called with a timestamp representing a message sent more than 1 hour ago must continue to return the correct hours-ago or days-ago string
- `formatTime` called with any valid timestamp must continue to return the correctly formatted HH:MM local time string
- Notification timestamps using `timeAgo(n.created_at)` must continue to show correct relative times

**Scope:**
All inputs that do NOT match the bug condition (i.e., timestamps that already carry timezone information) must be completely unaffected by this fix. This includes:
- ISO 8601 strings ending in `"Z"` (e.g., from other APIs)
- Strings with explicit UTC offset (e.g., `"+00:00"`, `"+03:00"`)
- `null` or `undefined` inputs (existing guard behavior must be preserved)

## Hypothesized Root Cause

Based on the bug description and code inspection, the root cause is:

1. **Missing UTC indicator on SQLite timestamps**: SQLite's `CURRENT_TIMESTAMP` produces strings like `"2024-01-15 10:30:00"` — no `T` separator, no `Z` suffix. The ECMAScript spec treats date-only strings as UTC but date-time strings without a timezone as local time, so `new Date("2024-01-15 10:30:00")` is local time in all major browsers.

2. **`timeAgo` does not normalize the input**: In `public/js/api.js`, `timeAgo` passes `d` directly to `new Date(d)` without checking for or appending a timezone indicator.

3. **`renderMessageBubble` does not normalize the input**: In `public/js/chat.js`, `new Date(msg.created_at)` is called directly to format the wall-clock time, with the same misparse risk.

4. **No server-side normalization**: The API returns `created_at` as-is from SQLite without appending `Z` or converting to ISO 8601 format, so the fix must be applied client-side.

## Correctness Properties

Property 1: Bug Condition - UTC-Naive Timestamps Parsed as UTC

_For any_ timestamp string `X` where `isBugCondition(X)` returns true (i.e., `X` is a UTC-naive datetime string without a timezone indicator), the fixed `timeAgo` function SHALL interpret `X` as UTC and return the correct relative time string — specifically, a message whose `created_at` equals the current UTC time SHALL return `"just now"`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Timezone-Aware Timestamps Unchanged

_For any_ timestamp string `X` where `isBugCondition(X)` returns false (i.e., `X` already carries a timezone indicator), the fixed `timeAgo` function SHALL produce exactly the same result as the original `timeAgo` function, preserving correct relative time computation for all already-correct inputs.

**Validates: Requirements 3.1, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct (UTC-naive strings misinterpreted as local time):

**File**: `public/js/api.js`

**Function**: `timeAgo(d)`

**Specific Changes**:
1. **Normalize UTC-naive strings**: Before calling `new Date(d)`, check whether `d` is a string lacking a timezone indicator. If so, append `"Z"` to force UTC interpretation.
   - Pattern to detect: string matches `YYYY-MM-DD HH:MM:SS` (space separator, no trailing `Z` or `+`)
   - Implementation: `const normalized = (typeof d === 'string' && !d.endsWith('Z') && !d.includes('+') && d.includes(' ')) ? d + 'Z' : d;`
   - Then use `new Date(normalized)` instead of `new Date(d)`

---

**File**: `public/js/chat.js`

**Function**: `renderMessageBubble(msg)`

**Specific Changes**:
1. **Normalize UTC-naive strings**: Apply the same normalization before calling `new Date(msg.created_at)` to format the wall-clock time.
   - Replace `new Date(msg.created_at)` with a normalized parse using the same pattern as above
   - This ensures the displayed HH:MM time is correct in the user's local timezone (correctly offset from UTC, not double-offset)

**Note**: `formatDate` and `formatTime` in `api.js` use `new Date(d)` as well, but they are not called with `created_at` values in the chat flow. They are included in the preservation requirements and should be verified but not changed unless evidence of misuse is found.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that call `timeAgo` with a UTC-naive string equal to the current UTC time and assert the result is `"just now"`. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Current UTC time, no suffix**: Call `timeAgo("2024-01-15 10:30:00")` where that string equals the current UTC time — expect `"just now"`, will fail on unfixed code in non-UTC timezones (will fail on unfixed code)
2. **UTC+3 offset simulation**: Construct a UTC-naive string that is 3 hours behind `Date.now()` and assert `timeAgo` returns `"just now"` — will fail on unfixed code, returning `"3h ago"` (will fail on unfixed code)
3. **renderMessageBubble time display**: Render a bubble with `created_at` = current UTC time and assert the displayed time matches the current local HH:MM — will fail on unfixed code in non-UTC timezones (will fail on unfixed code)
4. **Edge case — null input**: Call `timeAgo(null)` — should not throw; behavior should be preserved (may fail on unfixed code if NaN propagation differs)

**Expected Counterexamples**:
- `timeAgo` returns `"3h ago"` (or similar offset-sized value) for a message just sent
- Possible causes: UTC-naive string parsed as local time, inflating the diff by the timezone offset

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := timeAgo_fixed(X)
  ASSERT result = timeAgo(X + 'Z')   // appending Z is the correct UTC interpretation
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT timeAgo_original(X) = timeAgo_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code for timezone-aware strings, then write property-based tests capturing that behavior.

**Test Cases**:
1. **ISO 8601 Z-suffix preservation**: Verify `timeAgo("2024-01-15T10:30:00Z")` returns the same result before and after the fix
2. **Offset string preservation**: Verify `timeAgo("2024-01-15T10:30:00+03:00")` returns the same result before and after the fix
3. **Hours-ago string preservation**: Verify that a UTC-naive string 2 hours in the past returns `"2h ago"` after the fix (regression on the correct direction)
4. **formatTime preservation**: Verify `formatTime` output is unchanged for all valid inputs after the fix

### Unit Tests

- Test `timeAgo` with a UTC-naive string equal to current UTC time → expect `"just now"`
- Test `timeAgo` with a UTC-naive string 30 minutes in the past → expect `"30m ago"`
- Test `timeAgo` with an already-Z-suffixed string → expect same result as before fix
- Test `renderMessageBubble` time display with a UTC-naive `created_at` → expect correct local HH:MM
- Test edge cases: `null`, `undefined`, empty string inputs

### Property-Based Tests

- Generate random UTC-naive datetime strings and verify `timeAgo_fixed(X) === timeAgo(X + 'Z')` for all of them (Property 1)
- Generate random timezone-aware datetime strings and verify `timeAgo_fixed(X) === timeAgo_original(X)` for all of them (Property 2)
- Generate random offsets and verify the relative time bucket (just now / Xm ago / Xh ago / Xd ago) is correct after fix

### Integration Tests

- Send a chat message and verify the displayed timestamp shows `"just now"` immediately
- Load chat history and verify all message timestamps display correct relative times
- Verify notification timestamps are unaffected after the fix is applied
- Test in a non-UTC timezone environment to confirm the fix resolves the offset inflation
