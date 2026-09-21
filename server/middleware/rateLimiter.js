const { rateLimit } = require('express-rate-limit')

// Every request costs an upstream call, so keep a lid on it. The client turns a
// 429 into its own copy, but send a JSON body anyway for direct API callers.
const ttsLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX ?? 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit reached. Wait a moment before generating again.',
    message: 'Rate limit reached. Wait a moment before generating again.',
  },
})

module.exports = { ttsLimiter }
