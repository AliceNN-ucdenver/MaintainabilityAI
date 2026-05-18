/**
 * analyze_architecture — pure node (archaeology path), file-based variant.
 *
 * Phase 3a — no tree-sitter. Extracts:
 *   - RepositoryProfile (languages, frameworks, manifests, totals)
 *   - Modules (top-level src/ subdirectories or root dirs not in SKIP_DIRS),
 *     each tagged with an inferred layer (api / web / data / worker / shared)
 *   - Endpoints (regex-detected route handlers across the four most common
 *     frameworks: Express, FastAPI, Flask, Spring)
 *   - Dependencies (parsed from package.json, pyproject.toml requirements
 *     section, Cargo.toml [dependencies], go.mod require block)
 *
 * Heuristic, not authoritative. Tree-sitter integration (phase 3b) will
 * give us symbol-level accuracy; for now the synthesis prompt knows this
 * is a file-based pass and the audit log records `analyzer_version` so
 * an auditor can re-run with a deeper analyzer later.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Endpoint,
  Module,
  ObservedArchitecture,
  ObservedLayer,
  RepositoryProfile,
} from '../../schemas';
import type { FileInventory } from './clone-and-index';

export interface AnalyzeArchitectureOpts {
  cloneDir: string;
  targetRepo: string;
  cloneSha: string;
  inventory: FileInventory;
}

export const ANALYZER_VERSION = 'file-based-v1';

const LAYER_HINTS: Array<{ layer: ObservedLayer; patterns: RegExp[] }> = [
  { layer: 'api',    patterns: [/^api$/i, /^server$/i, /^backend$/i, /^routes$/i, /^controllers$/i, /^handlers$/i, /^endpoints$/i] },
  { layer: 'web',    patterns: [/^web$/i, /^frontend$/i, /^client$/i, /^ui$/i, /^app$/i, /^components$/i, /^pages$/i, /^views$/i] },
  { layer: 'data',   patterns: [/^db$/i, /^database$/i, /^models$/i, /^entities$/i, /^migrations$/i, /^prisma$/i, /^schemas?$/i] },
  { layer: 'worker', patterns: [/^workers?$/i, /^jobs$/i, /^cron$/i, /^queue$/i, /^tasks?$/i, /^consumers?$/i] },
  { layer: 'shared', patterns: [/^lib$/i, /^libs$/i, /^common$/i, /^shared$/i, /^utils?$/i, /^helpers$/i, /^core$/i, /^types$/i] },
];

const ENDPOINT_FILE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.java', '.kt']);

/** Walked-source file cap for endpoint scanning — keep audit cheap. */
const MAX_ENDPOINT_SCAN_FILES = 200;
/** Cap on returned endpoints (very chatty Express files can blow up). */
const MAX_ENDPOINTS = 80;

export function analyzeArchitecture(opts: AnalyzeArchitectureOpts): ObservedArchitecture {
  const { cloneDir, targetRepo, cloneSha, inventory } = opts;

  const languages = detectLanguages(inventory);
  const { frameworks, dependencies } = readManifests(cloneDir, inventory.rootManifests);

  const modules = detectModules(cloneDir, inventory);
  const endpoints = scanEndpoints(cloneDir);

  // Attribute endpoints back to their module (best-effort: longest matching prefix)
  const endpointsByModule = new Map<string, number>();
  for (const ep of endpoints) {
    const owner = modules
      .map(m => m.name)
      .filter(n => ep.file === n || ep.file.startsWith(`${n}/`) || ep.file.startsWith(`src/${n}/`))
      .sort((a, b) => b.length - a.length)[0];
    if (owner) {
      endpointsByModule.set(owner, (endpointsByModule.get(owner) ?? 0) + 1);
    }
  }
  for (const m of modules) {
    m.endpointCount = endpointsByModule.get(m.name) ?? 0;
  }

  const profile: RepositoryProfile = {
    slug: targetRepo,
    cloneSha,
    totalFiles: inventory.totalFiles,
    totalBytes: inventory.totalBytes,
    byExtension: inventory.byExtension,
    languages,
    frameworks,
    manifests: inventory.rootManifests,
  };

  return { profile, modules, endpoints, dependencies, deviations: [] };
}

// ============================================================================
// Language + framework detection
// ============================================================================

function detectLanguages(inventory: FileInventory): string[] {
  const langs = new Set<string>();
  const counts = inventory.byExtension;
  if ((counts['.ts'] ?? 0) + (counts['.tsx'] ?? 0) > 0) { langs.add('TypeScript'); }
  if ((counts['.js'] ?? 0) + (counts['.jsx'] ?? 0) + (counts['.mjs'] ?? 0) + (counts['.cjs'] ?? 0) > 0) { langs.add('JavaScript'); }
  if ((counts['.py'] ?? 0) > 0) { langs.add('Python'); }
  if ((counts['.java'] ?? 0) > 0) { langs.add('Java'); }
  if ((counts['.kt'] ?? 0) + (counts['.kts'] ?? 0) > 0) { langs.add('Kotlin'); }
  if ((counts['.go'] ?? 0) > 0) { langs.add('Go'); }
  if ((counts['.rs'] ?? 0) > 0) { langs.add('Rust'); }
  if ((counts['.rb'] ?? 0) > 0) { langs.add('Ruby'); }
  if ((counts['.php'] ?? 0) > 0) { langs.add('PHP'); }
  if ((counts['.cs'] ?? 0) > 0) { langs.add('C#'); }
  if ((counts['.swift'] ?? 0) > 0) { langs.add('Swift'); }
  if ((counts['.ex'] ?? 0) + (counts['.exs'] ?? 0) > 0) { langs.add('Elixir'); }
  return [...langs].sort();
}

