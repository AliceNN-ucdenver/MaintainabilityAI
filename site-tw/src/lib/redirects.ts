const ALLOWED_REDIRECT_PATHS = new Set(['/', '/agenda', '/agenda.html', '/docs']);

export function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }

    const path = parsed.pathname;
    const isAllowedPath = ALLOWED_REDIRECT_PATHS.has(path) || path.startsWith('/docs/');

    return isAllowedPath ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}
