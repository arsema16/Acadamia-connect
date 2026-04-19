const express = require("express");
const router = express.Router();
const { db } = require("../db/database");
const { requireAuthWithSchool } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const auth = requireAuthWithSchool(null);

const msgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/files/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const msgUpload = multer({ storage: msgStorage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get("/notifications", auth, (req, res) => {
  const notifs = db.prepare("SELECT * FROM notifications WHERE user_id=? AND user_role=? ORDER BY created_at DESC LIMIT 20").all(req.userId, req.userRole);
  const unreadCount = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND user_role=? AND read_status=0").get(req.userId, req.userRole).c;
  res.json({ success: true, notifications: notifs, unreadCount });
});

router.put("/notifications/read", auth, (req, res) => {
  const { notificationIds } = req.body;
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => '?').join(',');
    db.prepare(`UPDATE notifications SET read_status=1 WHERE id IN (${placeholders}) AND user_id=?`).run(...notificationIds, req.userId);
  } else {
    db.prepare("UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=?").run(req.userId, req.userRole);
  }
  res.json({ success: true });
});

router.put("/notifications/read-all", auth, (req, res) => {
  db.prepare("UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=?").run(req.userId, req.userRole);
  res.json({ success: true });
});

router.get("/announcements", auth, (req, res) => {
  const announcements = db.prepare("SELECT * FROM announcements WHERE school_id=? ORDER BY created_at DESC").all(req.schoolId);
  res.json({ success: true, announcements });
});

// ===== VIDEO FEED (TikTok-Style) =====
router.get("/videos", auth, (req, res) => {
  const { isMotivational } = req.query;
  let query = `SELECT v.*, 
    COALESCE(t.full_name, a.full_name) as uploader_name,
    (SELECT COUNT(*) FROM video_likes vl WHERE vl.video_id = v.id) as like_count,
    (SELECT COUNT(*) FROM video_comments vc WHERE vc.video_id = v.id) as comment_count,
    (SELECT COUNT(*) FROM video_likes vl2 WHERE vl2.video_id = v.id AND vl2.user_id = ? AND vl2.user_role = ?) as user_liked
    FROM videos v 
    LEFT JOIN teachers t ON v.uploader_id=t.id AND v.uploader_role='teacher' 
    LEFT JOIN admins a ON v.uploader_id=a.id AND v.uploader_role='admin' 
    WHERE v.school_id=? AND v.approved=1`;
  
  const params = [req.userId, req.userRole, req.schoolId];
  
  if (isMotivational !== undefined) {
    query += " AND v.is_motivational=?";
    params.push(parseInt(isMotivational));
  }
  
  query += " ORDER BY v.created_at DESC";
  
  const videos = db.prepare(query).all(...params);
  res.json({ success: true, videos });
});

