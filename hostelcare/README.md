# HostelCare - Smart Hostel Complaint Management

React 18 + Vite + Tailwind CSS frontend with a MySQL-backed Express authentication backend.

## Frontend
    cd hostelcare
    npm install
    npm run dev        # http://localhost:5173
    npm run build

## Backend
    cd hostelcare/backend
    npm install
    copy .env.example .env
    # Update .env with your MySQL username/password and JWT secret
    npm run dev

The backend listens on http://localhost:5000 and exposes authentication routes at /api/auth and complaint routes at /api/complaints.

## Environment files
- Frontend: hostelcare/.env
- Backend: hostelcare/backend/.env

These files are ignored by Git and should contain your local database and JWT settings.

## Default auth flow
- Student self-registration is supported through the UI.
- Registration and login use the backend MySQL user table and bcrypt password hashes.
- Session cookies are used for persistence across browser reloads.
- In development, the backend creates the student-profile and complaint tables and seeds the demo Admin/Warden accounts if their usernames, emails, and phone numbers are unused.
- Student complaints, status changes, assignments, ratings, and feedback are stored in MySQL and are visible to the Warden/Admin accounts.
- If the backend is unreachable, the frontend has a development-only local demo mode. Local-demo registrations and complaints stay in that browser and are not written to MySQL.
- If MySQL returns an application/database error, the frontend shows the error rather than reporting a local write as successful.
- The single Warden account can review complaints from every hostel.
- Seed/mock complaints and local-demo updates are saved in the browser and synchronized between open tabs on the same origin. They do not persist to MySQL or sync between different browsers/devices.
- Production does not use local demo fallback; configure the database and JWT settings before running it.

## Database note
The app expects an existing MySQL schema named hostel_complaint_db with the legacy `user_account`, `student`, and `room` tables. The backend automatically adds `password_hash` to `user_account` when missing and creates `hostelcare_student_profile` and `hostelcare_complaint`. Public student registration also needs valid hostel and room records in the legacy tables. Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env`; never commit that file.
