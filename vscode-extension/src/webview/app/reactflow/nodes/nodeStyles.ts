// Shared style utilities for ReactFlow custom nodes
// Reads CSS custom properties from the Looking Glass theme at mount time

let cachedVars: Record<string, string> | null = null;

export function getCssVars(): Record<string, string> {
  if (cachedVars) return cachedVars;
  const cs = getComputedStyle(document.documentElement);
  cachedVars = {
    accent: cs.getPropertyValue('--accent').trim() || '#8862ff',
    accentBg: cs.getPropertyValue('--accent-bg').trim() || 'rgba(136, 98, 255, 0.12)',
    surface: cs.getPropertyValue('--surface').trim() || '#161b22',
    surfaceRaised: cs.getPropertyValue('--surface-raised').trim() || '#1c2128',
    bg: cs.getPropertyValue('--bg').trim() || '#0d1117',
    bgCard: cs.getPropertyValue('--bg-card').trim() || '#161b22',
    border: cs.getPropertyValue('--border').trim() || '#30363d',
    text: cs.getPropertyValue('--text').trim() || '#e6edf3',
    textMuted: cs.getPropertyValue('--text-muted').trim() || '#8b949e',
    textDim: cs.getPropertyValue('--text-dim').trim() || '#484f58',
    passing: cs.getPropertyValue('--passing').trim() || '#3fb950',
    warning: cs.getPropertyValue('--warning').trim() || '#d29922',
    failing: cs.getPropertyValue('--failing').trim() || '#f85149',
  };
  return cachedVars;
}

// Invalidate cache when theme might change (e.g., on re-mount)
export function invalidateStyleCache(): void {
  cachedVars = null;
}

// Common node dimensions
export const NODE_DEFAULTS = {
  contextNodeWidth: 200,
  contextNodeHeight: 80,
  actorNodeWidth: 120,
  actorNodeHeight: 100,
  serviceNodeWidth: 180,
  serviceNodeHeight: 60,
  dataStoreNodeWidth: 160,
  dataStoreNodeHeight: 70,
  networkNodeWidth: 180,
  networkNodeHeight: 60,
  containerPadding: 40,
  containerHeaderHeight: 32,
};