router.post("/video-like", auth, (req, res) => {
  const { video_id } = req.body;
  
  // Verify video belongs to user's school
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(video_id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  
  const existing = db.prepare("SELECT id FROM video_likes WHERE video_id=? AND user_id=? AND user_role=?").get(video_id, req.userId, req.userRole);
  if (existing) {
    db.prepare("DELETE FROM video_likes WHERE id=?").run(existing.id);
    db.prepare("UPDATE videos SET likes=likes-1 WHERE id=?").run(video_id);
    const likes = db.prepare("SELECT likes FROM videos WHERE id=?").get(video_id).likes;
    return res.json({ success: true, liked: false, likes });
  }
  db.prepare("INSERT INTO video_likes (video_id,user_id,user_role) VALUES (?,?,?)").run(video_id, req.userId, req.userRole);
  db.prepare("UPDATE videos SET likes=likes+1 WHERE id=?").run(video_id);
  const likes = db.prepare("SELECT likes FROM videos WHERE id=?").get(video_id).likes;
  res.json({ success: true, liked: true, likes });
});

router.get("/video-comments/:video_id", auth, (req, res) => {
  // Verify video belongs to user's school
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(req.params.video_id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  
  const comments = db.prepare(`SELECT vc.*, 
    COALESCE(s.full_name, t.full_name, p.full_name) as author_name 
    FROM video_comments vc 
    LEFT JOIN students s ON vc.user_id=s.id AND vc.user_role='student' 
    LEFT JOIN teachers t ON vc.user_id=t.id AND vc.user_role='teacher' 
    LEFT JOIN parents p ON vc.user_id=p.id AND vc.user_role='parent' 
    WHERE vc.video_id=? ORDER BY vc.created_at ASC`).all(req.params.video_id);
  res.json({ success: true, comments });
});

router.post("/video-comment", auth, (req, res) => {
  const { video_id, content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ success: false, message: "Comment content required" });
  
  // Verify video belongs to user's school
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(video_id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  
  const r = db.prepare("INSERT INTO video_comments (video_id,user_id,user_role,content) VALUES (?,?,?,?)").run(video_id, req.userId, req.userRole, content);
  
  // Get the inserted comment with author name
  const comment = db.prepare(`SELECT vc.*, 
    COALESCE(s.full_name, t.full_name, p.full_name) as author_name 
    FROM video_comments vc 
    LEFT JOIN students s ON vc.user_id=s.id AND vc.user_role='student' 
    LEFT JOIN teachers t ON vc.user_id=t.id AND vc.user_role='teacher' 
    LEFT JOIN parents p ON vc.user_id=p.id AND vc.user_role='parent' 
    WHERE vc.id=?`).get(r.lastInsertRowid);
  
  res.json({ success: true, comment });
});

router.post("/video-view", auth, (req, res) => {
  const { video_id } = req.body;
  
  // Verify video belongs to user's school
  const video = db.prepare("SELECT id FROM videos WHERE id=? AND school_id=?").get(video_id, req.schoolId);
  if (!video) return res.status(404).json({ success: false, message: "Video not found" });
  
  // Record view (avoid duplicates per session)
  const existing = db.prepare("SELECT id FROM video_views WHERE video_id=? AND user_id=? AND user_role=? AND viewed_at > datetime('now', '-1 hour')").get(video_id, req.userId, req.userRole);
  if (!existing) {
    db.prepare("INSERT INTO video_views (video_id,user_id,user_role) VALUES (?,?,?)").run(video_id, req.userId, req.userRole);
    db.prepare("UPDATE videos SET views=views+1 WHERE id=?").run(video_id);
  }
  
  res.json({ success: true });
});

// ===== TELEGRAM-STYLE MESSAGING =====
router.post("/send-message", auth, msgUpload.single("media"), (req, res) => {
  const { receiver_id, receiver_role, content, reply_to } = req.body;
  
  if (!receiver_id || !receiver_role || !content) {
    return res.status(400).json({ success: false, message: "receiver_id, receiver_role, and content are required" });
  }
  
  // Verify receiver belongs to same school
  const tables = { student: "students", teacher: "teachers", parent: "parents", admin: "admins" };
  const table = tables[receiver_role];
  if (!table) return res.status(400).json({ success: false, message: "Invalid receiver role" });
  
  const receiver = db.prepare(`SELECT id FROM ${table} WHERE id=? AND school_id=?`).get(receiver_id, req.schoolId);
  if (!receiver) return res.status(404).json({ success: false, message: "Receiver not found in your school" });
  
  const media_url = req.file ? "/uploads/files/" + req.file.filename : null;
  const media_type = req.file ? (req.file.mimetype.startsWith("image") ? "image" : req.file.mimetype.startsWith("audio") ? "audio" : "file") : null;
  
  const r = db.prepare(`INSERT INTO messages (sender_id,sender_role,receiver_id,receiver_role,content,media_url,media_type,reply_to,school_id,read_status) VALUES (?,?,?,?,?,?,?,?,?,0)`).run(
    req.userId, req.userRole, receiver_id, receiver_role, content, media_url, media_type, reply_to || null, req.schoolId
  );
  
  let message = db.prepare("SELECT * FROM messages WHERE id=?").get(r.lastInsertRowid);
  
  // Attach reply context if replying
  if (reply_to) {
    message.reply_context = db.prepare("SELECT * FROM messages WHERE id=?").get(reply_to);
  }
  
  // Create notification for receiver
  db.prepare("INSERT INTO notifications (user_id,user_role,title,body,type,school_id) VALUES (?,?,?,?,?,?)").run(
    receiver_id, receiver_role, "New Message", `New message from ${req.userRole}`, "message", req.schoolId
  );
  
  // Emit via Socket.IO if available
  const io = req.app.get("io");
  if (io) {
    io.to(`${receiver_id}_${receiver_role}`).emit("new_message", message);
  }
  
  res.json({ success: true, message });
});

router.get("/messages/:conversationId", auth, (req, res) => {
  const { conversationId } = req.params;
  const [otherId, otherRole] = conversationId.split("_");
  
  const messages = db.prepare(`SELECT * FROM messages 
    WHERE school_id=? AND (
      (sender_id=? AND sender_role=? AND receiver_id=? AND receiver_role=?) OR
      (sender_id=? AND sender_role=? AND receiver_id=? AND receiver_role=?)
    ) ORDER BY created_at ASC`).all(
    req.schoolId,
    req.userId, req.userRole, otherId, otherRole,
    otherId, otherRole, req.userId, req.userRole
  );
  
  // Mark messages as read
  db.prepare("UPDATE messages SET read_status=1 WHERE receiver_id=? AND receiver_role=? AND sender_id=? AND sender_role=? AND school_id=?").run(
    req.userId, req.userRole, otherId, otherRole, req.schoolId
  );
  
  // Emit read receipt
  const io = req.app.get("io");
  if (io) {
    io.to(`${otherId}_${otherRole}`).emit("message_read", { readBy: req.userId, readByRole: req.userRole });
  }
  
  res.json({ success: true, messages });
});

router.post("/mark-read", auth, (req, res) => {
  const { messageIds } = req.body;
  if (!messageIds || !messageIds.length) return res.status(400).json({ success: false, message: "messageIds required" });
  
  const placeholders = messageIds.map(() => '?').join(',');
  db.prepare(`UPDATE messages SET read_status=1 WHERE id IN (${placeholders}) AND receiver_id=? AND school_id=?`).run(...messageIds, req.userId, req.schoolId);
  
  res.json({ success: true });
});

router.post("/pin-message", auth, (req, res) => {
  const { messageId, pinned } = req.body;
  
  // Verify message belongs to this conversation and school
  const msg = db.prepare("SELECT * FROM messages WHERE id=? AND school_id=? AND (sender_id=? OR receiver_id=?)").get(messageId, req.schoolId, req.userId, req.userId);
  if (!msg) return res.status(404).json({ success: false, message: "Message not found" });
  
  db.prepare("UPDATE messages SET pinned=? WHERE id=?").run(pinned ? 1 : 0, messageId);
  res.json({ success: true });
});

router.post("/star-message", auth, (req, res) => {
  const { messageId, starred } = req.body;
  
  const msg = db.prepare("SELECT * FROM messages WHERE id=? AND school_id=? AND (sender_id=? OR receiver_id=?)").get(messageId, req.schoolId, req.userId, req.userId);
  if (!msg) return res.status(404).json({ success: false, message: "Message not found" });
  
  db.prepare("UPDATE messages SET starred=? WHERE id=?").run(starred ? 1 : 0, messageId);
  res.json({ success: true });
});

router.delete("/message/:id", auth, (req, res) => {
  // Only sender can delete their own message
  const result = db.prepare("DELETE FROM messages WHERE id=? AND sender_id=? AND sender_role=? AND school_id=?").run(req.params.id, req.userId, req.userRole, req.schoolId);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Message not found or not authorized" });
  res.json({ success: true });
});

router.get("/search-messages", auth, (req, res) => {
  const { conversationId, query } = req.query;
  if (!conversationId || !query) return res.status(400).json({ success: false, message: "conversationId and query required" });
  
  const [otherId, otherRole] = conversationId.split("_");
  
  const messages = db.prepare(`SELECT * FROM messages 
    WHERE school_id=? AND content LIKE ? AND (
      (sender_id=? AND sender_role=? AND receiver_id=? AND receiver_role=?) OR
      (sender_id=? AND sender_role=? AND receiver_id=? AND receiver_role=?)
    ) ORDER BY created_at DESC LIMIT 50`).all(
    req.schoolId, `%${query}%`,
    req.userId, req.userRole, otherId, otherRole,
    otherId, otherRole, req.userId, req.userRole
  );
  
  res.json({ success: true, messages });
});

router.get("/events", auth, (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE school_id=? ORDER BY event_date ASC").all(req.schoolId);
  res.json({ success: true, events });
});

module.exports = router;
