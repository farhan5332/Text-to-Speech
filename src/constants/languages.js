export const LANGUAGES = [
  {
    code: 'en-US',
    label: 'English (US)',
    native: 'English',
    voices: [
      { id: 'ava', label: 'Ava', gender: 'Female' },
      { id: 'ryan', label: 'Ryan', gender: 'Male' },
      { id: 'nova', label: 'Nova', gender: 'Female' },
    ],
  },
  {
    code: 'en-GB',
    label: 'English (UK)',
    native: 'English',
    voices: [
      { id: 'sonia', label: 'Sonia', gender: 'Female' },
      { id: 'thomas', label: 'Thomas', gender: 'Male' },
    ],
  },
  {
    code: 'es-ES',
    label: 'Spanish (Spain)',
    native: 'Español',
    voices: [
      { id: 'elvira', label: 'Elvira', gender: 'Female' },
      { id: 'alvaro', label: 'Álvaro', gender: 'Male' },
    ],
  },
  {
    code: 'fr-FR',
    label: 'French',
    native: 'Français',
    voices: [
      { id: 'denise', label: 'Denise', gender: 'Female' },
      { id: 'henri', label: 'Henri', gender: 'Male' },
    ],
  },
  {
    code: 'de-DE',
    label: 'German',
    native: 'Deutsch',
    voices: [
      { id: 'katja', label: 'Katja', gender: 'Female' },
      { id: 'conrad', label: 'Conrad', gender: 'Male' },
    ],
  },
  {
    code: 'hi-IN',
    label: 'Hindi',
    native: 'हिन्दी',
    voices: [
      { id: 'swara', label: 'Swara', gender: 'Female' },
      { id: 'madhur', label: 'Madhur', gender: 'Male' },
    ],
  },
  {
    code: 'ur-PK',
    label: 'Urdu',
    native: 'اردو',
    voices: [
      { id: 'uzma', label: 'Uzma', gender: 'Female' },
      { id: 'asad', label: 'Asad', gender: 'Male' },
    ],
  },
  {
    code: 'ar-SA',
    label: 'Arabic',
    native: 'العربية',
    voices: [
      { id: 'zariyah', label: 'Zariyah', gender: 'Female' },
      { id: 'hamed', label: 'Hamed', gender: 'Male' },
    ],
  },
  {
    code: 'ja-JP',
    label: 'Japanese',
    native: '日本語',
    voices: [
      { id: 'nanami', label: 'Nanami', gender: 'Female' },
      { id: 'keita', label: 'Keita', gender: 'Male' },
    ],
  },
]

export const DEFAULT_LANGUAGE = 'en-US'

export const MAX_CHARS = 5000

export function findLanguage(code) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]
}
