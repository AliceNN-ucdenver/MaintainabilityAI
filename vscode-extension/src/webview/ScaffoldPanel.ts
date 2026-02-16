import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { TechStackDetector } from '../services/TechStackDetector';
import { requireTool } from '../services/PrerequisiteChecker';
import {
  generateClaudeMd,
  generatePrTemplate,
  generateSecurityPolicy,
  generateAliceRemediationWorkflow,
  generateCodeqlWorkflow,
  generateFitnessFunctionsWorkflow,
  generateCiWorkflow,
  generateCodeqlToIssuesWorkflow,
  generateValidatePromptHashesWorkflow,
  generatePromptMappings,
  generatePromptHashGenerator,
  generateProcessCodeqlResults,
  generateRepoMetadata,
} from '../templates/scaffoldTemplates';
import { readRepoMetadata } from '../services/RepoMetadata';

const execFileAsync = promisify(execFile);

export class ScaffoldPanel {
  public static currentPanel: ScaffoldPanel | undefined;
  private static readonly viewType = 'maintainabilityai.scaffold';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ScaffoldPanel.currentPanel) {
      ScaffoldPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ScaffoldPanel.viewType,
      'MaintainabilityAI — Scaffold Project',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ScaffoldPanel.currentPanel = new ScaffoldPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.extensionPath = context.extensionPath;

    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );

    // Send initial state and detect stack if workspace is available
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.send({ type: 'init', workspaceRoot });
    if (workspaceRoot) {
      this.detectStackForFolder(workspaceRoot);
    }
  }

  private send(msg: Record<string, unknown>) {
    this.panel.webview.postMessage(msg);
  }

  private async handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'pickFolder': {
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select project folder',
          title: 'MaintainabilityAI — Choose Target Folder',
        });
        if (picked && picked.length > 0) {
          const folderPath = picked[0].fsPath;
          this.send({ type: 'folderSelected', path: folderPath });
          await this.detectStackForFolder(folderPath);
        }
        break;
      }

      case 'openFolder': {
        const folderPath = msg.path as string;
        if (folderPath) {
          await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath));
        }
        break;
      }

      case 'scaffold': {
        const config = msg.config as {
          folder: string;
          files: string[];
          stackConfig: { language: string; testing: string; packageManager: string };
          createRepo: boolean;
          repoName: string;
          repoDescription: string;
          repoVisibility: string;
          configureSecrets: boolean;
        };
        await this.runScaffold(config);
        break;
      }
    }
  }

  private async detectStackForFolder(folderPath: string) {
    // Check for existing repo-metadata.yml first
    const metadata = readRepoMetadata(folderPath);
    if (metadata) {
      this.send({
        type: 'stackDefaults',
        language: metadata.language || '',
        moduleSystem: metadata.module_system || '',
        testing: metadata.testing || '',
        packageManager: metadata.package_manager || '',
        source: 'metadata',
      });
      return;
    }

    // Fall back to auto-detection from file presence in the selected folder
    let language = '';
    let moduleSystem = '';
    let testing = '';
    let packageManager = '';

    // Language detection
    if (fs.existsSync(path.join(folderPath, 'tsconfig.json'))) {
      language = 'TypeScript';
      try {
        const tsconfig = JSON.parse(fs.readFileSync(path.join(folderPath, 'tsconfig.json'), 'utf8'));
        const mod = tsconfig?.compilerOptions?.module?.toLowerCase() || '';
        moduleSystem = (mod.includes('esnext') || mod.includes('es20') || mod.includes('nodenext')) ? 'ESM' : 'CommonJS';
      } catch { moduleSystem = 'ESM'; }
    } else if (fs.existsSync(path.join(folderPath, 'pyproject.toml')) || fs.existsSync(path.join(folderPath, 'requirements.txt'))) {
      language = 'Python';
    } else if (fs.existsSync(path.join(folderPath, 'package.json'))) {
      language = 'JavaScript';
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(folderPath, 'package.json'), 'utf8'));
        moduleSystem = pkg.type === 'module' ? 'ESM' : 'CommonJS';
      } catch { moduleSystem = 'CommonJS'; }
    } else if (fs.existsSync(path.join(folderPath, 'go.mod'))) {
      language = 'Go';
    } else if (fs.existsSync(path.join(folderPath, 'Cargo.toml'))) {
      language = 'Rust';
    }

    // Package manager detection
    if (fs.existsSync(path.join(folderPath, 'pnpm-lock.yaml'))) { packageManager = 'pnpm'; }
    else if (fs.existsSync(path.join(folderPath, 'yarn.lock'))) { packageManager = 'yarn'; }
    else if (fs.existsSync(path.join(folderPath, 'bun.lockb'))) { packageManager = 'bun'; }
    else if (fs.existsSync(path.join(folderPath, 'package-lock.json'))) { packageManager = 'npm'; }
    else if (language === 'Python') { packageManager = 'pip'; }

    // Testing framework detection
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(folderPath, 'package.json'), 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.vitest) { testing = 'Vitest'; }
      else if (deps.jest) { testing = 'Jest'; }
      else if (deps.mocha) { testing = 'Mocha'; }
      else if (deps.cypress) { testing = 'Cypress'; }
      else if (deps.playwright || deps['@playwright/test']) { testing = 'Playwright'; }
    } catch { /* no package.json or parse error */ }
    if (!testing && language === 'Python') { testing = 'Pytest'; }

    this.send({
      type: 'stackDefaults',
      language,
      moduleSystem,
      testing,
      packageManager,
      source: language ? 'detected' : 'none',
    });
  }

  private async runScaffold(config: {
    folder: string;
    files: string[];
    stackConfig: { language: string; testing: string; packageManager: string };
    createRepo: boolean;
    repoName: string;
    repoDescription: string;
    repoVisibility: string;
    configureSecrets: boolean;
  }) {
    const workspaceRoot = config.folder;

    // Step 1: Build tech stack from user selections
    this.send({ type: 'step', id: 'detect', status: 'running', message: 'Applying project configuration...' });
    const sc = config.stackConfig;
    const stack = this.buildStackFromConfig(sc);
    this.send({ type: 'step', id: 'detect', status: 'done', message: `${sc.language}, ${sc.testing}, ${sc.packageManager}` });

    // Step 2: Generate files
    this.send({ type: 'step', id: 'generate', status: 'running', message: 'Generating scaffold files...' });

    const selectedIds = new Set(config.files);
    const filesToCreate: Array<{ relativePath: string; content: string }> = [];

    if (selectedIds.has('claude-md')) {
      filesToCreate.push({ relativePath: 'CLAUDE.md', content: generateClaudeMd(stack) });
    }
    if (selectedIds.has('alice-remediation')) {
      filesToCreate.push({ relativePath: '.github/workflows/alice-remediation.yml', content: generateAliceRemediationWorkflow(this.extensionPath) });
    }
    if (selectedIds.has('codeql')) {
      filesToCreate.push({ relativePath: '.github/workflows/codeql.yml', content: generateCodeqlWorkflow(this.extensionPath) });
    }
    if (selectedIds.has('codeql-to-issues')) {
      filesToCreate.push({ relativePath: '.github/workflows/codeql-to-issues.yml', content: generateCodeqlToIssuesWorkflow(this.extensionPath) });
      filesToCreate.push({ relativePath: '.github/workflows/validate-prompt-hashes.yml', content: generateValidatePromptHashesWorkflow(this.extensionPath) });
      filesToCreate.push({ relativePath: 'automation/process-codeql-results.js', content: generateProcessCodeqlResults(this.extensionPath) });
      filesToCreate.push({ relativePath: 'automation/prompt-mappings.json', content: generatePromptMappings(this.extensionPath) });
      filesToCreate.push({ relativePath: 'automation/generate-prompt-hashes.js', content: generatePromptHashGenerator(this.extensionPath) });
      // Empty hash manifest — user runs generate-prompt-hashes.js after adding prompt packs
      filesToCreate.push({ relativePath: 'automation/prompt-hashes.json', content: JSON.stringify({ _metadata: { generator: 'generate-prompt-hashes.js', algorithm: 'SHA-256' }, owasp: {} }, null, 2) + '\n' });
    }
    if (selectedIds.has('fitness')) {
      filesToCreate.push({ relativePath: '.github/workflows/fitness-functions.yml', content: generateFitnessFunctionsWorkflow(stack, this.extensionPath) });
    }
    if (selectedIds.has('ci-workflow')) {
      filesToCreate.push({ relativePath: '.github/workflows/ci.yml', content: generateCiWorkflow(stack, this.extensionPath) });
    }
    if (selectedIds.has('pr-template')) {
      filesToCreate.push({ relativePath: '.github/PULL_REQUEST_TEMPLATE.md', content: generatePrTemplate() });
    }
    if (selectedIds.has('security')) {
      filesToCreate.push({ relativePath: '.github/SECURITY.md', content: generateSecurityPolicy() });
    }
    if (selectedIds.has('prompt-packs')) {
      const packsDir = path.join(this.extensionPath, 'prompt-packs', 'owasp');
      if (fs.existsSync(packsDir)) {
        const files = fs.readdirSync(packsDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(packsDir, file), 'utf8');
          filesToCreate.push({ relativePath: `prompts/owasp/${file}`, content });
        }
      }
    }

    // Always write repo-metadata.yml
    filesToCreate.push({ relativePath: '.github/repo-metadata.yml', content: generateRepoMetadata(stack) });

    this.send({ type: 'step', id: 'generate', status: 'done', message: `${filesToCreate.length} files ready` });

    // Step 3: Write files
    this.send({ type: 'step', id: 'write', status: 'running', message: 'Writing files to disk...' });

    let created = 0;
    for (const file of filesToCreate) {
      const fullPath = path.join(workspaceRoot, file.relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content, 'utf8');
      created++;
      this.send({ type: 'fileCreated', file: file.relativePath, count: created, total: filesToCreate.length });
    }

    this.send({ type: 'step', id: 'write', status: 'done', message: `${created} files written` });

    // Step 4: Git + GitHub (if requested)
    if (config.createRepo) {
      // Check gh
      if (!(await requireTool('gh'))) {
        this.send({ type: 'step', id: 'github', status: 'error', message: 'GitHub CLI (gh) not found' });
        return;
      }

      // Git init
      this.send({ type: 'step', id: 'git', status: 'running', message: 'Initializing git repository...' });
      try {
        if (!fs.existsSync(path.join(workspaceRoot, '.git'))) {
          await execFileAsync('git', ['init'], { cwd: workspaceRoot });
          await execFileAsync('git', ['branch', '-M', 'main'], { cwd: workspaceRoot });
        }
        await execFileAsync('git', ['add', '-A'], { cwd: workspaceRoot });
        await execFileAsync('git', ['commit', '-m', 'chore: scaffold MaintainabilityAI SDLC structure\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: workspaceRoot });
        this.send({ type: 'step', id: 'git', status: 'done', message: 'Git initialized and committed' });
      } catch (err: unknown) {
        const message = this.extractError(err);
        this.send({ type: 'step', id: 'git', status: 'error', message: `Git error: ${message}` });
        return;
      }

      // Create GitHub repo (or connect to existing)
      this.send({ type: 'step', id: 'github', status: 'running', message: `Creating repo: ${config.repoName}...` });
      try {
        const ghArgs = [
          'repo', 'create', config.repoName,
          config.repoVisibility === 'private' ? '--private' : '--public',
          '--source', workspaceRoot,
          '--remote', 'origin',
          '--push',
        ];
        if (config.repoDescription) {
          ghArgs.push('--description', config.repoDescription);
        }
        const { stdout } = await execFileAsync('gh', ghArgs, { cwd: workspaceRoot });
        const repoUrl = stdout.trim();
        this.send({ type: 'step', id: 'github', status: 'done', message: repoUrl, url: repoUrl });
      } catch (err: unknown) {
        const errMsg = this.extractError(err);

        // Handle "already exists" — connect to existing repo and push
        if (errMsg.includes('already exists')) {
          this.send({ type: 'step', id: 'github', status: 'running', message: 'Repo exists — connecting and pushing...' });
          try {
            // Get the authenticated user's login for the full repo path
            const { stdout: owner } = await execFileAsync('gh', ['api', 'user', '-q', '.login'], { cwd: workspaceRoot });
            const fullRepo = `${owner.trim()}/${config.repoName}`;

            // Check if origin remote already exists
            try {
              await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: workspaceRoot });
              // Origin exists — update it
              await execFileAsync('git', ['remote', 'set-url', 'origin', `https://github.com/${fullRepo}.git`], { cwd: workspaceRoot });
            } catch {
              // No origin — add it
              await execFileAsync('git', ['remote', 'add', 'origin', `https://github.com/${fullRepo}.git`], { cwd: workspaceRoot });
            }

            await execFileAsync('git', ['push', '-u', 'origin', 'main'], { cwd: workspaceRoot });
            const repoUrl = `https://github.com/${fullRepo}`;
            this.send({ type: 'step', id: 'github', status: 'done', message: `Pushed to existing: ${repoUrl}`, url: repoUrl });
          } catch (pushErr: unknown) {
            const pushMsg = this.extractError(pushErr);
            this.send({ type: 'step', id: 'github', status: 'error', message: `Push failed: ${pushMsg}` });
            return;
          }
        } else {
          this.send({ type: 'step', id: 'github', status: 'error', message: `GitHub error: ${errMsg}` });
          return;
        }
      }

      // Configure secrets — prompt directly since the workspace may not be open yet
      if (config.configureSecrets) {
        this.send({ type: 'step', id: 'secrets', status: 'running', message: 'Waiting for API key input...' });

        // Determine the repo owner
        let repoOwner: string;
        try {
          const { stdout } = await execFileAsync('gh', ['api', 'user', '-q', '.login'], { cwd: workspaceRoot });
          repoOwner = stdout.trim();
        } catch {
          this.send({ type: 'step', id: 'secrets', status: 'error', message: 'Could not determine GitHub user' });
          // Continue to completion — secrets are optional
          this.send({ type: 'complete', folder: workspaceRoot });
          return;
        }

        const fullRepoName = `${repoOwner}/${config.repoName}`;

        // Prompt for Anthropic API key
        const apiKey = await vscode.window.showInputBox({
          prompt: `Enter your Anthropic API key for ${fullRepoName}`,
          placeHolder: 'sk-ant-api3-...',
          password: true,
          ignoreFocusOut: true,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'API key cannot be empty';
            }
            if (!value.startsWith('sk-ant-')) {
              return 'Anthropic keys start with "sk-ant-"';
            }
            return undefined;
          },
        });

        if (apiKey) {
          try {
            this.send({ type: 'step', id: 'secrets', status: 'running', message: `Setting ANTHROPIC_API_KEY on ${fullRepoName}...` });
            await execFileAsync('gh', [
              'secret', 'set', 'ANTHROPIC_API_KEY',
              '--repo', fullRepoName,
              '--body', apiKey,
            ], { cwd: workspaceRoot });
            this.send({ type: 'step', id: 'secrets', status: 'done', message: `ANTHROPIC_API_KEY set on ${fullRepoName}` });

            // Offer to save locally too
            const saveLocally = await vscode.window.showQuickPick(
              [
                { label: 'Yes — save to VS Code settings for local LLM use', value: 'yes' },
                { label: 'No — only set as repo secret', value: 'no' },
              ],
              {
                placeHolder: 'Also save the Anthropic key to VS Code settings?',
                ignoreFocusOut: true,
              }
            );
            if (saveLocally?.value === 'yes') {
              await vscode.workspace.getConfiguration().update(
                'maintainabilityai.llm.claudeApiKey',
                apiKey,
                vscode.ConfigurationTarget.Global
              );
            }
          } catch (err: unknown) {
            const errMsg = this.extractError(err);
            this.send({ type: 'step', id: 'secrets', status: 'error', message: `Failed to set secret: ${errMsg}` });
          }
        } else {
          this.send({ type: 'step', id: 'secrets', status: 'done', message: 'Skipped — no key provided' });
        }
      }
    }

    this.send({ type: 'complete', folder: workspaceRoot });
  }

  private extractError(err: unknown): string {
    // execFile errors have stderr with the actual useful message from gh/git
    const e = err as { stderr?: string; message?: string };
    if (e.stderr && e.stderr.trim()) {
      return e.stderr.trim();
    }
    if (e.message) {
      return e.message;
    }
    return String(err);
  }

  private dispose() {
    ScaffoldPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }

  private buildStackFromConfig(sc: { language: string; testing: string; packageManager: string }): import('../types').TechStack {
    const langLower = sc.language.toLowerCase();
    let language = 'JavaScript';
    let runtime = 'Node.js';
    let framework = '';

    if (langLower.includes('typescript') && langLower.includes('esm')) {
      language = 'TypeScript'; runtime = 'Node.js (ESM)';
    } else if (langLower.includes('typescript')) {
      language = 'TypeScript'; runtime = 'Node.js (CommonJS)';
    } else if (langLower.includes('javascript') && langLower.includes('esm')) {
      language = 'JavaScript'; runtime = 'Node.js (ESM)';
    } else if (langLower.includes('javascript')) {
      language = 'JavaScript'; runtime = 'Node.js (CommonJS)';
    } else if (langLower.includes('python')) {
      language = 'Python'; runtime = 'Python 3';
    } else if (langLower.includes('react')) {
      language = 'TypeScript'; runtime = 'Vite'; framework = 'React';
    } else if (langLower.includes('go')) {
      language = 'Go'; runtime = 'Go';
    } else if (langLower.includes('rust')) {
      language = 'Rust'; runtime = 'Rust';
    }

    return {
      language,
      runtime,
      framework,
      database: '',
      testing: sc.testing || 'Jest',
      validation: '',
      cicd: 'GitHub Actions',
      packageManager: sc.packageManager || 'npm',
    };
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MaintainabilityAI — Scaffold Project</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border, #333);
    --accent: var(--vscode-textLink-foreground, #7c3aed);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border, #444);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --success: #22c55e;
    --error: #ef4444;
    --running: #f59e0b;
    --muted: var(--vscode-descriptionForeground, #888);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size, 13px);
    color: var(--fg);
    background: var(--bg);
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .header h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .header .subtitle {
    color: var(--muted);
    font-style: italic;
  }

  .section {
    margin-bottom: 28px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title .step-num {
    background: var(--accent);
    color: #fff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .folder-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .folder-path {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--input-fg);
    padding: 6px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    min-height: 32px;
    display: flex;
    align-items: center;
  }
  .folder-path.empty { color: var(--muted); font-style: italic; }

  button {
    background: var(--btn-bg);
    color: var(--btn-fg);
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
  }
  button:hover { background: var(--btn-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button.secondary {
    background: transparent;
    border: 1px solid var(--input-border);
    color: var(--fg);
  }

  .file-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .file-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .file-item:hover { border-color: var(--accent); }
  .file-item.checked { border-color: var(--accent); background: rgba(124, 58, 237, 0.08); }
  .file-item input[type="checkbox"] { margin-top: 2px; flex-shrink: 0; }
  .file-item .file-label { font-weight: 500; font-size: 12px; }
  .file-item .file-desc { color: var(--muted); font-size: 11px; margin-top: 2px; }

  .repo-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
  }
  .repo-options.hidden { display: none; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .field input, .field select {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--input-fg);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 13px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
  }
  .toggle-row label { cursor: pointer; }

  /* Progress / Steps */
  .progress-panel {
    display: none;
    margin-top: 24px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .progress-panel.active { display: block; }
  .progress-header {
    padding: 12px 16px;
    background: rgba(124, 58, 237, 0.1);
    font-weight: 600;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }

  .step-list { padding: 8px 0; }
  .step-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    font-size: 12px;
  }
  .step-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
    border: 2px solid var(--border);
    color: var(--muted);
  }
  .step-item.pending .step-icon { border-color: var(--border); color: var(--muted); }
  .step-item.running .step-icon { border-color: var(--running); color: var(--running); animation: pulse 1s infinite; }
  .step-item.done .step-icon { border-color: var(--success); color: var(--success); background: rgba(34, 197, 94, 0.1); }
  .step-item.error .step-icon { border-color: var(--error); color: var(--error); background: rgba(239, 68, 68, 0.1); }

  .step-label { font-weight: 500; }
  .step-message { color: var(--muted); margin-left: auto; font-size: 11px; max-width: 60%; text-align: right; }
  .step-item.error .step-message { color: var(--error); white-space: normal; word-break: break-word; }

  .file-log {
    padding: 0 16px 8px;
    max-height: 120px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 11px;
    color: var(--muted);
  }
  .file-log div { padding: 1px 0; }
  .file-log .created { color: var(--success); }

  .complete-banner {
    display: none;
    text-align: center;
    padding: 24px;
    margin-top: 16px;
    border: 1px solid var(--success);
    border-radius: 8px;
    background: rgba(34, 197, 94, 0.06);
  }
  .complete-banner.active { display: block; }
  .cheshire-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
  .cheshire-header svg { flex-shrink: 0; border-radius: 8px; }
  .cheshire-header h2 { margin: 0; }
  .complete-banner h2 { font-size: 16px; margin-bottom: 8px; }
  .complete-banner .repo-link { color: var(--accent); text-decoration: underline; cursor: pointer; }
  .complete-banner .actions { margin-top: 12px; display: flex; gap: 8px; justify-content: center; }

  .run-btn {
    margin-top: 16px;
    padding: 10px 32px;
    font-size: 14px;
    font-weight: 600;
    width: 100%;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>Scaffold SDLC Structure</h1>
  <div class="subtitle">"Begin at the beginning," the King said gravely, "and go on till you come to the end: then stop."</div>
</div>

<!-- Step 1: Folder -->
<div class="section">
  <div class="section-title"><span class="step-num">1</span> Target Folder</div>
  <div class="folder-row">
    <div class="folder-path empty" id="folderDisplay">No folder selected</div>
    <button id="pickFolderBtn">Browse...</button>
  </div>
</div>

<!-- Step 2: Files -->
<div class="section">
  <div class="section-title"><span class="step-num">2</span> Files to Scaffold</div>
  <div class="file-grid" id="fileGrid"></div>
</div>

<!-- Step 3: Project Configuration -->
<div class="section">
  <div class="section-title"><span class="step-num">3</span> Project Configuration</div>
  <div id="stackStatus" style="font-size: 11px; color: var(--muted); margin-bottom: 8px;"></div>
  <div class="repo-options" id="stackOptions">
    <div class="field">
      <label>Language</label>
      <select id="langSelect">
        <option value="JavaScript (CommonJS)">JavaScript (CommonJS)</option>
        <option value="JavaScript (ESM)">JavaScript (ESM)</option>
        <option value="TypeScript (CommonJS)">TypeScript (CommonJS)</option>
        <option value="TypeScript (ESM)" selected>TypeScript (ESM)</option>
        <option value="Python">Python</option>
        <option value="Go">Go</option>
        <option value="Rust">Rust</option>
        <option value="React + Vite (TypeScript)">React + Vite (TypeScript)</option>
      </select>
    </div>
    <div class="field">
      <label>Testing Framework</label>
      <select id="testSelect">
        <option value="Jest" selected>Jest</option>
        <option value="Vitest">Vitest</option>
        <option value="Mocha">Mocha</option>
        <option value="Pytest">Pytest</option>
        <option value="Cypress">Cypress</option>
        <option value="Playwright">Playwright</option>
      </select>
    </div>
    <div class="field">
      <label>Package Manager</label>
      <select id="pmSelect">
        <option value="npm" selected>npm</option>
        <option value="pnpm">pnpm</option>
        <option value="yarn">yarn</option>
        <option value="bun">bun</option>
        <option value="pip">pip</option>
      </select>
    </div>
  </div>
</div>

<!-- Step 4: GitHub -->
<div class="section">
  <div class="section-title"><span class="step-num">4</span> GitHub Repository</div>
  <div class="toggle-row">
    <input type="checkbox" id="createRepoToggle">
    <label for="createRepoToggle">Create a GitHub repository and push</label>
  </div>
  <div class="repo-options hidden" id="repoOptions">
    <div class="field">
      <label>Repository Name</label>
      <input type="text" id="repoName" placeholder="my-project">
    </div>
    <div class="field">
      <label>Visibility</label>
      <select id="repoVisibility">
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>
    </div>
    <div class="field" style="grid-column: span 2">
      <label>Description</label>
      <input type="text" id="repoDescription" placeholder="Security-first project scaffolded with MaintainabilityAI">
    </div>
    <div class="toggle-row" style="grid-column: span 2">
      <input type="checkbox" id="configureSecretsToggle" checked>
      <label for="configureSecretsToggle">Configure ANTHROPIC_API_KEY secret after creation</label>
    </div>
  </div>
</div>

<!-- Run -->
<button class="run-btn" id="runBtn" disabled>Scaffold Project</button>

<!-- Progress -->
<div class="progress-panel" id="progressPanel">
  <div class="progress-header">Scaffolding in progress...</div>
  <div class="step-list" id="stepList"></div>
  <div class="file-log" id="fileLog"></div>
</div>

<!-- Complete -->
<div class="complete-banner" id="completeBanner">
  <div class="cheshire-header">
    <svg width="48" height="48" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="16" fill="#1e1e2e"/>
      <ellipse cx="42" cy="38" rx="9" ry="11" fill="#a855f7"/>
      <ellipse cx="86" cy="38" rx="9" ry="11" fill="#a855f7"/>
      <ellipse cx="44" cy="38" rx="4" ry="6" fill="#1e1e2e"/>
      <ellipse cx="88" cy="38" rx="4" ry="6" fill="#1e1e2e"/>
      <circle cx="46" cy="35" r="2" fill="#e9d5ff"/>
      <circle cx="90" cy="35" r="2" fill="#e9d5ff"/>
      <path d="M18 62 Q30 52 64 52 Q98 52 110 62" stroke="#a855f7" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M18 62 Q30 88 64 88 Q98 88 110 62" stroke="#a855f7" stroke-width="4" fill="none" stroke-linecap="round"/>
      <line x1="40" y1="58" x2="40" y2="76" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="52" y1="55" x2="52" y2="80" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="64" y1="54" x2="64" y2="82" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="76" y1="55" x2="76" y2="80" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="88" y1="58" x2="88" y2="76" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M104 96 L114 100 L114 110 Q114 116 104 120 Q94 116 94 110 L94 100 Z" fill="#a855f7" opacity="0.8"/>
      <path d="M100 106 L103 109 L109 103" stroke="#1e1e2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h2>The Cheshire Cat grins.</h2>
  </div>
  <p>Your project has been scaffolded and is ready to go.</p>
  <div id="repoUrlLine" style="margin-top: 8px; display: none;"></div>
  <div class="actions">
    <button id="openFolderBtn">Open Folder in VS Code</button>
  </div>
</div>

<script>
const vscode = acquireVsCodeApi();

const FILES = [
  { id: 'claude-md', label: 'CLAUDE.md', desc: 'Claude Code agent instructions', checked: true },
  { id: 'alice-remediation', label: 'Alice Remediation', desc: '.github/workflows/alice-remediation.yml', checked: true },
  { id: 'codeql', label: 'CodeQL Workflow', desc: '.github/workflows/codeql.yml', checked: true },
  { id: 'codeql-to-issues', label: 'CodeQL → Issues', desc: 'Workflow + automation scripts to create issues from CodeQL findings', checked: true },
  { id: 'ci-workflow', label: 'CI Workflow', desc: '.github/workflows/ci.yml — Build, test, and failure-to-issue reporting', checked: true },
  { id: 'fitness', label: 'Fitness Functions', desc: '.github/workflows/fitness-functions.yml', checked: false },
  { id: 'pr-template', label: 'PR Template', desc: '.github/PULL_REQUEST_TEMPLATE.md', checked: true },
  { id: 'security', label: 'Security Policy', desc: '.github/SECURITY.md', checked: true },
  { id: 'prompt-packs', label: 'Prompt Packs', desc: 'prompts/owasp/ — 10 OWASP packs', checked: false },
];

const STEPS = [
  { id: 'detect', label: 'Detect tech stack' },
  { id: 'generate', label: 'Generate scaffold files' },
  { id: 'write', label: 'Write files to disk' },
  { id: 'git', label: 'Initialize git & commit' },
  { id: 'github', label: 'Create GitHub repository' },
  { id: 'secrets', label: 'Configure repository secrets' },
];

let selectedFolder = '';
let repoUrl = '';

// Render file checkboxes
const fileGrid = document.getElementById('fileGrid');
FILES.forEach(f => {
  const div = document.createElement('div');
  div.className = 'file-item' + (f.checked ? ' checked' : '');
  div.innerHTML =
    '<input type="checkbox" data-id="' + f.id + '"' + (f.checked ? ' checked' : '') + '>' +
    '<div><div class="file-label">' + f.label + '</div><div class="file-desc">' + f.desc + '</div></div>';
  div.addEventListener('click', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const cb = div.querySelector('input');
    cb.checked = !cb.checked;
    div.classList.toggle('checked', cb.checked);
    updateRunBtn();
  });
  div.querySelector('input').addEventListener('change', () => {
    div.classList.toggle('checked', div.querySelector('input').checked);
    updateRunBtn();
  });
  fileGrid.appendChild(div);
});

// Render step list
const stepList = document.getElementById('stepList');
STEPS.forEach(s => {
  const div = document.createElement('div');
  div.className = 'step-item pending';
  div.id = 'step-' + s.id;
  div.innerHTML =
    '<div class="step-icon">&#9679;</div>' +
    '<span class="step-label">' + s.label + '</span>' +
    '<span class="step-message"></span>';
  stepList.appendChild(div);
});

// Folder picker
document.getElementById('pickFolderBtn').addEventListener('click', () => {
  vscode.postMessage({ type: 'pickFolder' });
});

// Repo toggle
document.getElementById('createRepoToggle').addEventListener('change', (e) => {
  document.getElementById('repoOptions').classList.toggle('hidden', !e.target.checked);
  // Show/hide git+github steps
  updateStepVisibility();
  updateRunBtn();
});

document.getElementById('configureSecretsToggle').addEventListener('change', () => {
  updateStepVisibility();
});

function updateStepVisibility() {
  const createRepo = document.getElementById('createRepoToggle').checked;
  const configSecrets = document.getElementById('configureSecretsToggle').checked;
  document.getElementById('step-git').style.display = createRepo ? '' : 'none';
  document.getElementById('step-github').style.display = createRepo ? '' : 'none';
  document.getElementById('step-secrets').style.display = (createRepo && configSecrets) ? '' : 'none';
}
updateStepVisibility();

// Run button
document.getElementById('runBtn').addEventListener('click', () => {
  const files = Array.from(document.querySelectorAll('#fileGrid input:checked'))
    .map(cb => cb.dataset.id);

  const createRepo = document.getElementById('createRepoToggle').checked;

  document.getElementById('runBtn').disabled = true;
  document.getElementById('runBtn').textContent = 'Scaffolding...';
  document.getElementById('progressPanel').classList.add('active');

  vscode.postMessage({
    type: 'scaffold',
    config: {
      folder: selectedFolder,
      files: files,
      stackConfig: {
        language: document.getElementById('langSelect').value,
        testing: document.getElementById('testSelect').value,
        packageManager: document.getElementById('pmSelect').value,
      },
      createRepo: createRepo,
      repoName: document.getElementById('repoName').value,
      repoDescription: document.getElementById('repoDescription').value,
      repoVisibility: document.getElementById('repoVisibility').value,
      configureSecrets: createRepo && document.getElementById('configureSecretsToggle').checked,
    },
  });
});

// Open folder
document.getElementById('openFolderBtn').addEventListener('click', () => {
  vscode.postMessage({ type: 'openFolder', path: selectedFolder });
});

function updateRunBtn() {
  const hasFolder = selectedFolder.length > 0;
  const hasFiles = document.querySelectorAll('#fileGrid input:checked').length > 0;
  const createRepo = document.getElementById('createRepoToggle').checked;
  const hasRepoName = !createRepo || document.getElementById('repoName').value.trim().length > 0;
  document.getElementById('runBtn').disabled = !(hasFolder && hasFiles && hasRepoName);
}

// Listen for repo name changes
document.getElementById('repoName').addEventListener('input', updateRunBtn);

// Messages from extension
window.addEventListener('message', (event) => {
  const msg = event.data;

  switch (msg.type) {
    case 'init':
      if (msg.workspaceRoot) {
        selectedFolder = msg.workspaceRoot;
        const display = document.getElementById('folderDisplay');
        display.textContent = selectedFolder;
        display.classList.remove('empty');
        // Default repo name from folder
        const parts = selectedFolder.split('/');
        document.getElementById('repoName').value = parts[parts.length - 1] || '';
        updateRunBtn();
      }
      break;

    case 'folderSelected':
      selectedFolder = msg.path;
      const display = document.getElementById('folderDisplay');
      display.textContent = selectedFolder;
      display.classList.remove('empty');
      const parts = selectedFolder.split(/[\\/]/);
      document.getElementById('repoName').value = parts[parts.length - 1] || '';
      updateRunBtn();
      break;

    case 'step': {
      const el = document.getElementById('step-' + msg.id);
      if (!el) break;
      el.className = 'step-item ' + msg.status;
      const msgEl = el.querySelector('.step-message');
      msgEl.textContent = msg.message || '';
      if (msg.url) {
        repoUrl = msg.url;
      }
      // Update icon
      const icon = el.querySelector('.step-icon');
      if (msg.status === 'done') icon.innerHTML = '&#10003;';
      else if (msg.status === 'error') icon.innerHTML = '&#10007;';
      else if (msg.status === 'running') icon.innerHTML = '&#9679;';
      // Log errors to file log for full visibility
      if (msg.status === 'error') {
        const log = document.getElementById('fileLog');
        const div = document.createElement('div');
        div.style.color = 'var(--error)';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordBreak = 'break-word';
        div.textContent = 'ERROR [' + msg.id + ']: ' + msg.message;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
        // Re-enable button so they can retry
        document.getElementById('runBtn').disabled = false;
        document.getElementById('runBtn').textContent = 'Retry';
      }
      break;
    }

    case 'fileCreated': {
      const log = document.getElementById('fileLog');
      const div = document.createElement('div');
      div.className = 'created';
      div.textContent = '+ ' + msg.file + ' (' + msg.count + '/' + msg.total + ')';
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      break;
    }

    case 'stackDefaults': {
      const statusEl = document.getElementById('stackStatus');
      if (msg.source === 'metadata') {
        statusEl.textContent = 'Loaded from .github/repo-metadata.yml';
      } else if (msg.source === 'detected') {
        statusEl.textContent = 'Auto-detected from project files';
      } else {
        statusEl.textContent = 'No project detected — select your stack';
      }

      if (msg.language) {
        const langEl = document.getElementById('langSelect');
        // Map detected values to dropdown option values
        let langVal = '';
        const lang = msg.language;
        const mod = msg.moduleSystem || '';
        if (lang === 'Python') { langVal = 'Python'; }
        else if (lang === 'Go') { langVal = 'Go'; }
        else if (lang === 'Rust') { langVal = 'Rust'; }
        else if (lang === 'TypeScript' && mod === 'ESM') { langVal = 'TypeScript (ESM)'; }
        else if (lang === 'TypeScript') { langVal = 'TypeScript (CommonJS)'; }
        else if (lang === 'JavaScript' && mod === 'ESM') { langVal = 'JavaScript (ESM)'; }
        else if (lang === 'JavaScript') { langVal = 'JavaScript (CommonJS)'; }
        if (langVal) { langEl.value = langVal; }
      }

      if (msg.testing) {
        document.getElementById('testSelect').value = msg.testing;
      }
      if (msg.packageManager) {
        document.getElementById('pmSelect').value = msg.packageManager;
      }
      break;
    }

    case 'complete':
      document.getElementById('progressPanel').querySelector('.progress-header').textContent = 'Scaffolding complete';
      document.getElementById('completeBanner').classList.add('active');
      if (repoUrl) {
        const urlLine = document.getElementById('repoUrlLine');
        urlLine.style.display = 'block';
        urlLine.innerHTML = 'Repository: <span class="repo-link">' + repoUrl + '</span>';
      }
      break;
  }
});
</script>
</body>
</html>`;
  }
}
