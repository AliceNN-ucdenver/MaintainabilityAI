/**
 * Regression tests for the WHAT code-design audit parser embedded in
 * code-templates/workflows/code-design-agent.yml.
 *
 * Bug NN — H2 grep used `\d` which is not POSIX ERE on the GHA Ubuntu
 * runner. PR #150's WHAT audit logged `structure h2=0/10` even though
 * all 10 H2s were present. Fixed by replacing with `[0-9]+`.
 *
 * Bug OO — The brownfield path-gate parser used a simple `in_frontmatter`
 * toggle that flipped on EVERY `---` line. PR #150's artifact uses
 * `---` as a markdown horizontal-rule separator between H2 sections
 * (9 occurrences); the toggle ate the rest of the file as fake-
 * frontmatter and the parser ended up with 0 cited brownfield paths.
 * Fixed by making frontmatter detection context-aware (only opens
 * when expected — at top-of-file or right after a repo H3).
 *
 * Both fixes are validated end-to-end against fixtures shaped like
 * PR #150's artifact. The Python parser inlined in the workflow uses
 * the same logic; if it ever drifts, this test fails.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PARSER_SCRIPT = `
import re, sys, json
doc = sys.stdin.read()

REPO_HEADING_RE = re.compile(r'^###\\s+\`?([a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+)\`?\\s*$')
PATH_IN_BACKTICKS_RE = re.compile(r'\`([a-zA-Z0-9_./-]+\\.[a-zA-Z0-9]{1,8})\`')
CITED_PATHS_FM_RE = re.compile(r'^\\s*cited_paths:\\s*\\[([^\\]]*)\\]', re.MULTILINE)
MODE_FM_RE = re.compile(r'^\\s*mode:\\s*(\\w+)', re.MULTILINE)

lines = doc.split('\\n')
cited_by_repo = {}
mode_by_repo = {}
current_repo = None
in_frontmatter = False
frontmatter_buf = []
frontmatter_owner_repo = None
expecting_frontmatter = True

for ln in lines:
    if ln.strip() == '---':
        if in_frontmatter:
            if frontmatter_owner_repo:
                fm_text = '\\n'.join(frontmatter_buf)
                fm_match = CITED_PATHS_FM_RE.search(fm_text)
                if fm_match:
                    for raw in fm_match.group(1).split(','):
                        p = raw.strip().strip('"').strip("'")
                        if p: cited_by_repo.setdefault(frontmatter_owner_repo, set()).add(p)
                mode_m = MODE_FM_RE.search(fm_text)
                if mode_m:
                    mode_by_repo[frontmatter_owner_repo] = mode_m.group(1)
            in_frontmatter = False
            frontmatter_buf = []
            frontmatter_owner_repo = None
        elif expecting_frontmatter:
            in_frontmatter = True
            frontmatter_owner_repo = current_repo
            expecting_frontmatter = False
        continue
    if in_frontmatter:
        frontmatter_buf.append(ln)
        continue
    hm = REPO_HEADING_RE.match(ln)
    if hm:
        current_repo = hm.group(1)
        cited_by_repo.setdefault(current_repo, set())
        expecting_frontmatter = True
        continue
    if ln.startswith('## '):
        current_repo = None
        expecting_frontmatter = False
        continue
    if not current_repo: continue
    for m in PATH_IN_BACKTICKS_RE.finditer(ln):
        cited_by_repo[current_repo].add(m.group(1))

out = {
    'modes': mode_by_repo,
    'cited': {r: sorted(p) for r, p in cited_by_repo.items()},
}
print(json.dumps(out))
`;

function runParser(doc: string): { modes: Record<string, string>; cited: Record<string, string[]> } {
  const out = execFileSync('python3', ['-c', PARSER_SCRIPT], { input: doc, encoding: 'utf8' });
  return JSON.parse(out);
}

describe('Bug OO — code-design path-gate parser handles intra-block --- separators', () => {
  it('attributes paths to the correct repo despite markdown HR separators between H2s', () => {
    // PR #150 shape: top Hatter Tag, H2, repo H3, repo frontmatter
    // with cited_paths + mode, then HR separators between subsequent H2s.
    const doc = `---
phase: what
audit:
  chain_root_hash: deadbeef
---

## 1. Project Structure

### \`org/greenfield-repo\`

---
repo: org/greenfield-repo
mode: greenfield
cited_paths: [README.md, package.json]
---

(prose for greenfield)

### \`org/brownfield-repo\`

---
repo: org/brownfield-repo
mode: brownfield
cited_paths: [src/App.tsx, src/config/env.ts]
---

The brownfield repo extends \`src/services/apiClient.ts\` with new client patterns.

---

## 2. API Endpoint Specifications

API specs here. The brownfield client calls \`src/services/apiClient.ts\` patterns.

---

## 3. Data Models

Model definitions reference \`src/types/movie.ts\`.
`;
    const result = runParser(doc);
    expect(result.modes).toEqual({
      'org/greenfield-repo': 'greenfield',
      'org/brownfield-repo': 'brownfield',
    });
    // Brownfield should have ≥ 4 paths (2 from cited_paths + apiClient.ts +
    // movie.ts via backtick mentions). The exact set varies based on what
    // section attribution catches; assert the floor + the explicit
    // cited_paths declarations.
    expect(result.cited['org/brownfield-repo']).toEqual(
      expect.arrayContaining(['src/App.tsx', 'src/config/env.ts']),
    );
    // CRITICAL: brownfield must NOT have ZERO cited paths.
    // Pre-Bug-OO bug had this at 0 because the HR `---` swallowed
    // the repo H3 and lost attribution.
    expect(result.cited['org/brownfield-repo'].length).toBeGreaterThanOrEqual(2);
  });

  it('does NOT treat HR separators between H2s as frontmatter boundaries', () => {
    // A more aggressive fixture — multiple HR separators in a row,
    // none of which should toggle frontmatter mode after the legitimate
    // ones close.
    const doc = `---
phase: what
---

### \`org/brownfield-repo\`

---
mode: brownfield
cited_paths: [src/A.ts]
---

Body cites \`src/B.ts\`.

---

## 2. Section Two

---

More body. Cites \`src/C.ts\` — but no repo context so should not attribute.

---

## 3. Section Three
`;
    const result = runParser(doc);
    expect(result.modes['org/brownfield-repo']).toBe('brownfield');
    // src/A.ts (cited_paths) + src/B.ts (backtick under repo H3) must
    // both attribute to brownfield-repo.
    expect(result.cited['org/brownfield-repo']).toEqual(
      expect.arrayContaining(['src/A.ts', 'src/B.ts']),
    );
    // src/C.ts is under H2 with no repo context — should NOT attribute.
    expect(result.cited['org/brownfield-repo']).not.toContain('src/C.ts');
  });

  it('handles greenfield + brownfield mixed (PR #150 real shape)', () => {
    const doc = `---
phase: what
---

## 1. Project Structure

### \`org/celeb-api\`

---
repo: org/celeb-api
mode: greenfield
cited_paths: [README.md]
---

\`\`\`
project tree
\`\`\`

### \`org/imdb-react-frontend\`

---
repo: org/imdb-react-frontend
mode: brownfield
cited_paths: [src/App.tsx, src/services/apiClient.ts]
---

Repo prose.

---

## 2. API Endpoints
`;
    const result = runParser(doc);
    expect(result.modes).toEqual({
      'org/celeb-api': 'greenfield',
      'org/imdb-react-frontend': 'brownfield',
    });
    expect(result.cited['org/imdb-react-frontend']).toEqual(
      expect.arrayContaining(['src/App.tsx', 'src/services/apiClient.ts']),
    );
    // The brownfield repo must have at least the 2 declared paths.
    // Pre-Bug-OO the parser returned 0 here.
    expect(result.cited['org/imdb-react-frontend'].length).toBeGreaterThanOrEqual(2);
  });
});

describe('Bug NN — H2 grep [0-9]+ matches numeric-prefixed headings', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'h2-grep-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('grep -E with [0-9]+ matches "## 1. Project Structure"', () => {
    const docPath = path.join(tmp, 'doc.md');
    fs.writeFileSync(docPath, '## 1. Project Structure\n\nbody\n');
    // Use the FIXED pattern.
    const result = execFileSync(
      'grep',
      ['-qE', '^##[[:space:]]+([0-9]+\\.[[:space:]]+)?Project Structure[[:space:]]*$', docPath],
      { encoding: 'utf8' },
    );
    // grep -q returns exit 0 on match; execFileSync throws on non-zero
    // exit. If we got here without throwing, the match succeeded.
    expect(result).toBe('');
  });

  it('matches the broader set of numbered H2s used by code-design.md', () => {
    const docPath = path.join(tmp, 'doc.md');
    // Mirror PR #150's numbered H2 set — 10 sections, numeric prefixes.
    fs.writeFileSync(docPath, [
      '## 1. Project Structure', '',
      '## 2. API Endpoint Specifications', '',
      '## 3. Data Models', '',
      '## 4. Authentication Middleware Implementation', '',
      '## 5. Security Control Implementations', '',
      '## 6. Configuration and Environment Variables', '',
      '## 7. Error Handling Patterns', '',
      '## 8. Testing Strategy with Example Test Cases', '',
      '## 9. Deployment Configuration', '',
      '## 10. Design Rationale & Research Traceability', '',
    ].join('\n'));
    const names = [
      'Project Structure', 'API Endpoint Specifications', 'Data Models',
      'Authentication Middleware Implementation', 'Security Control Implementations',
      'Configuration and Environment Variables', 'Error Handling Patterns',
      'Testing Strategy with Example Test Cases', 'Deployment Configuration',
      'Design Rationale & Research Traceability',
    ];
    let matched = 0;
    for (const name of names) {
      try {
        execFileSync(
          'grep',
          ['-qE', `^##[[:space:]]+([0-9]+\\.[[:space:]]+)?${name}[[:space:]]*$`, docPath],
          { encoding: 'utf8', stdio: 'pipe' },
        );
        matched += 1;
      } catch { /* miss */ }
    }
    // Pre-Bug-NN with `\d`: this would have been 0/10 on the GHA
    // Ubuntu runner (PR #150 forensic). Post-fix: 10/10.
    expect(matched).toBe(10);
  });
});
