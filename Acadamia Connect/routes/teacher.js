const express = require("express");
const router = express.Router();
const { db } = require("../db/database");
const multer = require("multer");
const path = require("path");
const { requireAuthWithSchool } = require("../middleware/auth");
const { addSchoolIdToInsert } = require("../middleware/schoolIsolation");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype.startsWith("video") ? "uploads/videos/" : "uploads/files/";
    cb(null, dest);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Use enhanced auth middleware with school isolation
const auth = requireAuthWithSchool("teacher");

router.get("/dashboard", auth, (req, res) => {
  const teacher = db.prepare("SELECT * FROM teachers WHERE id = ? AND school_id = ?").get(req.userId, req.schoolId);
  const students = db.prepare("SELECT id, full_name, grade, section, parent_name, parent_contact, email FROM students WHERE school_id = ? ORDER BY full_name").all(req.schoolId);
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND user_role = 'teacher' AND school_id = ? ORDER BY created_at DESC LIMIT 10").all(req.userId, req.schoolId);
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id = ? ORDER BY created_at DESC LIMIT 5").all(req.schoolId);
  
  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found" });
  }
  
  const { password: _, ...safeTeacher } = teacher;
  res.json({ success: true, teacher: safeTeacher, students, notifications, announcements });
});

// Subject Assignment Endpoints (New in V2)
router.post("/assign-subject", auth, (req, res) => {
  const { student_id, subject_id } = req.body;
  
  if (!student_id || !subject_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Student ID and Subject ID are required" 
    });
  }
  
  try {
    // Verify student belongs to the same school
    const student = db.prepare("SELECT id FROM students WHERE id = ? AND school_id = ?").get(student_id, req.schoolId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found in your school" 
      });
    }
    
    // Verify subject belongs to the same school
    const subject = db.prepare("SELECT id, name FROM subjects WHERE id = ? AND school_id = ?").get(subject_id, req.schoolId);
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: "Subject not found in your school" 
      });
    }
    
    // Check if assignment already exists
    const existing = db.prepare(`
      SELECT id FROM student_subjects 
      WHERE student_id = ? AND subject_id = ? AND school_id = ?
    `).get(student_id, subject_id, req.schoolId);
    
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: "Subject already assigned to this student" 
      });
    }
    
    // Create assignment
    const result = db.prepare(`
      INSERT INTO student_subjects (student_id, subject_id, teacher_id, school_id)
      VALUES (?, ?, ?, ?)
    `).run(student_id, subject_id, req.userId, req.schoolId);
    
    // Create notification for student
    db.prepare(`
      INSERT INTO notifications (user_id, user_role, title, body, type, school_id)
      VALUES (?, 'student', 'New Subject Assigned', ?, 'subject_assignment', ?)
    `).run(student_id, `Your teacher has assigned you to ${subject.name}`, req.schoolId);
    
    res.json({ 
      success: true, 
      message: "Subject assigned successfully",
      assignmentId: result.lastInsertRowid 
    });
    
  } catch (error) {
    console.error("Error assigning subject:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to assign subject" 
    });
  }
});

router.delete("/assign-subject", auth, (req, res) => {
  const { student_id, subject_id } = req.body;
  
  if (!student_id || !subject_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Student ID and Subject ID are required" 
    });
  }
  
  try {
    // Remove assignment (only if it was created by this teacher in this school)
    const result = db.prepare(`
      DELETE FROM student_subjects 
      WHERE student_id = ? AND subject_id = ? AND teacher_id = ? AND school_id = ?
    `).run(student_id, subject_id, req.userId, req.schoolId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Assignment not found or not authorized to remove" 
      });
    }
    
    // Get subject name for notification
    const subject = db.prepare("SELECT name FROM subjects WHERE id = ?").get(subject_id);
    
    // Create notification for student
    db.prepare(`
      INSERT INTO notifications (user_id, user_role, title, body, type, school_id)
      VALUES (?, 'student', 'Subject Removed', ?, 'subject_removal', ?)
    `).run(student_id, `You have been removed from ${subject ? subject.name : 'a subject'}`, req.schoolId);
    
    res.json({ 
      success: true, 
      message: "Subject assignment removed successfully" 
    });
    
  } catch (error) {
    console.error("Error removing subject assignment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to remove subject assignment" 
    });
  }
});

