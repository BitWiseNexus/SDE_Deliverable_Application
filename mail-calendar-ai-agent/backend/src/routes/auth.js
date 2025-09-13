import express from 'express';
import { google } from 'googleapis';
import { createUser, getUserByEmail, logAgentAction } from '../database/database.js';
import { logError, logSuccess, loadGoogleCredentials } from '../utils/validation.js';

const router = express.Router();

// Load credentials and create OAuth2 client
function createOAuth2Client() {
  try {
    const credentials = loadGoogleCredentials();
    
    return new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0] || 'http://localhost:5000/auth/google/callback'
    );
  } catch (error) {
    throw new Error(`Failed to create OAuth client: ${error.message}`);
  }
}

// Scopes needed for Gmail and Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email'
];

// GET /auth/login - Start OAuth flow
router.get('/login', (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent to get refresh token
    });
    
    logSuccess('Generated auth URL');
    
    // For development, you can also redirect directly
    if (req.query.redirect === 'true') {
      return res.redirect(authUrl);
    }
    
    res.json({ 
      success: true,
      authUrl,
      message: 'Visit the auth URL to authenticate with Google',
      directLink: `${req.protocol}://${req.get('host')}/auth/login?redirect=true`
    });
  } catch (error) {
    logError('Auth Login', error);
    res.status(500).json({ 
      error: true,
      message: 'Failed to generate auth URL',
      details: error.message
    });
  }
});

// GET /auth/google/callback - Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  
  console.log('🔍 OAuth Callback Debug Info:');
  console.log('   Code:', code ? 'Present' : 'Missing');
  console.log('   Error:', error || 'None');
  console.log('   State:', state || 'None');
  
  if (error) {
    console.error('❌ OAuth Error from Google:', error);
    logError('OAuth Callback', new Error(error));
    return res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1>❌ Google OAuth Error</h1>
          <p><strong>Error:</strong> ${error}</p>
          <a href="/auth/login?redirect=true" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🔄 Try Again</a>
        </body>
      </html>
    `);
  }
  
  if (!code) {
    console.error('❌ No authorization code received');
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1>❌ Authentication Failed</h1>
          <p>No authorization code received from Google.</p>
          <a href="/auth/login?redirect=true" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🔄 Try Again</a>
        </body>
      </html>
    `);
  }
  
  try {
    console.log('🔑 Creating OAuth2 client...');
    const oauth2Client = createOAuth2Client();
    console.log('✅ OAuth2 client created successfully');
    
    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ Tokens received successfully');
    console.log('   Access token:', tokens.access_token ? 'Present' : 'Missing');
    console.log('   Refresh token:', tokens.refresh_token ? 'Present' : 'Missing');
    console.log('   Expires in:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not specified');
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // Get user info
    console.log('👤 Getting user information...');
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    console.log('✅ User info received:');
    console.log('   Email:', userInfo.email);
    console.log('   Name:', userInfo.name);
    console.log('   Verified:', userInfo.verified_email);
    
    // Save user and tokens to database
    console.log('💾 Saving user to database...');
    await createUser(userInfo.email, tokens.access_token, tokens.refresh_token);
    await logAgentAction(userInfo.email, 'user_authenticated', 'success', 'OAuth flow completed');
    console.log('✅ User saved to database successfully');
    
    logSuccess(`🎉 User authenticated successfully: ${userInfo.email}`);
    
    // Success page - redirect to quick-login for better UX
    res.send(`
      <html>
        <head>
          <title>🎉 Authentication Successful</title>
          <meta http-equiv="refresh" content="2;url=/auth/quick-login/${userInfo.email}">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; margin-bottom: 15px; }
            .debug { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅ Authentication Successful!</div>
            <p class="info">Welcome, <strong>${userInfo.name || userInfo.email}</strong>!</p>
            <p class="info">Your Mail Calendar AI Agent is now connected! 🚀</p>
            
            <div class="debug">
              <strong>✅ Connection Status:</strong><br>
              📧 Email: ${userInfo.email}<br>
              🔑 Access Token: ✅ Valid<br>
              🔄 Refresh Token: ${tokens.refresh_token ? '✅ Available' : '❌ Missing'}<br>
              📅 Expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'Unknown'}
            </div>
            
            <p class="info">Redirecting to your dashboard in 2 seconds...</p>
            <p>If not redirected: <a href="/auth/quick-login/${userInfo.email}" style="color: #4285f4; text-decoration: none;">Click Here</a></p>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('💥 OAuth token exchange failed:');
    console.error('   Error type:', error.constructor.name);
    console.error('   Error message:', error.message);
    console.error('   Error status:', error.status);
    console.error('   Error code:', error.code);
    
    logError('OAuth Token Exchange', error);
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #f44336;">❌ Authentication Failed</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            
            <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>💡 Common Solutions:</strong>
              <ul style="text-align: left;">
                <li>Check your Google Cloud Console redirect URI settings</li>
                <li>Make sure APIs are enabled (Gmail, Calendar)</li>
                <li>Verify your credentials.json file is correct</li>
                <li>Check if OAuth consent screen is configured</li>
              </ul>
            </div>
            
            <a href="/auth/login?redirect=true" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🔄 Try Again</a>
          </div>
        </body>
      </html>
    `);
  }
});

