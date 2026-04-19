# Bugfix Requirements Document

## Introduction

Parents using the dashboard cannot see their children in the child selection section. The root cause is a fragile email-based lookup: the `parents.children` field stores an array of student email addresses as JSON, and the dashboard route performs a case-sensitive, whitespace-sensitive exact match against the `students` table. Any mismatch — wrong casing, extra whitespace, a typo at registration, or a student not yet registered — silently drops the child from the result, leaving the parent with an empty children list and no feedback. Additionally, there is no mechanism for a parent to correct or add children's emails after registration.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a parent's stored child email differs from the student's registered email only by letter casing (e.g., `"Student@School.com"` vs `"student@school.com"`) THEN the system returns no matching student and the child does not appear in the dashboard

1.2 WHEN a parent's stored child email contains leading or trailing whitespace (e.g., `" student@school.com"`) THEN the system returns no matching student and the child does not appear in the dashboard

1.3 WHEN a parent's stored child email does not match any registered student in the same school (e.g., student not yet registered, or email entered incorrectly at registration) THEN the system silently filters out the null result and the parent sees an empty children list with no explanation

1.4 WHEN a parent has no children linked or all lookups fail THEN the system displays an empty child selector with no error message or guidance on how to resolve the issue

1.5 WHEN a parent needs to correct or add a child's email after registration THEN the system provides no API endpoint or UI to do so

### Expected Behavior (Correct)

2.1 WHEN a parent's stored child email differs from the student's registered email only by letter casing THEN the system SHALL perform a case-insensitive comparison (using `LOWER()` on both sides in SQL) and return the matching student

2.2 WHEN a parent's stored child email contains leading or trailing whitespace THEN the system SHALL trim the email before performing the lookup and return the matching student if one exists

2.3 WHEN a parent's stored child email does not match any registered student in the same school after normalization THEN the system SHALL include a structured indicator in the API response (e.g., `unlinked_emails` array) so the frontend can inform the parent which emails failed to resolve

2.4 WHEN a parent has no successfully linked children THEN the system SHALL display a clear message in the UI explaining that no children were found and prompting the parent to link a child via their email address

2.5 WHEN a parent submits a `POST /api/parent/link-child` request with a valid student email belonging to the same school THEN the system SHALL add that email (normalized: lowercased and trimmed) to the parent's `children` array and return the updated child record

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a parent's stored child emails already exactly match registered student emails in the same school THEN the system SHALL CONTINUE TO return those students correctly in the dashboard response

3.2 WHEN a parent accesses `GET /api/parent/child/:student_id` for a legitimately linked child THEN the system SHALL CONTINUE TO enforce the existing authorization check and return the child's full detail data

3.3 WHEN a parent accesses `GET /api/parent/child/:student_id` for a student not in their children list THEN the system SHALL CONTINUE TO return a 403 Access Denied response

3.4 WHEN a parent's `children` field is an empty JSON array `[]` THEN the system SHALL CONTINUE TO return an empty children array without error

3.5 WHEN the school isolation middleware is active THEN the system SHALL CONTINUE TO prevent any parent from linking or viewing students belonging to a different school

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies emails that trigger the lookup failure:

```pascal
FUNCTION isBugCondition(storedEmail, studentEmail)
  INPUT: storedEmail as string (from parents.children JSON array)
         studentEmail as string (from students.email column)
  OUTPUT: boolean

  normalizedStored  ← TRIM(LOWER(storedEmail))
  normalizedStudent ← TRIM(LOWER(studentEmail))

  // Bug fires when the raw stored email would fail an exact match
  // but a normalized comparison would succeed
  RETURN (storedEmail ≠ studentEmail) AND (normalizedStored = normalizedStudent)
END FUNCTION
```

**Property: Fix Checking**

```pascal
// For all emails where the bug condition holds, the fixed lookup must find the student
FOR ALL (storedEmail, school_id) WHERE isBugCondition(storedEmail, students.email) DO
  result ← lookupStudent'(TRIM(LOWER(storedEmail)), school_id)
  ASSERT result ≠ null
END FOR
```

**Property: Preservation Checking**

```pascal
// For emails that already matched exactly, behavior must be unchanged
FOR ALL (storedEmail, school_id) WHERE NOT isBugCondition(storedEmail, students.email) DO
  ASSERT lookupStudent(storedEmail, school_id) = lookupStudent'(storedEmail, school_id)
END FOR
```