router.get("/student-subjects/:studentId", auth, (req, res) => {
  const { studentId } = req.params;
  
  try {
    // Verify student belongs to the same school
    const student = db.prepare("SELECT id FROM students WHERE id = ? AND school_id = ?").get(studentId, req.schoolId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found in your school" 
      });
    }
    
    // Get assigned subjects for the student
    const subjects = db.prepare(`
      SELECT s.id, s.name, ss.assigned_at, t.full_name as teacher_name
      FROM student_subjects ss
      JOIN subjects s ON ss.subject_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.student_id = ? AND ss.school_id = ?
      ORDER BY s.name
    `).all(studentId, req.schoolId);
    
    res.json({ 
      success: true, 
      subjects 
    });
    
  } catch (error) {
    console.error("Error fetching student subjects:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch student subjects" 
    });
  }
});

router.get("/students", auth, (req, res) => {
  const { q, grade, section } = req.query;
  let query = "SELECT id, full_name, grade, section, parent_name, parent_contact, email, avatar FROM students WHERE school_id = ?";
  const params = [req.schoolId];
  if (q) { query += " AND (full_name LIKE ? OR grade LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (grade) { query += " AND grade = ?"; params.push(grade); }
  if (section) { query += " AND section = ?"; params.push(section); }
  query += " ORDER BY full_name";
  const students = db.prepare(query).all(...params);
  res.json({ success: true, students });
});

router.post("/assessment", auth, (req, res) => {
  const { student_id, subject, assessment_type, date, max_marks, marks_obtained, comments, topics, send_to_parent } = req.body;
  if (!student_id || !subject || !assessment_type) return res.json({ success: false, message: "Required fields missing" });
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found in your school" });
  const pct = max_marks > 0 ? Math.round((marks_obtained / max_marks) * 100) : 0;
  const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F";
  const r = db.prepare("INSERT INTO assessments (student_id,teacher_id,subject,assessment_type,date,max_marks,marks_obtained,percentage,grade,comments,topics,school_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(
    student_id, req.userId, subject, assessment_type, date || new Date().toISOString().split("T")[0], max_marks, marks_obtained, pct, grade, comments || "", topics || "", req.schoolId
  );
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(student_id, "student", "New Result Posted", `Your ${subject} ${assessment_type} result is available`, "result", req.schoolId);
  if (send_to_parent) {
    const parent = db.prepare("SELECT id FROM parents WHERE children LIKE ? AND school_id=?").get(`%${student.email}%`, req.schoolId);
    if (parent) db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(parent.id, "parent", `New Result for ${student.full_name}`, `${subject} ${assessment_type}: ${marks_obtained}/${max_marks} (${grade})`, "result", req.schoolId);
  }
  res.json({ success: true, assessmentId: r.lastInsertRowid, grade, percentage: pct });
});

router.get("/assessments/:student_id", auth, (req, res) => {
  const student = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(req.params.student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  const results = db.prepare("SELECT * FROM assessments WHERE student_id=? AND teacher_id=? ORDER BY created_at DESC").all(req.params.student_id, req.userId);
  res.json({ success: true, results });
});

router.post("/attendance", auth, (req, res) => {
  const { records } = req.body;
  const insert = db.prepare("INSERT OR REPLACE INTO attendance (student_id,teacher_id,date,status,notes,school_id) VALUES (?,?,?,?,?,?)");
  const insertMany = db.transaction((recs) => recs.forEach(r => insert.run(r.student_id, req.userId, r.date, r.status, r.notes || "", req.schoolId)));
  insertMany(records);
  records.filter(r => r.status === "Absent").forEach(r => {
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(r.student_id, "student", "Attendance Marked", `You were marked Absent on ${r.date}`, "attendance", req.schoolId);
    const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(r.student_id, req.schoolId);
    if (student) {
      const parent = db.prepare("SELECT id FROM parents WHERE children LIKE ? AND school_id=?").get(`%${student.email}%`, req.schoolId);
      if (parent) db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(parent.id, "parent", "Absence Alert", `${student.full_name} was absent on ${r.date}`, "attendance", req.schoolId);
    }
  });
  res.json({ success: true });
});

router.get("/attendance", auth, (req, res) => {
  const { date, grade, section } = req.query;
  let query = "SELECT a.*, s.full_name, s.grade, s.section FROM attendance a JOIN students s ON a.student_id=s.id WHERE a.teacher_id=? AND a.school_id=?";
  const params = [req.userId, req.schoolId];
  if (date) { query += " AND a.date=?"; params.push(date); }
  query += " ORDER BY a.date DESC, s.full_name";
  const records = db.prepare(query).all(...params);
  res.json({ success: true, records });
});

router.get("/messages", auth, (req, res) => {
  const { with_id, with_role } = req.query;
  const msgs = db.prepare("SELECT m.*, CASE WHEN m.sender_role='teacher' THEN t.full_name WHEN m.sender_role='student' THEN s.full_name WHEN m.sender_role='parent' THEN p.full_name ELSE 'Unknown' END as sender_name FROM messages m LEFT JOIN teachers t ON m.sender_id=t.id AND m.sender_role='teacher' LEFT JOIN students s ON m.sender_id=s.id AND m.sender_role='student' LEFT JOIN parents p ON m.sender_id=p.id AND m.sender_role='parent' WHERE ((m.sender_id=? AND m.sender_role='teacher' AND m.receiver_id=? AND m.receiver_role=?) OR (m.sender_id=? AND m.sender_role=? AND m.receiver_id=? AND m.receiver_role='teacher')) AND m.school_id=? ORDER BY m.created_at ASC").all(req.userId, with_id, with_role, with_id, with_role, req.userId, req.schoolId);
  db.prepare("UPDATE messages SET read_status=1 WHERE receiver_id=? AND receiver_role='teacher' AND sender_id=? AND school_id=?").run(req.userId, with_id, req.schoolId);
  res.json({ success: true, messages: msgs });
});

router.post("/messages", auth, (req, res) => {
  const { receiver_id, receiver_role, content } = req.body;
  const r = db.prepare("INSERT INTO messages (sender_id,sender_role,receiver_id,receiver_role,content,school_id) VALUES (?,?,?,?,?,?)").run(req.userId, "teacher", receiver_id, receiver_role, content, req.schoolId);
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(receiver_id, receiver_role, "New Message from Teacher", "You have a new message", "message", req.schoolId);
  res.json({ success: true, messageId: r.lastInsertRowid });
});

// Materials upload
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/materials/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const materialUpload = multer({ storage: materialStorage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/materials", auth, (req, res) => {
  const materials = db.prepare("SELECT * FROM materials WHERE uploader_id=? AND uploader_role='teacher' AND school_id=? ORDER BY created_at DESC").all(req.userId, req.schoolId);
  res.json({ success: true, materials });
});

router.post("/materials", auth, materialUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  const { title, subject, description } = req.body;
  if (!title || !subject) return res.status(400).json({ success: false, message: "Title and subject required" });
  const fileType = req.file.mimetype.startsWith("image") ? "image" : req.file.originalname.endsWith(".pdf") ? "pdf" : req.file.originalname.match(/\.docx?$/) ? "doc" : "file";
  const r = db.prepare("INSERT INTO materials (title,subject,file_url,file_type,description,uploader_id,uploader_role,school_id) VALUES (?,?,?,?,?,?,?,?)").run(title, subject, "/uploads/materials/" + req.file.filename, fileType, description || "", req.userId, "teacher", req.schoolId);
  res.json({ success: true, materialId: r.lastInsertRowid, url: "/uploads/materials/" + req.file.filename });
});

router.delete("/materials/:id", auth, (req, res) => {
  const material = db.prepare("SELECT * FROM materials WHERE id=? AND uploader_id=? AND school_id=?").get(req.params.id, req.userId, req.schoolId);
  if (!material) return res.status(404).json({ success: false, message: "Material not found" });
  const fs = require('fs');
  const filePath = '.' + material.file_url;
  if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch(e) {} }
  db.prepare("DELETE FROM materials WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

router.post("/upload-video", auth, upload.single("video"), (req, res) => {
  if (!req.file) return res.json({ success: false, message: "No file uploaded" });
  const { title, description, is_motivational } = req.body;
  
  // Run content moderation
  const { moderateVideo } = require('../utils/contentModerator');
  const modResult = moderateVideo({ title, description, filename: req.file.originalname });
  
  if (!modResult.approved && !modResult.requiresReview) {
    // Auto-rejected by AI filter
    const fs = require('fs');
    try { fs.unlinkSync(req.file.path); } catch(e) {}
    return res.status(400).json({ 
      success: false, 
      message: `Video rejected: ${modResult.reason}` 
    });
  }
  
  const r = db.prepare("INSERT INTO videos (uploader_id,uploader_role,school_id,title,description,file_url,is_motivational,approved,moderation_status) VALUES (?,?,?,?,?,?,?,0,'pending')").run(
    req.userId, "teacher", req.schoolId, title || "Untitled", description || "", 
    "/uploads/videos/" + req.file.filename, is_motivational ? 1 : 0
  );
  
  // Notify admins for approval
  const admins = db.prepare("SELECT id FROM admins WHERE school_id=?").all(req.schoolId);
  admins.forEach(a => {
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
      a.id, "admin", "New Video Pending Approval", 
      `"${title || 'Untitled'}" by a teacher needs your review`, "video_approval", req.schoolId
    );
  });
  
  res.json({ success: true, videoId: r.lastInsertRowid, url: "/uploads/videos/" + req.file.filename, status: 'pending_approval' });
});

router.get("/videos", auth, (req, res) => {
  const videos = db.prepare("SELECT * FROM videos WHERE uploader_id=? AND uploader_role='teacher' AND school_id=? ORDER BY created_at DESC").all(req.userId, req.schoolId);
  res.json({ success: true, videos });
});

router.delete("/videos/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM videos WHERE id=? AND uploader_id=? AND school_id=?").run(req.params.id, req.userId, req.schoolId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Video not found" });
  res.json({ success: true });
});

router.post("/quiz", auth, (req, res) => {
  const { title, subject, questions, time_limit, reward_minutes } = req.body;
  if (!title || !questions) return res.json({ success: false, message: "Title and questions required" });
  const r = db.prepare("INSERT INTO quizzes (teacher_id,school_id,title,subject,questions,time_limit,reward_minutes) VALUES (?,?,?,?,?,?,?)").run(req.userId, req.schoolId, title, subject || "", JSON.stringify(questions), time_limit || 30, reward_minutes || 30);
  const students = db.prepare("SELECT id FROM students WHERE school_id=?").all(req.schoolId);
  students.forEach(s => db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(s.id, "student", "New Quiz Available", `A new quiz "${title}" has been posted`, "quiz", req.schoolId));
  res.json({ success: true, quizId: r.lastInsertRowid });
});

router.get("/quizzes", auth, (req, res) => {
  const quizzes = db.prepare("SELECT * FROM quizzes WHERE teacher_id=? AND school_id=? ORDER BY created_at DESC").all(req.userId, req.schoolId);
  res.json({ success: true, quizzes });
});

router.delete("/quizzes/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM quizzes WHERE id=? AND teacher_id=? AND school_id=?").run(req.params.id, req.userId, req.schoolId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Quiz not found" });
  res.json({ success: true });
});

