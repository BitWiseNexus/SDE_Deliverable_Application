## Name: Aditya Rehpade
## College: IIT Bhilai
## Department: Electrical Engineering


# Mail → Calendar AI Agent

Mail → Calendar AI Agent reads your unread Gmail messages, uses Gemini to extract event details (title, date/time, attendees, location), and automatically creates Google Calendar events after you sign in with Google OAuth 2.0. The backend is Node.js/Express with SQLite. An Vite + React frontend is included.

## Features

- Google OAuth 2.0 sign-in (Web application flow)
- Fetch unread Gmail messages
- AI-powered email parsing via Gemini API
- Automatic Google Calendar event creation
- SQLite persistence
- CORS-enabled backend for a frontend
- React UI: Dashboard, Emails, Calendar, Settings, “Process Emails” action
- Health check endpoint

## Prerequisites

- Node.js and npm
- Google Cloud project with:
  - OAuth consent screen configured
  - OAuth 2.0 Client (Web application)
  - Gmail API enabled
  - Google Calendar API enabled
- Gemini API key (Google AI Studio)
- Git (for cloning)
- A Google account with Gmail and Calendar access

## Setup Instructions

### 1) Clone and install

```bash
git clone https://github.com/BitWiseNexus/SDE_Deliverable_Application.git
cd mail-calendar-ai-agent

# Backend
cd backend
npm install

# Frontend (optional)
cd ../frontend
npm install
```

### 2) Configure environment variables (backend)

Create backend/.env and fill in the values below. Do NOT commit this file.

- Windows (PowerShell):
```powershell
Copy-Item ..\.env.example .\backend\.env
```

- Or create manually with:
```env
# ===== SERVER =====
PORT=5000
NODE_ENV=development

# ===== FRONTEND (CORS) =====
FRONTEND_URL=http://localhost:5173

# ===== GOOGLE API CREDENTIALS =====
# Preferred: path to the OAuth client JSON downloaded from Google Cloud
GOOGLE_CREDENTIALS_PATH=./credentials.json

# Alternative (only if not using GOOGLE_CREDENTIALS_PATH)
# GOOGLE_CLIENT_ID=your-google-oauth-client-id
# GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
# Must exactly match the redirect URI configured in Google Cloud
# GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# ===== GEMINI AI API =====
GEMINI_API_KEY=your-gemini-api-key

# ===== DATABASE =====
DATABASE_PATH=./database/mail_calendar.db

# ===== OPTIONAL =====
DEFAULT_USER_EMAIL=
DEBUG_MODE=true
LOG_LEVEL=info
```

Notes:
- Place the Google OAuth client JSON in backend/ as credentials.json and reference it via GOOGLE_CREDENTIALS_PATH.
- If you use GOOGLE_CREDENTIALS_PATH, do not set GOOGLE_CLIENT_ID/SECRET/GOOGLE_REDIRECT_URI separately.
- Rotate any keys you previously committed by mistake and remove them from history.

### 3) Obtain required keys and credentials

- Google OAuth Client (Client ID/Secret) and enable APIs
  1. Go to https://console.cloud.google.com/ and select/create a project.
  2. APIs & Services → OAuth consent screen:
     - Set App name and Support email.
     - Add test users (your Google account) if using Testing mode.
     - Scopes (at minimum):
       - Gmail: https://www.googleapis.com/auth/gmail.readonly
       - Calendar: https://www.googleapis.com/auth/calendar.events
  3. APIs & Services → Library:
     - Enable “Gmail API”.
     - Enable “Google Calendar API”.
  4. APIs & Services → Credentials → Create Credentials → OAuth client ID:
     - Application type: Web application
     - Authorized redirect URI: http://localhost:5000/auth/google/callback
     - Download the JSON and save it as backend/credentials.json.
     - Ensure backend/.env has GOOGLE_CREDENTIALS_PATH=./credentials.json.

- Gemini API key
  1. Go to Google AI Studio: https://ai.google.dev/
  2. Create an API key.
  3. Put it in backend/.env as GEMINI_API_KEY.

