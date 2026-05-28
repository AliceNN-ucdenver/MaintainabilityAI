import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDesignFanOut, writeDesignFanOut } from '../designFanOutFile';
import type { DesignFanOutDoc } from '../types';

/**
 * D-PR4 sub-PR 6 — writer + reader round-trip for design-fan-out.yaml.
 *
 * The writer hand-rolls YAML to keep diffs predictable; the reader
 * uses the standard yaml package. These tests prove the round-trip
 * is loss-less for every field on DesignFanOutRow, and that the
 * reader's defensive checks return null on the documented failure
 * shapes (missing file, mismatched okrId, malformed rows).
 */

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fanout-file-test-'));
});

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeDesignFanOut + readDesignFanOut', () => {
  it('round-trips a single ready→opened row', () => {
    const doc: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-2026Q3-IMDB-002-celeb-api',
      rows: [
        {
          repo: 'acme/celeb-api',
          status: 'opened',
          landingIssueUrl: 'https://github.com/acme/celeb-api/issues/42',
          openedAt: '2026-05-27T18:00:00.000Z',
          updatedAt: '2026-05-27T18:00:00.000Z',
        },
      ],
    };
    writeDesignFanOut(tmpDir, doc);

    const read = readDesignFanOut(tmpDir, 'OKR-2026Q3-IMDB-002-celeb-api');
    expect(read).not.toBeNull();
    expect(read!.okrId).toBe('OKR-2026Q3-IMDB-002-celeb-api');
    expect(read!.rows).toHaveLength(1);
    expect(read!.rows[0]).toEqual({
      repo: 'acme/celeb-api',
      status: 'opened',
      landingIssueUrl: 'https://github.com/acme/celeb-api/issues/42',
      openedAt: '2026-05-27T18:00:00.000Z',
      updatedAt: '2026-05-27T18:00:00.000Z',
      reason: undefined,
      repo_created: false,
      implPrUrl: undefined,
      implementation_run_id: undefined,
    });
  });

  it('round-trips greenfield row with repo_created + impl PR state', () => {
    const doc: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-XYZ',
      rows: [
        {
          repo: 'acme/brand-new',
          status: 'pr-merged',
          landingIssueUrl: 'https://github.com/acme/brand-new/issues/1',
          repo_created: true,
          implPrUrl: 'https://github.com/acme/brand-new/pull/2',
          implementation_run_id: 'IMPL-2026-05-27-celeb-api-abc123',
          openedAt: '2026-05-27T18:00:00.000Z',
          updatedAt: '2026-05-27T19:30:00.000Z',
        },
      ],
    };
    writeDesignFanOut(tmpDir, doc);

    const read = readDesignFanOut(tmpDir, 'OKR-XYZ');
    expect(read).not.toBeNull();
    expect(read!.rows[0].repo_created).toBe(true);
    expect(read!.rows[0].implPrUrl).toBe('https://github.com/acme/brand-new/pull/2');
    expect(read!.rows[0].implementation_run_id).toBe('IMPL-2026-05-27-celeb-api-abc123');
    expect(read!.rows[0].status).toBe('pr-merged');
  });

  it('round-trips multi-row doc with mixed statuses', () => {
    const doc: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-MULTI',
      rows: [
        { repo: 'acme/zeta', status: 'pending-on-upstream', reason: 'Waiting on foundation', updatedAt: 'T1' },
        { repo: 'acme/alpha', status: 'opened', landingIssueUrl: 'https://gh/a/1', openedAt: 'T0', updatedAt: 'T0' },
        { repo: 'acme/mid', status: 'harness-missing', reason: 'No agent.md', updatedAt: 'T2' },
      ],
    };
    writeDesignFanOut(tmpDir, doc);

    // Verify on-disk YAML preserves what we wrote.
    const filePath = path.join(tmpDir, 'okrs', 'OKR-MULTI', 'what', 'design-fan-out.yaml');
    const text = fs.readFileSync(filePath, 'utf8');
    expect(text).toContain('repo: acme/zeta');
    expect(text).toContain('repo: acme/alpha');
    expect(text).toContain('repo: acme/mid');

    const read = readDesignFanOut(tmpDir, 'OKR-MULTI');
    expect(read!.rows).toHaveLength(3);
    expect(read!.rows.map(r => r.repo)).toEqual(['acme/zeta', 'acme/alpha', 'acme/mid']);
  });

  it('preserves reasons containing special chars (quotes, colons, dashes)', () => {
    const doc: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-Q',
      rows: [
        {
          repo: 'acme/api',
          status: 'permission-blocked',
          reason: `PAT lacks "issues:write" on acme/api — fix Settings → Secrets.`,
          updatedAt: 'T0',
        },
      ],
    };
    writeDesignFanOut(tmpDir, doc);
    const read = readDesignFanOut(tmpDir, 'OKR-Q');
    expect(read!.rows[0].reason).toBe(
      `PAT lacks "issues:write" on acme/api — fix Settings → Secrets.`,
    );
  });

  it('returns null when file does not exist', () => {
    expect(readDesignFanOut(tmpDir, 'OKR-NO-FILE')).toBeNull();
  });

  it('returns null on okrId mismatch (defensive)', () => {
    const filePath = path.join(tmpDir, 'okrs', 'OKR-ASKING', 'what', 'design-fan-out.yaml');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `schema: 1\nokrId: OKR-DIFFERENT\nrows: []\n`);
    expect(readDesignFanOut(tmpDir, 'OKR-ASKING')).toBeNull();
  });

  it('returns null on malformed YAML', () => {
    const filePath = path.join(tmpDir, 'okrs', 'OKR-BAD', 'what', 'design-fan-out.yaml');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `this is: not: valid: yaml: {{{[[\n`);
    expect(readDesignFanOut(tmpDir, 'OKR-BAD')).toBeNull();
  });

  it('skips rows missing repo or status keys silently (best-effort recovery)', () => {
    const filePath = path.join(tmpDir, 'okrs', 'OKR-PART', 'what', 'design-fan-out.yaml');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      `schema: 1
okrId: OKR-PART
rows:
  - repo: acme/good
    status: opened
    landingIssueUrl: https://gh/g/1
  - status: opened   # missing repo
    landingIssueUrl: https://gh/x/1
  - repo: acme/no-status   # missing status
    landingIssueUrl: https://gh/n/1
`,
    );
    const read = readDesignFanOut(tmpDir, 'OKR-PART');
    expect(read).not.toBeNull();
    expect(read!.rows).toHaveLength(1);
    expect(read!.rows[0].repo).toBe('acme/good');
  });

  it('overwrites prior file on second write (caller is responsible for merging)', () => {
    const first: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-OVR',
      rows: [{ repo: 'acme/api', status: 'opened', updatedAt: 'T0' }],
    };
    writeDesignFanOut(tmpDir, first);
    const second: DesignFanOutDoc = {
      schema: 1,
      okrId: 'OKR-OVR',
      rows: [{ repo: 'acme/api', status: 'pr-merged', updatedAt: 'T1' }],
    };
    writeDesignFanOut(tmpDir, second);

    const read = readDesignFanOut(tmpDir, 'OKR-OVR');
    expect(read!.rows[0].status).toBe('pr-merged');
    expect(read!.rows[0].updatedAt).toBe('T1');
  });
});
