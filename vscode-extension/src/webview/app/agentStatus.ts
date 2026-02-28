/**
 * Shared Agent Status component for Scorecard and Looking Glass webviews.
 * Self-contained — owns its own escape helpers and has no external deps.
 */

import type { AgentStatusPhase, AgentStatusInfo } from './types';
export type { AgentStatusPhase, AgentStatusInfo };

// ==========================================================================
// Escape helpers
// ==========================================================================

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==========================================================================
// Phase Config
// ==========================================================================

interface PhaseConfig {
  color: string;       // CSS color for border + pulse
  bgColor: string;     // background tint
  icon: string;        // HTML entity / emoji
  label: (agent: string, status: AgentStatusInfo) => string;
  actionLabel?: string;
  actionUrl?: (status: AgentStatusInfo) => string | undefined;
  pulse: boolean;
}

function agentName(status: AgentStatusInfo): string {
  return status.agent === 'claude' ? 'Claude'
    : status.agent === 'copilot' ? 'Copilot'
    : 'Agent';
}

const PHASE_CONFIG: Record<AgentStatusPhase, PhaseConfig> = {
  'awaiting-approval': {
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.08)',
    icon: '&#9203;',  // hourglass
    label: (agent, s) => `<strong>${agent}</strong> is waiting for workflow approval${s.workflowRun ? ` (${esc(s.workflowRun.name)})` : ''}`,
    actionLabel: 'Approve Workflow',
    actionUrl: s => s.workflowRun?.url,
    pulse: true,
  },
  'planning': {
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.08)',
    icon: '&#128302;',  // crystal ball
    label: (agent, s) => `<strong>${agent}</strong> is planning <strong>#${s.issue.number}</strong>: ${esc(s.issue.title)}`,
    pulse: true,
  },
  'plan-review': {
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.08)',
    icon: '&#128203;',  // clipboard
    label: (agent, s) => `<strong>${agent}</strong> posted a plan for <strong>#${s.issue.number}</strong> &mdash; waiting for your approval`,
    actionLabel: 'Review Plan',
    actionUrl: s => s.issue.url,
    pulse: true,
  },
  'implementing': {
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.08)',
    icon: '&#128302;',  // crystal ball
    label: (agent, s) => `<strong>${agent}</strong> is implementing <strong>#${s.issue.number}</strong>: ${esc(s.issue.title)}`,
    pulse: true,
  },
  'pr-review': {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    icon: '&#10003;',  // checkmark
    label: (agent, s) => {
      if (!s.pr) { return `<strong>${agent}</strong> has work ready for review`; }
      const reviewNote = s.pr.reviewRequested ? ' — requested your review' : ' — ready for review';
      return `<strong>${agent}</strong> opened PR <strong>#${s.pr.number}</strong>${reviewNote}`;
    },
    actionLabel: 'Review PR',
    actionUrl: s => s.pr?.url,
    pulse: true,
  },
  'pr-checks-failing': {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.08)',
    icon: '&#10007;',  // X
    label: (_agent, s) => s.pr
      ? `PR <strong>#${s.pr.number}</strong> checks failing — agent may need guidance`
      : 'PR checks are failing',
    actionLabel: 'View PR',
    actionUrl: s => s.pr?.url,
    pulse: true,
  },
  'complete': {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    icon: '&#10003;',  // checkmark
    label: (_agent, s) => s.pr
      ? `PR <strong>#${s.pr.number}</strong> merged — implementation complete`
      : `Issue <strong>#${s.issue.number}</strong> — work complete`,
    pulse: false,
  },
};

// ==========================================================================
// CSS
// ==========================================================================

