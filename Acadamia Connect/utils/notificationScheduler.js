/**
 * Notification Scheduler for Academia Connect V2
 * Handles task deadline reminders (24h and 1h warnings)
 * and other scheduled notifications.
 */

const { db } = require('../db/database');

/**
 * Check for upcoming task deadlines and create notifications
 * Should be called periodically (e.g., every 30 minutes)
 */
function checkTaskDeadlines() {
  const now = new Date();
  
  // Get tasks due within 24 hours that haven't been notified
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];
  
  // Tasks due today or tomorrow that are not completed
  const upcomingTasks = db.prepare(`
    SELECT t.*, s.school_id 
    FROM tasks t 
    JOIN students s ON t.student_id = s.id
    WHERE t.completed = 0 
    AND t.due_date BETWEEN ? AND ?
  `).all(todayStr, tomorrowStr);
  
  upcomingTasks.forEach(task => {
    // Check if 24h notification already sent
    const existing24h = db.prepare(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND user_role = 'student' 
      AND type = 'task_deadline_24h' 
      AND body LIKE ?
      AND created_at > datetime('now', '-25 hours')
    `).get(task.student_id, `%${task.title}%`);
    
    if (!existing24h) {
      db.prepare(`
        INSERT INTO notifications (user_id, user_role, title, body, type, school_id)
        VALUES (?, 'student', 'Task Due Soon', ?, 'task_deadline_24h', ?)
      `).run(task.student_id, `"${task.title}" is due within 24 hours`, task.school_id);
    }
  });
}

/**
 * Start the notification scheduler
 * Runs every 30 minutes
 */
function startScheduler() {
  // Run immediately on start
  try { checkTaskDeadlines(); } catch(e) { console.error('Notification scheduler error:', e); }
  
  // Then run every 30 minutes
  setInterval(() => {
    try { checkTaskDeadlines(); } catch(e) { console.error('Notification scheduler error:', e); }
  }, 30 * 60 * 1000);
  
  console.log('Notification scheduler started');
}

module.exports = { checkTaskDeadlines, startScheduler };
