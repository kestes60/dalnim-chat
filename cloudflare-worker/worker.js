/**
 * Dalnim (달님) — Cloudflare Worker Backend
 *
 * Deployment:
 *   1. Create a new Cloudflare Worker in the dashboard.
 *   2. Paste this file as the worker script.
 *   3. Create a KV namespace called "RATE_LIMIT" and bind it to this worker.
 *   4. Set all environment variables listed below in Settings → Variables.
 *
 * Required Environment Variables:
 *   ANTHROPIC_API_KEY   — Anthropic API key for Claude
 *   OPENAI_API_KEY      — OpenAI API key for ChatGPT & DALL-E
 *   GOOGLE_AI_API_KEY   — Google AI API key for Gemini
 *   SUPABASE_URL        — Supabase project URL (e.g. https://xyz.supabase.co)
 *   SUPABASE_SERVICE_KEY— Supabase service role key
 *   APP_PASSWORD         — Shared password for private chat authentication
 *   ALLOWED_ORIGIN       — Set to https://kestes60.github.io in Cloudflare Dashboard
 *   DAILY_CHAT_LIMIT     — Max chat messages per day (default 50)
 *   DAILY_IMAGE_LIMIT    — Max image generations per day (default 5)
 *
 * Required KV Namespace Binding:
 *   RATE_LIMIT — KV namespace for daily counters
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(body, status = 200, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

function errorResponse(message, status, env) {
  return jsonResponse({ error: message }, status, env);
}

/** Return today's date string in YYYY-MM-DD format (UTC). */
function todayKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Increment a daily counter in KV. Returns the new count.
 * Keys expire after 48 hours so stale days are cleaned up automatically.
 */
async function incrementCounter(kv, key) {
  const current = parseInt(await kv.get(key) || '0', 10);
  const next = current + 1;
  // Expire after 48h — plenty of buffer past midnight UTC
  await kv.put(key, String(next), { expirationTtl: 172800 });
  return next;
}

async function getCounter(kv, key) {
  return parseInt(await kv.get(key) || '0', 10);
}

// ---------------------------------------------------------------------------
// AI Model Routing
// ---------------------------------------------------------------------------

async function callClaude(messages, system, env) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
  };
  if (system) {
    body.system = system;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const textParts = data.content.filter(b => b.type === 'text').map(b => b.text);
  return textParts.join('\n\n');
}

