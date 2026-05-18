/**
 * createResearchRequest command — VS Code QuickInput wizard that
 * collects a brief + scope + path, then creates a
 * `research-request`-labeled issue on the mesh repo via
 * ResearchRequestService.
 *
 * Triggered from the command palette OR from the OracularPanel's
 * "Promote to research-request" button (which passes a prefill).
 */
import * as vscode from 'vscode';
import {
  createResearchRequest,
  type ResearchRequestBrief,
  type ResearchPath,
  type ScopeLevel,
} from '../services/ResearchRequestService';
import { MeshService } from '../services/MeshService';
import { MeshReader } from '../core/mesh-reader';

export interface CreateResearchRequestPrefill {
  brief?: string;
  scopeLevel?: ScopeLevel;
  scopeId?: string;
  path?: ResearchPath;
  targetRepo?: string;
  derivedFrom?: string;
}

export async function createResearchRequestCommand(prefill: CreateResearchRequestPrefill = {}): Promise<void> {
  // Step 1: brief
  const brief = await vscode.window.showInputBox({
    title: 'Research request — brief',
    prompt: 'Plain-English description of what the Archeologist should research. Multi-line OK.',
    value: prefill.brief ?? '',
    ignoreFocusOut: true,
    validateInput: (v) => v.trim().length === 0 ? 'A brief is required.' : null,
  });
  if (brief === undefined) { return; }   // user cancelled

  // Step 2: scope level — portfolio was removed, agents need a concrete
  // architectural surface to produce a targeted PRD.
  const scopeLevel = (prefill.scopeLevel) ?? await vscode.window.showQuickPick(
    ['bar', 'platform'].map(l => ({ label: l })),
    { title: 'Research request — scope level', ignoreFocusOut: true },
  ).then(p => p?.label as ScopeLevel | undefined);
  if (!scopeLevel) { return; }

  // Step 3: scope id (BAR id, etc.) — always required now.
  let scopeId: string | undefined = prefill.scopeId;
  if (!scopeId) {
    if (scopeLevel === 'bar') {
      // Offer a pick list of known BARs.
      const meshPath = MeshService.getMeshPath();
      let pickItems: { label: string; description?: string }[] = [];
      if (meshPath) {
        try {
          const reader = new MeshReader(meshPath);
          pickItems = reader.listBars().map(b => ({ label: b.id, description: b.name }));
        } catch { /* mesh may be empty */ }
      }
      pickItems.push({ label: '(enter manually…)' });
      const picked = await vscode.window.showQuickPick(pickItems, {
        title: 'Research request — pick a BAR',
        ignoreFocusOut: true,
      });
      if (!picked) { return; }
      if (picked.label === '(enter manually…)') {
        scopeId = await vscode.window.showInputBox({
          title: 'Research request — BAR id', prompt: 'e.g. APP-INS-001',
          ignoreFocusOut: true,
        });
      } else {
        scopeId = picked.label;
      }
    } else {
      // platform — plain text input
      scopeId = await vscode.window.showInputBox({
        title: 'Research request — platform id', prompt: 'e.g. PLT-INS',
        ignoreFocusOut: true,
      });
    }
    if (!scopeId) { return; }
  }

  // Step 4: path
  const path = (prefill.path) ?? await vscode.window.showQuickPick(
    [
      { label: 'research', description: 'Market research path (Tavily + arXiv + USPTO + HN)' },
      { label: 'archaeology', description: 'Repo archaeology path (clone + analyze a target code repo)' },
    ],
    { title: 'Research request — path', ignoreFocusOut: true },
  ).then(p => p?.label as ResearchPath | undefined);
  if (!path) { return; }

  // Step 5: target repo (archaeology only)
  let targetRepo: string | undefined = prefill.targetRepo;
  if (path === 'archaeology' && !targetRepo) {
    targetRepo = await vscode.window.showInputBox({
      title: 'Research request — target repo', prompt: 'owner/repo (e.g. AliceN-ucdenver/celeb-api)',
      ignoreFocusOut: true,
      validateInput: (v) => /^[\w.-]+\/[\w.-]+$/.test(v.trim()) ? null : 'Must be in owner/repo form.',
    });
    if (!targetRepo) { return; }
  }

  const briefRequest: ResearchRequestBrief = {
    brief: brief.trim(),
    scope: { level: scopeLevel, id: scopeId },
    path,
    targetRepo,
    derivedFrom: prefill.derivedFrom,
  };

  try {
    const result = await createResearchRequest(briefRequest);
    const openOnGithub = 'Open Issue';
    const choice = await vscode.window.showInformationMessage(
      `Research-request issue created: #${result.issueNumber}. The Archeologist will dispatch on the label-add event.`,
      openOnGithub,
    );
    if (choice === openOnGithub) {
      void vscode.env.openExternal(vscode.Uri.parse(result.issueUrl));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to create research-request issue: ${msg}`);
  }
}
