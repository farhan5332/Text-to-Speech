const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const AUDIO_DIR = path.join(__dirname, '..', 'audio')
const TTL_MINUTES = Number(process.env.AUDIO_TTL_MINUTES ?? 30)
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

fs.mkdirSync(AUDIO_DIR, { recursive: true })

/** Writes one MP3 and hands back the name the client will request. */
function saveAudio(buffer) {
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`
  fs.writeFileSync(path.join(AUDIO_DIR, fileName), buffer)
  return fileName
}

/**
 * Spec §15: generated audio is not kept permanently. Anything older than the
 * TTL is deleted, so the folder cannot grow without bound.
 */
function purgeExpired() {
  const cutoff = Date.now() - TTL_MINUTES * 60 * 1000

  let entries
  try {
    entries = fs.readdirSync(AUDIO_DIR)
  } catch {
    return 0
  }

  let removed = 0
  for (const entry of entries) {
    if (!entry.endsWith('.mp3')) continue
    const full = path.join(AUDIO_DIR, entry)
    try {
      if (fs.statSync(full).mtimeMs < cutoff) {
        fs.unlinkSync(full)
        removed += 1
      }
    } catch {
      // A file that vanished mid-sweep needs no further attention.
    }
  }
  return removed
}

/** Sweeps on a timer that never holds the process open on its own. */
function startCleanup() {
  purgeExpired()
  const timer = setInterval(purgeExpired, SWEEP_INTERVAL_MS)
  timer.unref()
  return timer
}

module.exports = { AUDIO_DIR, TTL_MINUTES, saveAudio, purgeExpired, startCleanup }
