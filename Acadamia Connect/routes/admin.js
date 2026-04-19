const express = require("express");
const router = express.Router();
const { db } = require("../db/database");
const { requireAuthWithSchool } = require("../middleware/auth");

const auth = requireAuthWithSchool("admin");

router.get("/dashboard", auth, (req, res) => {
  const admin = db.prepare("SELECT * FROM admins WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
  
  const students = db.prepare("SELECT COUNT(*) as c FROM students WHERE school_id=?").get(req.schoolId);
  const teachers = db.prepare("SELECT COUNT(*) as c FROM teachers WHERE school_id=?").get(req.schoolId);
  const parents = db.prepare("SELECT COUNT(*) as c FROM parents WHERE school_id=?").get(req.schoolId);
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC LIMIT 5").all(req.schoolId);
  const payments = db.prepare("SELECT * FROM payments WHERE school_id=? ORDER BY created_at DESC LIMIT 10").all(req.schoolId);
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC LIMIT 5").all(req.schoolId);
  const pendingVideos = db.prepare("SELECT COUNT(*) as c FROM videos WHERE school_id=? AND approved=0").get(req.schoolId);
  
  const { password: _, ...safeAdmin } = admin;
  res.json({ 
    success: true, admin: safeAdmin, 
    stats: { students: students.c, teachers: teachers.c, parents: parents.c, pendingVideos: pendingVideos.c }, 
    announcements, payments, events 
  });
});

// Video moderation
router.get("/videos/pending", auth, (req, res) => {
  const videos = db.prepare(`SELECT v.*, t.full_name as uploader_name FROM videos v LEFT JOIN teachers t ON v.uploader_id=t.id AND v.uploader_role='teacher' WHERE v.school_id=? AND v.approved=0 ORDER BY v.created_at DESC`).all(req.schoolId);
  res.json({ success: true, videos });
});

router.get("/videos", auth, (req, res) => {
  const videos = db.prepare(`SELECT v.*, t.full_name as uploader_name FROM videos v LEFT JOIN teachers t ON v.uploader_id=t.id AND v.uploader_role='teacher' WHERE v.school_id=? ORDER BY v.created_at DESC`).all(req.schoolId);
  res.json({ success: true, videos });
});

router.post("/videos/:id/approve", auth, (req, res) => {
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(req.params.id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  db.prepare("UPDATE videos SET approved=1, moderation_status='approved' WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

router.post("/videos/:id/reject", auth, (req, res) => {
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(req.params.id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  db.prepare("DELETE FROM videos WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

router.get("/users", auth, (req, res) => {
  const { role, school_id } = req.query;
  // Use provided school_id filter or default to admin's own school
  const targetSchoolId = school_id || req.schoolId;
  if (role === "student") {
    const users = db.prepare("SELECT s.id, s.full_name, s.email, s.grade, s.section, s.points, s.streak, s.created_at, sc.name as school_name FROM students s LEFT JOIN schools sc ON s.school_id=sc.id WHERE s.school_id=? ORDER BY s.full_name").all(targetSchoolId);
    return res.json({ success: true, users });
  } else if (role === "teacher") {
    const users = db.prepare("SELECT t.id, t.full_name, t.email, t.employee_id, t.subjects, t.experience, t.created_at, sc.name as school_name FROM teachers t LEFT JOIN schools sc ON t.school_id=sc.id WHERE t.school_id=? ORDER BY t.full_name").all(targetSchoolId);
    return res.json({ success: true, users });
  } else if (role === "parent") {
    const users = db.prepare("SELECT p.id, p.full_name, p.email, p.phone, p.children, p.payment_reminders, p.created_at, sc.name as school_name FROM parents p LEFT JOIN schools sc ON p.school_id=sc.id WHERE p.school_id=? ORDER BY p.full_name").all(targetSchoolId);
    return res.json({ success: true, users });
  } else if (role === "all") {
    // Return all users across all schools for super-admin view
    const students = db.prepare("SELECT s.id, s.full_name, s.email, s.grade, s.created_at, 'student' as role, sc.name as school_name FROM students s LEFT JOIN schools sc ON s.school_id=sc.id ORDER BY sc.name, s.full_name").all();
    const teachers = db.prepare("SELECT t.id, t.full_name, t.email, t.employee_id, t.created_at, 'teacher' as role, sc.name as school_name FROM teachers t LEFT JOIN schools sc ON t.school_id=sc.id ORDER BY sc.name, t.full_name").all();
    const parents = db.prepare("SELECT p.id, p.full_name, p.email, p.created_at, 'parent' as role, sc.name as school_name FROM parents p LEFT JOIN schools sc ON p.school_id=sc.id ORDER BY sc.name, p.full_name").all();
    return res.json({ success: true, students, teachers, parents });
  }
  res.json({ success: false, message: "Invalid role" });
});

router.get("/schools", auth, (req, res) => {
  const schools = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM students WHERE school_id=s.id) as student_count,
      (SELECT COUNT(*) FROM teachers WHERE school_id=s.id) as teacher_count,
      (SELECT COUNT(*) FROM parents WHERE school_id=s.id) as parent_count
    FROM schools s ORDER BY s.name
  `).all();
  res.json({ success: true, schools });
});

router.delete("/user/:role/:id", auth, (req, res) => {
  const tables = { student: "students", teacher: "teachers", parent: "parents" };
  const table = tables[req.params.role];
  if (!table) return res.json({ success: false, message: "Invalid role" });
  const result = db.prepare(`DELETE FROM ${table} WHERE id=? AND school_id=?`).run(req.params.id, req.schoolId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true });
});

// Teacher attendance monitoring
router.get("/teacher-attendance", auth, (req, res) => {
  const { date } = req.query;
  const d = date || new Date().toISOString().split("T")[0];
  const teachers = db.prepare("SELECT id, full_name, email, employee_id FROM teachers WHERE school_id=?").all(req.schoolId);
  const records = db.prepare("SELECT * FROM teacher_attendance WHERE school_id=? AND date=?").all(req.schoolId, d);
  res.json({ success: true, teachers, records, date: d });
});

router.post("/teacher-attendance", auth, (req, res) => {
  const { teacher_id, date, status, notes } = req.body;
  if (!teacher_id || !date || !status) return res.status(400).json({ success: false, message: "teacher_id, date, and status required" });
  
  // Verify teacher belongs to same school
  const teacher = db.prepare("SELECT id FROM teachers WHERE id=? AND school_id=?").get(teacher_id, req.schoolId);
  if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found in your school" });
  
  db.prepare("INSERT OR REPLACE INTO teacher_attendance (teacher_id,school_id,date,status,notes,marked_by) VALUES (?,?,?,?,?,?)").run(teacher_id, req.schoolId, date, status, notes || "", req.userId);
  res.json({ success: true });
});

// Announcements
router.post("/announcement", auth, (req, res) => {
  const { title, content, target_roles } = req.body;
  if (!title || !content) return res.json({ success: false, message: "Title and content required" });
  db.prepare("INSERT INTO announcements (school_id,author_id,author_role,title,content,target_roles) VALUES (?,?,?,?,?,?)").run(req.schoolId, req.userId, "admin", title, content, target_roles || "all");
  res.json({ success: true });
});

router.get("/announcements", auth, (req, res) => {
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, announcements });
});

router.delete("/announcement/:id", auth, (req, res) => {
  db.prepare("DELETE FROM announcements WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

// Payments
router.get("/payments", auth, (req, res) => {
  const { status } = req.query;
  let query = "SELECT p.*, s.full_name as student_name, par.full_name as parent_name FROM payments p JOIN students s ON p.student_id=s.id JOIN parents par ON p.parent_id=par.id WHERE p.school_id=?";
  const params = [req.schoolId];
  if (status) { query += " AND p.status=?"; params.push(status); }
  query += " ORDER BY p.created_at DESC";
  const payments = db.prepare(query).all(...params);
  const stats = db.prepare("SELECT SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as collected, SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as pending FROM payments WHERE school_id=?").get(req.schoolId);
  res.json({ success: true, payments, stats });
});

router.post("/payment-schedule", auth, (req, res) => {
  const { fee_type, amount, due_date, target_grades } = req.body;
  if (!fee_type || !amount || !due_date) return res.status(400).json({ success: false, message: "fee_type, amount, and due_date required" });
  
  // Get all students (optionally filtered by grade)
  let studentsQuery = "SELECT s.id, s.school_id FROM students s WHERE s.school_id=?";
  const params = [req.schoolId];
  if (target_grades && target_grades.length > 0) {
    const placeholders = target_grades.map(() => '?').join(',');
    studentsQuery += ` AND s.grade IN (${placeholders})`;
    params.push(...target_grades);
  }
  const students = db.prepare(studentsQuery).all(...params);
  
  // Create payment records for each student
  const insertPayment = db.prepare("INSERT INTO payments (parent_id,student_id,school_id,amount,fee_type,status,due_date) VALUES ((SELECT id FROM parents WHERE children LIKE '%'||?||'%' AND school_id=? LIMIT 1),?,?,?,?,'pending',?)");
  
  let created = 0;
  students.forEach(s => {
    try {
      const student = db.prepare("SELECT email FROM students WHERE id=?").get(s.id);
      if (student) {
        insertPayment.run(student.email, req.schoolId, s.id, req.schoolId, amount, fee_type, due_date);
        created++;
      }
    } catch(e) { /* skip if parent not found */ }
  });
  
  res.json({ success: true, created });
});

router.put("/payment/:id", auth, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE payments SET status=?, paid_date=CASE WHEN ? = 'paid' THEN date('now') ELSE paid_date END WHERE id=? AND school_id=?").run(status, status, req.params.id, req.schoolId);
  res.json({ success: true });
});

// Download payment report as CSV
router.get("/payments/report", auth, (req, res) => {
  const payments = db.prepare(`SELECT p.*, s.full_name as student_name, par.full_name as parent_name 
    FROM payments p 
    JOIN students s ON p.student_id=s.id 
    JOIN parents par ON p.parent_id=par.id 
    WHERE p.school_id=? ORDER BY p.created_at DESC`).all(req.schoolId);
  
  const school = db.prepare("SELECT name FROM schools WHERE id=?").get(req.schoolId);
  
  let csv = `Payment Report - ${school?.name || 'School'}\n`;
  csv += `Generated: ${new Date().toLocaleString()}\n\n`;
  csv += `ID,Student,Parent,Fee Type,Amount (ETB),Status,Due Date,Paid Date,Receipt\n`;
  
  payments.forEach(p => {
    csv += `${p.id},"${p.student_name}","${p.parent_name}","${p.fee_type}",${p.amount},${p.status},${p.due_date || ''},${p.paid_date || ''},${p.receipt_no || ''}\n`;
  });
  
  const stats = db.prepare("SELECT SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as collected, SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as pending, SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END) as overdue FROM payments WHERE school_id=?").get(req.schoolId);
  csv += `\nSummary\n`;
  csv += `Total Collected,${stats.collected || 0} ETB\n`;
  csv += `Total Pending,${stats.pending || 0} ETB\n`;
  csv += `Total Overdue,${stats.overdue || 0} ETB\n`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="payment-report-${Date.now()}.csv"`);
  res.send(csv);
});

// Subjects
router.get("/subjects", auth, (req, res) => {
  const subjects = db.prepare("SELECT * FROM subjects WHERE school_id=?").all(req.schoolId);
  res.json({ success: true, subjects });
});

router.post("/subjects", auth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false, message: "Subject name required" });
  try {
    const r = db.prepare("INSERT INTO subjects (name, school_id) VALUES (?,?)").run(name, req.schoolId);
    res.json({ success: true, subjectId: r.lastInsertRowid });
  } catch (e) {
    res.json({ success: false, message: "Subject already exists" });
  }
});

router.delete("/subjects/:id", auth, (req, res) => {
  db.prepare("DELETE FROM subjects WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

// Events
router.post("/event", auth, (req, res) => {
  const { title, description, event_date, event_type } = req.body;
  db.prepare("INSERT INTO events (school_id,title,description,event_date,event_type,created_by) VALUES (?,?,?,?,?,?)").run(req.schoolId, title, description || "", event_date || "", event_type || "general", req.userId);
  res.json({ success: true });
});

router.get("/events", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

// Clubs management
router.get("/clubs", auth, (req, res) => {
  const clubs = db.prepare("SELECT * FROM clubs WHERE school_id=? ORDER BY name").all(req.schoolId);
  res.json({ success: true, clubs });
});

router.post("/clubs", auth, (req, res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Club name required" });
  const r = db.prepare("INSERT INTO clubs (school_id,name,description,type,created_by) VALUES (?,?,?,?,?)").run(
    req.schoolId, name, description || "", type || "club", req.userId
  );
  res.json({ success: true, clubId: r.lastInsertRowid });
});

router.delete("/clubs/:id", auth, (req, res) => {
  db.prepare("DELETE FROM clubs WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

// School campaigns
router.get("/campaigns", auth, (req, res) => {
  const campaigns = db.prepare("SELECT * FROM school_campaigns WHERE school_id=? ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, campaigns });
});

router.post("/campaigns", auth, (req, res) => {
  const { title, description, campaign_type, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ success: false, message: "Campaign title required" });
  const r = db.prepare("INSERT INTO school_campaigns (school_id,title,description,campaign_type,start_date,end_date,created_by) VALUES (?,?,?,?,?,?,?)").run(
    req.schoolId, title, description || "", campaign_type || "general", start_date || "", end_date || "", req.userId
  );
  
  // Notify all students
  const students = db.prepare("SELECT id FROM students WHERE school_id=?").all(req.schoolId);
  students.forEach(s => {
    db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
      s.id, "student", "New School Campaign!", `Join the "${title}" campaign!`, "campaign", req.schoolId
    );
  });
  
  res.json({ success: true, campaignId: r.lastInsertRowid });
});

// System settings
router.get("/settings", auth, (req, res) => {
  const school = db.prepare("SELECT * FROM schools WHERE id=?").get(req.schoolId);
  res.json({ success: true, settings: school });
});

router.put("/settings", auth, (req, res) => {
  const { name, feature_video, feature_chat, feature_games } = req.body;
  if (name) db.prepare("UPDATE schools SET name=? WHERE id=?").run(name, req.schoolId);
  res.json({ success: true });
});

module.exports = router;


// School analytics dashboard
router.get("/analytics", auth, (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM students WHERE school_id=?").get(req.schoolId).c;
  const totalTeachers = db.prepare("SELECT COUNT(*) as c FROM teachers WHERE school_id=?").get(req.schoolId).c;
  const totalParents = db.prepare("SELECT COUNT(*) as c FROM parents WHERE school_id=?").get(req.schoolId).c;
  const attendanceData = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present FROM attendance WHERE school_id=? AND date >= date('now', '-30 days')").get(req.schoolId);
  const avgAttendance = attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0;
  const avgScore = db.prepare("SELECT AVG(percentage) as avg FROM assessments WHERE school_id=?").get(req.schoolId).avg || 0;
  const activeStudents = db.prepare("SELECT COUNT(DISTINCT student_id) as c FROM study_sessions WHERE school_id=? AND date >= date('now', '-7 days')").get(req.schoolId).c;
  res.json({ success: true, analytics: { totalStudents, totalTeachers, totalParents, avgAttendance, avgScore: Math.round(avgScore), activeUsersThisWeek: activeStudents } });
});

// Staff management
router.post("/staff", auth, (req, res) => {
  const { full_name, email, phone, employee_id, subjects, experience } = req.body;
  if (!full_name || !email || !phone || !employee_id) return res.status(400).json({ success: false, message: "full_name, email, phone, and employee_id required" });
  const existing = db.prepare("SELECT id FROM teachers WHERE email=?").get(email);
  if (existing) return res.status(409).json({ success: false, message: "Email already registered" });
  const bcrypt = require('bcryptjs');
  const tempPassword = bcrypt.hashSync("TempPass123!", 10);
  const r = db.prepare("INSERT INTO teachers (full_name,email,phone,password,employee_id,school_id,subjects,experience) VALUES (?,?,?,?,?,?,?,?)").run(full_name, email, phone, tempPassword, employee_id, req.schoolId, JSON.stringify(subjects || []), experience || "");
  res.json({ success: true, teacherId: r.lastInsertRowid, tempPassword: "TempPass123!" });
});

router.put("/staff/:id", auth, (req, res) => {
  const { full_name, phone, subjects, experience, active } = req.body;
  const teacher = db.prepare("SELECT id FROM teachers WHERE id=? AND school_id=?").get(req.params.id, req.schoolId);
  if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });
  if (full_name) db.prepare("UPDATE teachers SET full_name=? WHERE id=?").run(full_name, req.params.id);
  if (phone) db.prepare("UPDATE teachers SET phone=? WHERE id=?").run(phone, req.params.id);
  if (subjects) db.prepare("UPDATE teachers SET subjects=? WHERE id=?").run(JSON.stringify(subjects), req.params.id);
  if (experience) db.prepare("UPDATE teachers SET experience=? WHERE id=?").run(experience, req.params.id);
  if (active !== undefined) db.prepare("UPDATE teachers SET active=? WHERE id=?").run(active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// School calendar
router.get("/calendar", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

router.post("/calendar", auth, (req, res) => {
  const { title, description, event_date, event_type } = req.body;
  if (!title || !event_date) return res.status(400).json({ success: false, message: "title and event_date required" });
  const r = db.prepare("INSERT INTO events (school_id,title,description,event_date,event_type,created_by) VALUES (?,?,?,?,?,?)").run(req.schoolId, title, description || "", event_date, event_type || "general", req.userId);
  res.json({ success: true, eventId: r.lastInsertRowid });
});

router.put("/calendar/:id", auth, (req, res) => {
  const { title, description, event_date, event_type } = req.body;
  db.prepare("UPDATE events SET title=COALESCE(?,title), description=COALESCE(?,description), event_date=COALESCE(?,event_date), event_type=COALESCE(?,event_type) WHERE id=? AND school_id=?").run(title || null, description || null, event_date || null, event_type || null, req.params.id, req.schoolId);
  res.json({ success: true });
});

router.delete("/calendar/:id", auth, (req, res) => {
  db.prepare("DELETE FROM events WHERE id=? AND school_id=?").run(req.params.id, req.schoolId);
  res.json({ success: true });
});

module.exports = router;
