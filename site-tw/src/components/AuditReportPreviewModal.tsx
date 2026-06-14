import { useEffect, useState } from 'react';

interface AuditReportPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

const phases = [
  {
    phase: 'WHY',
    runId: 'WHY-2026-06-13-rfh9pw',
    events: '17 events',
    signed: '12/12',
    chainHead: 'eefb49a7eb98...',
    chainRoot: 'c80528dfb3df7d32...',
    pr: '#235',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/235',
    artifact: 'why/research-doc.md',
    review: 'not required for WHY',
  },
  {
    phase: 'HOW',
    runId: 'HOW-2026-06-13-hoartt',
    events: '14 events',
    signed: '12/12',
    chainHead: 'd80a1410699e...',
    chainRoot: 'f22267d3ae0a9aa6...',
    pr: '#237',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/237',
    artifact: 'how/prd.md',
    review: 'architect 0.96 PASS · security 0.94 PASS',
  },
  {
    phase: 'WHAT',
    runId: 'WHAT-2026-06-13-5fjlgb',
    events: '39 events',
    signed: '37/37',
    chainHead: 'da3ec4ccb048...',
    chainRoot: '84193e9ede055439...',
    pr: '#245',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/245',
    artifact: 'what/code-design.md',
    review: 'code-architect 0.93 PASS · code-security 0.92 PASS',
  },
];

// Cross-phase ladder — the three planning phases plus the cross-repo
// implementation row, all threaded through one intent_thread_uuid.
const ladder = [
  { phase: 'why', pr: '#235', prUrl: phases[0].prUrl, chainRoot: 'c80528dfb3df7d32...' },
  { phase: 'how', pr: '#237', prUrl: phases[1].prUrl, chainRoot: 'f22267d3ae0a9aa6...' },
  { phase: 'what', pr: '#245', prUrl: phases[2].prUrl, chainRoot: '84193e9ede055439...' },
  { phase: 'implementation', pr: 'movie-api #24', prUrl: 'https://github.com/AliceNN-ucdenver/movie-api/pull/24', chainRoot: '3c8ed2673f8a2df6...' },
];

const controls = [
  ['SR-01', 'not declared', 'A01, A04', 'yes'],
  ['SR-02', 'not declared', 'A01, A02, A09', 'yes'],
  ['SR-03', 'not declared', 'A03, A04, A09', 'yes'],
  ['SR-04', 'not declared', 'A04, A09', 'yes'],
];

// Cross-repo implementation chain (the fan-out target repo).
const implChain = {
  repo: 'AliceNN-ucdenver/movie-api',
  status: 'pr-merged',
  pr: '#24',
  prUrl: 'https://github.com/AliceNN-ucdenver/movie-api/pull/24',
  runId: 'IMPL-2026-06-13-...-movie-api-m5k2q7',
  roots: 'parent_chain_root ✓ · intent_thread ✓',
  evidence: 'events JSONL + key PEM present @ merge SHA ✓',
  runnerVerify: 'not-yet-verified (Tier 3 T3-2)',
};

// Red Queen deterministic-enforcement seal over the impl decision log.
const redQueen = {
  repo: 'AliceNN-ucdenver/movie-api',
  seal: 'verified ✓',
  decisions: 49,
  allowed: 49,
  denied: 0,
  overrides: 0,
  prefix: 'a68e25420f78...',
};

// Hatter-side evidence-boundary rails. groundedness is ADVISORY (unpinned
// model): recorded + integrity-gated, but its model replay never gates.
const oracleRails = [
  { rail: 'injection', status: '✓ PASS', integrity: 'matches ✓ (1/1)', replay: 'PASS in CI ✓', verdict: 'needs_review' },
  { rail: 'groundedness', status: '✓ PASS', integrity: 'matches ✓ (3/3)', replay: 'advisory · non-gating', verdict: 'needs_review' },
  { rail: 'pii', status: '✓ PASS', integrity: 'matches ✓ (2/2)', replay: 'PASS in CI ✓', verdict: 'pass' },
];

