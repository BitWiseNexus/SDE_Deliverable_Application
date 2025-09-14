import { GoogleGenerativeAI } from '@google/generative-ai';
import { logError, logSuccess, logInfo } from '../utils/validation.js';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey || this.apiKey.includes('your_')) {
      throw new Error('GEMINI_API_KEY is not properly configured');
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    logSuccess('Gemini AI service initialized');
  }

  // Analyze email content and extract insights
  async analyzeEmail(email) {
    try {
      const prompt = `
        Analyze this email and provide a JSON response with the following structure:
        {
          "summary": "Brief summary of the email content (max 200 characters)",
          "importance_score": integer (1–10, 10 being most important),
          "deadline_info": {
            "has_deadline": true/false,
            "deadline_date": "YYYY-MM-DD format if found, null otherwise",
            "deadline_time": "HH:MM format if found, null otherwise",
            "deadline_description": "description of what the deadline is for"
          },
          "action_required": true/false,
          "category": "work/personal/promotional/social/other",
          "sentiment": "positive/neutral/negative",
          "keywords": ["key", "words", "from", "email"]
        } 

        Email to analyze:
        Subject: ${email.subject}
        From: ${email.from}
        Content: ${email.body || email.snippet}

        Please provide only the JSON response, no other text.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON response
      try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(cleanText);
        logSuccess(`Email analyzed: ${email.subject}`);
        return analysis;
      } catch (parseError) {
        // If JSON parsing fails, create a basic analysis
        logError('JSON Parse Error', parseError);
        return this.createFallbackAnalysis(email, text);
      }
      
    } catch (error) {
      logError('Gemini Analysis', error);
      return this.createFallbackAnalysis(email, null);
    }
  }

  // Create fallback analysis if AI fails
  createFallbackAnalysis(email, aiResponse) {
    const content = email.body || email.snippet || '';
    
    // Simple keyword-based importance scoring
    const importantKeywords = [
      'urgent', 'deadline', 'asap', 'important', 'critical', 'meeting', 
      'interview', 'exam', 'assignment', 'project', 'due', 'payment'
    ];
    
    const hasImportantKeywords = importantKeywords.some(keyword => 
      content.toLowerCase().includes(keyword) || 
      email.subject.toLowerCase().includes(keyword)
    );
    
    // Simple deadline detection
    const deadlinePatterns = [
      /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g, // dates
      /(today|tomorrow|next week|this week)/gi,
      /(due|deadline|expires?|ends?)\s+(on|by|at)?\s*([^\n.,]+)/gi
    ];
    
    const hasDeadline = deadlinePatterns.some(pattern => 
      content.match(pattern) || email.subject.match(pattern)
    );
    
    const snippet = content.length > 150 ? content.substring(0, 150) + '...' : content;

    return {
      summary: `${email.subject} - ${snippet}`,
      importance_score: hasImportantKeywords ? 8 : 5,
      deadline_info: {
        has_deadline: hasDeadline,
        deadline_date: null,
        deadline_time: null,
        deadline_description: hasDeadline ? 'Deadline detected but not parsed' : null
      },
      action_required: hasImportantKeywords || hasDeadline,
      category: this.categorizeEmail(email),
      sentiment: 'neutral',
      keywords: this.extractSimpleKeywords(content),
      ai_response: aiResponse // Include raw AI response for debugging
    };
  }

  // Simple email categorization
  categorizeEmail(email) {
    const content = (email.body || email.snippet || '').toLowerCase();
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();
    
    if (from.includes('noreply') || from.includes('no-reply') || 
        content.includes('unsubscribe') || subject.includes('newsletter')) {
      return 'promotional';
    }
    
    if (subject.includes('meeting') || subject.includes('calendar') || 
        content.includes('appointment') || content.includes('schedule')) {
      return 'work';
    }
    
    if (from.includes('facebook') || from.includes('twitter') || 
        from.includes('linkedin') || from.includes('instagram')) {
      return 'social';
    }
    
    return 'personal';
  }

  // Extract simple keywords
  extractSimpleKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(word));
    
    // Get most frequent words
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Test Gemini connection
  async testConnection() {
    try {
      const result = await this.model.generateContent("Say hello and confirm you're working!");
      const response = await result.response;
      const text = response.text();
      
      logSuccess('Gemini AI connection test successful');
      return { success: true, response: text };
    } catch (error) {
      logError('Gemini Connection Test', error);
      return { success: false, error: error.message };
    }
  }

  // Batch analyze multiple emails
  async analyzeEmailsBatch(emails) {
    const results = [];
    
    for (const email of emails) {
      try {
        const analysis = await this.analyzeEmail(email);
        results.push({
          email_id: email.id,
          analysis,
          success: true
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logError(`Batch Analysis - Email ${email.id}`, error);
        results.push({
          email_id: email.id,
          analysis: this.createFallbackAnalysis(email, null),
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export default new GeminiService();