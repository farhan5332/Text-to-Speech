import { api, API_URL } from './apiClient';

export { API_URL };

// true = call the Express backend; false = browser-only (Days 3–6)
export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND !== 'false';

function guessGender(name) {
  if (/female|zira|samantha|karen|tessa|woman/i.test(name)) return 'Female';
  if (/male|david|man/i.test(name)) return 'Male';
  return 'Other';
}

/* ── Voices ─────────────────────────────────────────── */

// Browser voices, normalized to { name, lang, gender, native }
export function getBrowserVoices() {
  const synth = window.speechSynthesis;
  if (!synth) return [];
  return synth.getVoices().map((v) => ({
    name: v.name,
    lang: v.lang,
    gender: guessGender(v.name),
    native: v,
  }));
}

export function onVoicesChanged(callback) {
  const synth = window.speechSynthesis;
  if (!synth) return () => {};
  synth.addEventListener('voiceschanged', callback);
  return () => synth.removeEventListener('voiceschanged', callback);
}

// GET /api/voices -> normalized voices
export async function fetchVoices() {
  const { data } = await api.get('/api/voices');
  return (data.voices || []).map((v) => ({
    name: v.name,
    lang: v.language,
    gender: v.gender || 'Other',
    native: null,
  }));
}

/* ── Generate ───────────────────────────────────────── */

// POST /api/tts -> the full result object
export async function generateSpeech({ text, language, voice, rate, pitch }) {
  const { data } = await api.post('/api/tts', { text, language, voice, rate, pitch });
  return { ...data, audioUrl: `${API_URL}${data.audioUrl}` };
}

// Pulls a generated clip back as bytes so the browser can save it locally.
export async function fetchAudioBlob(audioUrl) {
  const path = audioUrl.startsWith(API_URL) ? audioUrl.slice(API_URL.length) : audioUrl;
  const { data } = await api.get(path, { responseType: 'blob' });
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/api/health');
  return data;
}

/* ── Browser speech (fallback for VITE_USE_BACKEND=false) ── */

// pitch is the same relative percentage the API takes (-50..50).
export function speak({ text, voice, volume = 1, rate = 1, pitch = 0, onEnd }) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice?.native) {
    u.voice = voice.native;
    u.lang = voice.native.lang;
  }
  u.volume = volume;
  u.rate = rate;
  u.pitch = 1 + pitch / 100;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}
export const pauseBrowser = () => window.speechSynthesis?.pause();
export const resumeBrowser = () => window.speechSynthesis?.resume();
export const cancelBrowser = () => window.speechSynthesis?.cancel();
