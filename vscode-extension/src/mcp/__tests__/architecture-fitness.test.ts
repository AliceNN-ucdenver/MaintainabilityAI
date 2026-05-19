import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

interface SourceFileInfo {
  relativePath: string;
  absolutePath: string;
  text: string;
  ast: ts.SourceFile;
}

interface ImportRef {
  file: string;
  specifier: string;
  resolved?: string;
}

interface ComplexityFinding {
  file: string;
  line: number;
  name: string;
  complexity: number;
  budget: number;
}

interface DuplicateWindow {
  fingerprint: string;
  locations: Array<{ file: string; line: number }>;
}

const SRC_ROOT = path.resolve(__dirname, '../..');
const EXCLUDED_DIRS = new Set(['__tests__', 'fixtures']);
const ENTRY_POINTS = [
  'extension.ts',
  'mcp/server.ts',
  'webview/app/main.ts',
  'webview/app/scorecard.ts',
  'webview/app/lookingGlass.ts',
  'webview/app/oraculum.ts',
];

// Ratchet budgets: current hotspots are explicit so new complexity cannot hide.
const DEFAULT_COMPLEXITY_BUDGET = 40;
const FILE_COMPLEXITY_BUDGETS: Record<string, number> = {
  // Ratcheted upward when the Research Settings panel landed (5 new message
  // cases with conditional bodies; 5 new dispatcher branches), then again
  // when the "push secret to mesh + all linked code repos" affordance added
  // a new button handler in the webview + a new push-to-all handler in the
  // extension panel. Bumped once more when promptResearchSecret was added
  // for the showInputBox round-trip (window.prompt is unreliable in some
  // webview builds). And again when createResearchSecret landed for the
  // GMT guided-create flow.
  'webview/app/lookingGlass.ts': 221,
  'webview/LookingGlassPanel.ts': 111,
  'webview/app/main.ts': 56,
  'services/CalmWriteService.ts': 52,
  'webview/app/oraculum.ts': 48,
};

const INTENTIONAL_STANDALONE_MODULES = new Set([
  // Source-of-truth implementation mirrored into generated .redqueen/consensus.js.
  'mcp/utils/consensus.ts',
]);

const CORE_APPROVED_DOMAIN_SERVICES = new Set([
  'services/BarService.ts',
  'services/CapabilityModelService.ts',
  'services/GovernanceScorer.ts',
]);

const NODE_BUILTINS_FORBIDDEN_IN_WEBVIEW = new Set([
  'child_process',
  'crypto',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'stream',
  'tls',
  'zlib',
  'node:child_process',
  'node:crypto',
  'node:fs',
  'node:http',
  'node:https',
  'node:net',
  'node:os',
  'node:path',
  'node:stream',
  'node:tls',
  'node:zlib',
]);

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function listSourceFiles(dir = SRC_ROOT): SourceFileInfo[] {
  const files: SourceFileInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...listSourceFiles(path.join(dir, entry.name)));
      }
      continue;
    }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) {
      continue;
    }
    const absolutePath = path.join(dir, entry.name);
    const relativePath = toPosix(path.relative(SRC_ROOT, absolutePath));
    const text = fs.readFileSync(absolutePath, 'utf8');
    const scriptKind = entry.name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    files.push({
      relativePath,
      absolutePath,
      text,
      ast: ts.createSourceFile(absolutePath, text, ts.ScriptTarget.Latest, true, scriptKind),
    });
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function resolveRelativeImport(fromFile: string, specifier: string, knownFiles: Set<string>): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.posix.join(base, 'index.ts'),
    path.posix.join(base, 'index.tsx'),
  ];
  return candidates.find(candidate => knownFiles.has(candidate));
}

