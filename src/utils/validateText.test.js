import { describe, expect, test } from 'vitest';
import { validateText } from './validateText';
import { MAX_CHARS } from '../constants/languages';

describe('validateText', () => {
  test('empty and whitespace-only input is invalid', () => {
    for (const input of ['', '   ', '\n\t', null, undefined]) {
      const result = validateText(input);
      expect(result.valid).toBe(false);
      expect(result.isEmpty).toBe(true);
      expect(result.error).toMatch(/Enter some text/);
    }
  });

  test('counts characters and words', () => {
    const result = validateText('  Hello   brave new world ');
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(4);
    expect(result.charCount).toBe('  Hello   brave new world '.length);
  });

  test('text at the limit is valid, one over is not', () => {
    expect(validateText('a'.repeat(MAX_CHARS)).valid).toBe(true);

    const over = validateText('a'.repeat(MAX_CHARS + 1));
    expect(over.valid).toBe(false);
    expect(over.isOver).toBe(true);
    expect(over.error).toMatch(/1 characters over/);
  });

  test('warns when close to the limit', () => {
    const near = validateText('a'.repeat(Math.ceil(MAX_CHARS * 0.95)));
    expect(near.valid).toBe(true);
    expect(near.warning).toMatch(/close to/);
  });
});
