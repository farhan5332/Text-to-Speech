const TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS ?? 8000)
const CACHE_LIMIT = 200

/*
 * None of these endpoints is an official, contracted API: each is free, keyless
 * and rate limited, and Google's gtx host starts answering 429 after a burst.
 * So we try them in turn and, if they all refuse, speak the text as typed.
 */
const PROVIDERS = [
  {
    name: 'google-gtx',
    url: (text, target) =>
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (payload) => ({
      text: (payload?.[0] ?? []).map((chunk) => chunk?.[0] ?? '').join(''),
      detected: typeof payload?.[2] === 'string' ? payload[2] : null,
    }),
  },
  {
    name: 'google-dict',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${target}&q=${encodeURIComponent(text)}`,
    // Shape: [["translated","detected"]] — or a bare array of chunks for long text.
    parse: (payload) => {
      const first = payload?.[0]
      if (Array.isArray(first)) {
        return { text: String(first[0] ?? ''), detected: first[1] ?? null }
      }
      return { text: Array.isArray(payload) ? payload.join('') : '', detected: null }
    },
  },
  {
    name: 'mymemory',
    url: (text, target) =>
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`en|${target}`)}`,
    parse: (payload) => ({
      text: payload?.responseData?.translatedText ?? '',
      detected: null,
    }),
  },
]

// Regenerating the same sentence is common, and a hit costs no quota.
const cache = new Map()

function cacheGet(key) {
  if (!cache.has(key)) return null
  const value = cache.get(key)
  // Refresh recency so the busiest phrases survive eviction.
  cache.delete(key)
  cache.set(key, value)
  return value
}

function cacheSet(key, value) {
  cache.set(key, value)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
}

/**
 * Translate `text` into the base language of a BCP-47 code ("ur-PK" -> "ur").
 *
 * @returns {Promise<{ text: string, translated: boolean, detected: string|null, provider: string|null }>}
 */
async function translate(text, languageCode) {
  const target = String(languageCode).split('-')[0].toLowerCase()
  const key = `${target}:${text}`

  const cached = cacheGet(key)
  if (cached) return cached

  const failures = []

  for (const provider of PROVIDERS) {
    try {
      const response = await fetch(provider.url(text, target), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const { text: translatedText, detected } = provider.parse(await response.json())
      const trimmed = String(translatedText).trim()
      if (!trimmed) throw new Error('empty translation')

      // Already in the target language, so keep the user's own wording.
      const untouched = detected === target || trimmed === text.trim()
      const result = {
        text: untouched ? text : trimmed,
        translated: !untouched,
        detected,
        provider: provider.name,
      }
      cacheSet(key, result)
      return result
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`)
    }
  }

  console.error(`Translation unavailable, speaking the original text (${failures.join('; ')})`)
  return { text, translated: false, detected: null, provider: null }
}

module.exports = { translate }
