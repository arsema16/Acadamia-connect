const express = require("express");
const router = express.Router();
const { db } = require("../db/database");
const multer = require("multer");
const path = require("path");
const { requireAuthWithSchool } = require("../middleware/auth");
const { validateUserAccess, addSchoolIdToInsert } = require("../middleware/schoolIsolation");
const { recordStudyActivity } = require("../utils/streakCalculator");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/files/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Use enhanced auth middleware with school isolation
const auth = requireAuthWithSchool("student");

router.get("/dashboard", auth, (req, res) => {
  // Ensure all queries are filtered by school_id for complete isolation
  const student = db.prepare("SELECT * FROM students WHERE id = ? AND school_id = ?").get(req.userId, req.schoolId);
  const tasks = db.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY due_date ASC LIMIT 5").all(req.userId);
  const assessments = db.prepare("SELECT * FROM assessments WHERE student_id = ? ORDER BY created_at DESC LIMIT 5").all(req.userId);
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND user_role = 'student' ORDER BY created_at DESC LIMIT 10").all(req.userId);
  const announcements = db.prepare("SELECT a.*, s.name as school_name FROM announcements a JOIN schools s ON a.school_id = s.id WHERE a.school_id = ? ORDER BY a.created_at DESC LIMIT 5").all(req.schoolId);
  const badges = db.prepare("SELECT * FROM badges WHERE student_id = ?").all(req.userId);
  
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }
  
  const { password: _, ...safeStudent } = student;
  res.json({ success: true, student: safeStudent, tasks, assessments, notifications, announcements, badges });
});

router.get("/tasks", auth, (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks WHERE student_id = ? ORDER BY due_date ASC").all(req.userId);
  res.json({ success: true, tasks });
});

router.post("/tasks", auth, (req, res) => {
  const { title, subject, due_date, due_time, priority, notes, recurring } = req.body;
  if (!title) return res.json({ success: false, message: "Title required" });
  
  // Add school_id to ensure isolation
  const taskData = addSchoolIdToInsert({
    student_id: req.userId,
    title,
    subject: subject || "",
    due_date: due_date || "",
    due_time: due_time || "",
    priority: priority || "Medium",
    notes: notes || "",
    recurring: recurring || "none"
  }, req.schoolId);
  
  const r = db.prepare("INSERT INTO tasks (student_id,title,subject,due_date,due_time,priority,notes,recurring,school_id) VALUES (?,?,?,?,?,?,?,?,?)").run(
    taskData.student_id, taskData.title, taskData.subject, taskData.due_date, 
    taskData.due_time, taskData.priority, taskData.notes, taskData.recurring, taskData.school_id
  );
  
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type) VALUES (?,?,?,?,?)").run(
    req.userId, "student", "Task Added", "New task: " + title, "task"
  );
  
  res.json({ success: true, taskId: r.lastInsertRowid });
});

router.put("/tasks/:id", auth, (req, res) => {
  const { title, subject, due_date, due_time, priority, notes, completed } = req.body;
  
  // Ensure task belongs to the authenticated student and school
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND student_id = ?").get(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  
  db.prepare("UPDATE tasks SET title=?,subject=?,due_date=?,due_time=?,priority=?,notes=?,completed=? WHERE id=? AND student_id=?").run(
    title, subject, due_date, due_time, priority, notes, completed ? 1 : 0, req.params.id, req.userId
  );
  
  if (completed) {
    const student = db.prepare("SELECT * FROM students WHERE id = ? AND school_id = ?").get(req.userId, req.schoolId);
    const newPoints = (student.points || 0) + 10;
    const newRewardMins = (student.reward_minutes || 0) + 30;
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    db.prepare("UPDATE students SET points=?, reward_minutes=?, reward_expires=? WHERE id=? AND school_id=?").run(
      newPoints, newRewardMins, expires, req.userId, req.schoolId
    );
    
    // Update streak using the streak calculator
    const currentDate = new Date().toISOString().split('T')[0];
    const streakResult = recordStudyActivity(db, req.userId, req.schoolId, 'task_completion');
    
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
      req.userId, "student", "Task Completed!", 
      `You earned 10 points and 30 min reward time! Streak: ${streakResult.newStreak} day(s)`, 
      "reward", req.schoolId
    );
  }
  
  res.json({ success: true });
});

router.delete("/tasks/:id", auth, (req, res) => {
  // Ensure task belongs to the authenticated student
  const result = db.prepare("DELETE FROM tasks WHERE id=? AND student_id=?").run(req.params.id, req.userId);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  
  res.json({ success: true });
});

