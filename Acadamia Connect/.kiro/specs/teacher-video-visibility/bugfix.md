# Bugfix Requirements Document

## Introduction

Teacher-uploaded videos are permanently invisible to students. When a teacher uploads a video, it is inserted into the database with `approved=0` and `moderation_status='pending'`. All student, parent, and common video endpoints filter with `WHERE approved=1`, so unapproved videos are never returned. The admin dashboard counts pending videos but no API endpoints exist to list, approve, or reject them — meaning videos are stuck in a pending state indefinitely and students never see them.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a teacher uploads a video THEN the system inserts it with `approved=0` and `moderation_status='pending'`

1.2 WHEN a student requests the video feed THEN the system returns zero teacher-uploaded videos because the query filters `WHERE approved=1`

1.3 WHEN an admin navigates to the Videos section THEN the system calls `GET /api/admin/videos` which does not exist, returning a 404 error

1.4 WHEN an admin attempts to approve a video THEN the system calls `PUT /api/admin/video/:id/approve` which does not exist, so no approval can be performed

1.5 WHEN an admin attempts to reject/delete a video THEN the system calls `DELETE /api/admin/video/:id` which does not exist, so no rejection can be performed

1.6 WHEN the admin dashboard loads THEN the system counts pending videos (`SELECT COUNT(*) FROM videos WHERE approved=0`) but provides no mechanism to act on them

### Expected Behavior (Correct)

2.1 WHEN a teacher uploads a video THEN the system SHALL insert it with `approved=0` and notify admins for review (existing behavior preserved)

2.2 WHEN an admin calls `GET /api/admin/videos/pending` THEN the system SHALL return all videos with `approved=0` for the school, including uploader name and metadata

2.3 WHEN an admin calls `GET /api/admin/videos` THEN the system SHALL return all videos for the school (both approved and pending) with uploader name and metadata

2.4 WHEN an admin calls `POST /api/admin/videos/:id/approve` THEN the system SHALL set `approved=1` and `moderation_status='approved'` for that video and return success

2.5 WHEN an admin calls `POST /api/admin/videos/:id/reject` THEN the system SHALL delete the video record (and optionally the file) and return success

2.6 WHEN a student requests the video feed THEN the system SHALL return all videos where `approved=1`, making approved teacher videos visible

2.7 WHEN an admin views the Videos tab in the admin portal THEN the system SHALL display pending videos with Approve and Reject action buttons

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student requests videos THEN the system SHALL CONTINUE TO filter by `approved=1`, ensuring unapproved content is never shown to students

3.2 WHEN a teacher views their own uploaded videos THEN the system SHALL CONTINUE TO return all their videos regardless of approval status

3.3 WHEN a teacher deletes their own video THEN the system SHALL CONTINUE TO allow deletion via `DELETE /api/teacher/videos/:id`

3.4 WHEN the content moderator auto-rejects a video THEN the system SHALL CONTINUE TO block the upload before it is inserted into the database

3.5 WHEN an admin loads the dashboard THEN the system SHALL CONTINUE TO display the count of pending videos in the stats

3.6 WHEN an admin manages other resources (payments, announcements, users, events) THEN the system SHALL CONTINUE TO function without any change

---

## Bug Condition

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type VideoApprovalRequest
  OUTPUT: boolean

  // Bug is triggered when a teacher video exists with approved=0
  // AND no admin API endpoint exists to approve it
  RETURN X.video.approved = 0
    AND NOT EXISTS(route GET /api/admin/videos/pending)
    AND NOT EXISTS(route POST /api/admin/videos/:id/approve)
    AND NOT EXISTS(route POST /api/admin/videos/:id/reject)
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← adminApproveVideo'(X.video.id)
  ASSERT result.success = true
    AND video.approved = 1
    AND studentVideoFeed CONTAINS video
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT studentVideoFeed(X) = studentVideoFeed'(X)
    AND teacherOwnVideos(X) = teacherOwnVideos'(X)
END FOR
```
