const { pool } = require('../config/db');
const { randomUUID } = require('crypto');

const VALID_STATUSES = new Set(['Pending', 'In Progress', 'Resolved', 'Rejected']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Emergency']);

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseTimeline(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function mapComplaint(row) {
  return {
    id: row.public_id,
    title: row.title,
    cat: row.category,
    pri: row.priority,
    hostel: row.hostel,
    room: row.room,
    student: row.student_name,
    studentUserId: row.student_user_id,
    prn: row.student_prn || '',
    status: row.status,
    warden: row.warden,
    staff: row.staff || '',
    date: new Date(row.created_at).toISOString(),
    desc: row.description,
    t: parseTimeline(row.timeline_json),
    rating: row.rating || 0,
    remarks: row.remarks || '',
    feedback: row.feedback || '',
  };
}

async function ensureComplaintSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hostelcare_complaint (
      complaint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      public_id VARCHAR(24) NOT NULL,
      student_user_id BIGINT NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      student_prn VARCHAR(32) NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      priority VARCHAR(20) NOT NULL,
      hostel VARCHAR(100) NOT NULL,
      room VARCHAR(20) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      warden VARCHAR(255) NOT NULL,
      staff VARCHAR(255) NULL,
      description TEXT NOT NULL,
      timeline_json LONGTEXT NOT NULL,
      remarks TEXT NULL,
      rating TINYINT UNSIGNED NULL,
      feedback TEXT NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (complaint_id),
      UNIQUE KEY uq_hostelcare_complaint_public_id (public_id),
      KEY idx_hostelcare_complaint_student (student_user_id, is_deleted),
      KEY idx_hostelcare_complaint_warden (warden, is_deleted),
      KEY idx_hostelcare_complaint_status (status, is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function list(req, res) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userId = Number(req.user?.userId);
    if (!userId || !['student', 'warden', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'This account cannot view complaints.' });
    }

    const [rows] = role === 'student'
      ? await pool.query(
        'SELECT * FROM hostelcare_complaint WHERE student_user_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
        [userId]
      )
      : await pool.query(
        'SELECT * FROM hostelcare_complaint WHERE is_deleted = 0 ORDER BY created_at DESC'
      );

    return res.status(200).json({ complaints: rows.map(mapComplaint) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load complaints.' });
  }
}

async function create(req, res) {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'student') {
      return res.status(403).json({ message: 'Only students can submit complaints.' });
    }

    const { title, cat, pri, hostel, room, desc } = req.body || {};
    if (typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({ message: 'Complaint title must be at least 5 characters.' });
    }
    if (typeof desc !== 'string' || desc.trim().length < 20) {
      return res.status(400).json({ message: 'Complaint description must be at least 20 characters.' });
    }
    if (typeof cat !== 'string' || !cat.trim()) {
      return res.status(400).json({ message: 'Choose a complaint category.' });
    }
    if (!VALID_PRIORITIES.has(pri)) {
      return res.status(400).json({ message: 'Choose a valid complaint priority.' });
    }
    if (typeof hostel !== 'string' || !hostel.trim() || !/^\d{3}$/.test(String(room || ''))) {
      return res.status(400).json({ message: 'Choose a hostel and enter a 3-digit room number.' });
    }

    const userId = Number(req.user.userId);
    if (!userId) {
      return res.status(401).json({ message: 'Your session is invalid. Please sign in again.' });
    }

    const now = new Date().toISOString();
    const timeline = { 0: now };
    const temporaryId = `TEMP-${randomUUID()}`;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO hostelcare_complaint
          (public_id, student_user_id, student_name, student_prn, title, category, priority, hostel, room, status, warden, description, timeline_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
        [
          temporaryId,
          userId,
          req.user.name || 'Student',
          req.user.prn || null,
          title.trim(),
          cat.trim(),
          pri,
          hostel.trim(),
          String(room),
          'Dr. Meera Deshpande',
          desc.trim(),
          JSON.stringify(timeline),
        ]
      );

      const publicId = `HC-${String(result.insertId).padStart(6, '0')}`;
      await connection.query(
        'UPDATE hostelcare_complaint SET public_id = ? WHERE complaint_id = ?',
        [publicId, result.insertId]
      );
      const [rows] = await connection.query(
        'SELECT * FROM hostelcare_complaint WHERE complaint_id = ? LIMIT 1',
        [result.insertId]
      );
      await connection.commit();
      return res.status(201).json({ complaint: mapComplaint(rows[0]) });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Could not submit complaint.',
    });
  }
}

