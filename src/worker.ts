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
      "img-src 'self' data: https://www.gravatar.com",
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
    const normalizedPath = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname;
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html');

    const htmlRoutes = new Map<string, string>([
      ['/', '/index.html'],
      ['/index.html', '/index.html'],
      ['/dashboard', '/dashboard.html'],
      ['/dashboard.html', '/dashboard.html'],
      ['/integrations', '/integrations.html'],
      ['/integrations.html', '/integrations.html'],
      ['/account', '/account.html'],
      ['/account.html', '/account.html'],
      ['/domains', '/domains.html'],
      ['/domains.html', '/domains.html'],
      ['/projects', '/projects.html'],
      ['/projects.html', '/projects.html'],
      ['/sites', '/sites.html'],
      ['/sites.html', '/sites.html'],
      ['/redirects', '/redirects.html'],
      ['/redirects.html', '/redirects.html'],
      ['/streams', '/streams.html'],
      ['/streams.html', '/streams.html'],
      ['/reset-password', '/reset-password.html'],
      ['/reset-password.html', '/reset-password.html'],
      ['/about', '/about.html'],
      ['/about.html', '/about.html'],
      ['/privacy', '/privacy.html'],
      ['/privacy.html', '/privacy.html'],
      ['/terms', '/terms.html'],
      ['/terms.html', '/terms.html'],
      ['/security', '/security.html'],
      ['/security.html', '/security.html'],
      ['/docs', '/docs.html'],
      ['/docs.html', '/docs.html'],
      ['/404', '/404.html'],
      ['/404.html', '/404.html'],
    ]);

    const cookie = request.headers.get('cookie') || '';
    const hasSession = cookie.includes('refresh_token=') ||
      cookie.includes('session=') ||
      cookie.includes('auth_session=') ||
      cookie.includes('_301st_session=');

    // Early redirect: authenticated users should skip login page
    // This runs on Cloudflare Workers edge. For non-CF deployments,
    // client-side fallback in index.html will handle the redirect.
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      if (hasSession) {
        return Response.redirect(`${url.origin}/dashboard.html`, 307);
      }
    }

    // Auth guard: redirect unauthenticated users away from dashboard pages
    const protectedPrefixes = ['/dashboard', '/integrations', '/account',
      '/domains', '/projects', '/sites', '/redirects', '/streams'];

    if (request.method === 'GET' && !hasSession) {
      const isProtected = protectedPrefixes.some(prefix =>
        normalizedPath === prefix || normalizedPath === `${prefix}.html`
      );
      if (isProtected) {
        return Response.redirect(`${url.origin}/`, 307);
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

    if (request.method === 'GET' && htmlRoutes.has(normalizedPath)) {
      const target = htmlRoutes.get(normalizedPath)!;
      const assetUrl = new URL(target, request.url);
      const assetRequest = new Request(assetUrl.toString(), request);
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      return addSecurityHeaders(assetResponse);
    }

    const response = await env.ASSETS.fetch(request);
    // Add CSP headers to HTML pages
    const contentType = response.headers.get('content-type') || '';
    if (response.status !== 404 && contentType.includes('text/html')) {
      return addSecurityHeaders(response);
    }

    if (response.status !== 404 || !wantsHtml) {
      return response;
    }

    const notFoundUrl = new URL('/404.html', request.url);
    const notFoundRequest = new Request(notFoundUrl.toString(), {
      method: 'GET',
      headers: request.headers,
    });
    const notFoundAsset = await env.ASSETS.fetch(notFoundRequest);

    if (notFoundAsset.status === 404) {
      // Fallback to plain text if 404.html is missing
      return new Response('404 Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const notFoundHeaders = new Headers(notFoundAsset.headers);
    notFoundHeaders.set('Content-Type', 'text/html; charset=utf-8');

    return addSecurityHeaders(
      new Response(notFoundAsset.body, {
        status: 404,
        headers: notFoundHeaders,
      })
    );
  },
};
