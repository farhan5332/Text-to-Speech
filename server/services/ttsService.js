const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')
const { RequestError } = require('../utils/validateText')
const { saveAudio } = require('./audioStore')

const UPSTREAM_TIMEOUT = Number(process.env.TTS_TIMEOUT_MS ?? 20000)
const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH'])

// The library drops text straight into SSML, so markup characters have to be
// escaped or a stray "&" or "<" breaks the whole request.
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * @param {{ text: string, edgeVoice: string, rate?: number, pitch?: number }} request
 * @returns {Promise<Buffer>} MP3 bytes
 */
async function synthesizeToBuffer({ text, edgeVoice, rate = 1, pitch = 0 }) {
  // A connection is bound to one voice, so each request opens its own.
  const tts = new MsEdgeTTS()
  let timer

  try {
    await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(escapeXml(text), {
      rate,
      pitch: `${pitch >= 0 ? '+' : ''}${pitch}%`,
    })

    const audio = await new Promise((resolve, reject) => {
      const chunks = []
      timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), UPSTREAM_TIMEOUT)
      audioStream.on('data', (chunk) => chunks.push(chunk))
      audioStream.once('end', () => resolve(Buffer.concat(chunks)))
      audioStream.once('error', reject)
    })

    if (!audio.length) {
      throw new RequestError(502, 'The speech provider returned no audio.')
    }
    return audio
  } catch (error) {
    throw error instanceof RequestError ? error : toRequestError(error)
  } finally {
    clearTimeout(timer)
    tts.close()
  }
}

/** Translate an upstream failure into something worth showing a user. */
function toRequestError(error) {
  const message = error.message ?? ''

  if (error.code === 'ETIMEDOUT' || /timeout/i.test(message)) {
    return new RequestError(504, 'The speech provider timed out. Try a shorter passage.')
  }

  if (/429/.test(message)) {
    return new RequestError(429, 'The speech provider is rate limiting us. Wait a moment.')
  }

  // Spec §4.7: the provider refusing our credentials is a server-side outage,
  // not something the user can fix, so it reads as "unavailable".
  if (/\b(401|403)\b/.test(message)) {
    console.error('Speech provider rejected the request:', error)
    return new RequestError(503, 'The speech service is unavailable right now. Try again later.')
  }

  // DNS failure, refused or dropped connection: the provider cannot be reached.
  if (NETWORK_CODES.has(error.code) || /ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|socket hang up|network/i.test(message)) {
    console.error('Speech provider unreachable:', error)
    return new RequestError(503, 'Could not reach the speech service. Try again in a moment.')
  }

  console.error('Speech synthesis failed:', error)
  return new RequestError(502, 'The speech provider could not generate that audio.')
}

/**
 * Synthesise, store, and describe the clip — the shape `POST /api/tts` returns.
 *
 * @returns {Promise<{ fileName: string, sizeBytes: number }>}
 */
async function synthesize(request) {
  const audio = await synthesizeToBuffer(request)
  const fileName = saveAudio(audio)
  return { fileName, sizeBytes: audio.length }
}

module.exports = { synthesize, synthesizeToBuffer, toRequestError }
