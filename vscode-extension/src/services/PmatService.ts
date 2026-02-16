import { exec as execCb } from 'child_process';
import type { PmatComplexityResult, PmatTechDebtResult, PmatTechDebtFile } from '../types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  result: T;
  timestamp: number;
}

export class PmatService {
  private installedCache: boolean | null = null;
  private cargoInstalledCache: boolean | null = null;
  private complexityCache: CacheEntry<PmatComplexityResult | null> | null = null;
  private techDebtCache: CacheEntry<PmatTechDebtResult | null> | null = null;

  // --------------------------------------------------------------------------
  // Detection
  // --------------------------------------------------------------------------

  async isInstalled(): Promise<boolean> {
    if (this.installedCache !== null) {
      return this.installedCache;
    }

    try {
      // pmat --version should exit 0 and print version info
      // The npm stub exits 1 with an error, so this correctly detects it as not installed
      const output = await this.execShell('pmat --version');
      // Verify it's a real version output, not an error stub
      this.installedCache = /\d+\.\d+/.test(output);
    } catch {
      this.installedCache = false;
    }
    return this.installedCache;
  }

  async isCargoInstalled(): Promise<boolean> {
    if (this.cargoInstalledCache !== null) {
      return this.cargoInstalledCache;
    }

    try {
      await this.execShell('cargo --version');
      this.cargoInstalledCache = true;
    } catch {
      this.cargoInstalledCache = false;
    }
    return this.cargoInstalledCache;
  }

  // --------------------------------------------------------------------------
  // Install steps (each runs in a fresh terminal)
  // --------------------------------------------------------------------------

  // The crates.io aprender 0.25.4 is broken (missing source files). We clone
  // pmat from source, bump aprender to 0.25.9 (fixed on crates.io), and build
  // with a separate target dir to avoid stale `target` entries in the clone.
  private static readonly PMAT_INSTALL_SCRIPT = [
    'PMAT_TMP=$(mktemp -d)',
    'git clone https://github.com/paiml/paiml-mcp-agent-toolkit "$PMAT_TMP/pmat"',
    // Bump aprender to a working crates.io version
    "sed -i '' 's|^aprender = .*|aprender = \"0.25.9\"|' \"$PMAT_TMP/pmat/Cargo.toml\"",
    'export CARGO_TARGET_DIR="$PMAT_TMP/cargo-target"',
    'cargo install --path "$PMAT_TMP/pmat"',
    'rm -rf "$PMAT_TMP"',
    'echo pmat installed successfully',
  ].join(' && ');

  private static readonly PMAT_INSTALL_SCRIPT_WIN = [
    'set PMAT_TMP=%TEMP%\\pmat-build',
    'git clone https://github.com/paiml/paiml-mcp-agent-toolkit "%PMAT_TMP%"',
    // Bump aprender to a working crates.io version
    'powershell -Command "(Get-Content %PMAT_TMP%\\Cargo.toml) -replace \'^aprender = .*\', \'aprender = \\\"0.25.9\\\"\' | Set-Content %PMAT_TMP%\\Cargo.toml"',
    'set CARGO_TARGET_DIR=%PMAT_TMP%\\cargo-target',
    'cargo install --path "%PMAT_TMP%"',
    'rmdir /s /q "%PMAT_TMP%"',
    'echo pmat installed successfully',
  ].join(' && ');