router.get("/results", auth, (req, res) => {
  const results = db.prepare(`SELECT a.*, t.full_name as teacher_name 
    FROM assessments a 
    JOIN teachers t ON a.teacher_id = t.id 
    WHERE a.student_id = ? 
    ORDER BY a.created_at DESC`).all(req.userId);
  
  // Group by subject and calculate averages
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.subject]) grouped[r.subject] = { assessments: [], avg: 0 };
    grouped[r.subject].assessments.push(r);
  });
  Object.keys(grouped).forEach(subject => {
    const items = grouped[subject].assessments;
    const total = items.reduce((sum, a) => sum + (a.percentage || 0), 0);
    grouped[subject].avg = items.length > 0 ? Math.round(total / items.length) : 0;
  });
  
  res.json({ success: true, results, subjectAverages: grouped });
});

router.get("/attendance", auth, (req, res) => {
  const records = db.prepare("SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC").all(req.userId);
  res.json({ success: true, records });
});

// Materials - only for assigned subjects
router.get("/materials", auth, (req, res) => {
  const assignedSubjects = db.prepare(`
    SELECT s.name FROM student_subjects ss
    JOIN subjects s ON ss.subject_id = s.id
    WHERE ss.student_id = ? AND ss.school_id = ?
  `).all(req.userId, req.schoolId).map(s => s.name);
  
  if (assignedSubjects.length === 0) {
    return res.json({ success: true, materials: [], message: "No subjects assigned yet" });
  }
  
  const placeholders = assignedSubjects.map(() => '?').join(',');
  const materials = db.prepare(`
    SELECT * FROM materials 
    WHERE school_id = ? AND subject IN (${placeholders})
    ORDER BY created_at DESC
  `).all(req.schoolId, ...assignedSubjects);
  
  res.json({ success: true, materials });
});

router.get("/notes", auth, (req, res) => {
  const { subject } = req.query;
  let notes;
  if (subject) {
    notes = db.prepare("SELECT * FROM notes WHERE student_id = ? AND subject = ? ORDER BY updated_at DESC").all(req.userId, subject);
  } else {
    notes = db.prepare("SELECT * FROM notes WHERE student_id = ? ORDER BY updated_at DESC").all(req.userId);
  }
  res.json({ success: true, notes });
});

router.post("/notes", auth, (req, res) => {
  const { subject, title, content } = req.body;
  if (!title) return res.status(400).json({ success: false, message: "Title required" });
  const r = db.prepare("INSERT INTO notes (student_id,subject,title,content,school_id) VALUES (?,?,?,?,?)").run(
    req.userId, subject || "General", title || "Untitled", content || "", req.schoolId
  );
  const note = db.prepare("SELECT * FROM notes WHERE id=?").get(r.lastInsertRowid);
  res.json({ success: true, note });
});

router.put("/notes/:id", auth, (req, res) => {
  const { title, content, subject } = req.body;
  const note = db.prepare("SELECT id FROM notes WHERE id=? AND student_id=?").get(req.params.id, req.userId);
  if (!note) return res.status(404).json({ success: false, message: "Note not found" });
  db.prepare("UPDATE notes SET title=?,content=?,subject=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND student_id=?").run(
    title, content, subject, req.params.id, req.userId
  );
  res.json({ success: true });
});

router.delete("/notes/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM notes WHERE id=? AND student_id=?").run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Note not found" });
  res.json({ success: true });
});

router.get("/messages", auth, (req, res) => {
  const { with_id, with_role } = req.query;
  const msgs = db.prepare("SELECT m.*, CASE WHEN m.sender_role='teacher' THEN t.full_name WHEN m.sender_role='student' THEN s.full_name ELSE 'Unknown' END as sender_name FROM messages m LEFT JOIN teachers t ON m.sender_id=t.id AND m.sender_role='teacher' LEFT JOIN students s ON m.sender_id=s.id AND m.sender_role='student' WHERE ((m.sender_id=? AND m.sender_role='student' AND m.receiver_id=? AND m.receiver_role=?) OR (m.sender_id=? AND m.sender_role=? AND m.receiver_id=? AND m.receiver_role='student')) AND m.school_id=? ORDER BY m.created_at ASC").all(req.userId,with_id,with_role,with_id,with_role,req.userId,req.schoolId);
  db.prepare("UPDATE messages SET read_status=1 WHERE receiver_id=? AND receiver_role='student' AND sender_id=? AND school_id=?").run(req.userId, with_id, req.schoolId);
  res.json({ success: true, messages: msgs });
});

