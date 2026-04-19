const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { db } = require("../db/database");
const { 
  validatePhoneNumber, 
  validateEmail, 
  checkPasswordStrength, 
  validateRegistrationInput,
  validateLoginInput 
} = require("../utils/validation");

// In-memory store for password reset tokens
const resetTokens = new Map();

router.post("/register", (req, res) => {
  // Use comprehensive validation
  const validation = validateRegistrationInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      message: validation.errors[0], // Return first error
      errors: validation.errors 
    });
  }

  const { role, full_name, email, phone, password, confirm_password, school_name, ...rest } = req.body;

  // Check for duplicate email across all role tables (HTTP 409)
  const emailExists = (table) => db.prepare(`SELECT id FROM ${table} WHERE email = ?`).get(email);
  if (emailExists("students") || emailExists("teachers") || emailExists("parents") || emailExists("admins")) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  // Check for duplicate employee_id for teachers (HTTP 409)
  if (role === "teacher" && rest.employee_id) {
    const empExists = db.prepare("SELECT id FROM teachers WHERE employee_id = ?").get(rest.employee_id);
    if (empExists) {
      return res.status(409).json({ success: false, message: "Employee ID already exists" });
    }
  }

  // Find or create school — prefer school_id if provided by client
  const { school_id: bodySchoolId } = req.body;
  let school = null;
  if (bodySchoolId) {
    school = db.prepare("SELECT id FROM schools WHERE id = ?").get(bodySchoolId);
  }
  if (!school && school_name) {
    // Case-insensitive + trimmed name match
    school = db.prepare("SELECT id FROM schools WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))").get(school_name);
  }
  if (!school && school_name) {
    // Last resort: partial match (school name contains the typed value or vice versa)
    const allSchools = db.prepare("SELECT id, name FROM schools").all();
    const typed = school_name.trim().toLowerCase();
    const partial = allSchools.find(s => 
      s.name.trim().toLowerCase().includes(typed) || typed.includes(s.name.trim().toLowerCase())
    );
    if (partial) school = partial;
  }
  if (!school) {
    const result = db.prepare("INSERT INTO schools (name, code, verified) VALUES (?, ?, 0)").run(school_name, "SCH" + Date.now());
    school = { id: result.lastInsertRowid };
    const defaultSubjects = ["Mathematics","Physics","Chemistry","Biology","English","History","Geography","Art","Music","Physical Education","Computer Science","Amharic"];
    defaultSubjects.forEach(s => db.prepare("INSERT OR IGNORE INTO subjects (name, school_id) VALUES (?, ?)").run(s, school.id));
  }

  // Hash password with bcrypt before any DB insertion
  const hash = bcrypt.hashSync(password, 10);

  try {
    if (role === "student") {
      const r = db.prepare("INSERT INTO students (full_name,nickname,gender,email,phone,password,school_id,grade,section,parent_name,parent_contact,avatar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(
        full_name, rest.nickname||"", rest.gender||"", email, phone, hash, school.id, rest.grade||"", rest.section||"", rest.parent_name||"", rest.parent_contact||"", rest.avatar||"scholar"
      );
      return res.json({ success: true, message: "Student registered!", userId: r.lastInsertRowid, role: "student" });
    } else if (role === "teacher") {
      const r = db.prepare("INSERT INTO teachers (full_name,email,phone,password,employee_id,school_id,subjects,classes,qualifications,experience,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
        full_name, email, phone, hash, rest.employee_id, school.id, JSON.stringify(rest.subjects||[]), JSON.stringify(rest.classes||[]), rest.qualifications||"", rest.experience||"", rest.bio||""
      );
      return res.json({ success: true, message: "Teacher registered!", userId: r.lastInsertRowid, role: "teacher" });
    } else if (role === "parent") {
      const r = db.prepare("INSERT INTO parents (full_name,parental_status,phone,email,password,school_id,children) VALUES (?,?,?,?,?,?,?)").run(
        full_name, rest.parental_status||"", phone, email, hash, school.id, JSON.stringify(rest.children||[])
      );
      return res.json({ success: true, message: "Parent registered!", userId: r.lastInsertRowid, role: "parent" });
    } else if (role === "admin") {
      const r = db.prepare("INSERT INTO admins (full_name,email,phone,password,school_id) VALUES (?,?,?,?,?)").run(full_name, email, phone, hash, school.id);
      return res.json({ success: true, message: "Admin registered!", userId: r.lastInsertRowid, role: "admin" });
    }
  } catch (e) {
    if (e.message && e.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ success: false, message: "A record with this information already exists" });
    }
    return res.status(500).json({ success: false, message: "Registration failed: " + e.message });
  }
});

