const DOC_INDEX_DIRECTORIES = new Set([
  'agents',
  'governance',
  'maintainability',
  'owasp',
  'sdlc',
  'threat-modeling',
  'workshop',
]);

export function markdownPathForRoute(pathOverride: string | undefined, pathname: string): string {
  if (pathOverride) {
    return pathOverride;
  }

  let urlPath = pathname;
  const hadTrailingSlash = urlPath.endsWith('/');

  if (urlPath.endsWith('/') && urlPath !== '/') {
    urlPath = urlPath.slice(0, -1);
  }

  urlPath = urlPath.replace(/\.html$/, '');

  if (urlPath.endsWith('.md')) {
    return urlPath;
  }

  if (urlPath === '/docs') {
    return '/docs/index.md';
  }

  if (urlPath.startsWith('/docs/')) {
    const lastSegment = urlPath.split('/').pop() || '';
    if (hadTrailingSlash || DOC_INDEX_DIRECTORIES.has(lastSegment)) {
      return `${urlPath}/index.md`;
    }

    return `${urlPath}.md`;
  }

  return `${urlPath}.md`;
}