router.post("/messages", auth, (req, res) => {
  const { receiver_id, receiver_role, content } = req.body;
  const r = db.prepare("INSERT INTO messages (sender_id,sender_role,receiver_id,receiver_role,content,school_id) VALUES (?,?,?,?,?,?)").run(req.userId,"student",receiver_id,receiver_role,content,req.schoolId);
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(receiver_id,receiver_role,"New Message","Message from student","message",req.schoolId);
  res.json({ success: true, messageId: r.lastInsertRowid });
});

router.get("/teachers", auth, (req, res) => {
  const teachers = db.prepare("SELECT id, full_name, subjects, bio FROM teachers WHERE school_id = ?").all(req.schoolId);
  res.json({ success: true, teachers });
});

router.get("/videos", auth, (req, res) => {
  const { motivational } = req.query;
  let query = "SELECT v.*, t.full_name as uploader_name FROM videos v LEFT JOIN teachers t ON v.uploader_id=t.id AND v.uploader_role='teacher' WHERE v.school_id=? AND v.approved=1";
  const params = [req.schoolId];
  if (motivational === '1') { query += " AND v.is_motivational=1"; }
  else if (motivational === '0') { query += " AND v.is_motivational=0"; }
  query += " ORDER BY v.created_at DESC";
  const videos = db.prepare(query).all(...params);
  res.json({ success: true, videos });
});

router.get("/quizzes", auth, (req, res) => {
  const quizzes = db.prepare("SELECT q.*, t.full_name as teacher_name FROM quizzes q JOIN teachers t ON q.teacher_id=t.id WHERE q.school_id=? ORDER BY q.created_at DESC").all(req.schoolId);
  res.json({ success: true, quizzes });
});

router.post("/quiz-attempt", auth, (req, res) => {
  const { quiz_id, answers, score, total } = req.body;
  const existing = db.prepare("SELECT id FROM quiz_attempts WHERE quiz_id=? AND student_id=?").get(quiz_id, req.userId);
  if (existing) return res.json({ success: false, message: "Already attempted" });
  db.prepare("INSERT INTO quiz_attempts (quiz_id,student_id,score,total,answers) VALUES (?,?,?,?,?)").run(quiz_id,req.userId,score,total,JSON.stringify(answers));
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(quiz_id);
  const pts = Math.round((score/total)*50);
  const rewardMins = quiz ? quiz.reward_minutes : 30;
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  const expires = new Date(Date.now() + rewardMins*60*1000).toISOString();
  db.prepare("UPDATE students SET points=?, reward_minutes=?, reward_expires=? WHERE id=? AND school_id=?").run((student.points||0)+pts, (student.reward_minutes||0)+rewardMins, expires, req.userId, req.schoolId);
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(req.userId,"student","Quiz Completed!","Score: "+score+"/"+total+". Earned "+pts+" points!","quiz",req.schoolId);
  res.json({ success: true, points_earned: pts, reward_minutes: rewardMins });
});

// Gamification endpoints
router.get("/leaderboard", auth, (req, res) => {
  const { type, grade } = req.query;
  const { getLeaderboard } = require('../utils/gamification');
  const board = getLeaderboard(db, req.schoolId, type || 'school', grade);
  const myRank = board.findIndex(s => s.id === req.userId) + 1;
  res.json({ success: true, leaderboard: board, myRank });
});

router.get("/xp-status", auth, (req, res) => {
  const { getLevelFromXP, getLevelProgress, getXPForNextLevel } = require('../utils/gamification');
  const student = db.prepare("SELECT xp_points, coins, level, points FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const level = getLevelFromXP(student.xp_points || 0);
  const progress = getLevelProgress(student.xp_points || 0);
  const xpForNext = getXPForNextLevel(level);
  
  res.json({ 
    success: true, 
    xp: student.xp_points || 0,
    coins: student.coins || 0,
    points: student.points || 0,
    level,
    progress,
    xpForNext
  });
});

router.post("/game-complete", auth, (req, res) => {
  const { gameType, score, maxScore, level, subject } = req.body;
  const { awardGameRewards } = require('../utils/gamification');
  
  const result = awardGameRewards(db, req.userId, req.schoolId, gameType, score || 0, maxScore || 100, level || 'easy');
  if (!result) return res.status(404).json({ success: false, message: "Student not found" });
  
  res.json({ success: true, ...result });
});

// Coin spending
router.post("/spend-coins", auth, (req, res) => {
  const { amount, purpose } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });
  
  const student = db.prepare("SELECT coins FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!student || student.coins < amount) {
    return res.status(400).json({ success: false, message: "Not enough coins" });
  }
  
  db.prepare("UPDATE students SET coins=coins-? WHERE id=? AND school_id=?").run(amount, req.userId, req.schoolId);
  res.json({ success: true, remainingCoins: student.coins - amount });
});

