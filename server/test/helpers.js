// Shared set-up for the API tests: quiet logs, a fake provider, and a server
// on a random free port so tests never collide with a running dev server.
process.env.NODE_ENV = 'test'

const ttsService = require('../services/ttsService')
const translateService = require('../services/translateService')

/** Replace the network-bound services with fakes; returns a restore function. */
function fakeProvider({ synthesize, translate } = {}) {
  const original = { synthesize: ttsService.synthesize, translate: translateService.translate }

  ttsService.synthesize =
    synthesize ?? (async () => ({ fileName: 'fake-clip.mp3', sizeBytes: 1234 }))
  translateService.translate =
    translate ?? (async (text) => ({ text, translated: false, detected: null, provider: null }))

  return () => {
    ttsService.synthesize = original.synthesize
    translateService.translate = original.translate
  }
}

/** Boots the app on an ephemeral port. */
function startServer() {
  const app = require('../app')
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address()
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}

/** POST a JSON body (or a raw string) and return { status, body, headers }. */
async function post(baseUrl, path, body, headers = { 'Content-Type': 'application/json' }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json(), headers: response.headers }
}

async function get(baseUrl, path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers })
  const type = response.headers.get('content-type') ?? ''
  const body = type.includes('json') ? await response.json() : await response.text()
  return { status: response.status, body, headers: response.headers }
}

module.exports = { fakeProvider, startServer, post, get }