// GET /auth/check/:email - Check authentication status (API endpoint)
router.get('/check/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const user = await getUserByEmail(email);
    
    if (user && user.access_token && user.refresh_token) {
      res.json({
        authenticated: true,
        email: user.email,
        message: '✅ Already authenticated! No need to login again.',
        authenticatedAt: user.created_at,
        lastUpdated: user.updated_at
      });
    } else {
      res.json({
        authenticated: false,
        email: email,
        message: '❌ Not authenticated. Please login first.',
        loginUrl: `/auth/login?redirect=true`
      });
    }
  } catch (error) {
    logError('Auth Check', error);
    res.status(500).json({
      error: true,
      message: 'Failed to check authentication status'
    });
  }
});

// GET /auth/quick-login/:email - Dashboard with auto-login check
router.get('/quick-login/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const user = await getUserByEmail(email);
    
    if (user && user.access_token && user.refresh_token) {
      // User is authenticated - show dashboard
      res.send(`
        <html>
          <head>
            <title>Mail Calendar AI Agent - Dashboard</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin: 0; background: #f5f5f5; }
              .header { background: #4285f4; color: white; padding: 20px; }
              .container { max-width: 800px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .success { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
              .btn { background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block; border: none; cursor: pointer; font-size: 14px; }
              .btn:hover { background: #3367d6; }
              .btn.processing { background: #ff9800; }
              .btn.success { background: #4CAF50; }
              .btn.error { background: #f44336; }
              .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
              .card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
              .card h3 { margin: 0 0 10px; color: #333; }
              .result { margin: 20px 0; padding: 15px; border-radius: 5px; }
              .result.success { background: #e8f5e9; color: #2e7d32; }
              .result.error { background: #ffebee; color: #c62828; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📧 Mail Calendar AI Agent</h1>
              <p>Dashboard for ${email}</p>
            </div>
            
            <div class="container">
              <div class="success">✅ Ready to Process Emails!</div>
              
              <div class="info">
                <strong>📊 Account Status:</strong><br>
                🔑 Authenticated: ${new Date(user.created_at).toLocaleDateString()}<br>
                🔄 Last Updated: ${new Date(user.updated_at).toLocaleDateString()}<br>
                📧 Email Access: ✅ Enabled<br>
                📅 Calendar Access: ✅ Enabled
              </div>

              <div class="grid">
                <div class="card">
                  <h3>🤖 Process Emails</h3>
                  <button class="btn" onclick="processEmails()" id="processBtn">
                    📧 Start Processing
                  </button>
                </div>
                
                <div class="card">
                  <h3>📊 View Data</h3>
                  <a href="/api/database/emails/${encodeURIComponent(email)}" class="btn" target="_blank">
                    📧 Processed Emails
                  </a>
                </div>
                
                <div class="card">
                  <h3>📅 Calendar</h3>
                  <a href="/api/calendar/${encodeURIComponent(email)}/ai-events" class="btn" target="_blank">
                    📅 AI Events
                  </a>
                </div>
                
                <div class="card">
                  <h3>📈 Analytics</h3>
                  <a href="/api/database/stats" class="btn" target="_blank">
                    📊 Dashboard Stats
                  </a>
                </div>
              </div>
              
              <div id="result"></div>
              
              <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h3>🧪 API Testing</h3>
                <p>Test the AI agent directly with cURL:</p>
                <code style="background: white; padding: 10px; border-radius: 4px; display: block; text-align: left; font-size: 12px; overflow-x: auto;">
curl -X POST http://localhost:5000/api/agent/process/${encodeURIComponent(email)} \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"maxEmails": 5, "createCalendarEvents": true}'
                </code>
              </div>
            </div>

            <script>
              async function processEmails() {
                const btn = document.getElementById('processBtn');
                const result = document.getElementById('result');
                
                btn.innerHTML = '⏳ Processing...';
                btn.className = 'btn processing';
                btn.disabled = true;
                
                result.innerHTML = '<div class="result">🔄 Processing your emails...</div>';
                
                try {
                  const response = await fetch('/api/agent/process/${encodeURIComponent(email)}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ maxEmails: 10, createCalendarEvents: true })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    btn.innerHTML = '✅ Processing Complete!';
                    btn.className = 'btn success';
                    
                    const summary = data.results.summary;
                    result.innerHTML = \`
                      <div class="result success">
                        <h3>🎉 Processing Complete!</h3>
                        <div class="grid">
                          <div class="card">
                            <h3>📧 \${summary.processedEmails}</h3>
                            <p>Emails Processed</p>
                          </div>
                          <div class="card">
                            <h3>📅 \${summary.createdEvents}</h3>
                            <p>Calendar Events Created</p>
                          </div>
                          <div class="card">
                            <h3>⏭️ \${summary.skippedEmails}</h3>
                            <p>Emails Skipped</p>
                          </div>
                          <div class="card">
                            <h3>❌ \${summary.errors}</h3>
                            <p>Errors</p>
                          </div>
                        </div>
                      </div>
                    \`;
                  } else {
                    throw new Error(data.message || 'Processing failed');
                  }
                } catch (error) {
                  btn.innerHTML = '❌ Processing Failed';
                  btn.className = 'btn error';
                  result.innerHTML = \`
                    <div class="result error">
                      <h3>❌ Processing Failed</h3>
                      <p>\${error.message}</p>
                    </div>
                  \`;
                }
                
                setTimeout(() => {
                  btn.innerHTML = '🔄 Process Again';
                  btn.className = 'btn';
                  btn.disabled = false;
                }, 3000);
              }
            </script>
          </body>
        </html>
      `);
    } else {
      // User needs to authenticate
      res.redirect('/auth/login?redirect=true');
    }
  } catch (error) {
    logError('Quick Login Check', error);
    res.status(500).send(`
      <html>
        <body style="text-align: center; margin-top: 50px; font-family: Arial;">
          <h1>❌ Error</h1>
          <p>${error.message}</p>
          <a href="/auth/login?redirect=true">Try Login</a>
        </body>
      </html>
    `);
  }
});