async function update(req, res) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['student', 'warden', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'This account cannot update complaints.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM hostelcare_complaint WHERE public_id = ? AND is_deleted = 0 LIMIT 1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    const current = rows[0];
    const input = req.body || {};
    if (role === 'student') {
      if (Number(current.student_user_id) !== Number(req.user.userId) || current.status !== 'Resolved') {
        return res.status(403).json({ message: 'You can only rate your own resolved complaints.' });
      }
      if (input.rating !== undefined && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      }
      if (input.feedback !== undefined && typeof input.feedback !== 'string') {
        return res.status(400).json({ message: 'Feedback must be text.' });
      }
      await pool.query(
        'UPDATE hostelcare_complaint SET rating = ?, feedback = ? WHERE complaint_id = ?',
        [input.rating ?? current.rating, input.feedback ?? current.feedback, current.complaint_id]
      );
      const [updatedRows] = await pool.query(
        'SELECT * FROM hostelcare_complaint WHERE complaint_id = ? LIMIT 1',
        [current.complaint_id]
      );
      return res.status(200).json({ complaint: mapComplaint(updatedRows[0]) });
    }

    if (input.status !== undefined && !VALID_STATUSES.has(input.status)) {
      return res.status(400).json({ message: 'Choose a valid complaint status.' });
    }
    if (input.rating !== undefined && (!Number.isInteger(input.rating) || input.rating < 0 || input.rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5.' });
    }
    const status = VALID_STATUSES.has(input.status) ? input.status : current.status;
    const staff = typeof input.staff === 'string' ? input.staff : current.staff;
    const warden = typeof input.warden === 'string' ? input.warden : current.warden;
    const remarks = typeof input.remarks === 'string' ? input.remarks : current.remarks;
    const rating = Number.isInteger(input.rating) && input.rating >= 0 && input.rating <= 5
      ? input.rating || null
      : current.rating;
    const feedback = typeof input.feedback === 'string' ? input.feedback : current.feedback;
    const timeline = input.t && typeof input.t === 'object'
      ? JSON.stringify(input.t)
      : current.timeline_json;

    await pool.query(
      `UPDATE hostelcare_complaint
       SET status = ?, staff = ?, warden = ?, remarks = ?, rating = ?, feedback = ?, timeline_json = ?
       WHERE complaint_id = ?`,
      [status, staff, warden, remarks, rating, feedback, timeline, current.complaint_id]
    );
    const [updatedRows] = await pool.query(
      'SELECT * FROM hostelcare_complaint WHERE complaint_id = ? LIMIT 1',
      [current.complaint_id]
    );
    return res.status(200).json({ complaint: mapComplaint(updatedRows[0]) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not update complaint.' });
  }
}

async function remove(req, res) {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete complaints.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE hostelcare_complaint SET is_deleted = 1 WHERE public_id = ? AND is_deleted = 0',
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    return res.status(200).json({ message: 'Complaint deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not delete complaint.' });
  }
}

async function restore(req, res) {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Only admins can restore complaints.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE hostelcare_complaint SET is_deleted = 0 WHERE public_id = ? AND is_deleted = 1',
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Deleted complaint not found.' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM hostelcare_complaint WHERE public_id = ? LIMIT 1',
      [req.params.id]
    );
    return res.status(200).json({ complaint: mapComplaint(rows[0]) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not restore complaint.' });
  }
}

module.exports = { ensureComplaintSchema, list, create, update, remove, restore };
