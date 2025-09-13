import { google } from 'googleapis';
import { getUserByEmail, logAgentAction, isEmailProcessed, createUser } from '../database/database.js';
import { logError, logSuccess, logInfo, loadGoogleCredentials } from '../utils/validation.js';

class GmailService {
  constructor() {
    this.gmail = null;
    this.credentials = null;
  }

  // Initialize Gmail client for user
  async initializeGmailClient(userEmail) {
    try {
      const user = await getUserByEmail(userEmail);
      if (!user || !user.access_token) {
        throw new Error(`User not authenticated: ${userEmail}`);
      }

      // Load Google credentials
      this.credentials = loadGoogleCredentials();
      
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        this.credentials.client_id,
        this.credentials.client_secret,
        this.credentials.redirect_uris[0]
      );

      // Set user tokens
      oauth2Client.setCredentials({
        access_token: user.access_token,
        refresh_token: user.refresh_token
      });

      // Handle token refresh
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          logInfo(`Refreshing tokens for ${userEmail}`);
          await createUser(userEmail, tokens.access_token, tokens.refresh_token || user.refresh_token);
        }
      });

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      logSuccess(`Gmail client initialized for ${userEmail}`);
      
      return this.gmail;
    } catch (error) {
      logError('Gmail Client Init', error);
      throw new Error(`Failed to initialize Gmail client: ${error.message}`);
    }
  }

  // Get recent emails
  async getRecentEmails(userEmail, maxResults = 10, timeRange = '1d') {
    try {
      await this.initializeGmailClient(userEmail);
      
      // Build query for recent emails
      const query = `newer_than:${timeRange} -in:spam -in:trash -from:noreply`;
      
      logInfo(`Fetching emails for ${userEmail} with query: ${query}`);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      await logAgentAction(userEmail, 'fetch_emails', 'success', 
        `Found ${messages.length} emails`);
      
      logSuccess(`Found ${messages.length} recent emails`);
      return messages;
    } catch (error) {
      await logAgentAction(userEmail, 'fetch_emails', 'error', error.message);
      logError('Get Recent Emails', error);
      throw new Error(`Failed to get recent emails: ${error.message}`);
    }
  }

  // Get detailed email content
  async getEmailDetails(userEmail, messageId) {
    try {
      if (!this.gmail) {
        await this.initializeGmailClient(userEmail);
      }

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      
      // Extract email details
      const headers = message.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract body content
      const body = this.extractEmailBody(message.payload);

      return {
        id: messageId,
        subject,
        from,
        date,
        body,
        snippet: message.snippet,
        threadId: message.threadId,
        labelIds: message.labelIds || []
      };
    } catch (error) {
      await logAgentAction(userEmail, 'get_email_details', 'error', 
        `Failed to get email ${messageId}: ${error.message}`);
      logError('Get Email Details', error);
      throw new Error(`Failed to get email details: ${error.message}`);
    }
  }

  // Extract email body from payload
  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      body = this.extractFromParts(payload.parts);
    }

    return this.cleanEmailBody(body);
  }

  // Extract body from email parts
  extractFromParts(parts) {
    let body = '';
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body.data && !body) {
        let htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        body = this.stripHtmlTags(htmlBody);
      } else if (part.parts) {
        body += this.extractFromParts(part.parts);
      }
    }
    
    return body;
  }

  // Strip HTML tags
  stripHtmlTags(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace