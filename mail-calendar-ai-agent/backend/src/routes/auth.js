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
  
  if (error) {
    logError('OAuth Callback', new Error(error));
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${error}`);
  }
  
  if (!code) {
    logError('OAuth Callback', new Error('No authorization code received'));
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1>❌ Authentication Failed</h1>
          <p>No authorization code received. Please try again.</p>
          <a href="/auth/login?redirect=true" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🔄 Retry Authentication</a>
        </body>
      </html>
    `);
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    
    // Exchange code for tokens
    logSuccess('Exchanging auth code for tokens...');
    const { tokens } = await oauth2Client.getAccessToken(code);
    logSuccess('Received OAuth tokens');
    
    // Get user info
    oauth2Client.setCredentials({ access_token: tokens.access_token });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    // Save user and tokens to database
    await createUser(userInfo.email, tokens.access_token, tokens.refresh_token);
    await logAgentAction(userInfo.email, 'user_authenticated', 'success', 'OAuth flow completed');
    
    logSuccess(`User authenticated: ${userInfo.email}`);
    
    // Success page with redirect to frontend
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <meta http-equiv="refresh" content="3;url=${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success&email=${userInfo.email}">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; margin-bottom: 15px; }
            .link { color: #4285f4; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅ Authentication Successful!</div>
            <p class="info">Welcome, <strong>${userInfo.name || userInfo.email}</strong>!</p>
            <p class="info">Your Mail Calendar AI Agent is now connected.</p>
            <p class="info">You will be redirected to the application in 3 seconds...</p>
            <p>If not redirected automatically, <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success&email=${userInfo.email}" class="link">click here</a></p>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    logError('OAuth Token Exchange', error);
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #f44336;">❌ Authentication Failed</h1>
            <p>Error: ${error.message}</p>
            <a href="/auth/login?redirect=true" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">🔄 Try Again</a>
          </div>
        </body>
      </html>
    `);
  }
});

// GET /auth/status/:email - Check authentication status
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