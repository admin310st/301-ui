import { describe, it, expect } from 'vitest';
import { toJsonBody, parseJsonSafe } from '@utils/json';

describe('toJsonBody', () => {
  it('stringifies an object', () => {
    expect(toJsonBody({ a: 1 })).toBe('{"a":1}');
  });

  it('converts null to empty object string', () => {
    expect(toJsonBody(null)).toBe('{}');
  });

  it('converts undefined to empty object string', () => {
    expect(toJsonBody(undefined)).toBe('{}');
  });
});

describe('parseJsonSafe', () => {
  it('parses valid JSON response', async () => {
    const response = new Response(JSON.stringify({ ok: true }));
    const result = await parseJsonSafe<{ ok: boolean }>(response);
    expect(result).toEqual({ ok: true });
  });

  it('returns null for invalid JSON', async () => {
    const response = new Response('not json', {
      headers: { 'content-type': 'text/plain' },
    });
    const result = await parseJsonSafe(response);
    expect(result).toBeNull();
  });
});
