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

/**
 * Add Content Security Policy headers for Turnstile compatibility
 */
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // CSP for Turnstile widget
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.301.st",
      "img-src 'self' data:",
    ].join('; ')
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
      const response = await env.ASSETS.fetch(indexReq);
      return addSecurityHeaders(response);
    }

    const response = await env.ASSETS.fetch(request);
    // Add CSP headers to HTML pages
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return addSecurityHeaders(response);
    }

    return response;
  },
};
