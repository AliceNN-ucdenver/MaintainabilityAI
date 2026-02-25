/**
 * Unified CSS custom properties mapped to VS Code theme tokens.
 *
 * Canonical names follow the Scorecard/IssueCreator convention
 * (--bg-primary, --text-primary, etc.).  Compat aliases let panels
 * that use shorter names (--bg, --fg, --text, --surface, …) keep
 * working without a big-bang rename.
 */
export const themeStyles = /* css */ `
:root {
  /* ---- Backgrounds ---- */
  --bg-primary: var(--vscode-editor-background);
  --bg-secondary: var(--vscode-sideBar-background);
  --bg-input: var(--vscode-input-background);

  /* ---- Text ---- */
  --text-primary: var(--vscode-editor-foreground);
  --text-secondary: var(--vscode-descriptionForeground);

  /* ---- Interactive ---- */
  --accent: var(--vscode-button-background);
  --accent-hover: var(--vscode-button-hoverBackground);
  --accent-fg: var(--vscode-button-foreground);
  --accent-secondary-bg: var(--vscode-button-secondaryBackground);
  --accent-secondary-fg: var(--vscode-button-secondaryForeground);

  /* ---- Borders ---- */
  --border: var(--vscode-panel-border, #333);
  --border-light: var(--vscode-widget-border, var(--border));

  /* ---- Inputs ---- */
  --input-fg: var(--vscode-input-foreground);
  --input-border: var(--vscode-input-border, #444);

  /* ---- Status ---- */
  --error: var(--vscode-errorForeground);
  --success: #22c55e;
  --running: #f59e0b;
  --warning: #f59e0b;
  --purple: #a855f7;

  /* ---- Fonts ---- */
  --font: var(--vscode-font-family);
  --font-mono: var(--vscode-editor-font-family, monospace);
  --font-size: var(--vscode-font-size, 13px);

  /* ---- Radii ---- */
  --radius: 8px;
  --radius-sm: 6px;

  /* ============================================================
   * Compat aliases — keep existing selectors working
   * ============================================================ */

  /* ScaffoldPanel: --bg, --fg, --btn-bg, --btn-fg, --btn-hover, --muted */
  --bg: var(--bg-primary);
  --fg: var(--text-primary);
  --muted: var(--text-secondary);
  --btn-bg: var(--accent);
  --btn-fg: var(--accent-fg);
  --btn-hover: var(--accent-hover);
  --input-bg: var(--bg-input);

  /* LookingGlass: --text, --text-muted, --text-dim, --surface, etc. */
  --text: var(--text-primary);
  --text-muted: var(--text-secondary);
  --text-dim: var(--text-secondary);
  --surface: var(--bg-secondary);
  --surface-raised: var(--bg-input);
  --accent-bg: rgba(136, 98, 255, 0.1);
  --passing: var(--success);
  --failing: var(--error);
}
`;
