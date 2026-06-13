/**
 * @maintainabilityai/research-runner CLI entry.
 *
 * The runner is the deterministic **skill-rails** backend for the agentic-SDLC
 * Skills surface declared in `vscode-extension/code-templates/skills/<name>/
 * SKILL.md`. Every subcommand is `skill-<name>`: it reads a JSON object from
 * stdin, does pure/deterministic work (mesh reads, search APIs, self-review
 * gating, audit-chain emit/verify, Pocket Watch drift), and writes JSON to
 * stdout. The calling Copilot agent — dispatched by Looking Glass via
 * `assignCustomCopilotAgent`, NOT by this CLI — invokes them with
 * `npx -y @maintainabilityai/research-runner@<pin> skill-<name>`.
 *
 * Retired 2026-06-13: the former `archeologist` (research) and `prd`
 * (PRD) **LLM-generation** pipelines — and the in-runner `llm-router` /
 * `callLlm` path they drove — were removed. Research / PRD / design
 * *generation* now runs entirely on the Copilot Coding Agent personas
 * (`.github/agents/<name>.agent.md`); the runner's job is the deterministic
 * skill rails those agents call. There is intentionally no local LLM escape
 * hatch. See `vscode-extension/design/cheshire-cat-maintenance-agent.md`
 * ("Future cleanup — resolved").
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isSkillName, readStdin, runSkill, SKILLS } from './runner/skills';

const PKG = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

function abort(msg: string, code = 1): never {
  process.stderr.write(`research-runner: ${msg}\n`);
  process.exit(code);
}

function help(): void {
  const skillNames = Object.keys(SKILLS).map(n => `skill-${n}`).sort().join('\n  ');
  process.stdout.write(`research-runner v${PKG.version}

The runner is skill-only. Each subcommand reads JSON from stdin and writes
JSON to stdout; the assigned Copilot agent invokes them.

Usage:
  research-runner skill-<name>   # one-shot skill subcommand
  echo '{"...":...}' | npx -y @maintainabilityai/research-runner@~0.1.0 skill-<name>

Skills (declared by .agent.md tools: blocks under $MESH_PATH):
  ${skillNames}

See README.md for the per-skill input/output contracts.
`);
}

/**
 * skill-* dispatcher. Reads a JSON object from stdin, calls runSkill,
 * writes the result as JSON to stdout. Exits non-zero on `ok: false` so
 * the calling agent (or shell wrapper) can detect failure via exit code
 * in addition to the structured `{ok: false, reason}` payload.
 */
async function skillCmd(skillName: string): Promise<void> {
  if (!isSkillName(skillName)) {
    process.stdout.write(JSON.stringify({ ok: false, reason: `unknown-skill: ${skillName}` }) + '\n');
    process.exit(1);
  }
  const stdinRaw = await readStdin();
  let input: unknown = {};
  if (stdinRaw.trim().length > 0) {
    try {
      input = JSON.parse(stdinRaw);
    } catch (err) {
      process.stdout.write(JSON.stringify({ ok: false, reason: `bad-stdin-json: ${(err as Error).message}` }) + '\n');
      process.exit(1);
    }
  }
  const result = await runSkill(skillName, input);
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.ok === false) { process.exit(1); }
}

async function main(): Promise<void> {
  const [, , subcommand] = process.argv;
  if (subcommand && subcommand.startsWith('skill-')) {
    await skillCmd(subcommand.slice('skill-'.length));
    return;
  }
  switch (subcommand) {
    case 'help':
    case '--help':
    case '-h':
    case undefined:      help(); break;
    case '--version':
    case '-v':           process.stdout.write(`${PKG.version}\n`); break;
    case 'archeologist':
    case 'prd':
      abort(`subcommand "${subcommand}" was retired — research/PRD generation now runs on the Copilot agent personas, not the runner. The runner is skill-only; run \`research-runner help\` for the skill surface.`);
      break;
    default:             abort(`unknown subcommand: ${subcommand} (the runner is skill-only; run \`research-runner help\`)`);
  }
}

main().catch(err => {
  process.stderr.write(`research-runner: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
