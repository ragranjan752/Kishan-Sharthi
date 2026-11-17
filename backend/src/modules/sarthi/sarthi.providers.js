// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Multi-Provider AI LLM Adapter (Gemini & OpenAI)
//  Never invents pesticide doses, fake schemes, or statistical figures.
// ═══════════════════════════════════════════════════════════════════

const logger = require('../../config/logger');

/**
 * Call Google Gemini API
 */
async function callGemini(systemPrompt, userMessage, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt + '\n\n---\nकिसान का प्रश्न:\n' + userMessage }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Low temperature for high factual accuracy
      maxOutputTokens: 800
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return text;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(systemPrompt, userMessage, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.2,
    max_tokens: 800
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

/**
 * Unified dispatch with automatic fallback
 */
async function generateAgriAdvice(systemPrompt, userMessage) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      return {
        provider: 'gemini',
        text: await callGemini(systemPrompt, userMessage, geminiKey)
      };
    } catch (err) {
      logger.warn({ err: err.message }, 'Gemini API call failed - trying fallback provider');
    }
  }

  if (openaiKey && !openaiKey.includes('your_')) {
    try {
      return {
        provider: 'openai',
        text: await callOpenAI(systemPrompt, userMessage, openaiKey)
      };
    } catch (err) {
      logger.warn({ err: err.message }, 'OpenAI API call failed');
    }
  }

  return null; // Both failed or unconfigured, triggers deterministic verified RAG fallback
}

module.exports = {
  generateAgriAdvice
};
