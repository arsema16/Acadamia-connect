/**
 * Bug Condition Exploration & Preservation Tests — New User Empty Dashboard
 *
 * Task 1: Bug condition tests MUST FAIL on unfixed code (failure confirms bug exists).
 * Task 2: Preservation tests MUST PASS on unfixed code (establishes baseline).
 *
 * Bug: routes/auth.js does `SELECT id FROM schools WHERE name = ?` — a case-sensitive
 * exact match. If a user types "addis high school" but the DB has "Addis High School",
 * a new duplicate school is created instead of reusing the existing one.
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a minimal in-memory SQLite DB that mirrors the real schema
 * (only the tables needed for registration tests).
 */
function createTestDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT UNIQUE,
      verified INTEGER DEFAULT 0
    );

    CREATE TABLE subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      school_id INTEGER,
      UNIQUE(name, school_id)
    );

    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      nickname TEXT,
      gender TEXT,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      school_id INTEGER,
      grade TEXT,
      section TEXT,
      parent_name TEXT,
      parent_contact TEXT,
      avatar TEXT DEFAULT 'scholar'
    );

    CREATE TABLE teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      employee_id TEXT NOT NULL UNIQUE,
      school_id INTEGER,
      subjects TEXT DEFAULT '[]',
      classes TEXT DEFAULT '[]',
      qualifications TEXT,
      experience TEXT,
      bio TEXT
    );

    CREATE TABLE parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      parental_status TEXT,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      school_id INTEGER,
      children TEXT DEFAULT '[]'
    );

    CREATE TABLE admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      school_id INTEGER
    );
  `);

  return db;
}

const DEFAULT_SUBJECTS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'History','Geography','Art','Music','Physical Education',
  'Computer Science','Amharic'
];

/**
 * Simulates the UNFIXED POST /api/auth/register handler from routes/auth.js verbatim.
 * Key bug: uses `SELECT id FROM schools WHERE name = ?` (case-sensitive exact match).
 * Does NOT use school_id from body even if provided.
 */
function unfixedRegisterHandler(db, body) {
  const { role, full_name, email, phone, password, school_name } = body;

  // Check for duplicate email
  const tables = ['students', 'teachers', 'parents', 'admins'];
  for (const table of tables) {
    const exists = db.prepare(`SELECT id FROM ${table} WHERE email = ?`).get(email);
    if (exists) return { status: 409, body: { success: false, message: 'Email already registered' } };
  }

  // Find or create school — UNFIXED: case-sensitive exact match, ignores school_id
  let school = db.prepare('SELECT id FROM schools WHERE name = ?').get(school_name);
  if (!school) {
    const result = db.prepare(
      'INSERT INTO schools (name, code, verified) VALUES (?, ?, 0)'
    ).run(school_name, 'SCH' + Date.now());
    school = { id: result.lastInsertRowid };
    DEFAULT_SUBJECTS.forEach(s =>
      db.prepare('INSERT OR IGNORE INTO subjects (name, school_id) VALUES (?, ?)').run(s, school.id)
    );
  }

  const hash = bcrypt.hashSync(password, 10);

  if (role === 'student') {
    const r = db.prepare(
      'INSERT INTO students (full_name,nickname,gender,email,phone,password,school_id,grade,section,parent_name,parent_contact,avatar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(
      full_name, body.nickname || '', body.gender || '', email, phone, hash,
      school.id, body.grade || '', body.section || '',
      body.parent_name || '', body.parent_contact || '', body.avatar || 'scholar'
    );
    return { status: 200, body: { success: true, userId: r.lastInsertRowid, role: 'student', school_id: school.id } };
  }

  return { status: 400, body: { success: false, message: 'Unsupported role in test' } };
}

/** Count all rows in the schools table */
function countSchools(db) {
  return db.prepare('SELECT COUNT(*) as c FROM schools').get().c;
}

/** Minimal valid student registration payload */
function studentPayload(overrides = {}) {
  return {
    role: 'student',
    full_name: 'Test Student',
    email: `student_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    phone: '+251911234567',
    password: 'Password1!',
    school_name: 'Test School',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1 — Bug Condition Exploration Tests
