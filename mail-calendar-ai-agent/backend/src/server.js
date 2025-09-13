import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './database/database.js';
import { validateEnvironmentVariables } from './utils/validation.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('🚀 Starting Mail Calendar AI Agent...\n');

  try {
    // Step 1: Validate environment variables
    console.log('📋 Validating environment variables...');
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      console.error('❌ Environment validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.log('\n💡 Please check your .env file and ensure all required variables are set.');
      console.log('💡 Make sure credentials.json is in the backend folder.');
      console.log('💡 Get Gemini API key from: https://makersuite.google.com/app/apikey\n');
      process.exit(1);
    }
    console.log('✅ Environment variables validated\n');

    // Step 2: Initialize database
    console.log('🗄️  Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Step 3: Start server
    const server = app.listen(PORT, () => {
      console.log('🎉 SERVER STARTED SUCCESSFULLY!');
      console.log('════════════════════════════════════════════');
      console.log(`🌐 Server:     http://localhost:${PORT}`);
      console.log(`🏥 Health:     http://localhost:${PORT}/health`);
      console.log(`🔐 Auth:       http://localhost:${PORT}/auth/login`);
      console.log(`🧪 Test Creds: http://localhost:${PORT}/auth/test`);
      console.log(`📧 Process:    POST http://localhost:${PORT}/api/agent/process/:email`);
      console.log('════════════════════════════════════════════');
      console.log('📝 Logs will appear below...\n');
      console.log('🚀 NEXT STEPS:');
      console.log('   1. Visit /auth/test to verify credentials');
      console.log('   2. Visit /auth/login?redirect=true to authenticate');
      console.log('   3. Use POST /api/agent/process/:email to run the AI agent\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🔄 Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 FATAL ERROR - Failed to start server:');
    console.error('════════════════════════════════════════');
    console.error(error.message);
    console.error('════════════════════════════════════════');
    
    if (process.env.DEBUG_MODE === 'true') {
      console.error('\n🐛 DEBUG INFO:');
      console.error(error.stack);
    }
    
    console.log('\n💡 Common solutions:');
    console.log('   - Check your .env file exists and has correct values');
    console.log('   - Ensure credentials.json is in the backend folder');
    console.log('   - Get Gemini API key from: https://makersuite.google.com/app/apikey');
    console.log('   - Check if port 5000 is already in use');
    console.log('   - Run: npm install\n');
    
    process.exit(1);
  }
}

startServer();