import {CATS,HOS,STAFFL,STU,WARD} from '../data/mockData.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const LOCAL_USER_KEY = 'hostelcare-demo-users';
const LOCAL_SESSION_KEY = 'hostelcare-demo-session';
const LOCAL_DATA_KEY = 'hostelcare-demo-data';
const DEMO_HOSTELS = HOS;
const DEMO_USERS = import.meta.env.DEV ? [
  {
    userId: 'demo-student',
    username: 'student',
    email: 'student@demo.hostelcare.test',
    name: STU[0].name,
    phone: STU[0].phone,
    prn: STU[0].prn,
    hostel: STU[0].hostel,
    room: STU[0].room,
    role: 'student',
    password: 'StudentDemo123!',
  },
  {
    userId: 'demo-admin',
    username: 'admin',
    email: 'admin@demo.hostelcare.test',
    name: 'Prof. Sanjay Kulkarni',
    phone: '9822001122',
    role: 'admin',
    password: 'AdminDemo123!',
  },
  {
    userId: 'demo-warden',
    username: 'warden',
    email: 'warden@demo.hostelcare.test',
    name: 'Dr. Meera Deshpande',
    phone: '9822003344',
    hostel: 'Sahyadri',
    role: 'warden',
    password: 'WardenDemo123!',
  },
] : [];

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'warden') return 'warden';
  if (value === 'admin') return 'admin';
  return 'student';
}

function readStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeStoredUsers(users) {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(user) {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

function getDemoUserFromCredentials({ identifier, password, role }) {
  const value = String(identifier || '').trim();
  const passwordValue = String(password || '');
  const normalizedRole = normalizeRole(role);

  const users = [...readStoredUsers(), ...DEMO_USERS];
  return users.find((user) => {
    const matchesIdentifier =
      user.username === value ||
      user.email === value.toLowerCase() ||
      user.phone === value ||
      user.prn === value;

    const matchesPassword = user.password === passwordValue;
    const matchesRole = !normalizedRole || user.role === normalizedRole;
    return matchesIdentifier && matchesPassword && matchesRole;
  });
}

function hasActiveLocalSession() {
  return import.meta.env.DEV && Boolean(readSession());
}

function readLocalData() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || 'null');
    return {
      complaints: Array.isArray(data?.complaints) ? data.complaints : [],
      notes: Array.isArray(data?.notes) ? data.notes : [],
      deletedComplaints: Array.isArray(data?.deletedComplaints) ? data.deletedComplaints : [],
    };
  } catch {
    return { complaints: [], notes: [], deletedComplaints: [] };
  }
}

function writeLocalData(data) {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
}

function fallbackLogin({ identifier, password, role }) {
  const matchedUser = getDemoUserFromCredentials({ identifier, password, role });
  if (!matchedUser) {
    throw new Error('Invalid credentials.');
  }

  const sessionUser = {
    id: matchedUser.userId,
    userId: matchedUser.userId,
    username: matchedUser.username,
    name: matchedUser.name,
    email: matchedUser.email,
    phone: matchedUser.phone,
    prn: matchedUser.prn,
    hostel: matchedUser.hostel || (matchedUser.role === 'student' ? HOS[0] : undefined),
    room: matchedUser.room || (matchedUser.role === 'student' ? STU[0].room : undefined),
    role: matchedUser.role,
    title: matchedUser.role === 'warden' ? 'Warden' : matchedUser.role === 'admin' ? 'Admin' : 'Student',
    isActive: true,
  };

  writeSession(sessionUser);
  return { user: sessionUser };
}