// Multiplayer game invite
router.post("/game-invite", auth, (req, res) => {
  const { toStudentId, gameType } = req.body;
  
  // Verify target student is in same school
  const target = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(toStudentId, req.schoolId);
  if (!target) return res.status(404).json({ success: false, message: "Student not found in your school" });
  
  const r = db.prepare("INSERT INTO multiplayer_sessions (game_type,player1_id,player2_id,school_id,status) VALUES (?,?,?,?,'pending')").run(
    gameType, req.userId, toStudentId, req.schoolId
  );
  
  // Notify via chat-style notification
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
    toStudentId, "student", "Game Invite!", 
    `A classmate challenged you to a ${gameType} game!`, "game_invite", req.schoolId
  );
  
  // Emit via Socket.IO
  const io = req.app.get("io");
  if (io) {
    io.to(`${toStudentId}_student`).emit("game_invite", { sessionId: r.lastInsertRowid, gameType, fromId: req.userId });
  }
  
  res.json({ success: true, sessionId: r.lastInsertRowid });
});

router.get("/challenge-progress", auth, (req, res) => {
  const progress = db.prepare("SELECT * FROM challenge_progress WHERE student_id=?").all(req.userId);
  res.json({ success: true, progress });
});

router.post("/challenge-progress", auth, (req, res) => {
  const { interest, lesson_id, xp_earned } = req.body;
  let prog = db.prepare("SELECT * FROM challenge_progress WHERE student_id=? AND interest=?").get(req.userId, interest);
  if (!prog) {
    db.prepare("INSERT INTO challenge_progress (student_id,interest,level,xp,completed_lessons,school_id) VALUES (?,?,1,0,'[]',?)").run(req.userId, interest, req.schoolId);
    prog = db.prepare("SELECT * FROM challenge_progress WHERE student_id=? AND interest=?").get(req.userId, interest);
  }
  const lessons = JSON.parse(prog.completed_lessons||"[]");
  if (!lessons.includes(lesson_id)) lessons.push(lesson_id);
  const newXp = (prog.xp||0) + (xp_earned||10);
  const newLevel = Math.floor(newXp/100) + 1;
  db.prepare("UPDATE challenge_progress SET completed_lessons=?,xp=?,level=? WHERE id=?").run(JSON.stringify(lessons),newXp,newLevel,prog.id);
  db.prepare("UPDATE students SET points=points+? WHERE id=? AND school_id=?").run(xp_earned||10, req.userId, req.schoolId);
  res.json({ success: true, xp: newXp, level: newLevel });
});

router.get("/analytics", auth, (req, res) => {
  const sessions = db.prepare("SELECT subject, SUM(duration) as total, date FROM study_sessions WHERE student_id=? GROUP BY subject, date ORDER BY date DESC LIMIT 30").all(req.userId);
  const results = db.prepare("SELECT subject, AVG(percentage) as avg_score FROM assessments WHERE student_id=? GROUP BY subject").all(req.userId);
  const student = db.prepare("SELECT points, streak, reward_minutes, reward_expires, last_study_date FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  
  // Weekly task stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weeklyTasks = db.prepare("SELECT date(created_at) as day, SUM(completed) as completed, COUNT(*) as total FROM tasks WHERE student_id=? AND created_at >= ? GROUP BY day ORDER BY day").all(req.userId, weekStartStr);
  
  res.json({ success: true, sessions, results, student, weeklyTasks });
});

router.get("/portfolio", auth, (req, res) => {
  const items = db.prepare("SELECT * FROM portfolios WHERE student_id=? ORDER BY created_at DESC").all(req.userId);
  res.json({ success: true, portfolio: items });
});

router.post("/portfolio", auth, upload.single("file"), (req, res) => {
  const { title, description, type } = req.body;
  if (!title) return res.status(400).json({ success: false, message: "Title required" });
  const file_url = req.file ? "/uploads/files/" + req.file.filename : req.body.link || "";
  db.prepare("INSERT INTO portfolios (student_id,title,description,file_url,type,school_id) VALUES (?,?,?,?,?,?)").run(req.userId,title,description||"",file_url,type||"project",req.schoolId);
  res.json({ success: true });
});

router.delete("/portfolio/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM portfolios WHERE id=? AND student_id=?").run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Portfolio item not found" });
  res.json({ success: true });
});

