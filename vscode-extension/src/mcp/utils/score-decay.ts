/**
 * Score Decay — compute-on-read model for governance scores.
 *
 * Scores decay over time using exponential half-life when no assessment
 * has been performed recently. Pure functions, no I/O.
 */
import type { DecayConfig, DecayedScoreResult, GovernanceTimestamps } from '../../types/redqueen';

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeDays: 90,
  minScore: 0,
  graceWindowDays: 14,
};

export function computeDecayedScore(
  rawScore: number,
  timestamps: GovernanceTimestamps,
  now: Date = new Date(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): DecayedScoreResult {
  const lastAssessment = new Date(timestamps.lastAssessment);
  const daysSinceAssessment = Math.max(
    0,
    (now.getTime() - lastAssessment.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Grace window: no decay
  if (daysSinceAssessment <= config.graceWindowDays) {
    return {
      rawScore,
      decayedScore: rawScore,
      decayFactor: 1.0,
      daysSinceAssessment,
      inGraceWindow: true,
      decayApplied: false,
    };
  }

  // Exponential decay: score * (0.5 ^ (days_past_grace / halfLife))
  const daysPastGrace = daysSinceAssessment - config.graceWindowDays;
  const decayFactor = Math.pow(0.5, daysPastGrace / config.halfLifeDays);
  const decayedScore = Math.max(config.minScore, Math.round(rawScore * decayFactor));

  return {
    rawScore,
    decayedScore,
    decayFactor,
    daysSinceAssessment,
    inGraceWindow: false,
    decayApplied: true,
  };
}

export function computeDecayedPillarScores(
  pillars: { architecture: number; security: number; informationRisk: number; operations: number },
  timestamps: GovernanceTimestamps,
  now: Date = new Date(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): Record<string, DecayedScoreResult> {
  return {
    architecture: computeDecayedScore(pillars.architecture, timestamps, now, config),
    security: computeDecayedScore(pillars.security, timestamps, now, config),
    informationRisk: computeDecayedScore(pillars.informationRisk, timestamps, now, config),
    operations: computeDecayedScore(pillars.operations, timestamps, now, config),
  };
}