function fallbackRegister(payload) {
  const users = readStoredUsers();
  const fullName = String(payload.fullName || payload.name || '').trim();
  const username = String(payload.username || payload.user_name || '').trim();
  const prn = String(payload.prn || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = String(payload.phone || '').trim();
  const password = String(payload.password || '');
  const role = normalizeRole(payload.role || 'student');
  const hostel = String(payload.hostel || '').trim();
  const room = String(payload.roomNumber || payload.room || '').trim();

  if (!fullName || !username || !prn || !email || !phone || !password || !hostel || !room) {
    throw new Error('Please fill all required student details.');
  }

  if (users.some((user) => user.username === username || user.email === email || user.phone === phone)) {
    throw new Error('A user with the same username, email or phone already exists.');
  }

  const userId = `demo-${Date.now()}`;
  const user = {
    userId,
    id: userId,
    username,
    name: fullName,
    email,
    phone,
    role,
    prn,
    hostel,
    room,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeStoredUsers(users);

  const sessionUser = {
    id: userId,
    userId,
    username,
    name: fullName,
    email,
    phone,
    prn,
    hostel,
    room,
    role,
    title: role === 'warden' ? 'Warden' : role === 'admin' ? 'Admin' : 'Student',
    isActive: true,
  };

  writeSession(sessionUser);
  return { user: sessionUser, message: 'Registration successful. Please sign in to continue.' };
}

function fallbackRequest(endpoint, options = {}) {
  const { method = 'GET', body } = options;
  const sessionUser = readSession();

  if (endpoint === '/auth/registration-options') {
    return {
      hostels: DEMO_HOSTELS.map((name, index) => ({ id: index + 1, name })),
      rooms: DEMO_HOSTELS.flatMap((_, index) =>
        (index === 0 ? ['B-101', 'B-205'] : ['G-204', 'G-406']).map((roomNumber) => ({
          roomId: `${index + 1}-${roomNumber}`,
          hostelId: index + 1,
          roomNumber,
        }))
      ),
    };
  }

  if (endpoint === '/auth/login') {
    return fallbackLogin(body || {});
  }

  if (endpoint === '/auth/register') {
    return fallbackRegister(body || {});
  }

  if (endpoint === '/auth/logout') {
    clearSession();
    return { message: 'Logged out successfully.' };
  }

  if (endpoint === '/auth/me') {
    const user = sessionUser;
    if (!user) {
      throw new Error('Authentication required.');
    }
    return { user };
  }

  if (endpoint === '/auth/profile' && method === 'PATCH') {
    if (!sessionUser) throw new Error('Authentication required.');
    const user = { ...sessionUser, ...body };
    writeSession(user);
    return { user };
  }

  if (endpoint === '/complaints' && method === 'GET') {
    return { complaints: readLocalData().complaints };
  }

  if (endpoint === '/complaints/options') {
    return { categories: CATS, staff: STAFFL };
  }

  if (endpoint === '/complaints/directory') {
    const hostels = HOS.map((name, index) => ({
      id: index + 1,
      name,
      totalRooms: [120, 96, 110, 84][index],
      capacity: [500, 400, 450, 350][index],
      occupiedBeds: [470, 352, 410, 276][index],
      warden: WARD[name],
    }));
    return {
      hostels,
      students: STU.map((student) => ({
        ...student,
        academicYear: student.year,
      })),
      wardens: [...new Set([...Object.values(WARD), 'Dr. Meera Deshpande'])].map((name) => ({
        name,
        hostels: name === 'Dr. Meera Deshpande'
          ? 'All hostels (development demo)'
          : HOS.filter((hostel) => WARD[hostel] === name).join(' & '),
      })),
    };
  }

  if (endpoint === '/complaints' && method === 'POST') {
    const data = readLocalData();
    const nextNumber = data.complaints.reduce((max, complaint) => {
      const match = String(complaint.id || '').match(/^HC-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1039) + 1;
    const complaint = {
      ...body,
      id: `HC-${nextNumber}`,
      student: sessionUser?.name || body.student || 'Student',
      studentUserId: sessionUser?.userId,
      prn: sessionUser?.prn || body.prn || '',
      status: 'Pending',
      warden: WARD[body.hostel] || sessionUser?.name || 'Unassigned',
      staff: '',
      date: new Date().toISOString(),
      t: { 0: new Date().toISOString() },
      rating: 0,
      remarks: '',
    };
    data.complaints = [complaint, ...data.complaints];
    writeLocalData(data);
    return { complaint };
  }

  const complaintRoute = endpoint.match(/^\/complaints\/([^/]+)(?:\/(restore))?$/);
  if (complaintRoute) {
    const id = decodeURIComponent(complaintRoute[1]);
    const restoring = Boolean(complaintRoute[2]);
    const data = readLocalData();

    if (method === 'PATCH') {
      const index = data.complaints.findIndex((complaint) => complaint.id === id);
      if (index < 0) throw new Error('Complaint not found.');
      const complaint = { ...data.complaints[index], ...body };
      data.complaints[index] = complaint;
      writeLocalData(data);
      return { complaint };
    }

    if (method === 'DELETE') {
      const index = data.complaints.findIndex((complaint) => complaint.id === id);
      if (index < 0) throw new Error('Complaint not found.');
      data.deletedComplaints.push(data.complaints[index]);
      data.complaints.splice(index, 1);
      writeLocalData(data);
      return { message: 'Complaint deleted.' };
    }

    if (method === 'POST' && restoring) {
      const index = data.deletedComplaints.findIndex((complaint) => complaint.id === id);
      if (index < 0) throw new Error('Deleted complaint not found.');
      const [complaint] = data.deletedComplaints.splice(index, 1);
      data.complaints.unshift(complaint);
      writeLocalData(data);
      return { complaint };
    }
  }

  throw new Error('Request failed.');
}

function canUseLocalFallback(endpoint, method, status) {
  if (!import.meta.env.DEV) return false;
  if (endpoint === '/auth/login' && status === 401) return true;
  if (hasActiveLocalSession() && (endpoint === '/auth/me' || endpoint === '/auth/profile' || endpoint === '/auth/logout' || endpoint.startsWith('/complaints'))) {
    return status === 401 || endpoint === '/auth/logout';
  }
  return false;
}

async function request(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (canUseLocalFallback(endpoint, method, response.status)) {
        return fallbackRequest(endpoint, { method, body });
      }
      throw new Error(data.message || 'Request failed.');
    }

    if (endpoint === '/auth/login' || endpoint === '/auth/me') {
      clearSession();
    }

    return data;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
      if (import.meta.env.DEV && (endpoint === '/auth/login' || endpoint === '/auth/register' || endpoint === '/auth/registration-options' || hasActiveLocalSession())) {
        return fallbackRequest(endpoint, { method, body });
      }
    }

    throw error;
  }
}

export const api = {
  login: ({ identifier, password, role }) =>
    request('/auth/login', { method: 'POST', body: { identifier, password, role } }),
  getRegistrationOptions: () => request('/auth/registration-options'),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  getCurrentUser: () => request('/auth/me'),
  updateProfile: (profile) => request('/auth/profile', { method: 'PATCH', body: profile }),
  getComplaints: async () => (await request('/complaints')).complaints,
  getComplaintOptions: () => request('/complaints/options'),
  getDirectory: () => request('/complaints/directory'),
  createComplaint: async (complaint) =>
    (await request('/complaints', { method: 'POST', body: complaint })).complaint,
  updateComplaint: async (id, complaint) =>
    (await request(`/complaints/${encodeURIComponent(id)}`, { method: 'PATCH', body: complaint })).complaint,
  deleteComplaint: (id) =>
    request(`/complaints/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreComplaint: async (id) =>
    (await request(`/complaints/${encodeURIComponent(id)}/restore`, { method: 'POST' })).complaint,
  logout: async () => {
    try {
      return await request('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  },
};