interface ManifestExtract {
  frameworks: string[];
  dependencies: string[];
}

function readManifests(cloneDir: string, manifestNames: string[]): ManifestExtract {
  const frameworks = new Set<string>();
  const dependencies = new Set<string>();

  for (const name of manifestNames) {
    const full = path.join(cloneDir, name);
    let raw: string;
    try { raw = fs.readFileSync(full, 'utf8'); } catch { continue; }

    if (/^package\.json$/i.test(name)) {
      parsePackageJson(raw, frameworks, dependencies);
    } else if (/^pyproject\.toml$/i.test(name)) {
      parsePyproject(raw, frameworks, dependencies);
    } else if (/^requirements\.txt$/i.test(name)) {
      parseRequirementsTxt(raw, frameworks, dependencies);
    } else if (/^cargo\.toml$/i.test(name)) {
      parseCargoToml(raw, frameworks, dependencies);
    } else if (/^go\.mod$/i.test(name)) {
      parseGoMod(raw, frameworks, dependencies);
    } else if (/^pom\.xml$/i.test(name)) {
      parsePomXml(raw, frameworks, dependencies);
    } else if (/^gemfile$/i.test(name)) {
      parseGemfile(raw, frameworks, dependencies);
    }
  }

  return {
    frameworks: [...frameworks].sort().slice(0, 30),
    dependencies: [...dependencies].sort().slice(0, 60),
  };
}

const KNOWN_FRAMEWORK_PACKAGES: Record<string, string> = {
  // JS/TS
  express: 'express', '@nestjs/core': 'nestjs', fastify: 'fastify',
  next: 'next.js', react: 'react', vue: 'vue', '@angular/core': 'angular',
  svelte: 'svelte', remix: 'remix', '@remix-run/server-runtime': 'remix',
  koa: 'koa', hapi: 'hapi',
  // Python
  fastapi: 'fastapi', flask: 'flask', django: 'django', starlette: 'starlette',
  // Java/Kotlin
  'spring-boot-starter-web': 'spring-boot', 'spring-web': 'spring',
  // Go
  'github.com/gin-gonic/gin': 'gin', 'github.com/labstack/echo': 'echo',
  'github.com/gofiber/fiber': 'fiber',
  // Rust
  actix: 'actix-web', 'actix-web': 'actix-web', axum: 'axum', rocket: 'rocket',
  // Ruby
  rails: 'rails', sinatra: 'sinatra',
};

function classifyDep(dep: string, frameworks: Set<string>): void {
  const hit = KNOWN_FRAMEWORK_PACKAGES[dep.toLowerCase()];
  if (hit) { frameworks.add(hit); }
}

function parsePackageJson(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  try {
    const obj = JSON.parse(raw) as { dependencies?: Record<string, string> };
    const dependencies = obj.dependencies ?? {};
    for (const name of Object.keys(dependencies)) {
      deps.add(name);
      classifyDep(name, frameworks);
    }
  } catch { /* malformed package.json — skip */ }
}

function parsePyproject(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  // Lightweight: pick up `dependencies = ["fastapi >=0.100", …]` AND
  // `[tool.poetry.dependencies]` keys.
  const arrayMatch = raw.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    for (const m of arrayMatch[1].matchAll(/"\s*([a-zA-Z0-9_.-]+)/g)) {
      deps.add(m[1].toLowerCase());
      classifyDep(m[1].toLowerCase(), frameworks);
    }
  }
  const poetrySection = raw.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (poetrySection) {
    for (const m of poetrySection[1].matchAll(/^([a-zA-Z0-9_.-]+)\s*=/gm)) {
      const name = m[1].toLowerCase();
      if (name === 'python') { continue; }
      deps.add(name);
      classifyDep(name, frameworks);
    }
  }
}

function parseRequirementsTxt(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) { continue; }
    const m = trimmed.match(/^([a-zA-Z0-9_.-]+)/);
    if (m) {
      const name = m[1].toLowerCase();
      deps.add(name);
      classifyDep(name, frameworks);
    }
  }
}