// GET /auth/status/:email - Check authentication status (duplicate route - keeping for backward compatibility)
router.get('/status/:email', async (req, res) => {
  const { email } = req.params;
  
  if (!email) {
    return res.status(400).json({ 
      error: true,
      message: 'Email is required'
    });
  }
  
  try {
    const user = await getUserByEmail(email);
    
    res.json({
      authenticated: !!user,
      email: email,
      hasTokens: !!(user && user.access_token && user.refresh_token),
      createdAt: user ? user.created_at : null,
      lastUpdated: user ? user.updated_at : null
    });
  } catch (error) {
    logError('Auth Status Check', error);
    res.status(500).json({ 
      error: true,
      message: 'Failed to check authentication status'
    });
  }
});

// GET /auth/test - Test credentials loading
router.get('/test', (req, res) => {
  try {
    const credentials = loadGoogleCredentials();
    res.json({
      success: true,
      message: 'Credentials loaded successfully',
      clientId: credentials.client_id ? credentials.client_id.substring(0, 20) + '...' : 'Not found',
      hasClientSecret: !!credentials.client_secret,
      redirectUris: credentials.redirect_uris
    });
  } catch (error) {
    logError('Auth Test', error);
    res.status(500).json({
      error: true,
      message: 'Failed to load credentials',
      details: error.message
    });
  }
});

// POST /auth/logout/:email - Logout user
router.post('/logout/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    await logAgentAction(email, 'user_logout', 'success', 'User logged out');
    
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logError('Auth Logout', error);
    res.status(500).json({ 
      error: true,
      message: 'Logout failed'
    });
  }
});

export default router;