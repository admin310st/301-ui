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

    // Early redirect: authenticated users should skip login page
    // This runs on Cloudflare Workers edge. For non-CF deployments,
    // client-side fallback in index.html will handle the redirect.
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const cookie = request.headers.get('cookie');
      // Check for common session cookie patterns from backend
      // Adjust cookie names based on your backend implementation
      if (cookie && (
        cookie.includes('refresh_token=') ||
        cookie.includes('session=') ||
        cookie.includes('auth_session=') ||
        cookie.includes('_301st_session=')
      )) {
        return Response.redirect(`${url.origin}/dashboard.html`, 307);
      }
    }

    if (request.method === 'GET' && url.pathname === '/env') {
      return jsonResponse({ turnstileSitekey: env.TURNSTILE_SITEKEY });
    } else if (request.method === 'GET' && url.pathname.startsWith('/auth')) {
      const indexUrl = new URL('/', request.url);
      const indexReq = new Request(indexUrl.toString(), request);
      return env.ASSETS.fetch(indexReq);
    }

    return env.ASSETS.fetch(request);
  },
};
