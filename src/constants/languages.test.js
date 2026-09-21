import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';
import { LANGUAGES, MAX_CHARS, findLanguage } from './languages';

// The server catalogue is CommonJS; load it the way Node would.
const require = createRequire(import.meta.url);
const server = require('../../server/constants/voices.js');

describe('language catalogue', () => {
  test('findLanguage falls back to the first entry for an unknown code', () => {
    expect(findLanguage('xx-XX')).toBe(LANGUAGES[0]);
    expect(findLanguage('fr-FR').label).toBe('French');
  });

  test('every client language is one the server accepts', () => {
    const serverCodes = server.LANGUAGES.map((l) => l.code);
    expect(LANGUAGES.map((l) => l.code)).toEqual(serverCodes);
  });

  test('client and server agree on the character limit', () => {
    expect(MAX_CHARS).toBe(server.MAX_CHARS);
  });
});