router.post("/kudos", auth, (req, res) => {
  const { to_student_id, message } = req.body;
  // Ensure both students are in the same school
  const toStudent = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(to_student_id, req.schoolId);
  if (!toStudent) return res.status(404).json({ success: false, message: "Student not found in your school" });
  
  db.prepare("INSERT INTO kudos (from_student_id,to_student_id,message,school_id) VALUES (?,?,?,?)").run(req.userId, to_student_id, message||"", req.schoolId);
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(to_student_id,"student","Kudos Received!","A classmate gave you a shout-out!","kudos",req.schoolId);
  res.json({ success: true });
});

router.get("/reward-status", auth, (req, res) => {
  const student = db.prepare("SELECT reward_minutes, reward_expires, points FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  const now = new Date();
  const expires = student.reward_expires ? new Date(student.reward_expires) : null;
  const active = expires && expires > now;
  const minutesLeft = active ? Math.round((expires - now) / 60000) : 0;
  res.json({ success: true, active, minutesLeft, points: student.points });
});

// Rewards marketplace
router.get("/rewards", auth, (req, res) => {
  const student = db.prepare("SELECT points FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  const history = db.prepare("SELECT * FROM reward_redemptions WHERE student_id=? ORDER BY redeemed_at DESC LIMIT 20").all(req.userId);
  
  const marketplace = [
    { id: 1, type: 'game_time', name: '30-Min Game Unlock', description: 'Unlock 30 minutes of game time', points: 100, icon: '🎮' },
    { id: 2, type: 'movie_time', name: '30-Min Movie Unlock', description: 'Unlock 30 minutes of movie time', points: 150, icon: '🎬' },
    { id: 3, type: 'avatar', name: 'Star Avatar', description: 'Unlock the Star avatar', points: 200, icon: '⭐' },
    { id: 4, type: 'avatar', name: 'Crown Avatar', description: 'Unlock the Crown avatar', points: 300, icon: '👑' },
    { id: 5, type: 'badge', name: 'Scholar Badge', description: 'Earn the Scholar badge', points: 250, icon: '🎓' },
    { id: 6, type: 'badge', name: 'Champion Badge', description: 'Earn the Champion badge', points: 500, icon: '🏆' }
  ];
  
  res.json({ success: true, rewards: marketplace, points: student.points, history });
});

router.post("/redeem-reward", auth, (req, res) => {
  const { rewardType, rewardName, pointsCost } = req.body;
  
  if (!rewardType || !rewardName || !pointsCost) {
    return res.status(400).json({ success: false, message: "rewardType, rewardName, and pointsCost are required" });
  }
  
  const student = db.prepare("SELECT points FROM students WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  if (student.points < pointsCost) {
    return res.status(400).json({ success: false, message: "Not enough points" });
  }
  
  // Deduct points
  db.prepare("UPDATE students SET points=points-? WHERE id=? AND school_id=?").run(pointsCost, req.userId, req.schoolId);
  
  // Record redemption
  db.prepare("INSERT INTO reward_redemptions (student_id,reward_type,reward_name,points_cost) VALUES (?,?,?,?)").run(req.userId, rewardType, rewardName, pointsCost);
  
  // Activate reward
  if (rewardType === 'game_time' || rewardType === 'movie_time') {
    const duration = 30;
    const expires = new Date(Date.now() + duration * 60 * 1000).toISOString();
    db.prepare("UPDATE students SET reward_minutes=?, reward_expires=? WHERE id=? AND school_id=?").run(duration, expires, req.userId, req.schoolId);
  } else if (rewardType === 'avatar') {
    db.prepare("UPDATE students SET avatar=? WHERE id=? AND school_id=?").run(rewardName.toLowerCase().replace(/\s+/g, '_'), req.userId, req.schoolId);
  } else if (rewardType === 'badge') {
    db.prepare("INSERT INTO badges (student_id,badge_type,badge_name,school_id) VALUES (?,?,?,?)").run(req.userId, 'reward', rewardName, req.schoolId);
  }
  
  const remainingPoints = student.points - pointsCost;
  res.json({ success: true, remainingPoints });
});

router.get("/announcements", auth, (req, res) => {
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, announcements });
});