router.post("/login", (req, res) => {
  // Use comprehensive validation
  const validation = validateLoginInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      message: validation.errors[0] 
    });
  }

  const { email, password, role, employee_id } = req.body;
  
  // Role-based login enforcement - query only the correct table
  const tables = { student: "students", teacher: "teachers", parent: "parents", admin: "admins" };
  const table = tables[role];
  if (!table) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  // Query only the table corresponding to the selected role
  const user = db.prepare(`SELECT * FROM ${table} WHERE email = ?`).get(email);
  
  // Generic error message to prevent role enumeration
  if (!user) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  // Verify password
  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  // Check if account is active
  if (user.active === 0) {
    return res.json({ success: false, message: "Account deactivated. Contact your school admin." });
  }

  // Teacher-specific validation: require employee_id match
  if (role === "teacher") {
    if (!employee_id || employee_id !== user.employee_id) {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  }

  // Set session data
  req.session.userId = user.id;
  req.session.role = role;
  req.session.schoolId = user.school_id;
  req.session.name = user.full_name;

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, role });
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get("/me", (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const tables = { student: "students", teacher: "teachers", parent: "parents", admin: "admins" };
  const table = tables[req.session.role];
  const user = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.session.userId);
  if (!user) return res.json({ success: false });
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, role: req.session.role });
});

router.get("/schools", (req, res) => {
  const schools = db.prepare("SELECT id, name, code, verified FROM schools").all();
  res.json({ success: true, schools });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  // Always return the same response to avoid revealing whether email exists
  const genericResponse = { success: true, message: "If that email exists, a reset link has been sent" };

  if (!email || !validateEmail(email)) return res.json(genericResponse);

  // Search across all role tables
  const roles = ["students", "teachers", "parents", "admins"];
  const roleNames = ["student", "teacher", "parent", "admin"];
  let foundRole = null;

  for (let i = 0; i < roles.length; i++) {
    const row = db.prepare(`SELECT id FROM ${roles[i]} WHERE email = ?`).get(email);
    if (row) {
      foundRole = roleNames[i];
      break;
    }
  }

  if (!foundRole) return res.json(genericResponse);

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  resetTokens.set(token, { email, role: foundRole, expires: Date.now() + 3600000 });

  // Send reset email (fire-and-forget)
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransporter({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || "587", 10),
        secure: parseInt(SMTP_PORT || "587", 10) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      const resetLink = `${APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
      transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`,
      }).catch(() => {});
    } catch {
      // Silently ignore email errors
    }
  }

  res.json(genericResponse);
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

  const entry = resetTokens.get(token);
  if (!entry || Date.now() > entry.expires) {
    resetTokens.delete(token);
    return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
  }

  // Check password strength
  const strength = checkPasswordStrength(password);
  if (strength === 'weak') {
    return res.status(400).json({ success: false, message: "Please choose a stronger password" });
  }

  const tables = { student: "students", teacher: "teachers", parent: "parents", admin: "admins" };
  const table = tables[entry.role];

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE ${table} SET password = ? WHERE email = ?`).run(hash, entry.email);

  resetTokens.delete(token);

  res.json({ success: true, message: "Password reset successfully" });
});

module.exports = router;
