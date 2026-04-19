const express = require("express");
const router = express.Router();
const { db } = require("../db/database");
const { requireAuthWithSchool } = require("../middleware/auth");

const auth = requireAuthWithSchool("parent");

router.get("/dashboard", auth, (req, res) => {
  const parent = db.prepare("SELECT * FROM parents WHERE id = ? AND school_id = ?").get(req.userId, req.schoolId);
  if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });
  
  const children_emails = JSON.parse(parent.children || "[]");
  const children = children_emails.map(email => {
    const s = db.prepare("SELECT id, full_name, grade, section, avatar, points, streak FROM students WHERE email=? AND school_id=?").get(email, req.schoolId);
    return s;
  }).filter(Boolean);
  
  const notifications = db.prepare("SELECT * FROM notifications WHERE user_id=? AND user_role='parent' ORDER BY created_at DESC LIMIT 10").all(req.userId);
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC LIMIT 5").all(req.schoolId);
  const payments = db.prepare("SELECT * FROM payments WHERE parent_id=? ORDER BY created_at DESC LIMIT 5").all(req.userId);
  const { password: _, ...safeParent } = parent;
  res.json({ success: true, parent: safeParent, children, notifications, announcements, payments });
});

router.get("/child/:student_id", auth, (req, res) => {
  // Verify the student belongs to this parent's school and is linked to this parent
  const parent = db.prepare("SELECT children FROM parents WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!parent) return res.status(403).json({ success: false, message: "Access denied" });
  
  const student = db.prepare("SELECT id, full_name, grade, section, avatar, points, streak, email FROM students WHERE id=? AND school_id=?").get(req.params.student_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  // Verify parent is linked to this student
  const children = JSON.parse(parent.children || "[]");
  if (!children.includes(student.email)) {
    return res.status(403).json({ success: false, message: "Access denied - not your child" });
  }
  
  const results = db.prepare("SELECT a.*, t.full_name as teacher_name FROM assessments a JOIN teachers t ON a.teacher_id=t.id WHERE a.student_id=? ORDER BY a.created_at DESC").all(student.id);
  const attendance = db.prepare("SELECT * FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 30").all(student.id);
  const tasks = db.prepare("SELECT * FROM tasks WHERE student_id=? ORDER BY due_date ASC").all(student.id);
  const badges = db.prepare("SELECT * FROM badges WHERE student_id=?").all(student.id);
  res.json({ success: true, student, results, attendance, tasks, badges });
});

router.get("/weekly-summary/:child_id", auth, (req, res) => {
  const parent = db.prepare("SELECT children FROM parents WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!parent) return res.status(403).json({ success: false, message: "Access denied" });
  
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(req.params.child_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const children = JSON.parse(parent.children || "[]");
  if (!children.includes(student.email)) return res.status(403).json({ success: false, message: "Access denied" });
  
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const tasksCompleted = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE student_id=? AND completed=1 AND created_at>=?").get(student.id, weekStartStr).c;
  const studyTime = db.prepare("SELECT SUM(duration) as t FROM study_sessions WHERE student_id=? AND date>=?").get(student.id, weekStartStr).t || 0;
  const assessments = db.prepare("SELECT subject, percentage, grade FROM assessments WHERE student_id=? AND date>=? ORDER BY date DESC").all(student.id, weekStartStr);
  const badges = db.prepare("SELECT badge_name FROM badges WHERE student_id=? AND earned_at>=?").all(student.id, weekStartStr);
  
  res.json({ success: true, summary: { student: { full_name: student.full_name, streak: student.streak, points: student.points }, tasksCompleted, studyTime, assessments, badges } });
});

router.get("/messages", auth, (req, res) => {
  const { with_id, with_role } = req.query;
  const msgs = db.prepare("SELECT m.*, CASE WHEN m.sender_role='teacher' THEN t.full_name WHEN m.sender_role='parent' THEN p.full_name ELSE 'Unknown' END as sender_name FROM messages m LEFT JOIN teachers t ON m.sender_id=t.id AND m.sender_role='teacher' LEFT JOIN parents p ON m.sender_id=p.id AND m.sender_role='parent' WHERE ((m.sender_id=? AND m.sender_role='parent' AND m.receiver_id=? AND m.receiver_role=?) OR (m.sender_id=? AND m.sender_role=? AND m.receiver_id=? AND m.receiver_role='parent')) AND m.school_id=? ORDER BY m.created_at ASC").all(req.userId, with_id, with_role, with_id, with_role, req.userId, req.schoolId);
  db.prepare("UPDATE messages SET read_status=1 WHERE receiver_id=? AND receiver_role='parent' AND sender_id=? AND school_id=?").run(req.userId, with_id, req.schoolId);
  res.json({ success: true, messages: msgs });
});

router.post("/messages", auth, (req, res) => {
  const { receiver_id, receiver_role, content } = req.body;
  // Verify receiver belongs to same school
  const tables = { teacher: "teachers", admin: "admins" };
  const table = tables[receiver_role];
  if (table) {
    const receiver = db.prepare(`SELECT id FROM ${table} WHERE id=? AND school_id=?`).get(receiver_id, req.schoolId);
    if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found in your school" });
  }
  const r = db.prepare("INSERT INTO messages (sender_id,sender_role,receiver_id,receiver_role,content,school_id) VALUES (?,?,?,?,?,?)").run(req.userId, "parent", receiver_id, receiver_role, content, req.schoolId);
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(receiver_id, receiver_role, "New Message from Parent", "You have a new message", "message", req.schoolId);
  res.json({ success: true, messageId: r.lastInsertRowid });
});

router.get("/teachers", auth, (req, res) => {
  const teachers = db.prepare("SELECT id, full_name, subjects, email FROM teachers WHERE school_id=?").all(req.schoolId);
  res.json({ success: true, teachers });
});

router.get("/payments", auth, (req, res) => {
  const payments = db.prepare("SELECT p.*, s.full_name as student_name FROM payments p JOIN students s ON p.student_id=s.id WHERE p.parent_id=? ORDER BY p.created_at DESC").all(req.userId);
  res.json({ success: true, payments });
});

router.post("/payment", auth, (req, res) => {
  const { student_id, amount, fee_type, receipt_no } = req.body;
  const receipt = receipt_no || "RCP" + Date.now();
  const r = db.prepare("INSERT INTO payments (parent_id,student_id,school_id,amount,fee_type,status,paid_date,receipt_no) VALUES (?,?,?,?,?,'paid',date('now'),?)").run(req.userId, student_id, req.schoolId, amount, fee_type, receipt);
  res.json({ success: true, receipt_no: receipt, paymentId: r.lastInsertRowid });
});

// Chapa payment integration
router.post("/pay-now", auth, async (req, res) => {
  const { payment_id } = req.body;
  const payment = db.prepare("SELECT p.*, s.full_name as student_name, s.email as student_email FROM payments p JOIN students s ON p.student_id=s.id WHERE p.id=? AND p.parent_id=? AND p.school_id=?").get(payment_id, req.userId, req.schoolId);
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  if (payment.status === 'paid') return res.status(400).json({ success: false, message: "Payment already completed" });
  const parent = db.prepare("SELECT * FROM parents WHERE id=?").get(req.userId);
  const school = db.prepare("SELECT * FROM schools WHERE id=?").get(req.schoolId);
  const { initializePayment, generateTxRef } = require('../utils/paymentGateway');
  const tx_ref = generateTxRef(payment_id, req.schoolId);
  db.prepare("UPDATE payments SET receipt_no=? WHERE id=?").run(tx_ref, payment_id);
  const result = await initializePayment({
    amount: payment.amount, currency: 'ETB',
    email: parent.email,
    first_name: parent.full_name.split(' ')[0],
    last_name: parent.full_name.split(' ').slice(1).join(' ') || 'N/A',
    phone_number: parent.phone, tx_ref,
    callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/parent/payment-callback`,
    return_url: `${process.env.APP_URL || 'http://localhost:3000'}`,
    customization: { title: `${school?.name || 'School'} Fee Payment`, description: `${payment.fee_type} for ${payment.student_name}` }
  });
  if (result.success) {
    res.json({ success: true, checkout_url: result.checkout_url, tx_ref, demo: result.demo });
  } else {
    res.status(500).json({ success: false, message: result.message || 'Payment initialization failed' });
  }
});

router.post("/payment-callback", async (req, res) => {
  const { tx_ref, status } = req.body;
  if (status === 'success' && tx_ref) {
    const { verifyPayment } = require('../utils/paymentGateway');
    const verification = await verifyPayment(tx_ref);
    if (verification.success) {
      db.prepare("UPDATE payments SET status='paid', paid_date=date('now') WHERE receipt_no=?").run(tx_ref);
    }
  }
  res.json({ success: true });
});

router.get("/payment-receipt/:payment_id", auth, (req, res) => {
  const payment = db.prepare("SELECT p.*, s.full_name as student_name FROM payments p JOIN students s ON p.student_id=s.id WHERE p.id=? AND p.parent_id=?").get(req.params.payment_id, req.userId);
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
  const student = db.prepare("SELECT * FROM students WHERE id=?").get(payment.student_id);
  const school = db.prepare("SELECT * FROM schools WHERE id=?").get(req.schoolId);
  const { generateReceipt } = require('../utils/paymentGateway');
  const html = generateReceipt(payment, student, school);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

router.put("/payment-reminders", auth, (req, res) => {
  const { enabled } = req.body;
  db.prepare("UPDATE parents SET payment_reminders=? WHERE id=? AND school_id=?").run(enabled ? 1 : 0, req.userId, req.schoolId);
  res.json({ success: true });
});

// Parent group chat (grade-level, school-isolated)
router.get("/group/:grade", auth, (req, res) => {
  let group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  if (!group) {
    db.prepare("INSERT INTO parent_groups (school_id,grade,name) VALUES (?,?,?)").run(req.schoolId, req.params.grade, "Grade " + req.params.grade + " Parents");
    group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  }
  const members = db.prepare("SELECT p.id, p.full_name FROM parents p WHERE p.school_id=? AND p.children LIKE ?").all(req.schoolId, '%"grade":"' + req.params.grade + '"%');
  res.json({ success: true, group, members });
});

router.get("/group-messages/:grade", auth, (req, res) => {
  let group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  if (!group) {
    db.prepare("INSERT INTO parent_groups (school_id,grade,name) VALUES (?,?,?)").run(req.schoolId, req.params.grade, "Grade " + req.params.grade + " Parents");
    group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  }
  const msgs = db.prepare("SELECT gm.*, p.full_name as sender_name FROM group_messages gm JOIN parents p ON gm.sender_id=p.id WHERE gm.group_id=? ORDER BY gm.created_at ASC").all(group.id);
  res.json({ success: true, messages: msgs, group });
});

router.post("/group-messages/:grade", auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: "Content required" });
  
  let group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  if (!group) {
    db.prepare("INSERT INTO parent_groups (school_id,grade,name) VALUES (?,?,?)").run(req.schoolId, req.params.grade, "Grade " + req.params.grade + " Parents");
    group = db.prepare("SELECT * FROM parent_groups WHERE school_id=? AND grade=?").get(req.schoolId, req.params.grade);
  }
  
  db.prepare("INSERT INTO group_messages (group_id,sender_id,sender_role,content) VALUES (?,?,?,?)").run(group.id, req.userId, "parent", content);
  
  // Emit via Socket.IO
  const io = req.app.get("io");
  if (io) {
    io.to(`group_${group.id}`).emit("group_message", { groupId: group.id, content, senderId: req.userId });
  }
  
  res.json({ success: true });
});

router.get("/videos", auth, (req, res) => {
  const videos = db.prepare("SELECT v.*, t.full_name as uploader_name FROM videos v LEFT JOIN teachers t ON v.uploader_id=t.id AND v.uploader_role='teacher' WHERE v.school_id=? AND v.approved=1 ORDER BY v.created_at DESC").all(req.schoolId);
  res.json({ success: true, videos });
});

router.get("/events", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

module.exports = router;

// Attendance calendar view
router.get("/attendance-calendar/:child_id", auth, (req, res) => {
  const parent = db.prepare("SELECT children FROM parents WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!parent) return res.status(403).json({ success: false, message: "Access denied" });
  
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(req.params.child_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const children = JSON.parse(parent.children || "[]");
  if (!children.includes(student.email)) return res.status(403).json({ success: false, message: "Access denied" });
  
  // Get current month attendance
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const records = db.prepare("SELECT date, status FROM attendance WHERE student_id=? AND date >= ? ORDER BY date").all(student.id, monthStart);
  
  res.json({ success: true, records, student: { full_name: student.full_name, grade: student.grade } });
});

// Child progress charts
router.get("/progress-charts/:child_id", auth, (req, res) => {
  const parent = db.prepare("SELECT children FROM parents WHERE id=? AND school_id=?").get(req.userId, req.schoolId);
  if (!parent) return res.status(403).json({ success: false, message: "Access denied" });
  
  const student = db.prepare("SELECT * FROM students WHERE id=? AND school_id=?").get(req.params.child_id, req.schoolId);
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  
  const children = JSON.parse(parent.children || "[]");
  if (!children.includes(student.email)) return res.status(403).json({ success: false, message: "Access denied" });
  
  const assessments = db.prepare("SELECT subject, percentage, date FROM assessments WHERE student_id=? ORDER BY date ASC LIMIT 50").all(student.id);
  const subjectAverages = db.prepare("SELECT subject, AVG(percentage) as avg FROM assessments WHERE student_id=? GROUP BY subject").all(student.id);
  
  res.json({ success: true, assessments, subjectAverages });
});

// Event RSVP
router.post("/event-rsvp/:event_id", auth, (req, res) => {
  const { response } = req.body;
  try {
    db.prepare("INSERT OR REPLACE INTO event_rsvps (event_id,user_id,user_role,response) VALUES (?,?,?,?)").run(
      req.params.event_id, req.userId, "parent", response || "yes"
    );
    
    // Notify admin
    const event = db.prepare("SELECT * FROM events WHERE id=? AND school_id=?").get(req.params.event_id, req.schoolId);
    if (event) {
      const admins = db.prepare("SELECT id FROM admins WHERE school_id=?").all(req.schoolId);
      const parent = db.prepare("SELECT full_name FROM parents WHERE id=?").get(req.userId);
      admins.forEach(a => {
        db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
          a.id, "admin", "Event RSVP", `${parent?.full_name || 'A parent'} responded "${response}" to "${event.title}"`, "rsvp", req.schoolId
        );
      });
    }
    
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: "Failed to RSVP" });
  }
});
