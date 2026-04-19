/**
 * Notification Service — Academia Connect
 *
 * createNotification(db, userId, userRole, title, body, type)
 *   - Inserts a record into the `notifications` table (always)
 *   - Fire-and-forget email dispatch for: assessment_result, password_reset, meeting_confirmation
 *   - Fire-and-forget Web Push dispatch for: task_reminder, new_message, assessment_result, attendance_alert
 *
 * Requirements: 17.1, 17.2, 17.4, 17.5
 */

"use strict";

// ─── Email (nodemailer) ───────────────────────────────────────────────────────

const EMAIL_TYPES = new Set([
  "assessment_result",
  "password_reset",
  "meeting_confirmation",
]);

function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  try {
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587", 10),
      secure: parseInt(SMTP_PORT || "587", 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } catch {
    return null;
  }
}

/**
 * Look up the email address for a user by role.
 * Returns null if not found.
 */
function getUserEmail(db, userId, userRole) {
  const tables = {
    student: "students",
    teacher: "teachers",
    parent: "parents",
    admin: "admins",
  };
  const table = tables[userRole];
  if (!table) return null;
  try {
    const row = db.prepare(`SELECT email FROM ${table} WHERE id = ?`).get(userId);
    return row ? row.email : null;
  } catch {
    return null;
  }
}

function dispatchEmail(db, userId, userRole, title, body) {
  // Fire-and-forget — never throws
  setImmediate(() => {
    try {
      const transporter = buildTransporter();
      if (!transporter) return;

      const to = getUserEmail(db, userId, userRole);
      if (!to) return;

      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      transporter.sendMail({ from, to, subject: title, text: body }).catch(() => {});
    } catch {
      // Silently ignore all errors
    }
  });
}

// ─── Web Push ─────────────────────────────────────────────────────────────────

const PUSH_TYPES = new Set([
  "task_reminder",
  "new_message",
  "assessment_result",
  "attendance_alert",
]);

function buildWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;

  try {
    const webpush = require("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@academia.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    return webpush;
  } catch {
    return null;
  }
}

/**
 * Fetch all push subscriptions for a user from the `push_subscriptions` table.
 * Returns an empty array if the table doesn't exist or no rows are found.
 */
function getPushSubscriptions(db, userId, userRole) {
  try {
    const rows = db
      .prepare(
        "SELECT subscription FROM push_subscriptions WHERE user_id = ? AND user_role = ?"
      )
      .all(userId, userRole);
    return rows.map((r) => {
      try {
        return typeof r.subscription === "string"
          ? JSON.parse(r.subscription)
          : r.subscription;
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    // Table likely doesn't exist — skip gracefully
    return [];
  }
}

function dispatchPush(db, userId, userRole, title, body) {
  // Fire-and-forget — never throws
  setImmediate(() => {
    try {
      const webpush = buildWebPush();
      if (!webpush) return;

      const subscriptions = getPushSubscriptions(db, userId, userRole);
      if (!subscriptions.length) return;

      const payload = JSON.stringify({ title, body });
      subscriptions.forEach((sub) => {
        webpush.sendNotification(sub, payload).catch(() => {});
      });
    } catch {
      // Silently ignore all errors
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * createNotification(db, userId, userRole, title, body, type)
 *
 * Always inserts into the `notifications` table.
 * Optionally dispatches email and/or push notifications based on `type`.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {string} userRole  - "student" | "teacher" | "parent" | "admin"
 * @param {string} title
 * @param {string} body
 * @param {string} type      - notification type string
 * @returns {number}         - lastInsertRowid
 */
function createNotification(db, userId, userRole, title, body, type) {
  const result = db
    .prepare(
      "INSERT INTO notifications (user_id, user_role, title, body, type) VALUES (?, ?, ?, ?, ?)"
    )
    .run(userId, userRole, title, body, type);

  if (EMAIL_TYPES.has(type)) {
    dispatchEmail(db, userId, userRole, title, body);
  }

  if (PUSH_TYPES.has(type)) {
    dispatchPush(db, userId, userRole, title, body);
  }

  return result.lastInsertRowid;
}

module.exports = { createNotification };
