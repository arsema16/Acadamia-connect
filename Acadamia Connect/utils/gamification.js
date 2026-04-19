/**
 * Gamification Engine for Academia Connect V2
 * Handles XP, coins, badges, levels, leaderboards, and game progression.
 */

// XP thresholds per level
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4500, 6000];

// Badge definitions
const BADGES = {
  MATH_MASTER: { name: 'Math Master', type: 'achievement', description: '10 consecutive correct math answers' },
  QUIZ_CHAMPION: { name: 'Quiz Champion', type: 'achievement', description: 'Win 5 quizzes' },
  STREAK_3: { name: '3-Day Streak', type: 'streak', description: 'Login 3 days in a row' },
  STREAK_7: { name: 'Week Warrior', type: 'streak', description: 'Login 7 days in a row' },
  STREAK_14: { name: 'Fortnight Scholar', type: 'streak', description: 'Login 14 days in a row' },
  STREAK_30: { name: '30-Day Scholar', type: 'streak', description: 'Login 30 days in a row' },
  FIVE_DAY_STREAK: { name: '5-Day Streak', type: 'streak', description: 'Study 5 days in a row' },
  FIRST_GAME: { name: 'Game On!', type: 'milestone', description: 'Complete your first game' },
  LEVEL_5: { name: 'Rising Star', type: 'level', description: 'Reach Level 5' },
  LEVEL_10: { name: 'Academic Champion', type: 'level', description: 'Reach Level 10' }
};

// Game difficulty levels
const GAME_LEVELS = {
  easy: { minScore: 0, maxScore: 60, xpMultiplier: 1, coinsMultiplier: 1 },
  medium: { minScore: 61, maxScore: 80, xpMultiplier: 1.5, coinsMultiplier: 1.5 },
  hard: { minScore: 81, maxScore: 100, xpMultiplier: 2, coinsMultiplier: 2 }
};

/**
 * Calculate level from XP
 */
function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/**
 * Get XP needed for next level
 */
function getXPForNextLevel(currentLevel) {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[currentLevel] || null;
}

/**
 * Get progress percentage to next level
 */
function getLevelProgress(xp) {
  const level = getLevelFromXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1];
  if (nextThreshold === currentThreshold) return 100;
  return Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
}

/**
 * Award XP and coins to a student after a game
 */
function awardGameRewards(db, studentId, schoolId, gameType, score, maxScore, level = 'easy') {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const levelConfig = GAME_LEVELS[level] || GAME_LEVELS.easy;
  
  const baseXP = Math.round(percentage * 0.5); // 0-50 XP based on score
  const baseCoins = Math.round(percentage * 0.2); // 0-20 coins based on score
  
  const xpEarned = Math.round(baseXP * levelConfig.xpMultiplier);
  const coinsEarned = Math.round(baseCoins * levelConfig.coinsMultiplier);
  const pointsEarned = Math.round(percentage * 0.3);
  
  // Update student stats
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(studentId, schoolId);
  if (!student) return null;
  
  const newXP = (student.xp_points || 0) + xpEarned;
  const newCoins = (student.coins || 0) + coinsEarned;
  const newPoints = (student.points || 0) + pointsEarned;
  const newLevel = getLevelFromXP(newXP);
  
  db.prepare("UPDATE students SET xp_points=?, coins=?, points=?, level=? WHERE id=? AND school_id=?").run(
    newXP, newCoins, newPoints, newLevel, studentId, schoolId
  );
  
  // Record game session
  db.prepare("INSERT INTO game_sessions (student_id,game_type,score,xp_earned,coins_earned,level,school_id) VALUES (?,?,?,?,?,?,?)").run(
    studentId, gameType, score, xpEarned, coinsEarned, level, schoolId
  );
  
  // Check for badges
  const badgesAwarded = checkAndAwardBadges(db, studentId, schoolId, { gameType, score, maxScore, newXP, newLevel });
  
  return { xpEarned, coinsEarned, pointsEarned, newXP, newLevel, newCoins, badgesAwarded };
}

/**
 * Check and award badges based on achievements
 */
