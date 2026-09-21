const {
  DEFAULT_LANGUAGE,
  MAX_CHARS,
  findLanguage,
  findVoice,
} = require('../constants/voices')

class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    // Marks the message as written for a human, so the error handler passes it
    // through instead of substituting a generic one.
    this.expose = true
  }
}

/**
 * Normalise and check a synthesis request body.
 *
 * @returns {{ text: string, language: string, voice: string, gender: string, edgeVoice: string }}
 * @throws {RequestError} 400 with a message the client shows verbatim.
 */
function validateSynthesisRequest(body) {
  const raw = body?.text

  if (typeof raw !== 'string') {
    throw new RequestError(400, 'Send a "text" field containing the words to speak.')
  }

  const text = raw.trim()
  if (text.length === 0) {
    throw new RequestError(400, 'There is nothing to say — add some text first.')
  }
  if (text.length > MAX_CHARS) {
    throw new RequestError(
      400,
      `That passage is ${text.length} characters. Keep it to ${MAX_CHARS} or fewer.`,
    )
  }

  const code = body.language ?? DEFAULT_LANGUAGE
  const language = findLanguage(code)
  if (!language) {
    throw new RequestError(400, `"${code}" is not a language this service speaks.`)
  }

  const requested = body.voice ?? language.voices[0].name
  const voice = findVoice(language, requested)
  if (!voice) {
    throw new RequestError(400, `"${requested}" is not a voice available for ${code}.`)
  }

  return {
    text,
    language: code,
    voice: voice.name,
    gender: voice.gender,
    edgeVoice: voice.edge,
  }
}

/** Spec §13: reject bodies that are not JSON before anything else reads them. */
function requireJson(req, _res, next) {
  if (!req.is('application/json')) {
    return next(new RequestError(415, 'Send this request as application/json.'))
  }
  next()
}

module.exports = { validateSynthesisRequest, requireJson, RequestError }
