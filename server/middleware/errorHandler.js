/**
 * Anything that reaches here becomes `{ success: false, error }`. The client
 * reads `error`; `message` is kept as well so older callers keep working.
 */
// Express identifies error handlers by arity, so all four parameters must stay.
function errorHandler(error, _req, res, _next) {
  // express.static reports a missing file with the full path on disk, which is
  // nobody's business outside the server.
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'That clip is no longer available. Generate it again.',
      message: 'That clip is no longer available. Generate it again.',
    })
  }

  // express.json() failures: say what was wrong with the body, not the parser's
  // internal wording ("Unexpected token } in JSON at position 12").
  if (error.type === 'entity.parse.failed') {
    return send(res, 400, 'The request body is not valid JSON.')
  }
  if (error.type === 'entity.too.large') {
    return send(res, 413, 'The request body is too large.')
  }

  const status = error.status ?? 500

  if (status >= 500) {
    console.error(error)
  }

  const message =
    status >= 500 && !error.expose
      ? 'The speech service hit an unexpected problem.'
      : error.message

  send(res, status, message)
}

function notFound(req, res) {
  send(res, 404, `No route for ${req.method} ${req.originalUrl}.`)
}

function send(res, status, message) {
  res.status(status).json({ success: false, error: message, message })
}

module.exports = { errorHandler, notFound }
