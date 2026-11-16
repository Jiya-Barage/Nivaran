const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'hostelcare-secret-change-me';
const JWT_TTL = '7d';

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'student') return 'student';
  if (value === 'warden') return 'warden';
  if (value === 'admin') return 'admin';
  return 'student';
}

function toAuthUser(row, profile = {}) {
  const role = String(row.role || 'Student').toLowerCase();
  return {
    id: row.user_id,
    userId: row.user_id,
    username: row.user_name,
    name: row.name,
    email: row.email,
    phone: row.phone,
    prn: profile.prn,
    hostel: profile.hostel,
    room: profile.room_number,
    role: role === 'student' ? 'student' : role === 'warden' ? 'warden' : 'admin',
    title: role === 'student' ? 'Student' : role === 'warden' ? 'Warden' : 'Admin',
    isActive: Boolean(row.is_active),
  };
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function isPhoneValid(value) {
  return /^\+?[0-9]{10,15}$/.test((value || '').replace(/\s+/g, ''));
}

function isPrnValid(value) {
  return /^[A-Za-z0-9-]{6,20}$/.test(String(value || '').trim());
}

function validatePassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(String(value || ''));
}

function getNextId(connection, table, column) {
  return connection.query(`SELECT COALESCE(MAX(${column}), 0) + 1 AS nextId FROM ${table}`)
    .then(([rows]) => Number(rows[0]?.nextId || 1));
}

