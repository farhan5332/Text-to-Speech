import { describe, expect, test } from 'vitest';
import { polishText } from './polishText';

describe('polishText', () => {
  test('collapses spacing, fixes punctuation spacing and closes the sentence', () => {
    expect(polishText('  hello   world ,how are you')).toBe('Hello world, how are you.');
  });

  test('capitalises each sentence start', () => {
    expect(polishText('first one. second one! third?')).toBe('First one. Second one! Third?');
  });

  test('leaves domains and decimals alone', () => {
    expect(polishText('Visit example.com for version 3.5 today.')).toBe('Visit example.com for version 3.5 today.');
  });

  test('keeps a trailing pause marker as the ending', () => {
    expect(polishText('wait for it …')).toBe('Wait for it …');
  });

  test('returns empty text unchanged', () => {
    expect(polishText('   ')).toBe('');
  });
});