// Pocket Watch v2 — advisory contrastive alignment vs sibling OKRs.
const pocketWatch = [
  { phase: 'WHY', status: '⚠ needs_review', rank: '1', margin: '+0.1337', anchors: '1/2' },
  { phase: 'HOW', status: '✓ pass', rank: '1', margin: '+0.1617', anchors: '2/2' },
  { phase: 'WHAT', status: '✓ pass', rank: '1', margin: '+0.1422', anchors: '2/2' },
];

const verifierCommand = `printf '{"okrId":"OKR-2026Q2-IMDB-004-movie-api","runId":"WHAT-2026-06-13-5fjlgb"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.64 skill-audit-verify-chain`;

export default function AuditReportPreviewModal({ open, onClose }: AuditReportPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const copyVerifierCommand = async () => {
    try {
      await navigator.clipboard.writeText(verifierCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="audit-report-modal" role="dialog" aria-modal="true" aria-labelledby="audit-report-title">
      <button className="audit-report-backdrop" type="button" aria-label="Close audit report preview" onClick={onClose} />
      <section className="audit-report-sheet">
        <header className="audit-report-header">
          <div>
            <div className="audit-report-kicker">Sample OKR audit rollup</div>
            <h2 id="audit-report-title">OKR-2026Q2-IMDB-004-movie-api</h2>
            <p>Add a personalized movie-recommendations endpoint to movie-api</p>
          </div>
          <button className="audit-report-close" type="button" onClick={onClose} aria-label="Close audit report preview">×</button>
        </header>

        <div className="audit-report-verdict">
          <div className="audit-report-pass">PASS</div>
          <div>
            <strong>All 3 phases present, runner-verified, and source-atomic.</strong>
            <span>Sources: GitHub canonical · risk: low · action: approve closeout for downstream use · outstanding gaps: none.</span>
          </div>
        </div>

        <div className="audit-report-meta" aria-label="OKR audit report metadata">
          <span><strong>Tier</strong> autonomous</span>
          <span><strong>BAR</strong> APP-IMDB-001</span>
          <span><strong>Owner</strong> maintainabilityai</span>
          <span><strong>Completed</strong> 2026-06-13</span>
        </div>

        <div className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Phase rollup</span>
            <em>Each phase is sealed, runner-verified, and linked to the PR that merged it.</em>
          </div>
          <div className="audit-phase-grid">
            {phases.map(phase => (
              <article className="audit-phase-card" key={phase.phase}>
                <div className="audit-phase-topline">
                  <strong>{phase.phase}</strong>
                  <span>sealed</span>
                </div>
                <div className="audit-phase-run">{phase.runId}</div>
                <dl>
                  <div><dt>Runner</dt><dd>PASS · {phase.events}</dd></div>
                  <div><dt>Signed</dt><dd>{phase.signed}</dd></div>
                  <div><dt>Chain head</dt><dd>{phase.chainHead}</dd></div>
                  <div><dt>Artifact</dt><dd>{phase.artifact}</dd></div>
                  <div><dt>Self-review</dt><dd>{phase.review}</dd></div>
                  <div><dt>PR</dt><dd><a href={phase.prUrl} target="_blank" rel="noopener noreferrer">{phase.pr}</a></dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>

        <div className="audit-report-two-col">
          <section className="audit-report-section">
            <div className="audit-report-section-title">
              <span>Cross-phase ladder</span>
              <em>WHY → HOW → WHAT → implementation, threaded by one intent_thread_uuid.</em>
            </div>
            <table className="audit-report-table">
              <thead>
                <tr><th>Phase</th><th>PR</th><th>Chain root</th></tr>
              </thead>
              <tbody>
                {ladder.map(row => (
                  <tr key={row.phase}>
                    <td>{row.phase}</td>
                    <td><a href={row.prUrl} target="_blank" rel="noopener noreferrer">{row.pr}</a></td>
                    <td><code>{row.chainRoot}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="audit-report-section">
            <div className="audit-report-section-title">
              <span>Control coverage</span>
              <em>Every PRD security requirement is cited in the design.</em>
            </div>
            <table className="audit-report-table">
              <thead>
                <tr><th>SR</th><th>OWASP</th><th>Design</th></tr>
              </thead>
              <tbody>
                {controls.map(([sr, _stride, owasp, cited]) => (
                  <tr key={sr}>
                    <td><code>{sr}</code></td>
                    <td>{owasp}</td>
                    <td>{cited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="audit-report-note">STRIDE was not declared in this PRD. The report says that plainly instead of filling the cell with a vague dash.</p>
          </section>
        </div>

        <section className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Implementation chain</span>
            <em>The cross-repo fan-out: the impl PR's continuation block, cross-checked against the mesh.</em>
          </div>
          <table className="audit-report-table">
            <thead>
              <tr><th>Repo</th><th>Status</th><th>PR</th><th>Run id</th><th>Chain roots</th><th>Evidence</th><th>Runner verify</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>{implChain.repo}</code></td>
                <td>{implChain.status}</td>
                <td><a href={implChain.prUrl} target="_blank" rel="noopener noreferrer">{implChain.pr}</a></td>
                <td><code>{implChain.runId}</code></td>
                <td>{implChain.roots}</td>
                <td>{implChain.evidence}</td>
                <td>{implChain.runnerVerify}</td>
              </tr>
            </tbody>
          </table>
          <p className="audit-report-note">Chain-root + intent-thread cross-checks are the verification today; the cross-repo runner extension (Tier 3 T3-2) is when the Runner-verify column flips real.</p>
        </section>

        <section className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Implementation chain — Red Queen</span>
            <em>Deterministic policy decisions, signed and sealed onto the impl chain.</em>
          </div>
          <table className="audit-report-table">
            <thead>
              <tr><th>Repo</th><th>Seal</th><th>Decisions</th><th>Allowed</th><th>Denied</th><th>Overrides</th><th>Prefix sha256</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>{redQueen.repo}</code></td>
                <td>{redQueen.seal}</td>
                <td>{redQueen.decisions}</td>
                <td>{redQueen.allowed}</td>
                <td>{redQueen.denied}</td>
                <td>{redQueen.overrides}</td>
                <td><code>{redQueen.prefix}</code></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Oracle rails (evidence boundary)</span>
            <em>Exporter re-derives bytes; CI replays the model; neither trusts the stored report alone.</em>
          </div>
          <table className="audit-report-table">
            <thead>
              <tr><th>Rail</th><th>Status</th><th>Integrity</th><th>Model replay</th><th>Verdict</th></tr>
            </thead>
            <tbody>
              {oracleRails.map(rail => (
                <tr key={rail.rail}>
                  <td><code>{rail.rail}</code></td>
                  <td>{rail.status}</td>
                  <td>{rail.integrity}</td>
                  <td>{rail.replay}</td>
                  <td>{rail.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="audit-report-note">groundedness is advisory (unpinned model) — recorded + integrity-gated, but its model replay never gates the verdict. injection + pii are pinned and gate normally.</p>
        </section>

        <section className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Pocket Watch alignment</span>
            <em>Advisory: contrastive rank / margin vs sibling OKRs. Recorded, not gating.</em>
          </div>
          <table className="audit-report-table">
            <thead>
              <tr><th>Phase</th><th>Status</th><th>Own rank</th><th>Margin</th><th>Critical anchors</th></tr>
            </thead>
            <tbody>
              {pocketWatch.map(row => (
                <tr key={row.phase}>
                  <td>{row.phase}</td>
                  <td>{row.status}</td>
                  <td>{row.rank}</td>
                  <td>{row.margin}</td>
                  <td>{row.anchors}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="audit-report-note">Nearest decoy across all phases: OKR-2026Q2-IMDB-003-celeb-api. Advisory while v2 calibrates — it does not affect the rollup verdict.</p>
        </section>

        <section className="audit-report-section">
          <div className="audit-report-section-title">
            <span>Verifier command</span>
            <em>Same runner verifier CI uses before merge.</em>
          </div>
          <pre className="audit-report-command"><code>{verifierCommand}</code></pre>
          <button className="audit-report-copy" type="button" onClick={copyVerifierCommand}>
            {copied ? 'Copied' : 'Copy verifier command'}
          </button>
        </section>
      </section>
    </div>
  );
}