//
// Property 1: Bug Condition — School Selection Assigns Correct school_id
// These tests MUST FAIL on unfixed code to confirm the bug exists.
// DO NOT fix the code or tests when they fail — failure = bug confirmed.
//
// Validates: Requirements 1.1, 1.2, 2.1, 2.2
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 1 — Bug Condition: school_id assignment on casing/spacing variants (EXPECT FAIL on unfixed code)', () => {
  let db;
  let existingSchool;

  beforeEach(() => {
    db = createTestDb();

    // Seed an existing school with canonical casing
    const r1 = db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Addis High School', 'AHS001', 1)"
    ).run();
    existingSchool = { id: r1.lastInsertRowid };

    const r2 = db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Bole Primary', 'BP001', 1)"
    ).run();
    // store for trailing-space test
    db._bolePrimaryId = r2.lastInsertRowid;
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Case-variant test: register with school_name="addis high school" (all lowercase)
   * when DB has "Addis High School".
   * Expected (after fix): user.school_id === existingSchool.id, no new school created.
   * Actual (unfixed): new school created → user.school_id !== existingSchool.id
   *
   * Counterexample: user ends up with a new school_id (e.g. 3) instead of existingSchool.id (1)
   * because the case-sensitive SQL match fails and a new school record is inserted.
   *
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   */
  test('Case-variant: register with "addis high school" when DB has "Addis High School" → same school_id (EXPECT FAIL on unfixed code)', () => {
    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'addis high school' });

    const result = unfixedRegisterHandler(db, payload);

    expect(result.status).toBe(200);

    /**
     * Counterexample: result.body.school_id !== existingSchool.id
     * A new school "addis high school" was created (school count increased).
     */
    expect(result.body.school_id).toBe(existingSchool.id);
    expect(countSchools(db)).toBe(schoolsBefore); // no new school created
  });

  /**
   * Trailing-space test: register with school_name="Bole Primary " (trailing space)
   * when DB has "Bole Primary".
   * Expected (after fix): user.school_id === bolePrimaryId, no new school created.
   * Actual (unfixed): new school created → user.school_id !== bolePrimaryId
   *
   * Counterexample: user ends up with a new school_id because "Bole Primary " ≠ "Bole Primary"
   * in a case-sensitive exact match.
   *
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   */
  test('Trailing-space: register with "Bole Primary " when DB has "Bole Primary" → same school_id (EXPECT FAIL on unfixed code)', () => {
    const bolePrimaryId = db._bolePrimaryId;
    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'Bole Primary ' });

    const result = unfixedRegisterHandler(db, payload);

    expect(result.status).toBe(200);

    /**
     * Counterexample: result.body.school_id !== bolePrimaryId
     * A new school "Bole Primary " (with trailing space) was created.
     */
    expect(result.body.school_id).toBe(bolePrimaryId);
    expect(countSchools(db)).toBe(schoolsBefore); // no new school created
  });

  /**
   * school_id test: register with school_id=existingSchool.id (and any school_name).
   * Expected (after fix): user assigned to existingSchool.id, no new school created.
   * Actual (unfixed): school_id in body is ignored; school_name is used for find-or-create.
   * Since school_name here is a new name, a new school is created.
   *
   * Counterexample: user ends up with a new school_id instead of existingSchool.id
   * because the unfixed handler ignores req.body.school_id entirely.
   *
   * Validates: Requirements 2.2, 2.3
   */
  test('school_id provided: register with school_id=existingSchool.id → user assigned to that school (EXPECT FAIL on unfixed code)', () => {
    const schoolsBefore = countSchools(db);
    // Pass school_id explicitly; school_name is a new name to force the bug to surface
    const payload = studentPayload({
      school_name: 'Some New School Name That Does Not Exist',
      school_id: existingSchool.id,
    });

    const result = unfixedRegisterHandler(db, payload);

    expect(result.status).toBe(200);

    /**
     * Counterexample: result.body.school_id !== existingSchool.id
     * The unfixed handler ignores school_id and creates a new school from school_name.
     */
    expect(result.body.school_id).toBe(existingSchool.id);
    expect(countSchools(db)).toBe(schoolsBefore); // no new school created
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 2 — Preservation Property Tests
//
// Property 2: Preservation — New School Creation and Existing User Flows Unchanged
// These tests MUST PASS on unfixed code (establishes baseline to preserve).
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 2 — Preservation: new school creation and exact-match flows (EXPECT PASS on unfixed code)', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  /**
   * New school: register with a brand-new school name → new school record created
   * with default subjects inserted.
   *
   * Validates: Requirements 3.4 (default subjects), 3.1 (new school creation path)
   */
  test('New school: registering with a brand-new school name creates a new school record (EXPECT PASS on unfixed code)', () => {
    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'Brand New Academy' });

    const result = unfixedRegisterHandler(db, payload);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);

    // A new school record was created
    expect(countSchools(db)).toBe(schoolsBefore + 1);

    const newSchool = db.prepare("SELECT * FROM schools WHERE name = 'Brand New Academy'").get();
    expect(newSchool).not.toBeNull();
    expect(result.body.school_id).toBe(newSchool.id);
  });

  /**
   * Default subjects: registering with a brand-new school name inserts default subjects.
   *
   * Validates: Requirement 3.4
   */
  test('New school: default subjects are inserted for the new school (EXPECT PASS on unfixed code)', () => {
    const payload = studentPayload({ school_name: 'Sunrise Academy' });

    unfixedRegisterHandler(db, payload);

    const newSchool = db.prepare("SELECT * FROM schools WHERE name = 'Sunrise Academy'").get();
    expect(newSchool).not.toBeNull();

    const subjects = db.prepare('SELECT * FROM subjects WHERE school_id = ?').all(newSchool.id);
    expect(subjects.length).toBe(DEFAULT_SUBJECTS.length);

    const subjectNames = subjects.map(s => s.name);
    expect(subjectNames).toContain('Mathematics');
    expect(subjectNames).toContain('English');
    expect(subjectNames).toContain('Amharic');
  });

  /**
   * Exact match: register with school_name exactly matching an existing school
   * → same school_id assigned (works on unfixed code because exact match succeeds).
   *
   * Validates: Requirements 3.1, 3.2
   */
  test('Exact match: register with school_name exactly matching existing school → same school_id (EXPECT PASS on unfixed code)', () => {
    // Seed an existing school
    const r = db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Exact Match School', 'EMS001', 1)"
    ).run();
    const existingId = r.lastInsertRowid;

    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'Exact Match School' });

    const result = unfixedRegisterHandler(db, payload);

    expect(result.status).toBe(200);
    expect(result.body.school_id).toBe(existingId);
    expect(countSchools(db)).toBe(schoolsBefore); // no new school created
  });

  /**
   * School count: registering with a new school name increases school count by exactly 1.
   *
   * Validates: Requirement 3.4
   */
  test('School count: registering with a new school name increases school count by 1 (EXPECT PASS on unfixed code)', () => {
    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'Unique School ' + Date.now() });

    unfixedRegisterHandler(db, payload);

    expect(countSchools(db)).toBe(schoolsBefore + 1);
  });

  /**
   * School count: registering with an exact-match school name does NOT increase school count.
   *
   * Validates: Requirements 3.1, 3.2
   */
  test('School count: registering with an exact-match school name does NOT increase school count (EXPECT PASS on unfixed code)', () => {
    db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Stable School', 'SS001', 1)"
    ).run();

    const schoolsBefore = countSchools(db);
    const payload = studentPayload({ school_name: 'Stable School' });

    unfixedRegisterHandler(db, payload);

    expect(countSchools(db)).toBe(schoolsBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3.6 — Fix Verification Tests
//
// Re-run the same assertions from Task 1 but using the FIXED register handler.
// These tests MUST PASS to confirm the bug is fixed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates the FIXED POST /api/auth/register handler from routes/auth.js.
 * Key fix: prefers school_id if provided, then falls back to case-insensitive
 * LOWER(TRIM(name)) match, then creates a new school if still not found.
 */
function fixedRegisterHandler(db, body) {
  const { role, full_name, email, phone, password, school_name, school_id: bodySchoolId } = body;

  const tables = ['students', 'teachers', 'parents', 'admins'];
  for (const table of tables) {
    const exists = db.prepare(`SELECT id FROM ${table} WHERE email = ?`).get(email);
    if (exists) return { status: 409, body: { success: false, message: 'Email already registered' } };
  }

  // FIXED: prefer school_id, then case-insensitive name match, then create
  let school = null;
  if (bodySchoolId) {
    school = db.prepare('SELECT id FROM schools WHERE id = ?').get(bodySchoolId);
  }
  if (!school) {
    school = db.prepare("SELECT id FROM schools WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))").get(school_name);
  }
  if (!school) {
    const result = db.prepare(
      'INSERT INTO schools (name, code, verified) VALUES (?, ?, 0)'
    ).run(school_name, 'SCH' + Date.now());
    school = { id: result.lastInsertRowid };
    DEFAULT_SUBJECTS.forEach(s =>
      db.prepare('INSERT OR IGNORE INTO subjects (name, school_id) VALUES (?, ?)').run(s, school.id)
    );
  }

  const hash = bcrypt.hashSync(password, 10);

  if (role === 'student') {
    const r = db.prepare(
      'INSERT INTO students (full_name,nickname,gender,email,phone,password,school_id,grade,section,parent_name,parent_contact,avatar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(
      full_name, body.nickname || '', body.gender || '', email, phone, hash,
      school.id, body.grade || '', body.section || '',
      body.parent_name || '', body.parent_contact || '', body.avatar || 'scholar'
    );
    return { status: 200, body: { success: true, userId: r.lastInsertRowid, role: 'student', school_id: school.id } };
  }

  return { status: 400, body: { success: false, message: 'Unsupported role in test' } };
}

describe('Task 3.6 — Fix Verification: school_id assignment after fix (EXPECT PASS on fixed code)', () => {
  let db;
  let existingSchool;

  beforeEach(() => {
    db = createTestDb();
    const r1 = db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Addis High School', 'AHS001', 1)"
    ).run();
    existingSchool = { id: r1.lastInsertRowid };
    const r2 = db.prepare(
      "INSERT INTO schools (name, code, verified) VALUES ('Bole Primary', 'BP001', 1)"
    ).run();
    db._bolePrimaryId = r2.lastInsertRowid;
  });

  afterEach(() => { db.close(); });

  test('Case-variant: "addis high school" → assigned to existing school_id (EXPECT PASS on fixed code)', () => {
    const schoolsBefore = countSchools(db);
    const result = fixedRegisterHandler(db, studentPayload({ school_name: 'addis high school' }));
    expect(result.status).toBe(200);
    expect(result.body.school_id).toBe(existingSchool.id);
    expect(countSchools(db)).toBe(schoolsBefore);
  });

  test('Trailing-space: "Bole Primary " → assigned to existing school_id (EXPECT PASS on fixed code)', () => {
    const schoolsBefore = countSchools(db);
    const result = fixedRegisterHandler(db, studentPayload({ school_name: 'Bole Primary ' }));
    expect(result.status).toBe(200);
    expect(result.body.school_id).toBe(db._bolePrimaryId);
    expect(countSchools(db)).toBe(schoolsBefore);
  });

  test('school_id provided: user assigned to that school regardless of school_name (EXPECT PASS on fixed code)', () => {
    const schoolsBefore = countSchools(db);
    const result = fixedRegisterHandler(db, studentPayload({
      school_name: 'Some Random Name',
      school_id: existingSchool.id,
    }));
    expect(result.status).toBe(200);
    expect(result.body.school_id).toBe(existingSchool.id);
    expect(countSchools(db)).toBe(schoolsBefore);
  });

  test('New school: brand-new name still creates a new school (preservation)', () => {
    const schoolsBefore = countSchools(db);
    const result = fixedRegisterHandler(db, studentPayload({ school_name: 'Totally New School XYZ' }));
    expect(result.status).toBe(200);
    expect(countSchools(db)).toBe(schoolsBefore + 1);
  });
});
