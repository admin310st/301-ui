import { describe, it, expect } from 'vitest';
import { createApiError } from '@utils/errors';

describe('createApiError', () => {
  it('extracts message from body.message', () => {
    const err = createApiError(400, { message: 'Bad input' });
    expect(err.message).toBe('Bad input');
    expect(err.status).toBe(400);
    expect(err.body).toEqual({ message: 'Bad input' });
  });

  it('uses fallback when body has no message', () => {
    const err = createApiError(500, { error: 'internal' }, 'Server error');
    expect(err.message).toBe('Server error');
    expect(err.status).toBe(500);
  });

  it('uses default fallback for null body', () => {
    const err = createApiError(502, null);
    expect(err.message).toBe('Request failed');
    expect(err.body).toBeNull();
  });

  it('is an instance of Error', () => {
    const err = createApiError(404, { message: 'Not found' });
    expect(err).toBeInstanceOf(Error);
  });
});
