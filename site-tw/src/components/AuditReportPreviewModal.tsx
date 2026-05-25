import { useEffect, useState } from 'react';

interface AuditReportPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

const phases = [
  {
    phase: 'WHY',
    runId: 'WHY-2026-05-24-kc6y7z',
    events: '13 events',
    chainHead: '94bc43535144...',
    chainRoot: '535ea82b9163fa72...',
    pr: '#136',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/136',
    artifact: 'why/research-doc.md',
    review: 'not required for WHY',
  },
  {
    phase: 'HOW',
    runId: 'HOW-2026-05-25-x2is24',
    events: '15 events',
    chainHead: '02e3562834d4...',
    chainRoot: 'a453c6f72c2ca067...',
    pr: '#148',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/148',
    artifact: 'how/prd.md',
    review: 'architect 0.92 MINOR · security 0.90 MINOR',
  },
  {
    phase: 'WHAT',
    runId: 'WHAT-2026-05-25-1d8h04',
    events: '28 events',
    chainHead: '87edfc98924d...',
    chainRoot: '5568ee75fe50bf26...',
    pr: '#154',
    prUrl: 'https://github.com/AliceNN-ucdenver/alicenn-ucdenver-governance-mesh/pull/154',
    artifact: 'what/code-design.md',
    review: 'architect 0.96 PASS · security 0.95 PASS',
  },
];

const controls = [
  ['SR-01', 'not declared', 'A01, A09', 'yes'],
  ['SR-02', 'not declared', 'A03, A05', 'yes'],
  ['SR-03', 'not declared', 'A02, A08', 'yes'],
  ['SR-04', 'not declared', 'A09, A10', 'yes'],
];

const verifierCommand = `printf '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"WHAT-2026-05-25-1d8h04"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain`;

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
            <h2 id="audit-report-title">OKR-2026Q2-IMDB-001-celeb-api</h2>
            <p>Add celebrity profile API to IMDB-Lite</p>
          </div>
          <button className="audit-report-close" type="button" onClick={onClose} aria-label="Close audit report preview">×</button>
        </header>

        <div className="audit-report-verdict">
          <div className="audit-report-pass">PASS</div>
          <div>
            <strong>All 3 phases present, runner-verified, and source-atomic.</strong>
            <span>Sources: GitHub canonical · risk: low · action: approve closeout for downstream use.</span>
          </div>
        </div>

        <div className="audit-report-meta" aria-label="OKR audit report metadata">
          <span><strong>Tier</strong> supervised</span>
          <span><strong>BAR</strong> APP-IMDB-002</span>
          <span><strong>Owner</strong> maintainabilityai</span>
          <span><strong>Completed</strong> 2026-05-25</span>
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
              <em>WHY, HOW, and WHAT tied together by chain roots.</em>
            </div>
            <table className="audit-report-table">
              <thead>
                <tr><th>Phase</th><th>PR</th><th>Chain root</th></tr>
              </thead>
              <tbody>
                {phases.map(phase => (
                  <tr key={phase.phase}>
                    <td>{phase.phase}</td>
                    <td><a href={phase.prUrl} target="_blank" rel="noopener noreferrer">{phase.pr}</a></td>
                    <td><code>{phase.chainRoot}</code></td>
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
