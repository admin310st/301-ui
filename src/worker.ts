export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  TURNSTILE_SITEKEY: string;
}

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init.headers,
    },
    status: init.status,
    statusText: init.statusText,
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/env') {
      return jsonResponse({ turnstileSitekey: env.TURNSTILE_SITEKEY });
    } else if (
      request.method === 'GET' &&
      url.pathname === '/auth/verify' &&
      url.searchParams.get('type') === 'reset'
    ) {
      const resetUrl = new URL('/reset-password.html', url.origin);
      const resetReq = new Request(resetUrl.toString(), request);
      return env.ASSETS.fetch(resetReq);
    } else if (request.method === 'GET' && url.pathname.startsWith('/auth/')) {
      const indexUrl = new URL('/index.html', url.origin);
      const indexReq = new Request(indexUrl.toString(), request);
      return env.ASSETS.fetch(indexReq);
    }

    return env.ASSETS.fetch(request);
  },
};