async function ensureSchema() {
  const [columns] = await pool.query("SHOW COLUMNS FROM user_account LIKE 'password_hash'");
  if (!columns.length) {
    await pool.query('ALTER TABLE user_account ADD COLUMN password_hash VARCHAR(255) NULL');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hostelcare_student_profile (
      user_id BIGINT NOT NULL PRIMARY KEY,
      prn VARCHAR(32) NOT NULL,
      hostel VARCHAR(100) NOT NULL,
      room_number VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_hostelcare_student_profile_prn (prn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getStudentProfile(userId, connection = pool) {
  const [rows] = await connection.query(
    'SELECT prn, hostel, room_number FROM hostelcare_student_profile WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || {};
}

async function seedDemoStaffAccounts() {
  const accounts = [
    { username: 'admin', name: 'Prof. Sanjay Kulkarni', email: 'admin@demo.hostelcare.test', phone: '9822001122', role: 'Admin', password: 'AdminDemo123!' },
    { username: 'warden', name: 'Dr. Meera Deshpande', email: 'warden@demo.hostelcare.test', phone: '9822003344', role: 'Warden', password: 'WardenDemo123!' },
  ];

  for (const account of accounts) {
    const [existing] = await pool.query(
      'SELECT user_id FROM user_account WHERE user_name = ? OR email = ? OR phone = ? LIMIT 1',
      [account.username, account.email, account.phone]
    );
    if (existing.length) continue;

    const userId = await getNextId(pool, 'user_account', 'user_id');
    const passwordHash = await bcrypt.hash(account.password, 12);
    await pool.query(
      'INSERT INTO user_account (user_id, user_name, name, phone, email, role, is_active, created_at, profile_pic, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)',
      [userId, account.username, account.name, account.phone, account.email, account.role, true, 'profiles/default.jpg', passwordHash]
    );
  }
}

async function getUserByIdentifier(identifier) {
  const value = sanitizeText(identifier);
  if (!value) return null;

  const [rows] = await pool.query(
    `SELECT account.*
     FROM user_account account
     LEFT JOIN student ON student.user_id = account.user_id
     WHERE account.user_name = ? OR account.email = ? OR account.phone = ? OR student.prn = ?
     LIMIT 1`,
    [value, value, value, value]
  );

  return rows[0] || null;
}

async function ensureRoomExists({ roomId, hostelId, roomNumber, connection }) {
  if (roomId) {
    const [rows] = await connection.query('SELECT room_id FROM room WHERE room_id = ? LIMIT 1', [roomId]);
    if (!rows.length) {
      const error = new Error('Selected room does not exist.');
      error.statusCode = 400;
      throw error;
    }
    return Number(rows[0].room_id);
  }

  if (!hostelId || !roomNumber) {
    const error = new Error('Hostel and room are required for student registration.');
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await connection.query(
    'SELECT room_id FROM room WHERE hostel_id = ? AND room_number = ? LIMIT 1',
    [Number(hostelId), String(roomNumber)]
  );

  if (!rows.length) {
    const error = new Error('The selected hostel/room combination does not exist.');
    error.statusCode = 400;
    throw error;
  }

  return Number(rows[0].room_id);
}

async function register(req, res) {
  try {
    await ensureSchema();

    const payload = req.body || {};
    const fullName = sanitizeText(payload.fullName || payload.name);
    const username = sanitizeText(payload.username || payload.user_name);
    const prn = sanitizeText(payload.prn);
    const email = sanitizeText(payload.email).toLowerCase();
    const phone = sanitizeText(payload.phone);
    const password = String(payload.password || '');
    const confirmPassword = String(payload.confirmPassword || '');
    const hostelId = payload.hostelId;
    const roomId = payload.roomId;
    const roomNumber = sanitizeText(payload.roomNumber);
    const hostel = sanitizeText(payload.hostel);
    const dateOfBirth = sanitizeText(payload.dateOfBirth || payload.dob);
    const gender = sanitizeText(payload.gender);
    const bloodGroup = sanitizeText(payload.bloodGroup);
    const academicYear = sanitizeText(payload.academicYear || payload.academic_year);
    const department = sanitizeText(payload.department || payload.dept);
    const emergencyContactName = sanitizeText(payload.emergencyContactName || payload.emergency_name);
    const emergencyContactRelation = sanitizeText(payload.emergencyContactRelation || payload.emergency_relation);
    const emergencyContactNo = sanitizeText(payload.emergencyContactNo || payload.emergency_contact_no);
    const parentsContactNo = sanitizeText(payload.parentsContactNo || payload.parents_contact_no);
    const permanentAddress = sanitizeText(payload.permanentAddress || payload.permanent_address);
    const nationality = sanitizeText(payload.nationality);
    const admissionDate = sanitizeText(payload.admissionDate || payload.admission_date);
    const startDate = sanitizeText(payload.startDate || payload.start_date);

    if (!fullName) return res.status(400).json({ message: 'Full name is required.' });
    if (!username) return res.status(400).json({ message: 'Username is required.' });
    if (!prn) return res.status(400).json({ message: 'PRN is required.' });
    if (!email || !isEmailValid(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!phone || !isPhoneValid(phone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    if (!password) return res.status(400).json({ message: 'Password is required.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });
    if (!validatePassword(password)) return res.status(400).json({ message: 'Password must be at least 8 characters and include upper, lower, number, and symbol.' });

    if (!hostel || !dateOfBirth || !gender || !bloodGroup || !academicYear || !department || !emergencyContactName || !emergencyContactRelation || !emergencyContactNo || !parentsContactNo || !permanentAddress || !nationality || !admissionDate || !startDate) {
      return res.status(400).json({ message: 'Please fill all required student details.' });
    }

    if (!isPrnValid(prn)) return res.status(400).json({ message: 'PRN format is invalid.' });

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [duplicateRows] = await connection.query(
        'SELECT user_name, email, phone FROM user_account WHERE LOWER(user_name) = LOWER(?) OR LOWER(email) = LOWER(?) OR phone = ? OR LOWER(name) = LOWER(?) LIMIT 1',
        [username, email, phone, fullName]
      );

      if (duplicateRows.length) {
        const error = new Error('A user with the same username, email or phone already exists.');
        error.statusCode = 409;
        throw error;
      }

      const [studentPrnRows] = await connection.query('SELECT user_id FROM student WHERE prn = ? LIMIT 1', [prn]);
      if (studentPrnRows.length) {
        const error = new Error('This PRN is already registered.');
        error.statusCode = 409;
        throw error;
      }

      const room_id = await ensureRoomExists({ roomId, hostelId, roomNumber, connection });
      const nextUserId = await getNextId(connection, 'user_account', 'user_id');
      const nextStudentId = await getNextId(connection, 'student', 'student_id');
      const passwordHash = await bcrypt.hash(password, 12);

      await connection.query(
        'INSERT INTO user_account (user_id, user_name, name, phone, email, role, is_active, created_at, profile_pic, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)',
        [nextUserId, username, fullName, phone, email, 'Student', true, 'profiles/default.jpg', passwordHash]
      );

      const [nameParts] = await connection.query('SELECT ? AS full_name', [fullName]);
      const rawName = nameParts[0]?.full_name || fullName;
      const nameTokens = rawName.split(/\s+/).filter(Boolean);
      const firstName = nameTokens[0] || fullName;
      const lastName = nameTokens.slice(1).join(' ') || '';

      await connection.query(
        'INSERT INTO student (student_id, user_id, prn, first_name, middle_name, last_name, date_of_birth, gender, blood_group, email, phone, academic_year, dept, admission_year, room_id, emergency_contact_name, emergency_contact_relation, emergency_contact_no, parents_contact_no, permanent_address, nationality, admission_date, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          nextStudentId,
          nextUserId,
          prn,
          firstName,
          '',
          lastName,
          dateOfBirth,
          gender,
          bloodGroup,
          email,
          phone,
          academicYear,
          department,
          Number(admissionDate.slice(0, 4)) || new Date().getFullYear(),
          room_id,
          emergencyContactName,
          emergencyContactRelation,
          emergencyContactNo,
          parentsContactNo,
          permanentAddress,
          nationality,
          admissionDate,
          startDate,
        ]
      );
      await connection.query(
        'INSERT INTO hostelcare_student_profile (user_id, prn, hostel, room_number) VALUES (?, ?, ?, ?)',
        [nextUserId, prn, hostel, roomNumber]
      );

      await connection.commit();
      return res.status(201).json({
        message: 'Registration successful. Please sign in to continue.',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || 'Registration failed.',
    });
  }
}

async function login(req, res) {
  try {
    await ensureSchema();

    const identifier = sanitizeText(req.body?.identifier || req.body?.user_name || req.body?.email || req.body?.username || req.body?.prn);
    const password = String(req.body?.password || '');
    const roleHint = normalizeRole(req.body?.role);

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required.' });
    }

    const user = await getUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'This account is inactive. Contact the administrator.' });
    }

    if (!user.password_hash) {
      return res.status(403).json({ message: 'This account needs password setup. Contact the administrator.' });
    }

    const roleFromDb = String(user.role || '').toLowerCase();
    if (roleHint !== roleFromDb) {
      return res.status(403).json({ message: 'Selected role does not match this account.' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const profile = await getStudentProfile(user.user_id);
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: roleFromDb,
        name: user.name,
        email: user.email,
        prn: profile.prn,
        hostel: profile.hostel,
        room: profile.room_number,
      },
      JWT_SECRET,
      { expiresIn: JWT_TTL }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Login successful.',
      user: toAuthUser(user, profile),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Login failed.' });
  }
}

async function me(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const [rows] = await pool.query('SELECT * FROM user_account WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const profile = await getStudentProfile(userId);
    return res.status(200).json({ user: toAuthUser(rows[0], profile) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load profile.' });
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully.' });
}

module.exports = { register, login, me, logout, ensureSchema, seedDemoStaffAccounts };