function checkAndAwardBadges(db, studentId, schoolId, context = {}) {
  const awarded = [];
  
  const awardBadge = (badge) => {
    const existing = db.prepare("SELECT id FROM badges WHERE student_id=? AND badge_name=?").get(studentId, badge.name);
    if (!existing) {
      db.prepare("INSERT INTO badges (student_id,badge_type,badge_name,school_id) VALUES (?,?,?,?)").run(
        studentId, badge.type, badge.name, schoolId
      );
      db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
        studentId, "student", "Badge Earned!", `You earned the "${badge.name}" badge!`, "badge", schoolId
      );
      awarded.push(badge.name);
    }
  };
  
  // Level badges
  if (context.newLevel >= 5) awardBadge(BADGES.LEVEL_5);
  if (context.newLevel >= 10) awardBadge(BADGES.LEVEL_10);
  
  // First game badge
  const gameCount = db.prepare("SELECT COUNT(*) as c FROM game_sessions WHERE student_id=?").get(studentId).c;
  if (gameCount === 1) awardBadge(BADGES.FIRST_GAME);
  
  // Quiz champion (5 quiz wins)
  if (context.gameType === 'quiz') {
    const quizWins = db.prepare("SELECT COUNT(*) as c FROM quiz_attempts WHERE student_id=? AND score >= total * 0.7").get(studentId).c;
    if (quizWins >= 5) awardBadge(BADGES.QUIZ_CHAMPION);
  }
  
  return awarded;
}

/**
 * Award daily login streak bonus
 */
function awardLoginStreakBonus(db, studentId, schoolId, streak) {
  const bonuses = { 3: 20, 7: 50, 14: 100, 30: 250 };
  const bonus = bonuses[streak];
  if (!bonus) return null;
  
  const badge = streak === 3 ? BADGES.STREAK_3 : streak === 7 ? BADGES.STREAK_7 : 
                streak === 14 ? BADGES.STREAK_14 : BADGES.STREAK_30;
  
  db.prepare("UPDATE students SET xp_points=xp_points+?, coins=coins+? WHERE id=? AND school_id=?").run(
    bonus, Math.round(bonus / 5), studentId, schoolId
  );
  
  checkAndAwardBadges(db, studentId, schoolId, {});
  
  const existing = db.prepare("SELECT id FROM badges WHERE student_id=? AND badge_name=?").get(studentId, badge.name);
  if (!existing) {
    db.prepare("INSERT INTO badges (student_id,badge_type,badge_name,school_id) VALUES (?,?,?,?)").run(
      studentId, badge.type, badge.name, schoolId
    );
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
      studentId, "student", "Streak Bonus!", `${streak}-day streak! You earned ${bonus} XP bonus!`, "streak_bonus", schoolId
    );
  }
  
  return { xpBonus: bonus, coinsBonus: Math.round(bonus / 5), badge: badge.name };
}

/**
 * Get leaderboard (class or school) with weekly reset support
 */
function getLeaderboard(db, schoolId, type = 'school', grade = null) {
  // Weekly leaderboard uses xp earned this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  let query, params;
  
  if (type === 'class' && grade) {
    query = `SELECT s.id, SUBSTR(s.full_name, 1, INSTR(s.full_name||' ',' ')-1) as name, 
      s.grade, s.avatar, s.xp_points, s.coins, s.level,
      COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
      FROM students s
      LEFT JOIN game_sessions gs ON gs.student_id=s.id AND gs.completed_at >= ?
      WHERE s.school_id=? AND s.grade=?
      GROUP BY s.id ORDER BY weekly_xp DESC, s.xp_points DESC LIMIT 20`;
    params = [weekStartStr, schoolId, grade];
  } else {
    query = `SELECT s.id, SUBSTR(s.full_name, 1, INSTR(s.full_name||' ',' ')-1) as name, 
      s.grade, s.avatar, s.xp_points, s.coins, s.level,
      COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
      FROM students s
      LEFT JOIN game_sessions gs ON gs.student_id=s.id AND gs.completed_at >= ?
      WHERE s.school_id=?
      GROUP BY s.id ORDER BY weekly_xp DESC, s.xp_points DESC LIMIT 20`;
    params = [weekStartStr, schoolId];
  }
  
  return db.prepare(query).all(...params);
}

module.exports = {
  getLevelFromXP,
  getXPForNextLevel,
  getLevelProgress,
  awardGameRewards,
  checkAndAwardBadges,
  awardLoginStreakBonus,
  getLeaderboard,
  BADGES,
  GAME_LEVELS,
  LEVEL_THRESHOLDS
};