  async getInstallSteps(): Promise<{ command: string; label: string }[]> {
    const hasCargo = await this.isCargoInstalled();
    const installCmd = process.platform === 'win32'
      ? PmatService.PMAT_INSTALL_SCRIPT_WIN
      : PmatService.PMAT_INSTALL_SCRIPT;

    if (hasCargo) {
      return [{ command: installCmd, label: 'Install pmat' }];
    }
    // Need Rust first in one terminal, then pmat in a fresh terminal
    // (cargo won't be on PATH until a new shell session)
    if (process.platform === 'win32') {
      return [
        { command: 'winget install Rustlang.Rustup', label: 'Install Rust' },
        { command: installCmd, label: 'Install pmat' },
      ];
    }
    return [
      { command: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y', label: 'Install Rust' },
      { command: installCmd, label: 'Install pmat' },
    ];
  }

  // --------------------------------------------------------------------------
  // Analysis commands
  // --------------------------------------------------------------------------

  async analyzeComplexity(workspacePath: string): Promise<PmatComplexityResult | null> {
    if (this.complexityCache && Date.now() - this.complexityCache.timestamp < CACHE_TTL_MS) {
      return this.complexityCache.result;
    }

    try {
      // --quiet suppresses emoji log lines so stdout is clean JSON
      const stdout = await this.execShell('pmat analyze complexity --format json --quiet', workspacePath);
      const parsed = JSON.parse(stdout);

      // pmat output: { summary: { summary: { total_functions, median_cyclomatic, max_cyclomatic, ... } }, violations: [...] }
      const summary = parsed.summary?.summary ?? parsed.summary ?? {};
      const violations = parsed.summary?.violations ?? [];

      // Build hotspots from cyclomatic violations sorted by value descending
      const cyclomaticViolations = violations
        .filter((v: Record<string, unknown>) => v.rule === 'cyclomatic-complexity')
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.value || 0) - Number(a.value || 0));

      const result: PmatComplexityResult = {
        averageComplexity: summary.median_cyclomatic ?? 0,
        maxComplexity: summary.max_cyclomatic ?? 0,
        totalFunctions: summary.total_functions ?? 0,
        hotspots: cyclomaticViolations.slice(0, 10).map((v: Record<string, unknown>) => ({
          file: String(v.file || ''),
          function: String(v.function || ''),
          complexity: Number(v.value || 0),
        })),
      };

      this.complexityCache = { result, timestamp: Date.now() };
      return result;
    } catch {
      this.complexityCache = { result: null, timestamp: Date.now() };
      return null;
    }
  }

  async analyzeTechDebt(workspacePath: string): Promise<PmatTechDebtResult | null> {
    if (this.techDebtCache && Date.now() - this.techDebtCache.timestamp < CACHE_TTL_MS) {
      return this.techDebtCache.result;
    }

    try {
      const stdout = await this.execShell('pmat analyze tdg --format json --quiet', workspacePath);
      const parsed = JSON.parse(stdout);

      // pmat output: { files: [...], average_score, total_files, grade_distribution: { A: n, B: n, ... } }
      const avgScore = parsed.average_score ?? 0;
      const totalFiles = parsed.total_files ?? 0;
      const gradeDist = parsed.grade_distribution ?? {};

      // Convert grade distribution to categories with readable names
      const gradeLabel = (g: string): string => {
        const map: Record<string, string> = {
          APLus: 'A+', A: 'A', AMinus: 'A-',
          BPlus: 'B+', B: 'B', BMinus: 'B-',
          CPlus: 'C+', C: 'C', CMinus: 'C-',
          DPlus: 'D+', D: 'D', DMinus: 'D-',
          F: 'F',
        };
        return map[g] ?? g;
      };
      const categories = Object.entries(gradeDist)
        .filter(([, count]) => (count as number) > 0)
        .map(([grade, count]) => ({
          category: gradeLabel(grade),
          count: count as number,
          severity: grade.startsWith('F') || grade.startsWith('D') ? 'high'
            : grade.startsWith('C') ? 'medium' : 'low',
        }));

      // Grades considered "below B" — anything not A+/A/A-/B+/B
      const goodGrades = new Set(['APLus', 'A', 'AMinus', 'BPlus', 'B']);
      const files: Record<string, unknown>[] = parsed.files ?? [];
      const problemFiles: PmatTechDebtFile[] = files
        .filter((f) => !goodGrades.has(String(f.grade ?? '')))
        .sort((a, b) => Number(a.total ?? 0) - Number(b.total ?? 0))
        .map((f) => ({
          filePath: String(f.file_path ?? ''),
          grade: gradeLabel(String(f.grade ?? '')),
          score: Math.round(Number(f.total ?? 0)),
          language: String(f.language ?? ''),
          issues: ((f.penalties_applied as Record<string, unknown>[]) ?? [])
            .map((p) => String(p.issue ?? ''))
            .filter(Boolean),
        }));

      const result: PmatTechDebtResult = {
        score: Math.round(avgScore),
        totalItems: totalFiles,
        categories,
        problemFiles,
      };

      this.techDebtCache = { result, timestamp: Date.now() };
      return result;
    } catch {
      this.techDebtCache = { result: null, timestamp: Date.now() };
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Cache management
  // --------------------------------------------------------------------------

  clearCache(): void {
    this.installedCache = null;
    this.cargoInstalledCache = null;
    this.complexityCache = null;
    this.techDebtCache = null;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Use exec (shell) instead of execFile so that PATH is resolved through
   * the user's shell profile (~/.bashrc, ~/.zshrc). This ensures tools
   * installed via cargo, nvm, brew, etc. are found even when the VS Code
   * extension host doesn't inherit the full interactive shell PATH.
   */
  private execShell(command: string, cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      execCb(command, {
        cwd,
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        shell: process.platform === 'win32' ? undefined : '/bin/bash',
        env: {
          ...process.env,
          // Prepend cargo/homebrew paths so real binaries beat npm stubs
          PATH: [
            `${process.env.HOME}/.cargo/bin`,
            '/opt/homebrew/bin',
            '/usr/local/bin',
            process.env.PATH,
          ].filter(Boolean).join(':'),
        },
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}
