/**
 * Shared component CSS used across multiple webview panels.
 *
 * Covers: reset, body base, links, buttons, error messages, spinners,
 * loading overlays.  Panel-specific styles remain in each panel.
 */
export const componentStyles = /* css */ `
/* ---- Reset ---- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  font-size: var(--font-size);
  color: var(--text-primary);
  background: var(--bg-primary);
  line-height: 1.5;
}

a { color: var(--accent); text-decoration: none; cursor: pointer; }
a:hover { text-decoration: underline; }

/* ---- Buttons ---- */
button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary { background: var(--accent); color: var(--accent-fg); }
.btn-primary:hover { background: var(--accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--bg-input); }

.btn-success { background: var(--success); color: #fff; }
.btn-success:hover { background: #16a34a; }

.btn-ghost { background: transparent; color: var(--text-primary); }
.btn-ghost:hover { background: var(--bg-input); }

.btn-link {
  background: none; border: none; color: var(--accent);
  cursor: pointer; padding: 2px 4px; font-size: 11px;
  text-decoration: underline; font-weight: 400;
}
.btn-link:hover { color: var(--accent-hover); }

.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-icon { padding: 6px 10px; font-size: 14px; line-height: 1; }

/* ---- Error Messages ---- */
.error-msg {
  color: var(--error);
  font-size: 12px;
  padding: 8px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  margin-bottom: 12px;
}
.error-msg:empty { display: none; }

/* ---- Spinner ---- */
.spinner {
  width: 24px; height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
.spinner-sm { width: 14px; height: 14px; border-width: 2px; }
.spinner-lg { width: 28px; height: 28px; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ---- Loading Overlay ---- */
.loading-overlay {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}
`;
