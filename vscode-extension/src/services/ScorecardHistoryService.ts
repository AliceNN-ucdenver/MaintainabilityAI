import type * as vscode from 'vscode';
import type { ScorecardData, ScorecardSnapshot, TrendDirection } from '../types';

const HISTORY_KEY = 'scorecard.history';
const MAX_SNAPSHOTS = 30;

export class ScorecardHistoryService {
  constructor(private readonly state: vscode.Memento) {}

  getHistory(): ScorecardSnapshot[] {
    return this.state.get<ScorecardSnapshot[]>(HISTORY_KEY, []);
  }

  async addSnapshot(data: ScorecardData): Promise<void> {
    if (data.compositeScore < 0) { return; }

    const snapshot: ScorecardSnapshot = {
      timestamp: data.lastRefreshed,
      compositeScore: data.compositeScore,
      grade: data.grade,
      metrics: {},
    };

    for (const [key, metric] of Object.entries(data.metrics)) {
      snapshot.metrics[key] = metric.score;
    }

    const history = this.getHistory();
    history.push(snapshot);

    while (history.length > MAX_SNAPSHOTS) {
      history.shift();
    }

    await this.state.update(HISTORY_KEY, history);
  }

  getAllTrends(): Record<string, TrendDirection> {
    const history = this.getHistory();
    const trends: Record<string, TrendDirection> = {
      composite: this.computeTrend(history, s => s.compositeScore),
    };

    if (history.length > 0) {
      for (const key of Object.keys(history[history.length - 1].metrics)) {
        trends[key] = this.computeTrend(history, s => s.metrics[key]);
      }
    }

    return trends;
  }

  private computeTrend(
    history: ScorecardSnapshot[],
    extract: (s: ScorecardSnapshot) => number | undefined,
  ): TrendDirection {
    if (history.length < 2) { return 'new'; }

    const latest = extract(history[history.length - 1]);
    const previous = extract(history[history.length - 2]);

    if (latest === undefined || previous === undefined) { return 'new'; }
    if (latest > previous) { return 'improving'; }
    if (latest < previous) { return 'declining'; }
    return 'stable';
  }
}
