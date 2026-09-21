const { describe, test, before, after, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const { fakeProvider, startServer, post, get } = require('./helpers')
const { RequestError } = require('../utils/validateText')
const { toRequestError } = require('../services/ttsService')

let server
let restore

before(async () => {
  server = await startServer()
})
after(async () => {
  await server.close()
})
afterEach(() => restore?.())

describe('read-only endpoints', () => {
  test('GET /api/health reports ok', async () => {
    const { status, body } = await get(server.baseUrl, '/api/health')
    assert.equal(status, 200)
    assert.equal(body.status, 'ok')
    assert.equal(typeof body.maxCharacters, 'number')
  })

  test('GET /health still answers for old uptime checks', async () => {
    const { status } = await get(server.baseUrl, '/health')
    assert.equal(status, 200)
  })

  test('GET /api/voices lists name, language and gender and hides provider ids', async () => {
    const { status, body } = await get(server.baseUrl, '/api/voices')
    assert.equal(status, 200)
    assert.ok(body.voices.length > 0)
    for (const voice of body.voices) {
      assert.ok(voice.name && voice.language && voice.gender, JSON.stringify(voice))
      assert.equal(voice.edge, undefined)
    }
  })

  test('responses carry the security headers and no framework banner', async () => {
    const { headers } = await get(server.baseUrl, '/api/health')
    assert.equal(headers.get('x-content-type-options'), 'nosniff')
    assert.equal(headers.get('x-powered-by'), null)
  })
})

describe('POST /api/tts', () => {
  test('201 with an audio URL on success', async () => {
    restore = fakeProvider()
    const { status, body } = await post(server.baseUrl, '/api/tts', {
      text: 'Hello there',
      language: 'en-GB',
      voice: 'Sonia',
    })
    assert.equal(status, 201)
    assert.equal(body.success, true)
    assert.equal(body.audioUrl, '/audio/fake-clip.mp3')
    assert.equal(body.voice, 'Sonia')
    assert.equal(body.language, 'en-GB')
  })

  test('passes the translated text to the provider', async () => {
    let spoken
    restore = fakeProvider({
      translate: async () => ({ text: 'Bonjour', translated: true, detected: 'en', provider: 'fake' }),
      synthesize: async (request) => {
        spoken = request.text
        return { fileName: 'x.mp3', sizeBytes: 1 }
      },
    })
    const { body } = await post(server.baseUrl, '/api/tts', { text: 'Hello', language: 'fr-FR' })
    assert.equal(spoken, 'Bonjour')
    assert.equal(body.translated, true)
    assert.equal(body.spokenText, 'Bonjour')
  })

  test('translate: false speaks the text exactly as sent', async () => {
    let translateCalled = false
    restore = fakeProvider({
      translate: async () => {
        translateCalled = true
        return { text: 'nope', translated: true, detected: null, provider: null }
      },
    })
    const { status, body } = await post(server.baseUrl, '/api/tts', {
      text: 'Keep me',
      language: 'fr-FR',
      translate: false,
    })
    assert.equal(status, 201)
    assert.equal(translateCalled, false)
    assert.equal(body.spokenText, 'Keep me')
  })

  const invalid = [
    ['missing text', {}, /"text" field/],
    ['empty text', { text: '' }, /nothing to say/],
    ['whitespace-only text', { text: '    ' }, /nothing to say/],
    ['text over the limit', { text: 'a'.repeat(5001) }, /or fewer/],
    ['unsupported language', { text: 'hi', language: 'xx' }, /not a language/],
    ['voice from another language', { text: 'hi', language: 'en-US', voice: 'Uzma' }, /not a voice/],
  ]
  for (const [name, payload, message] of invalid) {
    test(`400 for ${name}`, async () => {
      restore = fakeProvider()
      const { status, body } = await post(server.baseUrl, '/api/tts', payload)
      assert.equal(status, 400)
      assert.equal(body.success, false)
      assert.match(body.error, message)
    })
  }

  test('415 when the body is not JSON', async () => {
    const { status, body } = await post(server.baseUrl, '/api/tts', 'text=hello', {
      'Content-Type': 'application/x-www-form-urlencoded',
    })
    assert.equal(status, 415)
    assert.match(body.error, /application\/json/)
  })

  test('400 with a readable message for malformed JSON', async () => {
    const { status, body } = await post(server.baseUrl, '/api/tts', '{"text": "hi",')
    assert.equal(status, 400)
    assert.equal(body.error, 'The request body is not valid JSON.')
  })

  test('413 when the body exceeds the size cap', async () => {
    const { status, body } = await post(server.baseUrl, '/api/tts', { text: 'a'.repeat(70_000) })
    assert.equal(status, 413)
    assert.equal(body.success, false)
  })

  test('503 when the speech provider cannot be reached', async () => {
    const quiet = console.error
    console.error = () => {}
    restore = fakeProvider({
      synthesize: async () => {
        throw toRequestError(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }))
      },
    })
    try {
      const { status, body } = await post(server.baseUrl, '/api/tts', { text: 'hi' })
      assert.equal(status, 503)
      assert.match(body.error, /Could not reach the speech service/)
    } finally {
      console.error = quiet
    }
  })

  test('provider errors keep their status (504 timeout)', async () => {
    restore = fakeProvider({
      synthesize: async () => {
        throw new RequestError(504, 'The speech provider timed out. Try a shorter passage.')
      },
    })
    const { status } = await post(server.baseUrl, '/api/tts', { text: 'hi' })
    assert.equal(status, 504)
  })

  test('500 hides internal error details', async () => {
    const quiet = console.error
    console.error = () => {}
    restore = fakeProvider({
      synthesize: async () => {
        throw new Error('ENOSPC: disk full at C:\\secret\\path')
      },
    })
    try {
      const { status, body } = await post(server.baseUrl, '/api/tts', { text: 'hi' })
      assert.equal(status, 500)
      assert.doesNotMatch(body.error, /secret|ENOSPC/)
    } finally {
      console.error = quiet
    }
  })
})

describe('routing and CORS', () => {
  test('404 JSON for an unknown route', async () => {
    const { status, body } = await get(server.baseUrl, '/api/nope')
    assert.equal(status, 404)
    assert.match(body.error, /No route/)
  })

  test('404 for an expired clip without revealing the disk path', async () => {
    const { status, body } = await get(server.baseUrl, '/audio/expired.mp3')
    assert.equal(status, 404)
    assert.doesNotMatch(body.error, /[\\/]audio[\\/]|ENOENT/)
  })

  test('403 for an origin that is not on the allow-list', async () => {
    const { status } = await get(server.baseUrl, '/api/health', { Origin: 'https://evil.example' })
    assert.equal(status, 403)
  })

  test('allowed origins get the CORS header', async () => {
    const { status, headers } = await get(server.baseUrl, '/api/health', {
      Origin: 'http://localhost:5173',
    })
    assert.equal(status, 200)
    assert.equal(headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })
})
