# HostelCare - Smart Hostel Complaint Management (Frontend)

Frontend only. React 18 + Vite + Tailwind CSS. All data is mock data kept in React state.

## Run
    npm install
    npm run dev        # http://localhost:5173
    npm run build

## Demo logins
Pick a role on the login page and click "Fill demo credentials".

## Structure
    src/
      data/mockData.js          mock complaints, students, wardens, notifications (replace with API calls later)
      layouts/Shell.jsx         sidebar + top bar
      pages/                    Login, shared pages (notifications, profile, students), complaint list
      dashboards/               StudentDashboard, AdminDashboard, WardenDashboard
      components/               ui, charts, tables, complaint detail, icons
      lib/html.js               small adapter so templates render through React
      App.jsx                   state, routing between pages, toasts, undo

## Connecting MySQL later
The data lives in `App.jsx` state (`cs`, `notes`) seeded from `data/mockData.js`.
The state-changing helpers (`act`, `addC`, `del`, `note`) are the places to replace with calls to your backend.
