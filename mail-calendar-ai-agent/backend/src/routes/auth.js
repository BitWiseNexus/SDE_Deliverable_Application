// backend/src/routes/auth.js
const express = require('express');
const { google } = require('googleapis');
const { createUser, getUserByEmail, logAgentAction } = require('../database/database');
const { logError, logSuccess, validateGoogleCredentials } = require('../utils/validation');

const router = express.Router();

// OAuth2 client setup
function createOAuth2Client() {
  const validation = validateGoogleCredentials(
    process.env.GOOGLE_CLIENT_ID, 
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  if (!validation.isValid) {
    throw new Error(`Google credentials invalid: ${validation.errors.join(', ')}`);
  }
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
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
    res.json({ 
      success: true,
      authUrl,
      message: 'Visit the auth URL to authenticate with Google'
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
  const { code, error } = req.query;
  
  if (error) {
    logError('OAuth Callback', new Error(error));
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${error}`);
  }
  
  if (!code) {
    return res.status(400).json({ 
      error: true,
      message: 'Authorization code is required'
    });
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    
    // Exchange code for tokens
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
    
    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success&email=${userInfo.email}`);
    
  } catch (error) {
    logError('OAuth Token Exchange', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
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
      hasTokens: !!(user && user.access_token),
      createdAt: user ? user.created_at : null
    });
  } catch (error) {
    logError('Auth Status Check', error);
    res.status(500).json({ 
      error: true,
      message: 'Failed to check authentication status'
    });
  }
});

// POST /auth/logout/:email - Logout user
router.post('/logout/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    // In a real app, you might want to revoke tokens
    // For now, we'll just log the action
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

module.exports = router;