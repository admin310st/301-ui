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

    if (
      request.method === 'GET' &&
      (url.pathname === '/auth' ||
        url.pathname === '/auth/' ||
        url.pathname === '/auth/verify' ||
        url.pathname === '/auth/verify/' ||
        url.pathname === '/auth/success' ||
        url.pathname === '/auth/success/')
    ) {
      const indexReq = new Request(new URL('/index.html', url.origin).toString(), {
        method: 'GET',
        headers: request.headers,
      });
      return env.ASSETS.fetch(indexReq);
    }

    if (request.method === 'GET' && url.pathname === '/env') {
      return jsonResponse({ turnstileSitekey: env.TURNSTILE_SITEKEY });
    }

    return env.ASSETS.fetch(request);
  },
};