router.get("/quiz-attempts/:quiz_id", auth, (req, res) => {
  const attempts = db.prepare("SELECT qa.*, s.full_name as student_name FROM quiz_attempts qa JOIN students s ON qa.student_id=s.id WHERE qa.quiz_id=? ORDER BY qa.completed_at DESC").all(req.params.quiz_id);
  res.json({ success: true, attempts });
});

router.post("/competition", auth, (req, res) => {
  const { title, description, subject, start_date, end_date, reward_points } = req.body;
  const r = db.prepare("INSERT INTO competitions (teacher_id,school_id,title,description,subject,start_date,end_date,reward_points) VALUES (?,?,?,?,?,?,?,?)").run(req.userId, req.schoolId, title, description || "", subject || "", start_date || "", end_date || "", reward_points || 100);
  res.json({ success: true, competitionId: r.lastInsertRowid });
});

router.get("/competitions", auth, (req, res) => {
  const competitions = db.prepare("SELECT * FROM competitions WHERE teacher_id=? AND school_id=? ORDER BY created_at DESC").all(req.userId, req.schoolId);
  res.json({ success: true, competitions });
});

router.delete("/competitions/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM competitions WHERE id=? AND teacher_id=? AND school_id=?").run(req.params.id, req.userId, req.schoolId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Competition not found" });
  res.json({ success: true });
});

