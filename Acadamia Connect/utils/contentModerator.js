/**
 * Content Moderation Utility for Academia Connect V2
 * AI/rule-based filter for uploaded videos and content.
 * Uses keyword/pattern matching as a lightweight moderation layer.
 * In production, replace with a real AI moderation API (e.g., AWS Rekognition, Google Video Intelligence).
 */

// Inappropriate keywords/patterns to flag
const FLAGGED_KEYWORDS = [
  'violence', 'explicit', 'adult', 'nsfw', 'inappropriate',
  'hate', 'abuse', 'harassment', 'bullying', 'drugs', 'alcohol',
  'weapon', 'gore', 'pornography', 'sexual'
];

/**
 * Moderate video metadata (title, description) for inappropriate content
 * @param {Object} videoData - { title, description }
 * @returns {Object} - { approved: boolean, reason: string|null, confidence: number }
 */
function moderateVideoMetadata(videoData) {
  const text = `${videoData.title || ''} ${videoData.description || ''}`.toLowerCase();
  
  for (const keyword of FLAGGED_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        approved: false,
        reason: `Content flagged: contains potentially inappropriate term "${keyword}"`,
        confidence: 0.9
      };
    }
  }
  
  return {
    approved: true,
    reason: null,
    confidence: 0.95
  };
}

/**
 * Moderate a filename for suspicious patterns
 * @param {string} filename - Original filename
 * @returns {Object} - { approved: boolean, reason: string|null }
 */
function moderateFilename(filename) {
  const lower = filename.toLowerCase();
  
  // Check for suspicious file patterns
  for (const keyword of FLAGGED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        approved: false,
        reason: `Filename flagged: contains potentially inappropriate term`
      };
    }
  }
  
  return { approved: true, reason: null };
}

/**
 * Full video moderation check
 * @param {Object} videoData - { title, description, filename }
 * @returns {Object} - { approved: boolean, reason: string|null, requiresReview: boolean }
 */
function moderateVideo(videoData) {
  // Check metadata
  const metaResult = moderateVideoMetadata(videoData);
  if (!metaResult.approved) {
    return {
      approved: false,
      reason: metaResult.reason,
      requiresReview: false // Auto-rejected
    };
  }
  
  // Check filename if provided
  if (videoData.filename) {
    const fileResult = moderateFilename(videoData.filename);
    if (!fileResult.approved) {
      return {
        approved: false,
        reason: fileResult.reason,
        requiresReview: false
      };
    }
  }
  
  // All checks passed — still requires human approval
  return {
    approved: false, // Not auto-approved; requires teacher/admin review
    reason: null,
    requiresReview: true // Passed AI filter, awaiting human approval
  };
}

/**
 * Check if audio track is school-approved
 * @param {Object} db - Database instance
 * @param {number} schoolId - School ID
 * @param {string} audioTrack - Audio track identifier
 * @returns {boolean}
 */
function isAudioApproved(db, schoolId, audioTrack) {
  if (!audioTrack) return true; // No audio track = approved
  
  try {
    const approved = db.prepare(
      "SELECT id FROM approved_audio WHERE school_id = ? AND track_id = ?"
    ).get(schoolId, audioTrack);
    return !!approved;
  } catch (e) {
    return true; // If table doesn't exist yet, allow
  }
}

module.exports = {
  moderateVideo,
  moderateVideoMetadata,
  moderateFilename,
  isAudioApproved
};
