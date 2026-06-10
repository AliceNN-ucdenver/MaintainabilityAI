import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'dist/extension.js',
  'dist/mcp-server.js',
  'dist/webview/main.js',
  'dist/webview/scorecard.js',
  'dist/webview/lookingGlass.js',
  'assets/icon.png',
  'assets/cheshire-activity-dark.svg',
  'prompt-packs/rabbit-hole/default.md',
  'prompt-packs/looking-glass/default.md',
  'code-templates/workflows/ci.yml',
  'code-templates/agents/security-reviewer.md',
  'code-templates/agents/architecture-reviewer.md',
];

const forbiddenPatterns = [
  /^src\//,
  /^test\//,
  /^scripts\//,
  /^design\//,
  /^node_modules\//,
  /^tsconfig.*\.json$/,
  /^knip\.json$/,
  /^DEMO_SCRIPT\.md$/,
  /\.map$/,
  /\.ts$/,
  /\.vsix$/,
];

function runVsce(args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return execFileSync(executable, ['vsce', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const listing = runVsce(['ls', '--no-dependencies']);
const files = listing.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const fileSet = new Set(files);

const missing = requiredFiles.filter(file => !fileSet.has(file));
const forbidden = files.filter(file => forbiddenPatterns.some(pattern => pattern.test(file)));

if (missing.length > 0 || forbidden.length > 0) {
  const details = [
    missing.length > 0 ? `Missing required package files:\n${missing.join('\n')}` : '',
    forbidden.length > 0 ? `Forbidden package files:\n${forbidden.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
  throw new Error(details);
}

const tmpRoot = path.join(tmpdir(), 'maintainabilityai-vsix-check');
mkdirSync(tmpRoot, { recursive: true });
const vsixPath = path.join(tmpRoot, 'maintainabilityai-quality.vsix');

try {
  runVsce(['package', '--no-dependencies', '--out', vsixPath]);
  if (!existsSync(vsixPath)) {
    throw new Error(`VSIX was not created at ${vsixPath}`);
  }
  const sizeBytes = statSync(vsixPath).size;
  const maxSizeBytes = 12 * 1024 * 1024;
  if (sizeBytes > maxSizeBytes) {
    throw new Error(`VSIX size ${sizeBytes} exceeds ${maxSizeBytes} byte package budget`);
  }
  console.log(`Package check passed: ${files.length} files, ${(sizeBytes / 1024 / 1024).toFixed(2)} MB VSIX`);
} finally {
  rmSync(vsixPath, { force: true });
}