export function getAgentStatusStyles(): string {
  return `
    .agent-status-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 13px;
      border-left: 3px solid var(--agent-status-color, #7c3aed);
      background: var(--agent-status-bg, rgba(124,58,237,0.08));
    }
    .agent-status-pulse {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--agent-status-color, #7c3aed);
      flex-shrink: 0;
      animation: agent-pulse-glow 2s ease-in-out infinite;
    }
    .agent-status-pulse.no-pulse {
      animation: none;
    }
    @keyframes agent-pulse-glow {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--agent-status-pulse-shadow, rgba(124,58,237,0.4)); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px var(--agent-status-pulse-shadow, rgba(124,58,237,0)); }
    }
    .agent-status-body {
      flex: 1;
      min-width: 0;
    }
    .agent-status-text {
      font-size: 13px;
      line-height: 1.4;
    }
    .agent-status-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999);
    }
    .agent-status-link {
      color: var(--vscode-textLink-foreground, #a855f7);
      cursor: pointer; text-decoration: none; font-weight: 600;
    }
    .agent-status-link:hover { text-decoration: underline; }
    .agent-status-badge {
      display: inline-block; padding: 1px 6px; border-radius: 10px;
      font-size: 10px; font-weight: 600;
    }
    .agent-status-badge-draft {
      background: rgba(234, 179, 8, 0.15); color: #eab308;
    }
    .agent-status-badge-checks-passing {
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
    }
    .agent-status-badge-checks-failing {
      background: rgba(239, 68, 68, 0.15); color: #ef4444;
    }
    .agent-status-badge-checks-pending {
      background: rgba(124, 58, 237, 0.15); color: #a78bfa;
    }
    .agent-status-badge-review-requested {
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
    }
    .agent-status-action {
      margin-left: auto;
      flex-shrink: 0;
    }
    .agent-status-action-btn {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      background: var(--agent-status-color, #7c3aed);
      color: #fff;
    }
    .agent-status-action-btn:hover {
      opacity: 0.9;
    }
  `;
}

// ==========================================================================
// Renderer
// ==========================================================================

export function renderAgentStatus(status: AgentStatusInfo | null): string {
  if (!status) { return ''; }

  const config = PHASE_CONFIG[status.phase];
  const agent = agentName(status);
  const labelHtml = config.label(agent, status);

  // Issue link
  const issueLink = `Issue <a class="agent-status-link" data-url="${escAttr(status.issue.url)}">#${esc(String(status.issue.number))}</a>`;

  // PR link with badges
  let prHtml = '';
  if (status.pr) {
    const badges: string[] = [];
    if (status.pr.reviewRequested) {
      badges.push('<span class="agent-status-badge agent-status-badge-review-requested">Review Requested</span>');
    } else if (status.pr.draft) {
      badges.push('<span class="agent-status-badge agent-status-badge-draft">Draft</span>');
    }
    if (status.pr.checksStatus === 'passing') {
      badges.push('<span class="agent-status-badge agent-status-badge-checks-passing">Checks Passing</span>');
    } else if (status.pr.checksStatus === 'failing') {
      badges.push('<span class="agent-status-badge agent-status-badge-checks-failing">Checks Failing</span>');
    } else if (status.pr.checksStatus === 'pending') {
      badges.push('<span class="agent-status-badge agent-status-badge-checks-pending">Checks Running</span>');
    }
    if (status.pr.state === 'merged') {
      badges.push('<span class="agent-status-badge agent-status-badge-checks-passing">Merged</span>');
    }
    const badgesHtml = badges.length > 0 ? ` ${badges.join(' ')}` : '';
    prHtml = `<span style="margin-left: 6px;">PR <a class="agent-status-link" data-url="${escAttr(status.pr.url)}">#${esc(String(status.pr.number))}</a>${badgesHtml}</span>`;
  }

  // Action button
  let actionHtml = '';
  if (config.actionLabel && config.actionUrl) {
    const url = config.actionUrl(status);
    if (url) {
      actionHtml = `
        <span class="agent-status-action">
          <button class="agent-status-action-btn agent-status-link" data-url="${escAttr(url)}">${esc(config.actionLabel)}</button>
        </span>`;
    }
  }

  // Inline CSS variables for phase color
  const shadowColor = config.color + '66'; // ~40% alpha

  return `
    <div class="agent-status-card" style="--agent-status-color: ${config.color}; --agent-status-bg: ${config.bgColor}; --agent-status-pulse-shadow: ${shadowColor};">
      <span class="agent-status-pulse${config.pulse ? '' : ' no-pulse'}" style="background: ${config.color};"></span>
      <div class="agent-status-body">
        <div class="agent-status-text">${config.icon} ${labelHtml}</div>
        <div class="agent-status-meta">
          ${issueLink}
          ${prHtml}
        </div>
      </div>
      ${actionHtml}
    </div>
  `;
}

// ==========================================================================
// Event Listeners
// ==========================================================================

/**
 * Attach click handlers for `.agent-status-link` elements.
 * Call this after rendering / re-rendering the agent status card.
 */
export function attachAgentStatusListeners(
  postMessage: (msg: { type: string; url: string }) => void
): void {
  document.querySelectorAll('.agent-status-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (el as HTMLElement).dataset.url;
      if (url) {
        postMessage({ type: 'openUrl', url });
      }
    });
  });
}
