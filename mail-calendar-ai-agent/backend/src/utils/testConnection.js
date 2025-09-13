import 'dotenv/config';
import { validateEnvironmentVariables, loadGoogleCredentials, logError, logSuccess, logInfo } from './validation.js';
import geminiService from '../services/geminiService.js';

async function testAllConnections() {
  console.log('🧪 Testing Mail Calendar AI Agent Connections...\n');

  // Test 1: Environment Variables
  console.log('1️⃣  Testing Environment Variables...');
  const envValidation = validateEnvironmentVariables();
  if (envValidation.isValid) {
    logSuccess('Environment variables are valid');
  } else {
    console.error('❌ Environment validation failed:');
    envValidation.errors.forEach(error => console.error(`   - ${error}`));
    return;
  }

  // Test 2: Google Credentials
  console.log('\n2️⃣  Testing Google Credentials...');
  try {
    const credentials = loadGoogleCredentials();
    logSuccess('Google credentials loaded successfully');
    logInfo(`Client ID: ${credentials.client_id.substring(0, 20)}...`);
    logInfo(`Redirect URIs: ${credentials.redirect_uris.join(', ')}`);
  } catch (error) {
    logError('Google Credentials', error);
    return;
  }

  // Test 3: Gemini AI
  console.log('\n3️⃣  Testing Gemini AI...');
  try {
    const geminiTest = await geminiService.testConnection();
    if (geminiTest.success) {
      logSuccess('Gemini AI connection successful');
      logInfo(`Response: ${geminiTest.response}`);
    } else {
      logError('Gemini AI Test', new Error(geminiTest.error));
    }
  } catch (error) {
    logError('Gemini AI', error);
  }

  console.log('\n✅ Connection tests completed!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Visit: http://localhost:5000/auth/test');
  console.log('   3. Authenticate: http://localhost:5000/auth/login?redirect=true');
  console.log('   4. Test processing: POST http://localhost:5000/api/agent/process/:email');
}

testAllConnections().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});