router.post("/announcement", auth, (req, res) => {
  const { title, content, target_roles } = req.body;
  db.prepare("INSERT INTO announcements (school_id,author_id,author_role,title,content,target_roles) VALUES (?,?,?,?,?,?)").run(req.schoolId, req.userId, "teacher", title, content, target_roles || "all");
  res.json({ success: true });
});

router.get("/announcements", auth, (req, res) => {
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, announcements });
});

// Live sessions
router.post("/live-session", auth, (req, res) => {
  const { title, subject, meeting_url, start_time, duration, invited_students } = req.body;
  if (!title || !meeting_url || !start_time) return res.status(400).json({ success: false, message: "Title, meeting URL, and start time required" });
  const studentIds = invited_students || [];
  const r = db.prepare("INSERT INTO live_sessions (teacher_id,school_id,title,subject,meeting_url,start_time,duration,invited_students) VALUES (?,?,?,?,?,?,?,?)").run(req.userId, req.schoolId, title, subject || "", meeting_url, start_time, duration || 60, JSON.stringify(studentIds));
  studentIds.forEach(studentId => {
    const student = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(studentId, req.schoolId);
    if (student) db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(studentId, "student", "Live Session Scheduled", `You're invited to "${title}" on ${start_time}`, "live_session", req.schoolId);
  });
  res.json({ success: true, sessionId: r.lastInsertRowid });
});

