const { test } = require('node:test')
const assert = require('node:assert/strict')

const { validateSynthesisRequest, RequestError } = require('../utils/validateText')
const { toRequestError } = require('../services/ttsService')
const { MAX_CHARS } = require('../constants/voices')

function rejects(body, pattern) {
  assert.throws(
    () => validateSynthesisRequest(body),
    (error) => error instanceof RequestError && error.status === 400 && pattern.test(error.message),
  )
}

test('accepts a full request and resolves the provider voice', () => {
  const result = validateSynthesisRequest({ text: '  Hello  ', language: 'fr-FR', voice: 'Denise' })
  assert.equal(result.text, 'Hello')
  assert.equal(result.language, 'fr-FR')
  assert.equal(result.voice, 'Denise')
  assert.equal(result.edgeVoice, 'fr-FR-DeniseNeural')
})

test('falls back to the default language and its first voice', () => {
  const result = validateSynthesisRequest({ text: 'Hi' })
  assert.equal(result.language, 'en-US')
  assert.equal(result.voice, 'Ava')
})

test('matches voice names case-insensitively', () => {
  assert.equal(validateSynthesisRequest({ text: 'Hi', voice: 'ava' }).voice, 'Ava')
})

test('rejects a missing or non-string text field', () => {
  rejects({}, /"text" field/)
  rejects({ text: 42 }, /"text" field/)
  rejects(null, /"text" field/)
})

test('rejects empty and whitespace-only text', () => {
  rejects({ text: '' }, /nothing to say/)
  rejects({ text: '   \n\t ' }, /nothing to say/)
})

test('enforces the character limit on trimmed text', () => {
  assert.doesNotThrow(() => validateSynthesisRequest({ text: 'a'.repeat(MAX_CHARS) }))
  rejects({ text: 'a'.repeat(MAX_CHARS + 1) }, new RegExp(`${MAX_CHARS} or fewer`))
})

test('rejects an unsupported language', () => {
  rejects({ text: 'Hi', language: 'xx-XX' }, /not a language/)
})

test('rejects a voice that belongs to a different language', () => {
  rejects({ text: 'Hi', language: 'en-US', voice: 'Uzma' }, /not a voice available for en-US/)
})

test('provider timeouts become 504', () => {
  const error = toRequestError(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))
  assert.equal(error.status, 504)
})

test('provider rate limiting becomes 429', () => {
  assert.equal(toRequestError(new Error('Unexpected server response: 429')).status, 429)
})

test('an unreachable provider becomes 503', () => {
  const quiet = silenceConsole()
  try {
    assert.equal(toRequestError(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' })).status, 503)
    assert.equal(toRequestError(new Error('getaddrinfo ENOTFOUND speech.platform.bing.com')).status, 503)
  } finally {
    quiet()
  }
})

test('a rejected credential becomes 503 without leaking provider detail', () => {
  const quiet = silenceConsole()
  try {
    const error = toRequestError(new Error('Unexpected server response: 403'))
    assert.equal(error.status, 503)
    assert.doesNotMatch(error.message, /403/)
  } finally {
    quiet()
  }
})

test('anything else from the provider becomes 502', () => {
  const quiet = silenceConsole()
  try {
    assert.equal(toRequestError(new Error('bad frame')).status, 502)
  } finally {
    quiet()
  }
})

// The mapping logs server-side detail on purpose; keep test output readable.
function silenceConsole() {
  const original = console.error
  console.error = () => {}
  return () => {
    console.error = original
  }
}
