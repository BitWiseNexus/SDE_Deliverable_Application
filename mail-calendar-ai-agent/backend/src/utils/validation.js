import fs from 'fs';
import path from 'path';

export function validateEnvironmentVariables() {
  const errors = [];
  const warnings = [];

  // Check for credentials.json file
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  if (!fs.existsSync(credentialsPath)) {
    errors.push(`Google credentials file not found at: ${credentialsPath}`);
    errors.push('Please ensure credentials.json is in the backend folder');
  } else {
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      // Check if it's OAuth credentials
      if (credentials.installed) {
        if (!credentials.installed.client_id || !credentials.installed.client_secret) {
          errors.push('credentials.json missing client_id or client_secret');
        }
      } else if (credentials.web) {
        if (!credentials.web.client_id || !credentials.web.client_secret) {
          errors.push('credentials.json missing client_id or client_secret in web config');
        }
      } else {
        warnings.push('Unusual credentials.json format detected');
      }
    } catch (error) {
      errors.push(`Invalid credentials.json format: ${error.message}`);
    }
  }

  // Check Gemini API Key
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
    errors.push('GEMINI_API_KEY is missing or contains placeholder text');
  } else if (!process.env.GEMINI_API_KEY.startsWith('AI')) {
    warnings.push('GEMINI_API_KEY should start with "AI"');
  }

  // Check if database directory can be created
  try {
    const dbPath = process.env.DATABASE_PATH || './database/mail_calendar.db';
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (error) {
    errors.push(`Cannot create database directory: ${error.message}`);
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function loadGoogleCredentials() {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Google credentials file not found: ${credentialsPath}`);
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Handle different credential formats
    if (credentials.installed) {
      return {
        client_id: credentials.installed.client_id,
        client_secret: credentials.installed.client_secret,
        redirect_uris: credentials.installed.redirect_uris || ['http://localhost:5000/auth/google/callback']
      };
    } else if (credentials.web) {
      return {
        client_id: credentials.web.client_id,
        client_secret: credentials.web.client_secret,
        redirect_uris: credentials.web.redirect_uris || ['http://localhost:5000/auth/google/callback']
      };
    } else {
      throw new Error('Unsupported credentials.json format');
    }
  } catch (error) {
    throw new Error(`Failed to load credentials: ${error.message}`);
  }
}

export function logError(context, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ERROR in ${context}:`);
  console.error(`   Message: ${error.message}`);
  
  if (process.env.DEBUG_MODE === 'true') {
    console.error(`   Stack: ${error.stack}`);
  }
}

export function logInfo(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ℹ️  ${message}`);
}

export function logSuccess(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ ${message}`);
}