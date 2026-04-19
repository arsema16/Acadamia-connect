/**
 * Streak Calculation Utility for Academia Connect V2
 * Implements proper streak logic with consecutive day validation
 */

/**
 * Calculates streak update based on last study date and current date
 * @param {string|null} lastStudyDate - ISO date string of last study activity
 * @param {string} currentDate - ISO date string of current date
 * @returns {Object} - {streak: number|'increment'|null, shouldUpdate: boolean}
 */
function calculateStreakUpdate(lastStudyDate, currentDate) {
  if (!lastStudyDate) {
    return { streak: 1, shouldUpdate: true };
  }
  
  const last = new Date(lastStudyDate);
  const current = new Date(currentDate);
  
  // Reset time to midnight for date comparison
  last.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((current - last) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day, no update needed
    return { streak: null, shouldUpdate: false };
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    return { streak: 'increment', shouldUpdate: true };
  } else {
    // Gap > 1 day, reset streak to 1
    return { streak: 1, shouldUpdate: true };
  }
}

/**
 * Updates student streak in database and awards badges if thresholds are reached
 * @param {Object} db - Database instance
 * @param {number} studentId - Student ID
 * @param {number} schoolId - School ID for isolation
 * @param {string} currentDate - Current date in YYYY-MM-DD format
 * @returns {Object} - {newStreak: number, badgesAwarded: string[]}
 */
function updateStudentStreak(db, studentId, schoolId, currentDate) {
  try {
    // Get current student data
    const student = db.prepare("SELECT last_study_date, streak FROM students WHERE id = ? AND school_id = ?").get(studentId, schoolId);
    
    if (!student) {
      throw new Error("Student not found");
    }
    
    const streakUpdate = calculateStreakUpdate(student.last_study_date, currentDate);
    
    if (!streakUpdate.shouldUpdate) {
      return { newStreak: student.streak, badgesAwarded: [] };
    }
    
    let newStreak;
    if (streakUpdate.streak === 'increment') {
      newStreak = (student.streak || 0) + 1;
    } else {
      newStreak = streakUpdate.streak;
    }
    
    // Update student record
    db.prepare("UPDATE students SET streak = ?, last_study_date = ? WHERE id = ? AND school_id = ?").run(
      newStreak, currentDate, studentId, schoolId
    );
    
    // Check for badge awards
    const badgesAwarded = [];
    
    if (newStreak === 5) {
      // Award 5-day streak badge
      const existingBadge = db.prepare("SELECT id FROM badges WHERE student_id = ? AND badge_name = 'Five Day Streak'").get(studentId);
      if (!existingBadge) {
        db.prepare("INSERT INTO badges (student_id, badge_type, badge_name, school_id) VALUES (?, 'streak', 'Five Day Streak', ?)").run(studentId, schoolId);
        badgesAwarded.push('Five Day Streak');
        
        // Create notification
        db.prepare("INSERT INTO notifications (user_id, user_role, title, body, type, school_id) VALUES (?, 'student', 'Badge Earned!', 'Congratulations! You earned the Five Day Streak badge!', 'badge', ?)").run(studentId, schoolId);
      }
    } else if (newStreak === 30) {
      // Award 30-day streak badge
      const existingBadge = db.prepare("SELECT id FROM badges WHERE student_id = ? AND badge_name = '30-Day Scholar'").get(studentId);
      if (!existingBadge) {
        db.prepare("INSERT INTO badges (student_id, badge_type, badge_name, school_id) VALUES (?, 'streak', '30-Day Scholar', ?)").run(studentId, schoolId);
        badgesAwarded.push('30-Day Scholar');
        
        // Create notification
        db.prepare("INSERT INTO notifications (user_id, user_role, title, body, type, school_id) VALUES (?, 'student', 'Badge Earned!', 'Amazing! You earned the 30-Day Scholar badge!', 'badge', ?)").run(studentId, schoolId);
      }
    }
    
    return { newStreak, badgesAwarded };
    
  } catch (error) {
    console.error("Error updating student streak:", error);
    throw error;
  }
}

/**
 * Records a study activity and updates streak
 * @param {Object} db - Database instance
 * @param {number} studentId - Student ID
 * @param {number} schoolId - School ID for isolation
 * @param {string} activityType - Type of activity ('task_completion', 'study_session', etc.)
 * @returns {Object} - {newStreak: number, badgesAwarded: string[]}
 */
function recordStudyActivity(db, studentId, schoolId, activityType = 'task_completion') {
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  return updateStudentStreak(db, studentId, schoolId, currentDate);
}

module.exports = {
  calculateStreakUpdate,
  updateStudentStreak,
  recordStudyActivity
};