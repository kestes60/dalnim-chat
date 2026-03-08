# 달님 · Dalnim — Claude Code Build Brief
**Version:** 1.0  
**Date:** March 2026  
**Builder:** Keith (PAI Consulting)

---

## WHAT WE ARE BUILDING

A personal Progressive Web App (PWA) called **달님 · Dalnim** — a private, mobile-first web application for one specific user. It combines:

1. **AI Chat** — multi-model chat with Claude, ChatGPT, and Gemini
2. **Translation** — Korean ↔ English translation (uses same AI, no extra API)
3. **Image Generation** — DALL-E image creation via OpenAI
4. **Private Messaging** — real-time 2-person chat replacing Kakao (Keith ↔ Friend)

Hosted on **GitHub Pages** as a PWA (she bookmarks it to her phone home screen — no app store needed). API keys are protected via a **Cloudflare Worker** backend. Messages stored in **Supabase**.

---

## COLOR PALETTE — NON-NEGOTIABLE

These colors are pulled from the user's own oil painting of a full moon. Use them exactly.

```css
:root {
  --sky:         #0A0A0F;   /* deep black sky — main background */
  --night:       #0F0F1A;   /* slightly lighter — secondary backgrounds */
  --panel:       #141420;   /* card/panel background */
  --moon-deep:   #D4890A;   /* amber gold — deep moon tone */
  --moon-mid:    #E8A020;   /* amber gold — mid moon tone */
  --moon-glow:   #F0B830;   /* bright gold — peak moon glow */
  --teal-dark:   #0D5A5A;   /* dark teal — user message bubbles */
  --teal-mid:    #1A8A8A;   /* mid teal — secondary actions */
  --teal-bright: #2ABAAA;   /* bright teal — accents, icons */
  --cream:       #E8DCC0;   /* warm cream — primary text */
  --cream-dim:   #A89878;   /* dimmed cream — secondary text, labels */
  --red-dome:    #C04030;   /* red — use sparingly for warnings/errors */
  --border:      #2A2A3A;   /* subtle border color */
}
```

**Color usage rules:**
- Black sky backgrounds everywhere
- Gold (`--moon-mid`, `--moon-glow`) = active tabs, send buttons, primary actions
- Teal = user message bubbles, secondary actions, translation results, privacy badge
- Cream = all body text
- AI/bot message bubbles = `--panel` with cream text
- User message bubbles = `--teal-dark` with cream text

---

## TYPOGRAPHY

- **Korean text:** `'Noto Sans KR'` from Google Fonts — weight 400 and 700
- **App title:** Noto Sans KR 700, letter-spacing 3px, color `--moon-glow`
- **Tagline / secondary:** `'Cormorant Garamond'` italic from Google Fonts
- **UI / code:** `'Courier New'` monospace for all interface labels
- **Body chat text:** System font stack with Korean fallbacks

---

## APP HEADER (appears on every screen)

```
달님 · Dalnim
your private space
```

