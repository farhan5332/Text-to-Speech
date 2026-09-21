const express = require('express')
const cors = require('cors')

const ttsRoutes = require('./routes/ttsRoutes')
const { errorHandler, notFound } = require('./middleware/errorHandler')
const { AUDIO_DIR } = require('./services/audioStore')

// The Vite dev server and the built preview sit on different ports, so accept a
// comma-separated list and fall back to the two defaults.
const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGIN ??
  process.env.CLIENT_URL ??
  'http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

// Vite walks to the next free port when 5173 is taken, so outside production
// trust any loopback origin rather than chase the port in .env.
const isLoopback = (origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
const allowAnyLocalhost = process.env.NODE_ENV !== 'production'

const app = express()

app.disable('x-powered-by')

// Render, Railway and friends sit behind one proxy hop. Without this every
// visitor shares the proxy's IP, so one user could exhaust the rate limit for
// all of them. Off by default so a local server cannot be fooled by a forged
// X-Forwarded-For header.
const trustProxy = Number(process.env.TRUST_PROXY ?? 0)
if (trustProxy > 0) app.set('trust proxy', trustProxy)

// A JSON API that serves MP3s needs very little from the browser; tell it so.
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header means curl, Postman, or a same-origin request.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      if (allowAnyLocalhost && isLoopback(origin)) return callback(null, true)

      const error = new Error(`Origin ${origin} is not allowed.`)
      error.status = 403
      error.expose = true
      callback(error)
    },
  }),
)
app.use(express.json({ limit: '64kb' }))

// One line per API call, so what the browser actually sent is visible.
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', (req, _res, next) => {
    const detail =
      req.method === 'POST'
        ? ` language=${req.body?.language} voice=${req.body?.voice} text="${String(req.body?.text ?? '').slice(0, 40)}"`
        : ''
    console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.originalUrl}${detail}`)
    next()
  })
}

// Generated clips are served straight from disk. They expire, so tell browsers
// not to hold on to them, and never fall through to the SPA for a missing file.
app.use(
  '/audio',
  express.static(AUDIO_DIR, {
    maxAge: 0,
    fallthrough: false,
    setHeaders: (res) => res.set('Cache-Control', 'no-store'),
  }),
)

app.use('/api', ttsRoutes)
// Kept so older callers and uptime checks do not break.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use(notFound)
app.use(errorHandler)

module.exports = app
