# SpeakEasy — Text to Speech

Type or paste text, pick a language and voice, and get natural speech you can
play in the browser or download as an MP3.

**Stack:** React 19 + Vite (frontend) · Node.js + Express 5 (API) · Microsoft Edge
neural voices via `msedge-tts` (speech provider, no API key needed).

```
Browser (React)  ──POST /api/tts──▶  Express API  ──▶  translate text  ──▶  Edge neural TTS
      ▲                                  │
      └──────── GET /audio/<id>.mp3 ◀────┘  (MP3 kept for 30 min, then deleted)
```

## Features

- Text box with character and word counts and a 5,000-character limit
- 9 languages, 19 voices, with a quick voice preview
- Text is translated into the chosen language before it is spoken
- Player with play/pause, seek, volume, ±10 s skip, playback speed, and keyboard shortcuts
- MP3 download
- Clear messages for every failure: empty or long text, bad language or voice,
  rate limiting, provider outage, timeout, offline, and server unreachable
- Light and dark themes; responsive down to phone width

## Project layout

```
.
├── src/                    React app
│   ├── components/         TextInput, LanguageSelector, VoiceSelector, GenerateButton,
│   │                       AudioPlayer, DownloadButton, ErrorMessage, …
│   ├── pages/Home.jsx      the single screen
│   ├── services/           axios client + API calls (error → message mapping lives here)
│   ├── hooks/useVoices.js  loads and filters the voice list
│   └── utils/              client-side validation
├── server/                 Express API (see server/README.md)
│   ├── routes/ controllers/ services/ middleware/ utils/ constants/
│   ├── test/               node:test suites
│   └── postman/            Postman collection
├── render.yaml             API deployment (Render Blueprint)
└── vercel.json             frontend deployment (Vercel)
```

## Running locally

Requires Node.js 20 or newer.

```bash
# 1. API
cd server
npm install
cp .env.example .env
npm run dev                 # http://localhost:5000

# 2. Frontend (second terminal, from the project root)
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```

## Testing

| What | Command | Covers |
|---|---|---|
| API tests | `cd server && npm test` | validation, every status code (200/201/400/403/404/413/415/429/500/503/504), CORS, security headers. The speech provider is faked, so no network is needed. |
| Client tests | `npm test` | text validation, error-message mapping (timeout, offline, unreachable, each status), and that client and server agree on languages and the length limit |
| Live smoke test | `cd server; powershell -ExecutionPolicy Bypass -File .\test-api.ps1` (with the server running) | the real server and real provider, end to end, including fetching the generated MP3 |
| Postman | import `server/postman/TextToSpeech.postman_collection.json`, set `baseUrl`, then **Run collection** | every endpoint and error case, with assertions |

GitHub Actions (`.github/workflows/ci.yml`) runs lint, both test suites, and the
build on every push.

## API

Base URL: `http://localhost:5000` locally, or your Render URL.

### `POST /api/tts`

```json
{ "text": "Hello, welcome!", "language": "en-US", "voice": "Ava" }
```

`language` and `voice` are optional and default to `en-US` / that language's first
voice. Send `"translate": false` to speak the text exactly as typed.

**201 Created**

```json
{
  "success": true,
  "audioUrl": "/audio/1789970265834-b35463bd.mp3",
  "fileName": "1789970265834-b35463bd.mp3",
  "voice": "Ava",
  "language": "en-US",
  "characters": 15,
  "sizeBytes": 11232,
  "spokenText": "Hello, welcome!",
  "translated": false,
  "detectedLanguage": "en"
}
```

### `GET /api/voices`

```json
{ "voices": [{ "name": "Ava", "language": "en-US", "languageLabel": "English (US)", "gender": "Female" }] }
```

### `GET /api/health`

```json
{ "status": "ok", "provider": "microsoft-edge-neural", "maxCharacters": 5000, "audioTtlMinutes": 30 }
```

### `GET /audio/:file`

The generated MP3. Returns 404 once the clip has expired (after 30 minutes).

### Errors

Every error has the same shape: `{ "success": false, "error": "<message for the user>" }`.

| Status | When |
|---|---|
| 400 | Missing, empty or too-long text; unsupported language; voice not in that language; malformed JSON |
| 403 | Request from a browser origin not in `CORS_ORIGIN` |
| 404 | Unknown route, or the clip has expired |
| 413 | Request body over 64 KB |
| 415 | Body not sent as `application/json` |
| 429 | More than `RATE_LIMIT_MAX` generations per minute from one IP |
| 500 | Unexpected server error (details are logged, never returned) |
| 502 | The provider returned an error or no audio |
| 503 | The provider cannot be reached or refused the request |
| 504 | The provider timed out |

## Deployment

The frontend and the API deploy separately: **API → Render**, **frontend → Vercel**.
Both need the project in a GitHub repository whose root is this folder.

### 1. API on Render

1. Push the project to GitHub.
2. In Render, choose **New → Blueprint** and pick the repository. Render reads
   `render.yaml` and creates the `speakeasy-api` web service from `server/`.
3. When asked for `CORS_ORIGIN`, enter a placeholder for now (e.g.
   `https://example.com`). You set the real value in "Connect them" below.
4. Once it is live, open `https://<your-service>.onrender.com/api/health`. You
   should see `"status":"ok"`.

### 2. Frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the same repository.
   `vercel.json` sets the Vite build.
2. Under **Environment Variables**, add
   `VITE_API_URL = https://<your-service>.onrender.com` (no trailing slash needed).
3. Deploy, then copy the site URL (e.g. `https://speakeasy.vercel.app`).

### 3. Connect them

In Render → your service → **Environment**, set `CORS_ORIGIN` to the Vercel URL
(comma-separate several, e.g. a custom domain as well), then save. Render
redeploys. Open the Vercel URL and generate some speech.

`VITE_API_URL` is compiled into the frontend at build time. If the API URL
changes, redeploy the frontend.

### Production notes

- **Free tier sleep:** Render's free plan sleeps after 15 minutes idle, so the
  first request after that can take up to a minute. The client waits 60
  seconds and then shows a "timed out, try again" message.
- **Audio storage:** clips are written to the instance's temporary disk and
  deleted after 30 minutes. A redeploy clears them, which is intended.
- **HTTPS:** both Render and Vercel serve HTTPS by default.
- **Secrets:** the provider needs no key. If you switch to a keyed provider
  (Azure, Google, Polly, ElevenLabs), put the key in Render's environment and
  never in a `VITE_` variable. Anything prefixed `VITE_` ends up in the public
  JavaScript bundle.

## Environment variables

**Frontend** (`.env`, or Vercel's settings)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | API base URL |
| `VITE_USE_BACKEND` | `true` | `false` uses the browser's built-in speech instead |

**API** (`server/.env`, or Render's settings)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Port to listen on (Render sets this itself) |
| `CORS_ORIGIN` | localhost:5173, 4173 | Allowed browser origins, comma-separated |
| `NODE_ENV` | — | `production` stops accepting arbitrary localhost origins |
| `TRUST_PROXY` | `0` | Proxy hops in front of the app (`1` on Render) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `20` | Generation rate limit per IP |
| `MAX_TEXT_LENGTH` | `5000` | Longest accepted passage |
| `AUDIO_TTL_MINUTES` | `30` | Minutes before a clip is deleted |
| `TTS_TIMEOUT_MS` | `20000` | Provider timeout |
