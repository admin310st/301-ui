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

    if (request.method === 'GET' && url.pathname.startsWith('/auth/verify')) {
      const redirectUrl = new URL(url.pathname + url.search, 'https://api.301.st');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    if (request.method === 'GET' && url.pathname === '/env') {
      return jsonResponse({ turnstileSitekey: env.TURNSTILE_SITEKEY });
    }

    return env.ASSETS.fetch(request);
  },
};
