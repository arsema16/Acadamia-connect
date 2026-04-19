const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const db = new Database(path.join(__dirname, "academia.db"));

function initDB() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT UNIQUE,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      school_id INTEGER,
      FOREIGN KEY(school_id) REFERENCES schools(id),
      UNIQUE(name, school_id)
    );

    CREATE TABLE IF NOT EXISTS students (
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
      avatar TEXT DEFAULT 'scholar',
      id_photo TEXT,
      points INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_study_date TEXT,
      reward_minutes INTEGER DEFAULT 0,
      reward_expires TEXT,
      interests TEXT DEFAULT '[]',
      theme TEXT DEFAULT 'dark-academia',
      language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS teachers (
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
      availability TEXT,
      profile_image TEXT,
      bio TEXT,
      id_upload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      parental_status TEXT,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      school_id INTEGER,
      children TEXT DEFAULT '[]',
      payment_reminders INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT DEFAULT 'Medium',
      notes TEXT,
      recurring TEXT DEFAULT 'none',
      completed INTEGER DEFAULT 0,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      date TEXT,
      max_marks REAL,
      marks_obtained REAL,
      percentage REAL,
      grade TEXT,
      comments TEXT,
      topics TEXT,
      sent_to_parent INTEGER DEFAULT 0,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(teacher_id) REFERENCES teachers(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(teacher_id) REFERENCES teachers(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      receiver_id INTEGER NOT NULL,
      receiver_role TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      media_type TEXT,
      read_status INTEGER DEFAULT 0,
      starred INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      reply_to INTEGER,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT,
      read_status INTEGER DEFAULT 0,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      author_role TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_roles TEXT DEFAULT 'all',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploader_id INTEGER NOT NULL,
      uploader_role TEXT NOT NULL,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      thumbnail TEXT,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      is_motivational INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject TEXT,
      questions TEXT NOT NULL,
      time_limit INTEGER DEFAULT 30,
      reward_minutes INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      score INTEGER,
      total INTEGER,
      answers TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      start_date TEXT,
      end_date TEXT,
      reward_points INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      week TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      fee_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      paid_date TEXT,
      receipt_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(parent_id) REFERENCES parents(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject TEXT,
      duration INTEGER DEFAULT 0,
      date TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      badge_type TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      school_id INTEGER,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      event_type TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS challenge_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      interest TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      completed_lessons TEXT DEFAULT '[]',
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      type TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS parent_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      grade TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES parent_groups(id)
    );

    CREATE TABLE IF NOT EXISTS video_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS video_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS kudos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_student_id INTEGER NOT NULL,
      to_student_id INTEGER NOT NULL,
      message TEXT,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(from_student_id) REFERENCES students(id),
      FOREIGN KEY(to_student_id) REFERENCES students(id),
      FOREIGN KEY(school_id) REFERENCES schools(id)
    );

    -- New tables for V2 features
    CREATE TABLE IF NOT EXISTS student_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
      UNIQUE(student_id, subject_id, school_id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      description TEXT,
      uploader_id INTEGER NOT NULL,
      uploader_role TEXT NOT NULL,
      school_id INTEGER NOT NULL,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      marked_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY(marked_by) REFERENCES admins(id),
      UNIQUE(teacher_id, date)
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      meeting_url TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      invited_students TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_name TEXT NOT NULL,
      points_cost INTEGER NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- New tables for V2 Extended features (Tasks 23-34)
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'club',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS club_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      UNIQUE(club_id, user_id, user_role)
    );

    CREATE TABLE IF NOT EXISTS approved_audio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      track_id TEXT NOT NULL,
      track_name TEXT NOT NULL,
      approved_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS school_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      campaign_type TEXT DEFAULT 'general',
      start_date TEXT,
      end_date TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaign_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      video_id INTEGER,
      description TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES school_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      coins_earned INTEGER DEFAULT 0,
      level TEXT DEFAULT 'easy',
      subject TEXT,
      school_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS multiplayer_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type TEXT NOT NULL,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      winner_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      issued_by INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interest TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      level INTEGER DEFAULT 1,
      total_lessons INTEGER DEFAULT 0,
      school_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      video_url TEXT,
      order_num INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      path_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE(student_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      thumbnail TEXT,
      genre TEXT DEFAULT 'educational',
      approved INTEGER DEFAULT 0,
      uploaded_by INTEGER NOT NULL,
      uploader_role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      response TEXT DEFAULT 'yes',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(event_id, user_id, user_role)
    );

    CREATE TABLE IF NOT EXISTS class_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT,
      section TEXT,
      room TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      recurrence TEXT DEFAULT 'one-time',
      target_grades TEXT DEFAULT 'all',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add new columns to existing tables (safe ALTER TABLE)
  const alterStatements = [
    "ALTER TABLE students ADD COLUMN xp_points INTEGER DEFAULT 0",
    "ALTER TABLE students ADD COLUMN coins INTEGER DEFAULT 0",
    "ALTER TABLE students ADD COLUMN level INTEGER DEFAULT 1",
    "ALTER TABLE students ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE teachers ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE parents ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE videos ADD COLUMN club_id INTEGER",
    "ALTER TABLE videos ADD COLUMN campaign_id INTEGER",
    "ALTER TABLE videos ADD COLUMN audio_approved INTEGER DEFAULT 1",
    "ALTER TABLE videos ADD COLUMN moderation_status TEXT DEFAULT 'pending'",
    "ALTER TABLE videos ADD COLUMN moderation_reason TEXT"
  ];

  for (const stmt of alterStatements) {
    try { db.exec(stmt); } catch(e) { /* Column already exists */ }
  }

  seedData();
}

/**
 * Add performance indexes for V2
 * Called after initDB to ensure tables exist
 */
function addIndexes() {
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_school ON tasks(school_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_school ON assessments(school_id);
      CREATE INDEX IF NOT EXISTS idx_messages_school ON messages(school_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, receiver_role);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_role);
      CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_subjects_school ON student_subjects(school_id);
      CREATE INDEX IF NOT EXISTS idx_materials_school ON materials(school_id);
      CREATE INDEX IF NOT EXISTS idx_videos_school ON videos(school_id);
      CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
      CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
    `);
  } catch(e) {
    // Indexes may already exist
  }
}

function seedData() {
  const schoolCount = db.prepare("SELECT COUNT(*) as c FROM schools").get();
  if (schoolCount.c > 0) return;

  const insertSchool = db.prepare("INSERT OR IGNORE INTO schools (name, code, verified) VALUES (?, ?, 1)");
  insertSchool.run("Academia High School", "AHS001");
  insertSchool.run("Addis Ababa International School", "AAIS002");

  const school1 = db.prepare("SELECT id FROM schools WHERE code = 'AHS001'").get();
  const school2 = db.prepare("SELECT id FROM schools WHERE code = 'AAIS002'").get();

  const defaultSubjects = ["Mathematics","Physics","Chemistry","Biology","English","History","Geography","Art","Music","Physical Education","Computer Science","Foreign Languages","Amharic"];
  const insertSubject = db.prepare("INSERT OR IGNORE INTO subjects (name, school_id) VALUES (?, ?)");
  defaultSubjects.forEach(s => {
    insertSubject.run(s, school1.id);
    insertSubject.run(s, school2.id);
  });

  const hash = bcrypt.hashSync("password123", 10);

  const insertStudent = db.prepare(`INSERT OR IGNORE INTO students (full_name,nickname,gender,email,phone,password,school_id,grade,section,parent_name,parent_contact,avatar,points,streak) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insertStudent.run("Abebe Kebede","Abe","Male","abebe@student.com","+251911234567",hash,school1.id,"Grade 10","A","Kebede Alemu","+251922345678","scholar",250,5);
  insertStudent.run("Tigist Haile","Tigi","Female","tigist@student.com","+251911234568",hash,school1.id,"Grade 8","B","Haile Girma","+251922345679","owl",180,3);
  insertStudent.run("Dawit Bekele","Dawi","Male","dawit@student.com","+251911234569",hash,school1.id,"Grade 12","A","Bekele Tadesse","+251922345680","books",320,7);
  insertStudent.run("Sara Tesfaye","Sara","Female","sara@student.com","+251911234570",hash,school1.id,"Grade 5","C","Tesfaye Worku","+251922345681","lamp",90,2);
  insertStudent.run("Yonas Girma","Yoni","Male","yonas@student.com","+251911234571",hash,school1.id,"Grade 11","A","Girma Tadesse","+251922345682","globe",210,4);

  const insertTeacher = db.prepare(`INSERT OR IGNORE INTO teachers (full_name,email,phone,password,employee_id,school_id,subjects,classes,experience,bio) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertTeacher.run("Dr. Almaz Tadesse","almaz@teacher.com","+251933456789",hash,"TCH001",school1.id,JSON.stringify(["Mathematics","Physics"]),JSON.stringify(["Grade 10A","Grade 11A","Grade 12A"]),"10+ years","Passionate mathematics educator with 10+ years experience.");
  insertTeacher.run("Ato Bereket Hailu","bereket@teacher.com","+251933456790",hash,"TCH002",school1.id,JSON.stringify(["English","History"]),JSON.stringify(["Grade 8B","Grade 9A","Grade 10A"]),"5-10 years","English literature specialist dedicated to student growth.");
  insertTeacher.run("W/ro Selamawit Bekele","selamawit@teacher.com","+251933456791",hash,"TCH003",school1.id,JSON.stringify(["Biology","Chemistry"]),JSON.stringify(["Grade 10A","Grade 11A"]),"3-5 years","Science teacher focused on hands-on learning.");

  const insertParent = db.prepare(`INSERT OR IGNORE INTO parents (full_name,parental_status,phone,email,password,school_id,children) VALUES (?,?,?,?,?,?,?)`);
  insertParent.run("Kebede Alemu","Father","+251922345678","kebede@parent.com",hash,school1.id,JSON.stringify(["abebe@student.com"]));
  insertParent.run("Haile Girma","Father","+251922345679","haile@parent.com",hash,school1.id,JSON.stringify(["tigist@student.com"]));
  insertParent.run("Tesfaye Worku","Father","+251922345681","tesfaye@parent.com",hash,school1.id,JSON.stringify(["sara@student.com","yonas@student.com"]));

  const insertAdmin = db.prepare(`INSERT OR IGNORE INTO admins (full_name,email,phone,password,school_id) VALUES (?,?,?,?,?)`);
  insertAdmin.run("Admin User","admin@academia.com","+251900000001",hash,school1.id);

  const s1 = db.prepare("SELECT id FROM students WHERE email = 'abebe@student.com'").get();
  const s2 = db.prepare("SELECT id FROM students WHERE email = 'tigist@student.com'").get();
  const s3 = db.prepare("SELECT id FROM students WHERE email = 'dawit@student.com'").get();
  const t1 = db.prepare("SELECT id FROM teachers WHERE email = 'almaz@teacher.com'").get();
  const t2 = db.prepare("SELECT id FROM teachers WHERE email = 'bereket@teacher.com'").get();

  if (s1 && t1) {
    const insertTask = db.prepare("INSERT OR IGNORE INTO tasks (student_id,title,subject,due_date,priority,notes) VALUES (?,?,?,?,?,?)");
    insertTask.run(s1.id,"Complete Math Homework","Mathematics","2026-04-20","High","Chapter 5 exercises");
    insertTask.run(s1.id,"Read History Chapter","History","2026-04-21","Medium","Pages 45-60");
    insertTask.run(s2.id,"Science Project","Biology","2026-04-22","High","Ecosystem diagram");
    insertTask.run(s3.id,"Essay Writing","English","2026-04-19","High","500 words on Shakespeare");

    const insertAssessment = db.prepare("INSERT OR IGNORE INTO assessments (student_id,teacher_id,subject,assessment_type,date,max_marks,marks_obtained,percentage,grade,comments) VALUES (?,?,?,?,?,?,?,?,?,?)");
    insertAssessment.run(s1.id,t1.id,"Mathematics","Midterm Exam","2026-03-15",100,85,85,"A","Excellent work on algebra section");
    insertAssessment.run(s1.id,t1.id,"Physics","Test 1","2026-03-20",50,42,84,"A","Good understanding of mechanics");
    insertAssessment.run(s2.id,t2.id,"English","Assignment 1","2026-03-18",30,25,83.3,"B+","Well-written essay");
    insertAssessment.run(s3.id,t1.id,"Mathematics","Final Exam","2026-03-25",100,92,92,"A+","Outstanding performance");

    const insertAttendance = db.prepare("INSERT OR IGNORE INTO attendance (student_id,teacher_id,date,status) VALUES (?,?,?,?)");
    const dates = ["2026-04-01","2026-04-02","2026-04-03","2026-04-07","2026-04-08","2026-04-09","2026-04-10","2026-04-14","2026-04-15","2026-04-16"];
    dates.forEach(d => {
      insertAttendance.run(s1.id,t1.id,d,Math.random()>0.1?"Present":"Absent");
      insertAttendance.run(s2.id,t2.id,d,Math.random()>0.1?"Present":"Late");
    });

    const insertMsg = db.prepare("INSERT OR IGNORE INTO messages (sender_id,sender_role,receiver_id,receiver_role,content,school_id) VALUES (?,?,?,?,?,?)");
    insertMsg.run(t1.id,"teacher",1,"parent","Abebe is doing excellent in Mathematics this term!",school1.id);
    insertMsg.run(1,"parent",t1.id,"teacher","Thank you for the update. We will keep encouraging him.",school1.id);

    const insertAnnouncement = db.prepare("INSERT OR IGNORE INTO announcements (school_id,author_id,author_role,title,content) VALUES (?,?,?,?,?)");
    insertAnnouncement.run(school1.id,1,"admin","Welcome Back!","Welcome to the new semester. Please check your schedules.");
    insertAnnouncement.run(school1.id,t1.id,"teacher","Math Exam Next Week","Midterm mathematics exam scheduled for next Monday.");

    const insertPayment = db.prepare("INSERT OR IGNORE INTO payments (parent_id,student_id,school_id,amount,fee_type,status,due_date) VALUES (?,?,?,?,?,?,?)");
    insertPayment.run(1,s1.id,school1.id,5000,"Tuition Fee","paid","2026-04-01");
    insertPayment.run(2,s2.id,school1.id,5000,"Tuition Fee","pending","2026-04-01");

    const insertBadge = db.prepare("INSERT OR IGNORE INTO badges (student_id,badge_type,badge_name) VALUES (?,?,?)");
    insertBadge.run(s1.id,"academic","Math Master");
    insertBadge.run(s1.id,"consistency","5-Day Streak");
    insertBadge.run(s3.id,"academic","Top Scholar");
  }
}

module.exports = { db, initDB, addIndexes };
