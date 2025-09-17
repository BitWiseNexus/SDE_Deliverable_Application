# ===== SERVER CONFIGURATION =====
PORT=5000
NODE_ENV=development

# Add your email for quick access
DEFAULT_USER_EMAIL=

# ===== GOOGLE API CREDENTIALS =====
# Path to your credentials.json file
GOOGLE_CREDENTIALS_PATH=./credentials.json

# OR if you prefer to use individual values (alternative method)
# GOOGLE_CLIENT_ID=your_client_id_from_credentials_json
# GOOGLE_CLIENT_SECRET=your_client_secret_from_credentials_json
# GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# ===== GEMINI AI API =====
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=

# ===== DATABASE =====
DATABASE_PATH=./database/mail_calendar.db

# ===== FRONTEND =====
FRONTEND_URL=http://localhost:5173

# ===== DEBUG FLAGS =====
DEBUG_MODE=true
LOG_LEVEL=info