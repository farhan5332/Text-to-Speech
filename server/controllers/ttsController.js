const { validateSynthesisRequest } = require('../utils/validateText')
// Called through the module objects (not destructured) so tests can swap in a
// fake provider without touching the network.
const ttsService = require('../services/ttsService')
const translateService = require('../services/translateService')
const { LANGUAGES, MAX_CHARS } = require('../constants/voices')
const { TTL_MINUTES } = require('../services/audioStore')

/** POST /api/tts -> 201 { success, audioUrl, ... } */
async function createSpeech(req, res, next) {
  try {
    const request = validateSynthesisRequest(req.body)

    // A Hindi voice reading English words still sounds English, so put the
    // text into the chosen language first unless the caller opts out.
    const wantsTranslation = req.body.translate !== false
    const spoken = wantsTranslation
      ? await translateService.translate(request.text, request.language)
      : { text: request.text, translated: false, detected: null }

    const { fileName, sizeBytes } = await ttsService.synthesize({ ...request, text: spoken.text })

    res.status(201).json({
      success: true,
      audioUrl: `/audio/${fileName}`,
      fileName,
      voice: request.voice,
      language: request.language,
      characters: spoken.text.length,
      sizeBytes,
      spokenText: spoken.text,
      translated: spoken.translated,
      detectedLanguage: spoken.detected,
    })
  } catch (error) {
    next(error)
  }
}

/** GET /api/voices -> the catalogue the client renders. */
function listVoices(_req, res) {
  // `edge` is an internal provider detail; the client has no use for it.
  res.json({
    voices: LANGUAGES.flatMap((language) =>
      language.voices.map((voice) => ({
        name: voice.name,
        language: language.code,
        languageLabel: language.label,
        gender: voice.gender,
      })),
    ),
  })
}

/** GET /api/health -> a liveness probe the client can call on start-up. */
function health(_req, res) {
  res.json({
    status: 'ok',
    provider: 'microsoft-edge-neural',
    maxCharacters: MAX_CHARS,
    audioTtlMinutes: TTL_MINUTES,
  })
}

module.exports = { createSpeech, listVoices, health }
