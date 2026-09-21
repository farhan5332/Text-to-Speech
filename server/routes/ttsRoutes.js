const express = require('express')
const { createSpeech, listVoices, health } = require('../controllers/ttsController')
const { requireJson } = require('../utils/validateText')
const { ttsLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

router.get('/health', health)
router.get('/voices', listVoices)
// Only synthesis costs an upstream call, so only it is rate limited.
router.post('/tts', ttsLimiter, requireJson, createSpeech)

module.exports = router