router.get("/live-sessions", auth, (req, res) => {
  const sessions = db.prepare("SELECT * FROM live_sessions WHERE teacher_id=? AND school_id=? ORDER BY start_time DESC").all(req.userId, req.schoolId);
  res.json({ success: true, sessions });
});

router.put("/live-session/:id/status", auth, (req, res) => {
  const { status } = req.body;
  if (!['scheduled', 'live', 'ended'].includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
  db.prepare("UPDATE live_sessions SET status=? WHERE id=? AND teacher_id=? AND school_id=?").run(status, req.params.id, req.userId, req.schoolId);
  res.json({ success: true });
});

router.post("/weekly-report", auth, (req, res) => {
  const { student_id } = req.body;
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const tasksCompleted = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE student_id=? AND completed=1 AND created_at>=?").get(student_id, weekStartStr).c;
  const studyTime = db.prepare("SELECT SUM(duration) as t FROM study_sessions WHERE student_id=? AND date>=?").get(student_id, weekStartStr).t || 0;
  const assessments = db.prepare("SELECT subject, percentage, grade FROM assessments WHERE student_id=? AND date>=? ORDER BY date DESC").all(student_id, weekStartStr);
  const parent = db.prepare("SELECT id FROM parents WHERE children LIKE ? AND school_id=?").get(`%${student.email}%`, req.schoolId);
  if (parent) {
    const summary = `Weekly Report for ${student.full_name}: ${tasksCompleted} tasks completed, ${studyTime} min studied, ${assessments.length} assessments.`;
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(parent.id, "parent", `Weekly Report: ${student.full_name}`, summary, "weekly_report", req.schoolId);
  }
  res.json({ success: true, report: { tasksCompleted, studyTime, assessments } });
});

router.get("/subjects", auth, (req, res) => {
  const subjects = db.prepare("SELECT * FROM subjects WHERE school_id=? ORDER BY name").all(req.schoolId);
  res.json({ success: true, subjects });
});

router.post("/subjects", auth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.json({ success: false, message: "Subject name required" });
  try {
    const r = db.prepare("INSERT INTO subjects (name, school_id) VALUES (?,?)").run(name.trim(), req.schoolId);
    res.json({ success: true, subjectId: r.lastInsertRowid, subject: { id: r.lastInsertRowid, name: name.trim() } });
  } catch(e) {
    if (e.message && e.message.includes("UNIQUE")) {
      return res.status(409).json({ success: false, message: "Subject already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to add subject" });
  }
});

router.put("/subjects/:id", auth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Subject name required" });
  try {
    db.prepare("UPDATE subjects SET name=? WHERE id=? AND school_id=?").run(name.trim(), req.params.id, req.schoolId);
    res.json({ success: true });
  } catch(e) {
    if (e.message && e.message.includes("UNIQUE")) {
      return res.status(409).json({ success: false, message: "Subject already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to update subject" });
  }
});

router.delete("/subjects/:id", auth, (req, res) => {
  // Check for dependencies
  const assessmentCount = db.prepare("SELECT COUNT(*) as c FROM assessments WHERE subject=(SELECT name FROM subjects WHERE id=?) AND teacher_id=?").get(req.params.id, req.userId).c;
  if (assessmentCount > 0) {
    return res.status(409).json({ success: false, message: `Cannot delete: ${assessmentCount} assessment(s) use this subject` });
  }
  db.prepare("DELETE FROM subjects WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

router.get("/parents", auth, (req, res) => {
  const parents = db.prepare("SELECT id, full_name, email, phone, children FROM parents WHERE school_id=?").all(req.schoolId);
  res.json({ success: true, parents });
});

router.post("/event", auth, (req, res) => {
  const { title, description, event_date, event_type } = req.body;
  db.prepare("INSERT INTO events (school_id,title,description,event_date,event_type,created_by) VALUES (?,?,?,?,?,?)").run(req.schoolId, title, description || "", event_date || "", event_type || "general", req.userId);
  res.json({ success: true });
});

router.get("/events", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

module.exports = router;

// Certificates
router.post("/certificate", auth, (req, res) => {
  const { student_id, title, description } = req.body;
  if (!student_id || !title) return res.status(400).json({ success: false, message: "student_id and title required" });
  
  const student = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const r = db.prepare("INSERT INTO certificates (student_id,title,description,issued_by,school_id) VALUES (?,?,?,?,?)").run(
    student_id, title, description || "", req.userId, req.schoolId
  );
  
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
    student_id, "student", "Certificate Issued!", `You received a certificate: "${title}"`, "certificate", req.schoolId
  );
  
  res.json({ success: true, certificateId: r.lastInsertRowid });
});

router.get("/certificates", auth, (req, res) => {
  const certs = db.prepare("SELECT c.*, s.full_name as student_name FROM certificates c JOIN students s ON c.student_id=s.id WHERE c.school_id=? AND c.issued_by=? ORDER BY c.issued_at DESC").all(req.schoolId, req.userId);
  res.json({ success: true, certificates: certs });
});

// Class schedule management
router.get("/schedule", auth, (req, res) => {
  const schedule = db.prepare("SELECT * FROM class_schedules WHERE teacher_id=? AND school_id=? ORDER BY day_of_week, start_time").all(req.userId, req.schoolId);
  res.json({ success: true, schedule });
});

router.post("/schedule", auth, (req, res) => {
  const { day_of_week, start_time, end_time, subject, grade, section, room } = req.body;
  if (!day_of_week || !start_time || !end_time || !subject) {
    return res.status(400).json({ success: false, message: "day_of_week, start_time, end_time, and subject required" });
  }
  const r = db.prepare("INSERT INTO class_schedules (teacher_id,school_id,day_of_week,start_time,end_time,subject,grade,section,room) VALUES (?,?,?,?,?,?,?,?,?)").run(
    req.userId, req.schoolId, day_of_week, start_time, end_time, subject, grade || "", section || "", room || ""
  );
  res.json({ success: true, scheduleId: r.lastInsertRowid });
});

router.delete("/schedule/:id", auth, (req, res) => {
  db.prepare("DELETE FROM class_schedules WHERE id=? AND teacher_id=? AND school_id=?").run(req.params.id, req.userId, req.schoolId);
  res.json({ success: true });
});

// Student performance analytics
router.get("/analytics/:student_id", auth, (req, res) => {
  const student = db.prepare("SELECT id FROM students WHERE id=? AND school_id=?").get(req.params.student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const assessments = db.prepare("SELECT subject, percentage, date, assessment_type FROM assessments WHERE student_id=? AND teacher_id=? ORDER BY date ASC").all(req.params.student_id, req.userId);
  const subjectAverages = db.prepare("SELECT subject, AVG(percentage) as avg, COUNT(*) as count FROM assessments WHERE student_id=? AND teacher_id=? GROUP BY subject").all(req.params.student_id, req.userId);
  
  res.json({ success: true, assessments, subjectAverages });
});

// Resource library
router.get("/resource-library", auth, (req, res) => {
  const resources = db.prepare("SELECT m.*, t.full_name as uploader_name FROM materials m JOIN teachers t ON m.uploader_id=t.id WHERE m.school_id=? AND m.uploader_role='teacher' ORDER BY m.created_at DESC").all(req.schoolId);
  res.json({ success: true, resources });
});
