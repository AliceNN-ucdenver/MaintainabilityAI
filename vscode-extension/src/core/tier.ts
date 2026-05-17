/**
 * tier — pure function for tier derivation from a BarSummary.
 *
 * Extracted to break the circular import that would form if mcp/config-scaffold
 * (which also calls computeTier) and services/BarService both wanted to own it.
 * No vscode or service deps — just the BarSummary type.
 */
import type { BarSummary, GovernanceTier } from '../types';

/**
 * Derive the governance tier for a BAR from its pillar + composite scores.
 *
 * Rules:
 *   - Any pillar below 50 → `restricted` (a single weak pillar forces caution)
 *   - composite ≥ 80      → `autonomous`
 *   - composite ≥ 50      → `supervised`
 *   - otherwise           → `restricted`
 */
export function computeTier(bar: BarSummary): GovernanceTier {
  const pillars = [bar.architecture, bar.security, bar.infoRisk, bar.operations];
  if (pillars.some(p => p.score < 50)) { return 'restricted'; }

  if (bar.compositeScore >= 80) { return 'autonomous'; }
  if (bar.compositeScore >= 50) { return 'supervised'; }
  return 'restricted';
}
