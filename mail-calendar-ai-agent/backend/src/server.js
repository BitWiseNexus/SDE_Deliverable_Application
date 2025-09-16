import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './database/database.js';
import { validateEnvironmentVariables, logInfo } from './utils/validation.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  logInfo('Starting Mail Calendar AI Agent...');

  try {
    // Step 1: Validate environment variables
  logInfo('Validating environment variables...');
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      console.error('❌ Environment validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.log('\nPlease check your .env file and ensure all required variables are set.');
      console.log('Make sure credentials.json is in the backend folder.');
      console.log('Get Gemini API key from: https://makersuite.google.com/app/apikey\n');
      process.exit(1);
    }
  logInfo('Environment variables validated');

    // Step 2: Initialize database
  logInfo('Initializing database...');
    await initializeDatabase();
  logInfo('Database initialized successfully');

    // Step 3: Start server
    const server = app.listen(PORT, () => {
      logInfo(`Server listening on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logInfo('Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        logInfo('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logInfo('Received SIGINT, shutting down gracefully...');
      server.close(() => {
        logInfo('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('FATAL ERROR - Failed to start server:');
    console.error('════════════════════════════════════════');
    console.error(error.message);
    console.error('════════════════════════════════════════');
    
    if (process.env.DEBUG_MODE === 'true') {
      console.error('\nDEBUG INFO:');
      console.error(error.stack);
    }

    console.log('\nCommon solutions:');
    console.log('   - Check your .env file exists and has correct values');
    console.log('   - Ensure credentials.json is in the backend folder');
    console.log('   - Get Gemini API key from: https://makersuite.google.com/app/apikey');
    console.log('   - Check if port 5000 is already in use');
    console.log('   - Run: npm install\n');
    
    process.exit(1);
  }
}

startServer();