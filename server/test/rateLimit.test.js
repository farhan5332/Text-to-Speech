// Runs in its own process (node --test isolates files), so lowering the limit
// here does not affect the other suites.
process.env.RATE_LIMIT_MAX = '2'

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')

const { fakeProvider, startServer, post } = require('./helpers')

let server
let restore

before(async () => {
  restore = fakeProvider()
  server = await startServer()
})
after(async () => {
  restore()
  await server.close()
})

test('429 with a JSON error once the per-IP limit is spent', async () => {
  assert.equal((await post(server.baseUrl, '/api/tts', { text: 'one' })).status, 201)
  assert.equal((await post(server.baseUrl, '/api/tts', { text: 'two' })).status, 201)

  const { status, body, headers } = await post(server.baseUrl, '/api/tts', { text: 'three' })
  assert.equal(status, 429)
  assert.equal(body.success, false)
  assert.match(body.error, /Rate limit/)
  assert.ok(headers.get('ratelimit'), 'standard RateLimit header is sent')
})
