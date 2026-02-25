// ============================================================================
// HTML Component Helpers — reusable builders for buttons, badges, and pills
// Reduces boilerplate across webview renderers (87+ buttons, 40+ badges)
// ============================================================================

import { escapeHtml, escapeAttr } from '../pillars/shared';

// ============================================================================
// Buttons
// ============================================================================

export interface ButtonOpts {
  id?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: boolean;
  disabled?: boolean;
  title?: string;
  style?: string;
  data?: Record<string, string>;
}

/**
 * Render a `<button>` element with consistent class conventions.
 *
 * ```ts
 * button('Save', { id: 'btn-save', variant: 'primary' })
 * // → <button id="btn-save" class="btn-primary">Save</button>
 *
 * button('&#x21BB;', { id: 'btn-refresh', variant: 'secondary', icon: true, title: 'Refresh' })
 * // → <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh">&#x21BB;</button>
 * ```
 */
export function button(label: string, opts: ButtonOpts = {}): string {
  const classes: string[] = [];
  if (opts.variant) { classes.push(`btn-${opts.variant}`); }
  if (opts.icon) { classes.push('btn-icon'); }

  const parts: string[] = ['<button'];
  if (opts.id) { parts.push(` id="${escapeAttr(opts.id)}"`); }
  if (classes.length) { parts.push(` class="${classes.join(' ')}"`); }
  if (opts.title) { parts.push(` title="${escapeAttr(opts.title)}"`); }
  if (opts.style) { parts.push(` style="${escapeAttr(opts.style)}"`); }
  if (opts.disabled) { parts.push(' disabled'); }
  if (opts.data) {
    for (const [key, val] of Object.entries(opts.data)) {
      parts.push(` data-${key}="${escapeAttr(val)}"`);
    }
  }
  parts.push(`>${label}</button>`);
  return parts.join('');
}

// ============================================================================
// Status Badges
// ============================================================================

/**
 * Render a `<span class="status-badge ...">` element.
 * Used for workflow deployment status and similar on/off indicators.
 *
 * ```ts
 * statusBadge('Deployed', 'deployed')
 * // → <span class="status-badge deployed">Deployed</span>
 * ```
 */
export function statusBadge(text: string, status: 'deployed' | 'not-deployed' | 'checking' | 'unknown'): string {
  return `<span class="status-badge ${status}">${escapeHtml(text)}</span>`;
}

/**
 * Render a workflow deploy status badge from a boolean/null state.
 * Common pattern used in both scorecard.ts and lookingGlass.ts settings sections.
 */
export function deployStatusBadge(deployed: boolean | null | undefined): string {
  if (deployed === null || deployed === undefined) {
    return statusBadge('Checking\u2026', 'checking');
  }
  return deployed
    ? statusBadge('Deployed', 'deployed')
    : statusBadge('Not Deployed', 'not-deployed');
}
