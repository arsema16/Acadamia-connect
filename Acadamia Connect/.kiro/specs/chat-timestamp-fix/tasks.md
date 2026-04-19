# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - UTC-Naive Timestamp Parsed as Local Time
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a UTC-naive string equal to the current UTC time, asserted to return `"just now"`
  - Bug Condition from design: `isBugCondition(X)` returns true when `X` is a string that does NOT end with `'Z'`, does NOT contain `'+'`, and DOES contain a space separator (i.e., SQLite `CURRENT_TIMESTAMP` format `"YYYY-MM-DD HH:MM:SS"`)
  - Test cases to write (in a test file, e.g., `tests/chat-timestamp.test.js`):
    - Construct a UTC-naive string equal to the current UTC time (e.g., `new Date().toISOString().replace('T',' ').slice(0,19)`) and call `timeAgo(utcNaiveNow)` — assert result is `"just now"`
    - Construct a UTC-naive string 3 hours behind `Date.now()` and assert `timeAgo` returns `"just now"` (simulates UTC+3 user seeing a message just sent) — will return `"3h ago"` on unfixed code
    - Render a `renderMessageBubble` with `created_at` = current UTC-naive string and assert the displayed `msg-time` matches the current local HH:MM
    - Property sweep: for a range of UTC-naive strings where `isBugCondition(X)` is true, assert `timeAgo(X) === timeAgo(X + 'Z')`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `timeAgo("2024-01-15 10:30:00")` returns `"3h ago"` instead of `"just now"` in UTC+3)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Timezone-Aware Timestamps Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Non-bug condition from design: `isBugCondition(X)` returns false when `X` already ends with `'Z'`, contains `'+'`, or is otherwise timezone-aware
  - Observe on UNFIXED code:
    - `timeAgo("2024-01-15T10:30:00Z")` → record actual result (e.g., `"Xd ago"`)
    - `timeAgo("2024-01-15T10:30:00+03:00")` → record actual result
    - `timeAgo` with a Z-suffixed string 30 minutes in the past → observe `"30m ago"`
    - `timeAgo` with a Z-suffixed string 2 hours in the past → observe `"2h ago"`
    - `timeAgo(null)` → observe no throw, returns `"NaNm ago"` or similar (guard behavior)
  - Write property-based tests capturing observed behavior:
    - For all timezone-aware strings (ending in `Z` or containing `+`), assert `timeAgo_fixed(X) === timeAgo_original(X)`
    - For all valid inputs, assert `formatTime(X)` output is unchanged after the fix
    - For notification timestamps using `timeAgo(n.created_at)` where `created_at` is already UTC-aware, assert results are identical before and after fix
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix UTC-naive timestamp parsing in timeAgo and renderMessageBubble

  - [ ] 3.1 Implement the fix in `timeAgo` (`public/js/api.js`)
    - Locate the `timeAgo(d)` function
    - Before `new Date(d)`, add normalization: `const normalized = (typeof d === 'string' && !d.endsWith('Z') && !d.includes('+') && d.includes(' ')) ? d + 'Z' : d;`
    - Replace `new Date(d)` with `new Date(normalized)`
    - _Bug_Condition: `isBugCondition(X)` — X is a string, does not end with 'Z', does not contain '+', contains a space (SQLite CURRENT_TIMESTAMP format)_
    - _Expected_Behavior: `timeAgo(X)` returns the same result as `timeAgo(X + 'Z')` for all X where `isBugCondition(X)` is true; a message just sent returns `"just now"`_
    - _Preservation: For all X where `isBugCondition(X)` is false (already timezone-aware), `timeAgo(X)` result is unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.3, 3.5_

  - [ ] 3.2 Implement the fix in `renderMessageBubble` (`public/js/chat.js`)
    - Locate the `renderMessageBubble(msg, isMine)` function
    - Before `new Date(msg.created_at)`, add the same normalization: `const tsNormalized = (typeof msg.created_at === 'string' && !msg.created_at.endsWith('Z') && !msg.created_at.includes('+') && msg.created_at.includes(' ')) ? msg.created_at + 'Z' : msg.created_at;`
    - Replace `new Date(msg.created_at)` with `new Date(tsNormalized)`
    - _Bug_Condition: same `isBugCondition` applied to `msg.created_at`_
    - _Expected_Behavior: displayed HH:MM wall-clock time is correctly offset from UTC in the user's local timezone_
    - _Preservation: Messages with already-timezone-aware `created_at` strings display the same HH:MM as before_
    - _Requirements: 2.3, 3.2_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - UTC-Naive Timestamp Parsed as UTC
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the fix correctly interprets UTC-naive strings as UTC
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Timezone-Aware Timestamps Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix (no regressions introduced)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm all tests pass
  - Verify both the bug condition exploration test (task 1) and preservation tests (task 2) pass on the fixed code
  - Ask the user if any questions arise
