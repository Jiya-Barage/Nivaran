require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const { ensureSchema, seedDemoStaffAccounts } = require('./controllers/authController');
const { ensureComplaintSchema, importLegacyComplaints } = require('./controllers/complaintController');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ ok: true, message: 'Backend is running and MySQL is reachable.' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'MySQL connection failed', details: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

async function startServer() {
  try {
    await ensureSchema();
    await ensureComplaintSchema();
    const importedComplaints = await importLegacyComplaints();
    if (importedComplaints) {
      console.log(`Imported ${importedComplaints} legacy complaints into HostelCare.`);
    }
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      await seedDemoStaffAccounts();
    }
    const [rows] = await pool.query('SELECT 1');
    console.log('MySQL connection verified.');
    app.listen(PORT, () => {
      console.log(`HostelCare backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MySQL connection failed during startup:', error.message);
    console.error('Please update backend/.env with the correct DB credentials and restart the backend.');
    process.exit(1);
  }
}

startServer();
