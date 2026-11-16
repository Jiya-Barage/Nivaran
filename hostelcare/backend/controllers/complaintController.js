const { pool } = require('../config/db');
const { randomUUID } = require('crypto');

const VALID_STATUSES = new Set(['Pending', 'In Progress', 'Resolved', 'Rejected']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Emergency']);
const DEFAULT_CATEGORIES = ['Electrical', 'Plumbing', 'Cleaning', 'Internet/Wi-Fi', 'Furniture', 'Water Supply', 'Security', 'Other'];

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

function legacyStatus(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'submitted':
      return 'Pending';
    case 'assigned':
    case 'in progress':
      return 'In Progress';
    case 'resolved':
    case 'closed':
      return 'Resolved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending';
  }
}

function legacyPriority(priority) {
  switch (String(priority || '').trim().toLowerCase()) {
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    case 'urgent':
    case 'emergency':
      return 'Emergency';
    default:
      return 'Medium';
  }
}

function toTimelineDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function legacyTimeline(row, status) {
  const createdAt = toTimelineDate(row.created_at);
  if (!createdAt) {
    throw new Error(`Legacy complaint ${row.legacy_id} has an invalid creation date.`);
  }

  const sourceStatus = String(row.status || '').trim().toLowerCase();
  const timeline = { 0: createdAt };
  if (['assigned', 'in progress', 'resolved', 'closed', 'rejected'].includes(sourceStatus)) {
    timeline[1] = toTimelineDate(row.assigned_at) || createdAt;
    timeline[2] = timeline[1];
  }
  if (['in progress', 'resolved', 'closed', 'rejected'].includes(sourceStatus)) {
    timeline[3] = toTimelineDate(row.started_at) || timeline[2];
  }
  if (['resolved', 'closed', 'rejected'].includes(sourceStatus)) {
    timeline[4] = toTimelineDate(row.resolved_at) || toTimelineDate(row.closed_at) || timeline[3];
  }
  return timeline;
}

