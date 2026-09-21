import { describe, expect, test } from 'vitest';
import { describeError } from './apiClient';

const response = (status, data = {}) => ({ response: { status, data } });

describe('describeError', () => {
  test('prefers the message the server sent', () => {
    expect(describeError(response(400, { error: 'Keep it to 5000 or fewer.' }))).toBe(
      'Keep it to 5000 or fewer.'
    );
  });

  test('falls back to copy for each status in the spec', () => {
    expect(describeError(response(401))).toMatch(/Authentication failed/);
    expect(describeError(response(404))).toMatch(/not found/);
    expect(describeError(response(429))).toMatch(/Too many requests/);
    expect(describeError(response(500))).toMatch(/server had a problem/);
    expect(describeError(response(503))).toMatch(/temporarily unavailable/);
  });

  test('handles a status it has no copy for', () => {
    expect(describeError(response(418))).toBe('Request failed (status 418).');
  });

  test('ignores a Blob body from an audio download', () => {
    expect(describeError(response(404, new Blob(['x'])))).toMatch(/not found/);
  });

  test('reports a timeout as a timeout, not as the server being down', () => {
    expect(describeError({ code: 'ECONNABORTED', request: {} })).toMatch(/timed out/);
  });

  test('reports being offline', () => {
    expect(describeError({ request: {} }, { online: false })).toMatch(/offline/);
  });

  test('reports an unreachable server', () => {
    expect(describeError({ request: {} }, { online: true })).toMatch(/Could not reach/);
  });

  test('has a generic fallback', () => {
    expect(describeError(new Error('boom'), { online: true })).toMatch(/Something went wrong/);
  });
});
