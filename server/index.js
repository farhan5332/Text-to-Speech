require('dotenv').config()

const app = require('./app')
const { TTL_MINUTES, startCleanup } = require('./services/audioStore')

const PORT = Number(process.env.PORT ?? 5000)

startCleanup()

const server = app.listen(PORT, () => {
  console.log(`Speech service listening on http://localhost:${PORT}`)
  console.log(`Clips are served from /audio and deleted after ${TTL_MINUTES} minutes.`)
})

// Hosts send SIGTERM before replacing an instance on deploy. Finish the
// requests already in flight instead of cutting them off mid-synthesis.
function shutdown(signal) {
  console.log(`${signal} received, closing the server.`)
  server.close(() => process.exit(0))
  // Do not hang forever on a stuck upstream connection.
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Log instead of dying silently; the host restarts the process after exit.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})

module.exports = server
