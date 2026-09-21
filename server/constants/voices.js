/**
 * The voice catalogue, shared by validation and `GET /api/voices`.
 *
 * `name` is what the client shows and sends back; `edge` is the Microsoft Edge
 * neural voice that actually speaks. Edge has no Ryan or Nova, so those borrow
 * the nearest US voice of the same gender.
 */
const LANGUAGES = [
  {
    code: 'en-US',
    label: 'English (US)',
    voices: [
      { name: 'Ava', gender: 'Female', edge: 'en-US-AvaNeural' },
      { name: 'Ryan', gender: 'Male', edge: 'en-US-AndrewNeural' },
      { name: 'Nova', gender: 'Female', edge: 'en-US-EmmaNeural' },
    ],
  },
  {
    code: 'en-GB',
    label: 'English (UK)',
    voices: [
      { name: 'Sonia', gender: 'Female', edge: 'en-GB-SoniaNeural' },
      { name: 'Thomas', gender: 'Male', edge: 'en-GB-ThomasNeural' },
    ],
  },
  {
    code: 'es-ES',
    label: 'Spanish (Spain)',
    voices: [
      { name: 'Elvira', gender: 'Female', edge: 'es-ES-ElviraNeural' },
      { name: 'Álvaro', gender: 'Male', edge: 'es-ES-AlvaroNeural' },
    ],
  },
  {
    code: 'fr-FR',
    label: 'French',
    voices: [
      { name: 'Denise', gender: 'Female', edge: 'fr-FR-DeniseNeural' },
      { name: 'Henri', gender: 'Male', edge: 'fr-FR-HenriNeural' },
    ],
  },
  {
    code: 'de-DE',
    label: 'German',
    voices: [
      { name: 'Katja', gender: 'Female', edge: 'de-DE-KatjaNeural' },
      { name: 'Conrad', gender: 'Male', edge: 'de-DE-ConradNeural' },
    ],
  },
  {
    code: 'hi-IN',
    label: 'Hindi',
    voices: [
      { name: 'Swara', gender: 'Female', edge: 'hi-IN-SwaraNeural' },
      { name: 'Madhur', gender: 'Male', edge: 'hi-IN-MadhurNeural' },
    ],
  },
  {
    code: 'ur-PK',
    label: 'Urdu',
    voices: [
      { name: 'Uzma', gender: 'Female', edge: 'ur-PK-UzmaNeural' },
      { name: 'Asad', gender: 'Male', edge: 'ur-PK-AsadNeural' },
    ],
  },
  {
    code: 'ar-SA',
    label: 'Arabic',
    voices: [
      { name: 'Zariyah', gender: 'Female', edge: 'ar-SA-ZariyahNeural' },
      { name: 'Hamed', gender: 'Male', edge: 'ar-SA-HamedNeural' },
    ],
  },
  {
    code: 'ja-JP',
    label: 'Japanese',
    voices: [
      { name: 'Nanami', gender: 'Female', edge: 'ja-JP-NanamiNeural' },
      { name: 'Keita', gender: 'Male', edge: 'ja-JP-KeitaNeural' },
    ],
  },
]

const DEFAULT_LANGUAGE = 'en-US'
const MAX_CHARS = Number(process.env.MAX_TEXT_LENGTH ?? 5000)

function findLanguage(code) {
  return LANGUAGES.find((language) => language.code === code)
}

/** Voice lookup is case-insensitive so "ava" and "Ava" both resolve. */
function findVoice(language, name) {
  return language.voices.find(
    (voice) => voice.name.toLowerCase() === String(name).toLowerCase(),
  )
}

module.exports = { LANGUAGES, DEFAULT_LANGUAGE, MAX_CHARS, findLanguage, findVoice }