## How to Run

### Backend

- Development:
```bash
cd backend
npm run dev
```
Backend runs on http://localhost:5000

- Production:
```bash
cd backend
npm start
```

Auth endpoints (for reference):
- Start OAuth: http://localhost:5000/auth/login?redirect=true
- OAuth callback (must match Google Cloud): http://localhost:5000/auth/google/callback
- Dev quick login (if implemented): http://localhost:5000/auth/quick-login/:email

### Frontend (optional)

- Development:
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:5173 (ensure FRONTEND_URL in backend/.env matches).

- Production:
```bash
cd frontend
npm run build
npm run preview
```

### Sign in and test end-to-end

1. Start the backend (and frontend if using the UI).
2. Sign in with Google:
   - UI: click “Sign in with Google”.
   - Direct: open http://localhost:5000/auth/login?redirect=true in a browser.
3. After consent, tokens are stored for your account.
4. Send an email to yourself with clear event details (e.g., “Team sync on Sep 25, 3–4 PM at Room 12. Attendees: a@b.com, c@d.com.”).
5. Trigger processing:
   - UI: click “Process Emails”.
   - Or call the corresponding backend endpoint (if exposed).
6. Check your Google Calendar for the new event.

## Project Structure

```
mail-calendar-ai-agent/
├── backend/
│   ├── src/
│   │   ├── routes/           # Express routes
│   │   │   ├── auth.js
│   │   │   ├── emails.js
│   │   │   ├── calendar.js
│   │   │   ├── agent.js
│   │   │   ├── dashboard.js
│   │   │   └── database.js
│   │   ├── utils/            # Logging/validation helpers
│   │   │   └── validation.js
│   │   ├── app.js            # Express app and middleware
│   │   └── server.js         # Server entry point
│   ├── credentials.json      # Google OAuth client JSON (local, not committed)
│   ├── database/             # SQLite file location (mail_calendar.db)
│   └── package.json
├── frontend/                 # React (Vite) app
│   ├── src/
│   │   ├── components/       # Dashboard, EmailList, CalendarView, Settings, etc.
│   │   ├── context/          # AppContext
│   │   ├── hooks/            # useApi (auth/UI/processing)
│   │   └── App.jsx           # App shell, routing/tabs, login flow
│   ├── index.html
│   ├── vite.config.* 
│   └── package.json
└── README.md
```

Key files:
- backend/src/app.js: Express app bootstrap.
- backend/src/server.js: Starts the HTTP server.
- backend/src/services/: Integrations with Gmail, Calendar, Gemini.
- frontend/src/App.jsx: Auth wrapper, tabs (Dashboard, Emails, Calendar, Settings), “Process Emails”.

## Troubleshooting

- redirect_uri_mismatch:
  - GOOGLE_REDIRECT_URI (or credentials.json redirect) must exactly match Google Cloud.
- invalid_client / unauthorized_client:
  - Check Client ID/Secret and add your account as a Test User (or publish the app).
- Gmail/Calendar 403 or 404:
  - Ensure both APIs are enabled and required scopes were granted during OAuth.
- Token refresh invalid_grant:
  - Delete stored tokens for the user and re-authenticate. Verify system time is correct.
- CORS errors:
  - Set FRONTEND_URL in backend/.env to your frontend origin and restart the backend.
- No events created:
  - Ensure the email is unread and contains parseable date/time.
  - Use the UI “Process Emails” button and check backend logs for Gemini parsing errors.
  - Confirm you’re checking the same Google account’s calendar used during OAuth.
- Database errors:
  - Ensure DATABASE_PATH is writable. In development, delete the DB to reset if needed.
- Gemini errors or quota limits:
  - Verify GEMINI_API_KEY and quotas in Google AI Studio; add retry/backoff as needed.
- Port conflicts:
  - Change PORT or stop other services using 5000/5173.

## License

MIT License. See LICENSE for details.



