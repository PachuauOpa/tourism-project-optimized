import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const app = express();
const port = Number(process.env.PORT || 4001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// Gemini Client
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

const getGeminiModel = () => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Set it in tourist-AI/.env');
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/api/ai/health', (_req, res) => {
  const configured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({ status: 'ok', geminiConfigured: configured });
});

// ---------------------------------------------------------------------------
// POST /api/ai/generate-itinerary
// ---------------------------------------------------------------------------
app.post('/api/ai/generate-itinerary', async (req, res) => {
  try {
    const { duration, interests, destinations } = req.body || {};

    if (!duration) {
      res.status(400).json({ message: 'Duration is required' });
      return;
    }

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      res.status(400).json({ message: 'At least one interest must be selected' });
      return;
    }

    // Map duration labels to day counts
    const durationMap = {
      '1 Day': 1,
      '2-3 Days': 3,
      'A Week+': 7
    };
    const dayCount = durationMap[duration] || 1;

    // Build destination context for the prompt
    const destinationContext = Array.isArray(destinations) && destinations.length > 0
      ? destinations.map(d => `- ${d.name}: ${d.short || d.detail || ''} (Region: ${d.region || 'unknown'}, Type: ${(d.activityType || []).join(', ') || d.type || 'general'}, Duration: ${d.duration || 'N/A'})`).join('\n')
      : 'No specific destination data provided. Use general knowledge of Mizoram tourism spots.';

    const prompt = `You are an expert Mizoram travel planner. Generate a detailed ${dayCount}-day travel itinerary for someone interested in: ${interests.join(', ')}.

AVAILABLE DESTINATIONS IN MIZORAM:
${destinationContext}

RULES:
1. Create exactly ${dayCount} day(s) of itinerary
2. Each day should have 3-5 activities/stops
3. Include realistic time slots (morning to evening)
4. Match activities to the user's interests: ${interests.join(', ')}
5. Include practical tips like travel time between spots
6. Use actual Mizoram destinations from the list when possible
7. If the list doesn't have enough matching destinations, supplement with well-known Mizoram spots

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no backticks, just valid JSON):
{
  "title": "Your [duration] Mizoram Adventure",
  "summary": "Brief 1-2 sentence summary of the trip",
  "days": [
    {
      "dayNumber": 1,
      "theme": "Short theme for the day",
      "activities": [
        {
          "time": "09:00 AM",
          "name": "Destination/Activity Name",
          "description": "What to do here, what to expect",
          "duration": "2 hours",
          "type": "nature|culture|adventure|food|scenic",
          "tip": "Optional practical tip"
        }
      ]
    }
  ],
  "tips": ["General travel tip 1", "General travel tip 2"]
}`;

    console.log('📝 Calling Gemini API with prompt (length: ' + prompt.length + ')');
    const model = getGeminiModel();
    console.log('🤖 Model obtained:', model.constructor.name);
    const result = await model.generateContent(prompt);
    console.log('✅ AI response received');
    const responseText = result.response.text();

    // Parse the JSON response - handle potential markdown wrapping
    let itinerary;
    try {
      // Try direct parse first
      itinerary = JSON.parse(responseText);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        itinerary = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the text
        const braceStart = responseText.indexOf('{');
        const braceEnd = responseText.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd !== -1) {
          itinerary = JSON.parse(responseText.slice(braceStart, braceEnd + 1));
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }
    }

    // Validate structure
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error('Invalid itinerary structure: missing days array');
    }

    res.json({
      success: true,
      itinerary,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Itinerary generation failed:', error);

    const isConfigError = error.message?.includes('not configured');
    const statusCode = isConfigError ? 503 : 500;

    res.status(statusCode).json({
      success: false,
      message: isConfigError
        ? 'AI service is not configured. Please set GEMINI_API_KEY in tourist-AI/.env'
        : 'Failed to generate itinerary. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(port, () => {
  const geminiStatus = GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here'
    ? '✅ Gemini API configured'
    : '⚠️  Gemini API key not set - set GEMINI_API_KEY in .env';

  console.log(`\n🤖 Tourist AI Service running on http://localhost:${port}`);
  console.log(`   ${geminiStatus}\n`);
});