function parseCargoToml(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  const section = raw.match(/\[dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (!section) { return; }
  for (const m of section[1].matchAll(/^([a-zA-Z0-9_.-]+)\s*=/gm)) {
    const name = m[1].toLowerCase();
    deps.add(name);
    classifyDep(name, frameworks);
  }
}

function parseGoMod(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  const requireBlock = raw.match(/require\s*\(([\s\S]*?)\)/);
  const body = requireBlock ? requireBlock[1] : raw;
  for (const m of body.matchAll(/^\s*([\w./-]+)\s+v[\d.+\-a-z]+/gm)) {
    const name = m[1].toLowerCase();
    deps.add(name);
    classifyDep(name, frameworks);
  }
}

function parsePomXml(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  for (const m of raw.matchAll(/<artifactId>([\w.-]+)<\/artifactId>/gi)) {
    const name = m[1].toLowerCase();
    deps.add(name);
    classifyDep(name, frameworks);
  }
}

function parseGemfile(raw: string, frameworks: Set<string>, deps: Set<string>): void {
  for (const m of raw.matchAll(/gem\s+["']([a-zA-Z0-9_.-]+)/g)) {
    const name = m[1].toLowerCase();
    deps.add(name);
    classifyDep(name, frameworks);
  }
}

// ============================================================================
// Module / layer detection
// ============================================================================

function detectModules(cloneDir: string, inventory: FileInventory): Module[] {
  const candidateDirs = new Set<string>();

  // Top-level directories (skipped already filtered by clone-and-index)
  for (const entry of inventory.topLevelEntries) {
    const full = path.join(cloneDir, entry);
    try {
      if (fs.statSync(full).isDirectory()) { candidateDirs.add(entry); }
    } catch { /* skip */ }
  }

  // Also walk src/* — many JS/TS repos hide structure there
  const srcDir = path.join(cloneDir, 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    try {
      for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (entry.isDirectory()) { candidateDirs.add(`src/${entry.name}`); }
      }
    } catch { /* skip */ }
  }

  const modules: Module[] = [];
  for (const name of candidateDirs) {
    const full = path.join(cloneDir, name);
    const fileCount = countFiles(full);
    if (fileCount === 0) { continue; }
    modules.push({
      name,
      layer: classifyLayer(name),
      fileCount,
      endpointCount: 0,                 // populated after endpoint scan
    });
  }

  return modules.sort((a, b) => b.fileCount - a.fileCount);
}

function classifyLayer(modulePath: string): ObservedLayer {
  const leaf = modulePath.split('/').pop()!.toLowerCase();
  for (const hint of LAYER_HINTS) {
    if (hint.patterns.some(re => re.test(leaf))) { return hint.layer; }
  }
  return 'unknown';
}

function countFiles(dir: string): number {
  let count = 0;
  function walk(d: string): void {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.isDirectory()) { walk(path.join(d, ent.name)); }
      else if (ent.isFile()) { count += 1; }
    }
  }
  walk(dir);
  return count;
}

// ============================================================================
// Endpoint regex scan
// ============================================================================

interface EndpointPattern {
  framework: string;
  re: RegExp;            // expects two captures: method + path
  /** When the framework's decorator captures method via the @Get/@Post name. */
  methodFromDecoratorPos?: number;
}

const ENDPOINT_PATTERNS: EndpointPattern[] = [
  // Express / Koa / Fastify shape: `app.get('/users/:id', ...)`
  { framework: 'express',  re: /\b(?:app|router|fastify|server)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)/gi },
  // FastAPI / Flask: `@app.get("/users/{id}")` / `@app.route("/x")`
  { framework: 'fastapi',  re: /@\w+\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)/gi },
  { framework: 'flask',    re: /@\w+\.route\s*\(\s*['"]([^'"]+)/gi, methodFromDecoratorPos: -1 },
  // Spring (Java/Kotlin): `@GetMapping("/users")` / `@RequestMapping(method=…, value="/x")`
  { framework: 'spring',   re: /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*['"]([^'"]+)/g },
];

function scanEndpoints(cloneDir: string): Endpoint[] {
  const found: Endpoint[] = [];
  let scanned = 0;

  function walk(dir: string): void {
    if (found.length >= MAX_ENDPOINTS) { return; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (found.length >= MAX_ENDPOINTS) { return; }
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build') { continue; }
        walk(full);
        continue;
      }
      if (!ent.isFile()) { continue; }
      if (!ENDPOINT_FILE_EXTS.has(path.extname(ent.name).toLowerCase())) { continue; }
      if (scanned >= MAX_ENDPOINT_SCAN_FILES) { continue; }
      scanned += 1;

      let content: string;
      try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
      const relFile = path.relative(cloneDir, full);

      for (const pat of ENDPOINT_PATTERNS) {
        // matchAll needs a global regex; reset lastIndex isn't an issue with matchAll
        for (const m of content.matchAll(pat.re)) {
          let method: string;
          let routePath: string;
          if (pat.methodFromDecoratorPos === -1) {
            // Flask: `@app.route("/x")` — method defaults to GET unless `methods=` is set
            method = 'GET';
            routePath = m[1];
          } else {
            method = (m[1] || '').toUpperCase();
            routePath = m[2];
          }
          if (!routePath) { continue; }
          found.push({ method, path: routePath, file: relFile, framework: pat.framework });
          if (found.length >= MAX_ENDPOINTS) { break; }
        }
        if (found.length >= MAX_ENDPOINTS) { break; }
      }
    }
  }

  walk(cloneDir);
  return found;
}
