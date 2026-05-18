/**
 * @maintainabilityai/research-runner CLI entry.
 *
 * Two subcommands: `archeologist` (research pipeline) and `prd` (PRD pipeline).
 * Parses argv into a typed brief, runs the orchestrator, prints structured
 * outputs that the calling GitHub Action consumes via `core.setOutput`.
 *
 * Zero dep on a CLI framework — argv parsing is hand-rolled to keep the
 * package small. The flag surface is fixed by the design doc and shouldn't
 * grow without intent.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ResearchBrief, PrdBrief } from './schemas';
import { runArcheologist } from './runner/archeologist';
import { runPrd } from './runner/prd';

const PKG = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

interface ParsedFlags {
  brief?: string;
  scope_level?: string;
  scope_id?: string;
  path?: string;
  target_repo?: string;
  guardrails?: string;
  research_pr?: string;
  mode?: string;
  grounding?: string;
  max_iterations?: string;
  output?: string;
  audit?: string;
  emit_issue_body?: string;
  emit_pr_body?: string; // retained for PRD subcommand which still opens PRs
  mesh?: string;
  llm_provider?: string;
}

function parseFlags(argv: string[]): ParsedFlags {
  const flags: ParsedFlags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { continue; }
    const key = arg.slice(2).replace(/-/g, '_') as keyof ParsedFlags;
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      // boolean flag — not used yet
      continue;
    }
    flags[key] = value;
    i++;
  }
  return flags;
}

function emitGithubOutput(outputs: Record<string, string | number>): void {
  // Run inside GitHub Actions, write to GITHUB_OUTPUT so `steps.<id>.outputs.*` works.
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (!githubOutput) { return; }
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
  fs.appendFileSync(githubOutput, lines.join('\n') + '\n', 'utf8');
}

function abort(msg: string, code = 1): never {
  process.stderr.write(`research-runner: ${msg}\n`);
  process.exit(code);
}

async function archeologistCmd(argv: string[]): Promise<void> {
  const flags = parseFlags(argv);
  if (!flags.brief) { abort('--brief is required'); }
  if (!flags.scope_level) { abort('--scope-level is required'); }
  if (!flags.scope_id) { abort('--scope-id is required (portfolio scope was removed; pass platform slug or BAR id)'); }

  const briefInput: Partial<ResearchBrief> = {
    topic: flags.brief,
    scope: {
      level: flags.scope_level as ResearchBrief['scope']['level'],
      id: flags.scope_id,
    },
    path: (flags.path as ResearchBrief['path']) || 'research',
    target_repo: flags.target_repo || undefined,
    guardrails: (flags.guardrails as ResearchBrief['guardrails']) || 'default',
    llm_provider: (flags.llm_provider as ResearchBrief['llm_provider']) || undefined,
    trigger: {
      kind: process.env.GITHUB_ACTIONS === 'true' ? 'workflow_dispatch' : 'local_dev',
      actor: process.env.GITHUB_ACTOR,
    },
  };

  const result = await runArcheologist({
    brief: briefInput,
    meshDir: flags.mesh ? path.resolve(flags.mesh) : process.cwd(),
    outputDir: flags.output || 'research',
    auditDir: flags.audit || '.research-audit',
    emitIssueBodyPath: flags.emit_issue_body,
    agentVersion: PKG.version,
  });

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  emitGithubOutput({
    run_id: result.run_id,
    topic: result.topic,
    artifact_path: result.artifact_path,
    chain_root_hash: result.chain_root_hash,
    issue_body_path: result.issue_body_path || '',
  });
}

async function prdCmd(argv: string[]): Promise<void> {
  const flags = parseFlags(argv);
  if (!flags.research_pr) { abort('--research-pr is required'); }
  if (!flags.scope_level) { abort('--scope-level is required'); }
  if (!flags.scope_id) { abort('--scope-id is required (portfolio scope was removed; pass platform slug or BAR id)'); }

  const isUrl = /^https?:\/\//.test(flags.research_pr);

  const briefInput: Partial<PrdBrief> = {
    research_source: isUrl
      ? { kind: 'pr', url: flags.research_pr }
      : { kind: 'path', relative_path: flags.research_pr },
    scope: {
      level: flags.scope_level as PrdBrief['scope']['level'],
      id: flags.scope_id,
    },
    mode: (flags.mode as PrdBrief['mode']) || 'deep',
    grounding: (flags.grounding as PrdBrief['grounding']) || 'default',
    max_iterations: flags.max_iterations ? parseInt(flags.max_iterations, 10) : 3,
    llm_provider: (flags.llm_provider as PrdBrief['llm_provider']) || undefined,
    trigger: {
      kind: process.env.GITHUB_ACTIONS === 'true' ? 'workflow_dispatch' : 'local_dev',
      actor: process.env.GITHUB_ACTOR,
    },
  };

  const result = await runPrd({
    brief: briefInput,
    meshDir: flags.mesh ? path.resolve(flags.mesh) : process.cwd(),
    outputDir: flags.output || 'prds',
    auditDir: flags.audit || '.research-audit',
    emitPrBodyPath: flags.emit_pr_body,
    agentVersion: PKG.version,
  });

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  emitGithubOutput({
    run_id: result.run_id,
    topic: result.topic,
    artifact_path: result.artifact_path,
    chain_root_hash: result.chain_root_hash,
    pr_body_path: result.pr_body_path || '',
    final_score: result.final_score,
    iterations: result.iterations,
  });
}

function help(): void {
  process.stdout.write(`research-runner v${PKG.version}

Usage:
  research-runner archeologist --brief "<topic>" --scope-level <platform|bar> --scope-id ID [--path research|archaeology] [...]
  research-runner prd --research-pr <url|path> --scope-level <platform|bar> --scope-id ID [...]

See README.md for the full flag surface.
`);
}

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;
  switch (subcommand) {
    case 'archeologist': await archeologistCmd(rest); break;
    case 'prd':          await prdCmd(rest); break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:      help(); break;
    case '--version':
    case '-v':           process.stdout.write(`${PKG.version}\n`); break;
    default:             abort(`unknown subcommand: ${subcommand}`);
  }
}

main().catch(err => {
  process.stderr.write(`research-runner: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
