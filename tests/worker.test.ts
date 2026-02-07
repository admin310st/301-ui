import { describe, it, expect, vi } from 'vitest';
import worker, { Env } from '../src/worker';

function makeEnv(overrides?: Partial<Env>): Env {
  return {
    TURNSTILE_SITEKEY: 'test-key-123',
    ASSETS: {
      fetch: vi.fn().mockResolvedValue(
        new Response('<html></html>', {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
      ),
    },
    ...overrides,
  };
}

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(`https://app.301.st${url}`, init);
}

describe('worker', () => {
  it('GET /env returns turnstileSitekey', async () => {
    const env = makeEnv();
    const res = await worker.fetch(makeRequest('/env'), env);
    const body = await res.json();

    expect(res.headers.get('content-type')).toContain('application/json');
    expect(body).toEqual({ turnstileSitekey: 'test-key-123' });
  });

  it('redirects / to /dashboard.html when session cookie present', async () => {
    const env = makeEnv();
    const res = await worker.fetch(
      makeRequest('/', {
        headers: { cookie: 'refresh_token=abc123' },
      }),
      env,
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard.html');
  });

  it('serves index.html for / without cookie', async () => {
    const env = makeEnv();
    const res = await worker.fetch(makeRequest('/'), env);

    expect(res.status).toBe(200);
    expect(env.ASSETS.fetch).toHaveBeenCalled();
  });

  it('serves index.html for /auth/* routes (SPA mode)', async () => {
    const env = makeEnv();
    const res = await worker.fetch(makeRequest('/auth/verify?token=abc'), env);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });
});