- "달님" in Noto Sans KR bold, `--moon-glow` color
- "·" separator in `--teal-mid` color  
- "Dalnim" in Noto Sans KR bold, `--moon-glow` color
- Tagline "your private space" in Cormorant Garamond italic, `--cream-dim`
- Header background: `--sky` (#0A0A0F)
- Subtle radial gradient glow behind title (rgba of moon gold, very faint)

---

## NAVIGATION — 4 TABS

Bottom or top tab bar with these 4 tabs in this order:

| Tab | Icon | Korean Label | English Label |
|-----|------|-------------|---------------|
| 1 | 🤖 | AI | AI |
| 2 | 🌐 | 번역 | Translate |
| 3 | 🎨 | 이미지 | Image |
| 4 | 💬 | 채팅 | Chat |

**Active tab style:** `--moon-mid` text color, `--moon-deep` bottom border (2px)  
**Inactive tab style:** `#444` text color  
**Tab bar background:** `--night`

---

## SCREEN 1 — AI CHAT TAB

### Model Selector Bar
A persistent bar below the tab bar showing current model with a colored dot and dropdown:
- 🟠 Claude (Anthropic) — dot color `--moon-deep`
- 🟢 ChatGPT (OpenAI) — dot color `#10A37F`
- 🔵 Gemini (Google) — dot color `#4285F4`

Dropdown background `--night`, text `--cream`.

### Usage Meter
Below model selector:
- Label: "Today · X / 50 messages"
- Progress bar: gradient from `--moon-deep` to `--moon-glow`
- Background track: `#222`

### Chat Messages
- **User bubbles:** background `--teal-dark`, border `1px solid --teal-mid`, text `--cream`, aligned right
- **AI bubbles:** background `--panel`, border `1px solid --border`, text `--cream`, aligned left
- **Meta text** (timestamp + model name): `--cream-dim`, font-size small
- Rounded corners, bottom corner flattened on active side (standard chat style)

### Input Bar
- Background: `--night`
- Input field: `--panel` background, `--border` border, rounded, `--cream` placeholder text
- Send button: circle, background `--moon-deep`, color `--sky`, "↑" symbol

### AI Behavior
When user sends a message:
1. Call Cloudflare Worker endpoint `/api/chat`
2. Pass: `{ model, message, conversationHistory }`
3. Worker routes to correct API, returns response
4. Display streaming or full response in chat bubble

Maintain conversation history in memory (array of `{role, content}`) per session. Clear history when model is switched (offer confirmation first).

---

## SCREEN 2 — TRANSLATION TAB (번역)

### Direction Toggle
Two buttons side by side:
- `한국어 → 영어` (Korean to English) — active state: `--teal-dark` bg, `--teal-bright` text
- `English → 한국어` (English to Korean) — inactive state: `--panel` bg, `#555` text

### Input Box
- Large textarea, placeholder: `번역할 텍스트를 입력하세요 · Paste text to translate`
- Background `--panel`, border `--border`, text `--cream`
- Min-height: 100px

### Translate Button
- Full width
- Background: `--moon-deep`
- Text: `↓ 번역 · TRANSLATE ↓`
- Color: `--sky`
- Bold, letter-spacing

### Result Box
- Background: `#0A1A1A` (very dark teal-black)
- Border: `1px solid --teal-dark`
- Label: "🌐 English" or "🌐 한국어" in `--teal-mid`, uppercase, small
- Result text: `--teal-bright`

### Small note below result
"counts as 1 message from your daily allowance" — in `--cream-dim`, tiny

### API Behavior
Call `/api/chat` with system prompt:  
`"You are a translator. Translate the following text to [target language]. Return only the translation, nothing else."`

Uses whichever model is currently selected in the AI tab (or default to Claude if none selected).

---

## SCREEN 3 — IMAGE GENERATION TAB (이미지)

### Usage Meter
- Label: "이미지 today · X / 5"
- Progress bar: gradient from `--teal-dark` to `--teal-bright` (distinct from AI meter)

### Chat-style interface
Same chat layout as AI tab but for images:
- User types a description (English or Korean — both work)
- Generated image appears in AI bubble as an `<img>` tag
- Below image: "DALL-E · [time] · tap to save"
- Tapping image triggers download

### Input bar
- Placeholder: `이미지를 설명하세요 · Describe your image...`
- Send button: "✦" symbol instead of "↑"

### API Behavior
Call `/api/image` endpoint on Cloudflare Worker:
- Worker calls OpenAI Images API (DALL-E 3)
- Size: `1024x1024`
- Quality: `standard`
- Returns image URL
- Display in chat bubble

### Limit enforcement
Worker tracks image count. If limit reached, return friendly message:  
`"오늘의 이미지 한도에 도달했습니다 · You've reached today's image limit (5/5). Resets at midnight!"`

---

## SCREEN 4 — PRIVATE CHAT TAB (채팅)

### Privacy Badge
Persistent bar at top of chat:
- Background: `--panel`
- Border-bottom: `--border`
- Text: `🔒 Private · Only you and Keith` in `--teal-bright`

### Two Users
- **Keith** (admin/host): messages aligned left, background `--panel`, border `--border`
- **Friend** (the app's primary user): messages aligned right, background `--teal-dark`, border `--teal-mid`

### Translate Button on Messages
Every message bubble from Keith includes a small translate button below it:
- Style: transparent background, `--teal-bright` text, `1px solid --teal-dark` border, tiny
- Text: `🌐 번역 · Translate`
- On tap: calls translation API inline, result appears immediately below that message as a `--teal-dark` bordered box

### Real-time
Uses Supabase Realtime subscriptions. Messages appear instantly without refresh.

### Authentication
Simple shared-secret approach:
- On first visit, prompt for a password (one shared password Keith gives her)
- Store auth token in sessionStorage
- If wrong password, show friendly error in `--red-dome` color

### Message input
- Placeholder: `Keith에게 메시지 · Message Keith...`
- Standard send button with "↑"

### Supabase Schema
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,  -- 'keith' or 'friend'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Enable Row Level Security. Enable Realtime on this table.

---

## CLOUDFLARE WORKER — BACKEND

This is the most important piece. It lives between the frontend and the AI APIs.

### Endpoints

**POST `/api/chat`**
```json
Request:  { "model": "claude|chatgpt|gemini", "messages": [...], "system": "optional system prompt" }
Response: { "content": "AI response text" }
```

**POST `/api/image`**
```json
Request:  { "prompt": "image description" }
Response: { "url": "https://..." }
```

**POST `/api/message`**  
_(proxy to Supabase for sending messages — keeps Supabase key server-side)_

### Rate Limiting Logic (implement in Worker)
```javascript
// Daily counters stored in Cloudflare KV
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const chatKey = `chat_count_${today}`;
const imageKey = `image_count_${today}`;

const CHAT_LIMIT = 50;
const IMAGE_LIMIT = 5;
```

### Environment Variables (set in Cloudflare dashboard — NEVER in code)
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DAILY_CHAT_LIMIT=50
DAILY_IMAGE_LIMIT=5
APP_PASSWORD=  (the shared password for the chat)
```

### Model Routing
```javascript
if (model === 'claude') {
  // Call https://api.anthropic.com/v1/messages
  // Model: claude-sonnet-4-20250514
  // Max tokens: 1024
}
if (model === 'chatgpt') {
  // Call https://api.openai.com/v1/chat/completions
  // Model: gpt-4o-mini  (cost-efficient)
}
if (model === 'gemini') {
  // Call Google Generative AI API
  // Model: gemini-1.5-flash  (cost-efficient)
}
```

### CORS Headers
The Worker must include CORS headers to allow requests from the GitHub Pages domain:
```javascript
'Access-Control-Allow-Origin': 'https://[github-username].github.io'
'Access-Control-Allow-Methods': 'POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type'
```

---

## PWA CONFIGURATION

The app must be a valid PWA so she can "Add to Home Screen."

### Required files
- `manifest.json` — app name, icons, colors, display mode
- `sw.js` — service worker for offline caching
- `<link rel="manifest">` in HTML head

### manifest.json
```json
{
  "name": "달님 · Dalnim",
  "short_name": "달님",
  "description": "Your private AI space",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0F",
  "theme_color": "#D4890A",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### App Icon
Moon emoji 🌕 on a black background (`#0A0A0F`) with a subtle amber glow. Generate at 192x192 and 512x512.

---

## MOBILE-FIRST LAYOUT

- Max width: 480px, centered on desktop
- On desktop: phone-frame appearance (centered card with rounded corners, subtle shadow)
- On mobile: full screen, no frame
- Safe area insets for iPhone notch: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`
- Font sizes: minimum 16px for inputs (prevents iOS auto-zoom)
- Touch targets: minimum 44x44px

---

## FILE STRUCTURE

```
/                          ← GitHub Pages root
├── index.html             ← Single page app
├── manifest.json          ← PWA manifest
├── sw.js                  ← Service worker
├── icon-192.png           ← PWA icon
├── icon-512.png           ← PWA icon
└── CNAME (optional)       ← If custom domain

/cloudflare-worker/        ← Separate — deployed to Cloudflare
└── worker.js              ← The entire backend
```

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Single HTML file** for the entire frontend — no build tools, no npm, no React. Vanilla HTML/CSS/JS only. This deploys directly to GitHub Pages with zero configuration.

2. **The Cloudflare Worker is a separate file** (`worker.js`) — Keith will deploy it manually via the Cloudflare dashboard. Include clear deployment instructions in comments.

3. **Never put API keys in the frontend** — all keys live in Cloudflare Worker environment variables only.

4. **Korean font must load** — include the Google Fonts import for Noto Sans KR. Test that Korean characters render correctly in the header (`달님`).

5. **The color palette is from her painting** — do not substitute or "improve" these colors. They are intentional and personal.

6. **Error states** should be friendly, bilingual, and use `--red-dome` sparingly:
   - Limit reached: gentle, encouraging message in both languages
   - Network error: "잠시 후 다시 시도해 주세요 · Please try again in a moment"
   - Wrong password: "비밀번호가 맞지 않습니다 · Incorrect password"

7. **The send button** in AI Chat and Messages tab uses "↑". The Image tab uses "✦".

8. **Loading states** — while waiting for AI response, show a subtle pulsing dot animation in `--moon-mid` color inside the AI bubble. Do not show a spinner.

9. **Conversation history** — maintain in a JS array per session. Include last 10 message pairs maximum to control token usage.

10. **Image tap-to-save** — generated images should be downloadable. Use a `<a download>` link or `fetch` + `createObjectURL` approach.

---

## DEPLOYMENT SEQUENCE (for Keith to follow after Claude Code builds it)

1. Push frontend files to GitHub repo → GitHub Pages auto-deploys
2. Create Cloudflare Worker → paste `worker.js` → set all environment variables
3. Create Supabase project → run the SQL schema → enable Realtime → copy URL and service key to Worker env vars
4. Update CORS origin in Worker to match actual GitHub Pages URL
5. Test on desktop, then add to home screen on phone
6. Give friend the URL and the shared password

---

## ESTIMATED MONTHLY COSTS

| Service | Cost |
|---------|------|
| GitHub Pages | FREE |
| Cloudflare Worker | FREE (100k requests/day free tier) |
| Supabase | FREE (500MB, plenty for 2-person chat) |
| Anthropic API (Claude) | ~$2–4/month at moderate use |
| OpenAI API (ChatGPT + DALL-E) | ~$3–6/month |
| Google AI API (Gemini) | ~$1–2/month |
| **Total** | **~$6–12/month** |

---

*Built with love. She painted the moon. He built the app around it.*