async function callChatGPT(messages, system, env) {
  const apiMessages = [];
  if (system) {
    apiMessages.push({ role: 'system', content: system });
  }
  apiMessages.push(...messages);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-search-preview',
      messages: apiMessages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ChatGPT API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(messages, system, env) {
  // Convert messages array to Gemini's contents format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = { contents, tools: [{ googleSearch: {} }] };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GOOGLE_AI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/chat
 * { "model": "claude|chatgpt|gemini", "messages": [...], "system": "optional" }
 * → { "content": "..." }
 */
async function handleChat(request, env) {
  const { model, messages, system } = await request.json();

  if (!model || !messages || !Array.isArray(messages)) {
    return errorResponse('Invalid request: model and messages are required.', 400, env);
  }

  // Rate limiting
  const today = todayKey();
  const chatKey = `chat_count_${today}`;
  const currentCount = await getCounter(env.RATE_LIMIT, chatKey);
  const limit = parseInt(env.DAILY_CHAT_LIMIT || '50', 10);

  if (currentCount >= limit) {
    return jsonResponse({
      error: `오늘의 메시지 한도에 도달했습니다 · You've reached today's message limit (${limit}/${limit}). Resets at midnight!`,
    }, 429, env);
  }

  let content;
  try {
    switch (model) {
      case 'claude':
        content = await callClaude(messages, system, env);
        break;
      case 'chatgpt':
        content = await callChatGPT(messages, system, env);
        break;
      case 'gemini':
        content = await callGemini(messages, system, env);
        break;
      default:
        return errorResponse(`Unknown model: ${model}`, 400, env);
    }
  } catch (err) {
    console.error('AI call failed:', err.message);
    // TODO: Remove debug message — restore generic error after debugging
    return errorResponse(`${model} error: ${err.message}`, 502, env);
  }

  // Increment counter only after successful call
  await incrementCounter(env.RATE_LIMIT, chatKey);

  return jsonResponse({ content }, 200, env);
}

/**
 * POST /api/image
 * { "prompt": "..." }
 * → { "url": "..." }
 */
async function handleImage(request, env) {
  const { prompt } = await request.json();

  if (!prompt) {
    return errorResponse('Invalid request: prompt is required.', 400, env);
  }

  // Rate limiting
  const today = todayKey();
  const imageKey = `image_count_${today}`;
  const currentCount = await getCounter(env.RATE_LIMIT, imageKey);
  const limit = parseInt(env.DAILY_IMAGE_LIMIT || '5', 10);

  if (currentCount >= limit) {
    return jsonResponse({
      error: `오늘의 이미지 한도에 도달했습니다 · You've reached today's image limit (${limit}/${limit}). Resets at midnight!`,
    }, 429, env);
  }

  let url;
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DALL-E API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    url = data.data[0].url;
  } catch (err) {
    console.error('Image generation failed:', err.message);
    return errorResponse(
      '잠시 후 다시 시도해 주세요 · Please try again in a moment.',
      502,
      env,
    );
  }

  // Increment counter only after success
  await incrementCounter(env.RATE_LIMIT, imageKey);

  return jsonResponse({ url }, 200, env);
}

/**
 * POST /api/message
 * Proxy to Supabase — keeps the service key server-side.
 * Body is forwarded as-is to the Supabase REST API.
 *
 * Expected body for sending a message:
 *   { "sender": "keith"|"friend", "content": "..." }
 *
 * To fetch messages pass query params via a "action" field:
 *   { "action": "fetch", "limit": 50 }
 */
async function handleMessage(request, env) {
  const body = await request.json();

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return errorResponse('Supabase is not configured.', 500, env);
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  try {
    if (body.action === 'fetch' || body.action === 'list') {
      // Fetch messages ordered by created_at
      const limit = body.limit || 50;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/messages?order=created_at.asc&limit=${limit}`,
        { method: 'GET', headers },
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase fetch error (${res.status}): ${err}`);
      }

      const messages = await res.json();
      return jsonResponse({ messages }, 200, env);
    }

    if (body.action === 'poll') {
      // Fetch messages newer than `after` timestamp
      const after = body.after || new Date(0).toISOString();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/messages?created_at=gt.${encodeURIComponent(after)}&order=created_at.asc&limit=50`,
        { method: 'GET', headers },
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase poll error (${res.status}): ${err}`);
      }

      const messages = await res.json();
      return jsonResponse({ messages }, 200, env);
    }

    if (body.action === 'send') {
      // Insert via action field
      if (!body.sender || !body.content) {
        return errorResponse('sender and content are required.', 400, env);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sender: body.sender, content: body.content }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase insert error (${res.status}): ${err}`);
      }

      const data = await res.json();
      return jsonResponse({ message: data[0] || data }, 200, env);
    }

    // Legacy: insert directly without action field
    if (!body.sender || !body.content) {
      return errorResponse('sender and content are required.', 400, env);
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: body.sender,
        content: body.content,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase insert error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return jsonResponse({ message: data[0] || data }, 200, env);
  } catch (err) {
    console.error('Supabase proxy failed:', err.message);
    return errorResponse(
      '잠시 후 다시 시도해 주세요 · Please try again in a moment.',
      502,
      env,
    );
  }
}

/**
 * POST /api/auth
 * { "password": "..." }
 * → { "success": true } or 401
 */
async function handleAuth(request, env) {
  const { password } = await request.json();

  if (!env.APP_PASSWORD) {
    return errorResponse('Authentication is not configured.', 500, env);
  }

  if (password === env.APP_PASSWORD) {
    // Simple token: base64 of password + timestamp. Not cryptographic, but
    // sufficient for a single-user private app behind a shared secret.
    const token = btoa(`${password}:${Date.now()}`);
    return jsonResponse({ success: true, token }, 200, env);
  }

  return jsonResponse({
    success: false,
    error: '비밀번호가 맞지 않습니다 · Incorrect password',
  }, 401, env);
}

/**
 * GET /api/usage
 * Returns current daily usage counts so the frontend can display meters.
 * → { "chat": { "used": N, "limit": N }, "image": { "used": N, "limit": N } }
 */
async function handleUsage(env) {
  const today = todayKey();
  const chatUsed = await getCounter(env.RATE_LIMIT, `chat_count_${today}`);
  const imageUsed = await getCounter(env.RATE_LIMIT, `image_count_${today}`);

  return jsonResponse({
    chat: {
      used: chatUsed,
      limit: parseInt(env.DAILY_CHAT_LIMIT || '50', 10),
    },
    image: {
      used: imageUsed,
      limit: parseInt(env.DAILY_IMAGE_LIMIT || '5', 10),
    },
  }, 200, env);
}

/**
 * POST /api/transcribe
 * Accepts multipart form data with an audio file.
 * Forwards to OpenAI Whisper API for transcription.
 * → { "text": "..." }
 */
async function handleTranscribe(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return errorResponse('No audio file provided.', 400, env);
  }

  const whisperForm = new FormData();
  whisperForm.append('file', file, 'voice.webm');
  whisperForm.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: whisperForm,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return jsonResponse({ text: data.text }, 200, env);
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Usage endpoint (GET)
    if (path === '/api/usage' && request.method === 'GET') {
      return handleUsage(env);
    }

    // All other endpoints require POST
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed.', 405, env);
    }

    try {
      switch (path) {
        case '/api/chat':
          return await handleChat(request, env);
        case '/api/image':
          return await handleImage(request, env);
        case '/api/message':
          return await handleMessage(request, env);
        case '/api/auth':
          return await handleAuth(request, env);
        case '/api/transcribe':
          return await handleTranscribe(request, env);
        default:
          return errorResponse('Not found.', 404, env);
      }
    } catch (err) {
      console.error('Unhandled error:', err);
      return errorResponse(
        '잠시 후 다시 시도해 주세요 · Please try again in a moment.',
        500,
        env,
      );
    }
  },
};
