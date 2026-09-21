# Speech service

Express API behind the React client. Full endpoint and status-code reference:
see the project [README](../README.md#api).

```
POST /api/tts          { text, language?, voice?, translate? }  -> 201 { success, audioUrl, ... }
GET  /api/voices       the language/voice catalogue
GET  /api/health       liveness probe (also GET /health)
GET  /audio/:file      the generated MP3, until it expires
errors                 { success: false, error }  <- shown to the user verbatim
```

## Running it

```bash
cd server
npm install
cp .env.example .env     # only needed to change a default
npm run dev              # nodemon, http://localhost:5000
npm test                 # node:test suites, offline (provider is faked)
```

The client must point at the same port: `VITE_API_URL` in `../.env`.

## Provider notes

Audio comes from Microsoft Edge's neural voices via `msedge-tts`, which needs no
API key.

- **Voices.** `constants/voices.js` maps each voice the client shows (`name`) to
  the Edge voice that speaks it (`edge`). Edge has no "Ryan" or "Nova", so those
  borrow the nearest US voice of the same gender. Add a language there and in
  `../src/constants/languages.js`; a client test fails if the two lists drift.
- **Translation.** Before speaking, the text is translated into the chosen
  language through free, keyless endpoints (`services/translateService.js`).
  If all of them refuse, the text is spoken as typed.
- **Failures.** `services/ttsService.js` maps provider errors to status codes:
  timeout → 504, rate limited → 429, unreachable or refused → 503, anything
  else → 502.
- **Switching providers.** Only `constants/voices.js` and `services/ttsService.js`
  need to change. Keep any API key in `.env` (never in the client).

## Layout

```
index.js                  starts the server, graceful shutdown
app.js                    app wiring: CORS, security headers, routes (imported by tests)
routes/ttsRoutes.js       /api routes
controllers/ttsController.js   request -> response
services/ttsService.js    provider call + error translation
services/translateService.js   text translation with fallbacks
services/audioStore.js    writes clips, deletes expired ones
middleware/               rate limiter, error handler
utils/validateText.js     body validation
constants/voices.js       languages, voices, provider voice map
test/                     node:test suites
postman/                  Postman collection
test-api.ps1              live smoke test against a running server
```