async function importLegacyComplaints() {
  const [tables] = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'complaint'"
  );
  if (!tables.length) return 0;

  const [legacyRows] = await pool.query(`
    SELECT
      c.complaint_id AS legacy_id,
      c.user_id AS student_user_id,
      COALESCE(NULLIF(student_account.name, ''), CONCAT('Student ', c.user_id)) AS student_name,
      student.prn AS student_prn,
      c.title,
      COALESCE(NULLIF(c.category, ''), NULLIF(c.complaint_type, ''), 'Other') AS category,
      c.priority,
      COALESCE(NULLIF(hostel.hostel_name, ''), NULLIF(c.location, ''), 'Unknown Hostel') AS hostel,
      COALESCE(NULLIF(c.room_no, ''), room.room_number, 'N/A') AS room,
      c.status,
      COALESCE(NULLIF(hostel_warden.name, ''), NULLIF(assigned_by.name, ''), 'Unassigned') AS warden,
      assigned_staff.name AS staff,
      c.description,
      c.remarks,
      c.created_at,
      c.assigned_at,
      c.started_at,
      c.resolved_at,
      c.closed_at
    FROM complaint c
    LEFT JOIN user_account student_account ON student_account.user_id = c.user_id
    LEFT JOIN student ON student.user_id = c.user_id
    LEFT JOIN room ON room.room_id = student.room_id
    LEFT JOIN hostel ON hostel.hostel_id = room.hostel_id
    LEFT JOIN user_account hostel_warden ON hostel_warden.user_id = hostel.warden_user_id
    LEFT JOIN user_account assigned_by ON assigned_by.user_id = c.assigned_by
    LEFT JOIN user_account assigned_staff ON assigned_staff.user_id = c.assigned_to
    ORDER BY c.complaint_id
  `);
  if (!legacyRows.length) return 0;

  const connection = await pool.getConnection();
  let imported = 0;
  try {
    await connection.beginTransaction();
    for (const row of legacyRows) {
      const publicId = `LEGACY-${row.legacy_id}`;
      const [existing] = await connection.query(
        'SELECT complaint_id FROM hostelcare_complaint WHERE public_id = ? LIMIT 1',
        [publicId]
      );
      if (existing.length) continue;

      const status = legacyStatus(row.status);
      const [result] = await connection.query(
        `INSERT INTO hostelcare_complaint
          (public_id, student_user_id, student_name, student_prn, title, category, priority, hostel, room, status, warden, staff, description, timeline_json, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE public_id = public_id`,
        [
          publicId,
          row.student_user_id,
          row.student_name,
          row.student_prn || null,
          row.title || `Legacy complaint ${row.legacy_id}`,
          row.category,
          legacyPriority(row.priority),
          row.hostel,
          row.room,
          status,
          row.warden,
          row.staff || null,
          row.description || row.title || 'Imported legacy complaint.',
          JSON.stringify(legacyTimeline(row, status)),
          row.remarks || null,
          row.created_at,
        ]
      );
      imported += result.affectedRows;
    }
    await connection.commit();
    return imported;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
      : role === 'warden'
        ? await pool.query(
          `SELECT complaint.*
           FROM hostelcare_complaint complaint
           WHERE complaint.is_deleted = 0
             AND (
               EXISTS (
                 SELECT 1 FROM hostel
                 WHERE hostel.warden_user_id = ?
                   AND hostel.hostel_name = complaint.hostel
               )
               OR NOT EXISTS (SELECT 1 FROM hostel WHERE warden_user_id = ?)
             )
           ORDER BY complaint.created_at DESC`,
          [userId, userId]
        )
        : await pool.query(
        'SELECT * FROM hostelcare_complaint WHERE is_deleted = 0 ORDER BY created_at DESC'
      );

    return res.status(200).json({ complaints: rows.map(mapComplaint) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load complaints.' });
  }
}

async function getOptions(req, res) {
  try {
    const [categoryRows] = await pool.query(
      'SELECT DISTINCT category FROM hostelcare_complaint WHERE is_deleted = 0 AND category <> ? ORDER BY category',
      ['']
    );
    const categories = [...new Set([
      ...(categoryRows.length ? categoryRows.map((row) => row.category) : DEFAULT_CATEGORIES),
      'Other',
    ])];
    const [staffRows] = await pool.query(`
      SELECT name AS staff FROM user_account WHERE role = 'Maintenance'
      UNION
      SELECT DISTINCT staff FROM hostelcare_complaint WHERE staff IS NOT NULL AND staff <> ''
      ORDER BY staff
    `);
    return res.status(200).json({ categories, staff: staffRows.map((row) => row.staff) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load complaint options.' });
  }
}

async function getDirectory(req, res) {
  const role = String(req.user?.role || '').toLowerCase();
  const userId = Number(req.user?.userId);
  if (!['admin', 'warden'].includes(role) || !userId) {
    return res.status(403).json({ message: 'This account cannot view the hostel directory.' });
  }

  try {
    let hostels = [];
    let wardens = [];
    if (role === 'admin') {
      const [hostelRows] = await pool.query(`
        SELECT hostel.hostel_id AS id, hostel.hostel_name AS name,
          hostel.total_rooms AS totalRooms, hostel.total_capacity AS capacity,
          hostel.occupied_capacity AS occupiedBeds,
          COALESCE(warden.name, 'Unassigned') AS warden
        FROM hostel
        LEFT JOIN user_account warden ON warden.user_id = hostel.warden_user_id
        ORDER BY hostel.hostel_name
      `);
      hostels = hostelRows;
      const [wardenRows] = await pool.query(`
        SELECT account.name, GROUP_CONCAT(hostel.hostel_name ORDER BY hostel.hostel_name SEPARATOR ' & ') AS hostels
        FROM user_account account
        LEFT JOIN hostel ON hostel.warden_user_id = account.user_id
        WHERE account.role = 'Warden'
        GROUP BY account.user_id, account.name
        ORDER BY account.name
      `);
      wardens = wardenRows.map((row) => ({ name: row.name, hostels: row.hostels || 'Unassigned' }));
    }

    const [assignedHostels] = await pool.query(
      'SELECT hostel_id FROM hostel WHERE warden_user_id = ?',
      [userId]
    );
    const studentsQuery = assignedHostels.length && role === 'warden'
      ? `SELECT account.user_id AS userId, account.name, account.phone, account.email,
          student.prn, hostel.hostel_name AS hostel, room.room_number AS room,
          student.academic_year AS academicYear
        FROM student
        JOIN user_account account ON account.user_id = student.user_id
        JOIN room ON room.room_id = student.room_id
        JOIN hostel ON hostel.hostel_id = room.hostel_id
        WHERE hostel.warden_user_id = ?
        ORDER BY account.name`
      : `SELECT account.user_id AS userId, account.name, account.phone, account.email,
          student.prn, hostel.hostel_name AS hostel, room.room_number AS room,
          student.academic_year AS academicYear
        FROM student
        JOIN user_account account ON account.user_id = student.user_id
        JOIN room ON room.room_id = student.room_id
        JOIN hostel ON hostel.hostel_id = room.hostel_id
        ORDER BY account.name`;
    const [students] = assignedHostels.length && role === 'warden'
      ? await pool.query(studentsQuery, [userId])
      : await pool.query(studentsQuery);

    return res.status(200).json({ hostels, students, wardens });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load the hostel directory.' });
  }
}

async function create(req, res) {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'student') {
      return res.status(403).json({ message: 'Only students can submit complaints.' });
    }

    const { title, cat, pri, desc } = req.body || {};
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
    const userId = Number(req.user.userId);
    if (!userId) {
      return res.status(401).json({ message: 'Your session is invalid. Please sign in again.' });
    }

    const [categoryRows] = await pool.query(
      'SELECT DISTINCT category FROM hostelcare_complaint WHERE is_deleted = 0',
    );
    const validCategories = new Set([
      ...(categoryRows.length ? categoryRows.map((row) => row.category) : DEFAULT_CATEGORIES),
      'Other',
    ]);
    if (!validCategories.has(cat.trim())) {
      return res.status(400).json({ message: 'Choose a category from the available options.' });
    }

    const now = new Date().toISOString();
    const timeline = { 0: now };
    const temporaryId = `TMP-${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [studentRows] = await connection.query(
        `SELECT
           COALESCE(NULLIF(hostel.hostel_name, ''), profile.hostel) AS hostel,
           COALESCE(NULLIF(room.room_number, ''), profile.room_number) AS room,
           COALESCE(NULLIF(student.prn, ''), profile.prn) AS prn
         FROM user_account account
         LEFT JOIN hostelcare_student_profile profile ON profile.user_id = account.user_id
         LEFT JOIN student ON student.user_id = account.user_id
         LEFT JOIN room ON room.room_id = student.room_id
         LEFT JOIN hostel ON hostel.hostel_id = room.hostel_id
         WHERE account.user_id = ?
         LIMIT 1`,
        [userId]
      );
      const studentProfile = studentRows[0];
      if (!studentProfile?.hostel || !studentProfile?.room) {
        throw createError('Your hostel and room are missing from your student profile. Contact the administrator.', 400);
      }
      const [wardenRows] = await connection.query(
        `SELECT COALESCE(warden.name, 'Unassigned') AS name
         FROM hostel
         LEFT JOIN user_account warden ON warden.user_id = hostel.warden_user_id
         WHERE hostel.hostel_name = ?
         LIMIT 1`,
        [studentProfile.hostel]
      );
      if (!wardenRows.length) {
        throw createError('Your assigned hostel could not be found. Contact the administrator.', 400);
      }
      const [result] = await connection.query(
        `INSERT INTO hostelcare_complaint
          (public_id, student_user_id, student_name, student_prn, title, category, priority, hostel, room, status, warden, description, timeline_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
        [
          temporaryId,
          userId,
          req.user.name || 'Student',
          studentProfile.prn || req.user.prn || null,
          title.trim(),
          cat.trim(),
          pri,
          studentProfile.hostel,
          String(studentProfile.room),
          wardenRows[0].name,
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
    if (role === 'warden') {
      const [assignedHostels] = await pool.query(
        'SELECT hostel_name FROM hostel WHERE warden_user_id = ?',
        [req.user.userId]
      );
      if (assignedHostels.length && !assignedHostels.some((hostel) => hostel.hostel_name === current.hostel)) {
        return res.status(403).json({ message: 'This complaint is outside your assigned hostels.' });
      }
    }
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

module.exports = {
  ensureComplaintSchema,
  importLegacyComplaints,
  list,
  getOptions,
  getDirectory,
  create,
  update,
  remove,
  restore,
};
