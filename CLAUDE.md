# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dalnim (달님)** is a personal, mobile-first PWA for a single user combining AI chat (Claude/ChatGPT/Gemini), Korean-English translation, DALL-E image generation, and private 2-person messaging. Hosted on GitHub Pages with a Cloudflare Worker backend and Supabase for message storage.

## Architecture

**No build tools.** The entire frontend is a single `index.html` file with vanilla HTML/CSS/JS — no npm, no React, no bundler. Deploys directly to GitHub Pages.

### File Structure
```
/                          ← GitHub Pages root
├── index.html             ← Entire SPA (single file)
├── manifest.json          ← PWA manifest
├── sw.js                  ← Service worker for offline caching
├── icon-192.png           ← PWA icon
├── icon-512.png           ← PWA icon
└── cloudflare-worker/
    └── worker.js          ← Entire backend (deployed separately to Cloudflare)
```

### Data Flow
- Frontend → Cloudflare Worker (`/api/chat`, `/api/image`, `/api/message`) → AI APIs / Supabase
- All API keys live in Cloudflare Worker env vars, never in frontend code
- Private chat uses Supabase Realtime subscriptions for live updates
- Auth is a single shared password, validated by the Worker, token stored in sessionStorage

### Backend (Cloudflare Worker)
- **POST `/api/chat`** — Routes to Claude (claude-sonnet-4-20250514), ChatGPT (gpt-4o-mini), or Gemini (gemini-1.5-flash) based on `model` field
- **POST `/api/image`** — DALL-E 3 image generation (1024x1024)
- **POST `/api/message`** — Proxy to Supabase (keeps service key server-side)
- Rate limiting via Cloudflare KV: 50 chat messages/day, 5 images/day

### Frontend Tabs (in order)
1. **AI Chat** — Multi-model chat with model selector, usage meter, conversation history (last 10 pairs in JS array, cleared on model switch)
2. **Translation (번역)** — Korean↔English using the chat API with a translator system prompt
3. **Image (이미지)** — Chat-style interface for DALL-E prompts, tap-to-save generated images
4. **Private Chat (채팅)** — Real-time 2-person messaging via Supabase with inline translate buttons on messages

## Non-Negotiable Design Constraints

### Color Palette (from user's oil painting — do not modify)
```css
--sky: #0A0A0F;        /* main background */
--night: #0F0F1A;      /* secondary backgrounds, tab bar */
--panel: #141420;       /* cards, AI bubbles */
--moon-deep: #D4890A;   /* primary actions, send buttons */
--moon-mid: #E8A020;    /* active tabs */
--moon-glow: #F0B830;   /* app title, peak highlights */
--teal-dark: #0D5A5A;   /* user message bubbles */
--teal-mid: #1A8A8A;    /* secondary actions */
--teal-bright: #2ABAAA; /* accents, icons */
--cream: #E8DCC0;       /* primary text */
--cream-dim: #A89878;   /* secondary text */
--red-dome: #C04030;    /* errors/warnings only */
--border: #2A2A3A;      /* borders */
```

### Typography
- Korean text: `'Noto Sans KR'` (Google Fonts, weights 400/700)
- App title: Noto Sans KR 700, letter-spacing 3px, `--moon-glow`
- Tagline: `'Cormorant Garamond'` italic (Google Fonts)
- UI labels: `'Courier New'` monospace

### Mobile-First Layout
- Max-width 480px centered; phone-frame on desktop, full-screen on mobile
- Safe area insets for iPhone notch
- Minimum 16px font on inputs (prevents iOS auto-zoom)
- Minimum 44x44px touch targets

### UX Details
- Loading state: pulsing dot animation in `--moon-mid` (no spinners)
- Send button: "↑" for chat/messages, "✦" for images
- Error messages: bilingual (Korean + English), use `--red-dome` sparingly
- All messages include inline translate buttons (calls same chat API)

## Deployment

1. Push frontend files to GitHub repo (GitHub Pages auto-deploys)
2. Create Cloudflare Worker, paste `worker.js`, set env vars in dashboard
3. Create Supabase project, run schema SQL, enable Realtime
4. Update CORS origin in Worker to match GitHub Pages URL

### Supabase Schema
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,  -- 'keith' or 'friend'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS and Realtime on this table
```