router.get("/events", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

router.get("/classmates", auth, (req, res) => {
  // Privacy: only show limited info
  const classmates = db.prepare("SELECT id, full_name, grade, section, avatar, points FROM students WHERE school_id=? AND id!=? ORDER BY full_name").all(req.schoolId, req.userId);
  res.json({ success: true, classmates });
});

// Profile update
router.put("/profile", auth, (req, res) => {
  const { nickname, avatar, theme, language, interests } = req.body;
  db.prepare("UPDATE students SET nickname=COALESCE(?,nickname), avatar=COALESCE(?,avatar), theme=COALESCE(?,theme), language=COALESCE(?,language), interests=COALESCE(?,interests) WHERE id=? AND school_id=?").run(
    nickname || null, avatar || null, theme || null, language || null,
    interests ? JSON.stringify(interests) : null,
    req.userId, req.schoolId
  );
  const student = db.prepare("SELECT * FROM students WHERE id=?").get(req.userId);
  const { password: _, ...safeStudent } = student;
  res.json({ success: true, student: safeStudent });
});

// Movies section
router.get("/movies", auth, (req, res) => {
  const movies = db.prepare("SELECT * FROM movies WHERE school_id=? AND approved=1 ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, movies });
});

// Learning paths (Duolingo-style challenges)
router.get("/learning-paths", auth, (req, res) => {
  const student = db.prepare("SELECT interests FROM students WHERE id=?").get(req.userId);
  const interests = (() => { try { return JSON.parse(student?.interests || '[]'); } catch { return []; } })();
  
  let paths;
  if (interests.length > 0) {
    const placeholders = interests.map(() => '?').join(',');
    paths = db.prepare(`SELECT * FROM learning_paths WHERE interest IN (${placeholders}) OR school_id IS NULL ORDER BY level`).all(...interests);
  } else {
    paths = db.prepare("SELECT * FROM learning_paths WHERE school_id IS NULL ORDER BY level LIMIT 10").all();
  }
  
  // Add progress for each path
  const pathsWithProgress = paths.map(p => {
    const totalLessons = db.prepare("SELECT COUNT(*) as c FROM lessons WHERE path_id=?").get(p.id).c;
    const completedLessons = db.prepare("SELECT COUNT(*) as c FROM lesson_progress WHERE student_id=? AND path_id=? AND completed=1").get(req.userId, p.id).c;
    return { ...p, totalLessons, completedLessons, progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0 };
  });
  
  res.json({ success: true, paths: pathsWithProgress });
});

router.get("/learning-paths/:pathId/lessons", auth, (req, res) => {
  const lessons = db.prepare("SELECT l.*, lp.completed FROM lessons l LEFT JOIN lesson_progress lp ON l.id=lp.lesson_id AND lp.student_id=? WHERE l.path_id=? ORDER BY l.order_num").all(req.userId, req.params.pathId);
  res.json({ success: true, lessons });
});

router.post("/lesson-complete", auth, (req, res) => {
  const { lessonId, pathId } = req.body;
  
  const lesson = db.prepare("SELECT * FROM lessons WHERE id=? AND path_id=?").get(lessonId, pathId);
  if (!lesson) return res.status(404).json({ success: false, message: "Lesson not found" });
  
  // Mark lesson as complete
  db.prepare("INSERT OR REPLACE INTO lesson_progress (student_id,lesson_id,path_id,completed,completed_at) VALUES (?,?,?,1,CURRENT_TIMESTAMP)").run(req.userId, lessonId, pathId);
  
  // Award XP
  const { awardGameRewards } = require('../utils/gamification');
  db.prepare("UPDATE students SET xp_points=xp_points+? WHERE id=? AND school_id=?").run(lesson.xp_reward || 10, req.userId, req.schoolId);
  
  res.json({ success: true, xpEarned: lesson.xp_reward || 10 });
});

// Certificates
router.get("/certificates", auth, (req, res) => {
  const certs = db.prepare("SELECT c.*, t.full_name as issuer_name FROM certificates c JOIN teachers t ON c.issued_by=t.id WHERE c.student_id=? AND c.school_id=? ORDER BY c.issued_at DESC").all(req.userId, req.schoolId);
  res.json({ success: true, certificates: certs });
});

module.exports = router;
