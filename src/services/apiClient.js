import axios from 'axios';

// Base URL of the backend. Falls back to localhost:5000 in dev. A trailing
// slash (easy to paste from a hosting dashboard) would double up in paths.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const baseURL = API_URL;

// Synthesis can take a while: translation, then the provider call (up to 20s
// server-side), and a sleeping free-tier host needs up to a minute to wake.
// Give it room so a slow success is not reported as a failure.
export const REQUEST_TIMEOUT_MS = 60000;

// One configured axios instance the whole app shares.
export const api = axios.create({
  baseURL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Fallback copy for when the server sent no message of its own (spec §14).
const MESSAGE_BY_STATUS = {
  400: 'Invalid request. Check your text and try again.',
  401: 'Authentication failed (API key problem on the server).',
  403: 'You are not allowed to do that.',
  404: 'The requested resource was not found.',
  413: 'That text is too large to send.',
  415: 'The request was sent in the wrong format.',
  429: 'Too many requests. Please wait a moment and retry.',
  500: 'The server had a problem. Please try again.',
  502: 'The speech provider could not generate that audio.',
  503: 'The speech service is temporarily unavailable.',
  504: 'The speech provider took too long. Try a shorter passage.',
};

/**
 * Turn an axios error into one sentence the UI can show as-is.
 * Kept separate from the interceptor so it can be unit tested.
 */
export function describeError(error, { online = globalThis.navigator?.onLine ?? true } = {}) {
  // The server responded with a non-2xx status.
  if (error?.response) {
    const { status, data } = error.response;
    // Blob responses (audio downloads) carry no readable message.
    const serverMsg = typeof data?.error === 'string' ? data.error : null;
    return serverMsg || MESSAGE_BY_STATUS[status] || `Request failed (status ${status}).`;
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'The request timed out. The server may be busy or waking up. Try again.';
  }

  if (!online) {
    return 'You appear to be offline. Check your connection and try again.';
  }

  // Sent, but nothing came back: server down, wrong URL, or CORS refusal.
  if (error?.request) {
    return 'Could not reach the speech server. Check that it is running and try again.';
  }

  return 'Something went wrong. Please try again.';
}

// Re-throw a clean Error the UI can display directly, keeping the status for
// callers that want to branch on it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const clean = new Error(describeError(error));
    clean.status = error.response?.status ?? null;
    return Promise.reject(clean);
  }
);