function collectImports(files: SourceFileInfo[]): ImportRef[] {
  const knownFiles = new Set(files.map(file => file.relativePath));
  const imports: ImportRef[] = [];

  for (const file of files) {
    const visit = (node: ts.Node): void => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        imports.push({
          file: file.relativePath,
          specifier,
          resolved: resolveRelativeImport(file.relativePath, specifier, knownFiles),
        });
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text;
        imports.push({
          file: file.relativePath,
          specifier,
          resolved: resolveRelativeImport(file.relativePath, specifier, knownFiles),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(file.ast);
  }

  return imports;
}

function isFunctionLike(node: ts.Node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
}

function functionName(node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration, sourceFile: ts.SourceFile): string {
  if ('name' in node && node.name) {
    return node.name.getText(sourceFile);
  }
  return '<anonymous>';
}

function cyclomaticComplexity(node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration): number {
  let complexity = 1;

  function visit(child: ts.Node): void {
    if (child !== node && isFunctionLike(child)) {
      return;
    }

    switch (child.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        complexity += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const binary = child as ts.BinaryExpression;
        if (
          binary.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          binary.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          binary.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
          complexity += 1;
        }
        break;
      }
      default:
        break;
    }

    ts.forEachChild(child, visit);
  }

  if (node.body) {
    visit(node.body);
  }
  return complexity;
}

function collectComplexityFindings(files: SourceFileInfo[]): ComplexityFinding[] {
  const findings: ComplexityFinding[] = [];

  for (const file of files) {
    const visit = (node: ts.Node): void => {
      if (isFunctionLike(node) && node.body) {
        const complexity = cyclomaticComplexity(node);
        const budget = FILE_COMPLEXITY_BUDGETS[file.relativePath] ?? DEFAULT_COMPLEXITY_BUDGET;
        const position = file.ast.getLineAndCharacterOfPosition(node.getStart(file.ast));
        if (complexity > budget) {
          findings.push({
            file: file.relativePath,
            line: position.line + 1,
            name: functionName(node, file.ast),
            complexity,
            budget,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file.ast);
  }

  return findings;
}

function normalizeDuplicateLine(line: string): string {
  return line
    .trim()
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, 'STR')
    .replace(/\b\d+(?:\.\d+)?\b/g, 'NUM')
    .replace(/\s+/g, ' ');
}

function collectDuplicateWindows(files: SourceFileInfo[], windowSize = 10): DuplicateWindow[] {
  const windows = new Map<string, Array<{ file: string; line: number }>>();
  const ignoredLines = new Set(['', '{', '}', '},', '});', '];']);

  for (const file of files) {
    const lines = file.text.split(/\r?\n/).map(normalizeDuplicateLine);
    for (let index = 0; index <= lines.length - windowSize; index += 1) {
      const window = lines.slice(index, index + windowSize);
      if (window.some(line => ignoredLines.has(line) || line.startsWith('//'))) {
        continue;
      }
      const fingerprint = window.join('\n');
      if (fingerprint.length < 240) {
        continue;
      }
      const locations = windows.get(fingerprint) ?? [];
      locations.push({ file: file.relativePath, line: index + 1 });
      windows.set(fingerprint, locations);
    }
  }

  return Array.from(windows.entries())
    .map(([fingerprint, locations]) => ({ fingerprint, locations }))
    .filter(window => new Set(window.locations.map(location => location.file)).size > 1);
}

function isAllowedDuplicate(window: DuplicateWindow): boolean {
  const files = Array.from(new Set(window.locations.map(location => location.file)));
  if (files.every(file => file.startsWith('templates/'))) {
    return true;
  }
  if (files.every(file => file === 'webview/app/types.ts' || file.startsWith('types/'))) {
    return true;
  }
  if (files.every(file => file === 'mcp/resources.ts' || file === 'mcp/tools.ts')) {
    return true;
  }
  if (files.every(file => /^webview\/app\/reactflow\/nodes\/[A-Za-z]+Node\.tsx$/.test(file))) {
    return true;
  }
  if (files.every(file => file === 'webview/app/scorecard.ts' || file === 'webview/ScaffoldPanel.ts')) {
    return true;
  }
  return false;
}

function formatList(items: string[]): string {
  return items.length === 0 ? 'none' : items.join('\n');
}

const sourceFiles = listSourceFiles();
const imports = collectImports(sourceFiles);

describe('architecture fitness functions', () => {
  it('keeps production modules reachable from declared extension, MCP, and webview entry points', () => {
    const graph = new Map<string, string[]>();
    for (const file of sourceFiles) {
      graph.set(file.relativePath, []);
    }
    for (const importRef of imports) {
      if (importRef.resolved) {
        graph.get(importRef.file)?.push(importRef.resolved);
      }
    }

    const reachable = new Set<string>();
    const stack = [...ENTRY_POINTS];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || reachable.has(current)) {
        continue;
      }
      reachable.add(current);
      for (const dependency of graph.get(current) ?? []) {
        stack.push(dependency);
      }
    }

    const unreachable = sourceFiles
      .map(file => file.relativePath)
      .filter(file => !reachable.has(file) && !INTENTIONAL_STANDALONE_MODULES.has(file));

    expect(unreachable, `Unreachable production modules:\n${formatList(unreachable)}`).toEqual([]);
  });

  it('keeps architectural import boundaries intact', () => {
    const violations: string[] = [];

    for (const importRef of imports) {
      const { file, specifier, resolved } = importRef;

      if ((file.startsWith('mcp/') || file.startsWith('core/')) && specifier === 'vscode') {
        violations.push(`${file} imports vscode`);
      }

      if (
        file.startsWith('core/') &&
        resolved &&
        /^(commands|mcp|services|views|webview)\//.test(resolved) &&
        !CORE_APPROVED_DOMAIN_SERVICES.has(resolved)
      ) {
        violations.push(`${file} imports upward into ${resolved}`);
      }

      if (file.startsWith('mcp/') && resolved && /^(commands|views|webview)\//.test(resolved)) {
        violations.push(`${file} imports extension UI module ${resolved}`);
      }

      if (file.startsWith('mcp/') && resolved?.startsWith('services/') && resolved !== 'services/RedQueenService.ts') {
        violations.push(`${file} imports service module ${resolved}; MCP may only depend on RedQueenService`);
      }

      if (file.startsWith('services/') && resolved && /^(commands|views|webview)\//.test(resolved)) {
        violations.push(`${file} imports UI/controller module ${resolved}`);
      }

      if (file.startsWith('webview/app/') && NODE_BUILTINS_FORBIDDEN_IN_WEBVIEW.has(specifier)) {
        violations.push(`${file} imports Node-only module ${specifier}`);
      }

      if (file === 'services/RedQueenService.ts' && specifier === 'vscode') {
        violations.push('RedQueenService must remain VS Code-free for MCP reuse');
      }
    }

    expect(violations, `Import boundary violations:\n${formatList(violations)}`).toEqual([]);
  });

  it('keeps cyclomatic complexity under ratcheted module budgets', () => {
    const findings = collectComplexityFindings(sourceFiles)
      .map(finding => `${finding.file}:${finding.line} ${finding.name} complexity ${finding.complexity} > budget ${finding.budget}`);

    expect(findings, `Complexity budget violations:\n${formatList(findings)}`).toEqual([]);
  });

  it('prevents unreviewed large duplicate code blocks', () => {
    const unexpectedDuplicates = collectDuplicateWindows(sourceFiles)
      .filter(window => !isAllowedDuplicate(window))
      .slice(0, 20)
      .map(window => {
        const files = Array.from(new Set(window.locations.map(location => location.file))).join(', ');
        const locations = window.locations.slice(0, 4).map(location => `${location.file}:${location.line}`).join(', ');
        return `${files} at ${locations}`;
      });

    expect(unexpectedDuplicates, `Unexpected duplicate code windows:\n${formatList(unexpectedDuplicates)}`).toEqual([]);
  });
});
