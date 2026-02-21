import * as vscode from 'vscode';
import type { ActiveReviewInfo } from '../types';
import { LookingGlassPanel } from '../webview/LookingGlassPanel';

export function lookingGlassCommand(context: vscode.ExtensionContext, barPath?: string, activeReview?: ActiveReviewInfo) {
  LookingGlassPanel.createOrShow(context, barPath, activeReview);
}
