import { MAX_CHARS } from '../constants/languages';

// Central place for every rule the text box must satisfy.
// Returns a small result object the UI can read from.
export function validateText(rawText) {
  const text = rawText ?? '';
  const trimmed = text.trim();
  const charCount = text.length;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  let error = '';
  let warning = '';

  if (trimmed.length === 0) {
    // covers both empty and whitespace-only input
    error = 'Enter some text to generate speech.';
  } else if (charCount > MAX_CHARS) {
    error = `Text is ${charCount - MAX_CHARS} characters over the ${MAX_CHARS} limit.`;
  } else if (charCount > MAX_CHARS * 0.9) {
    warning = `You're close to the ${MAX_CHARS}-character limit.`;
  }

  return {
    valid: error === '',
    isEmpty: trimmed.length === 0,
    isOver: charCount > MAX_CHARS,
    error,
    warning,
    charCount,
    wordCount,
    remaining: MAX_CHARS - charCount,
  };
}