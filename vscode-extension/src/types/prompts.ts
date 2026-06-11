// ============================================================================
// RCTRO Prompt Types
// ============================================================================

export interface RctroRequirement {
  title: string;
  details: string[];
  validation: string; // ☐ checklist item
}

export interface RctroPrompt {
  title?: string;
  role: string;
  context: string;
  task: string;
  requirements: RctroRequirement[];
  output: string;
}

// ============================================================================
// Prompt Pack Types
// ============================================================================

export type PackDomain = 'rabbit-hole' | 'looking-glass';

// Codex-r4 Bug 2 — `implementation` is the Cheshire-side category for
// the impl-phase self-review packs (architect-review.md + security-review.md
// read by the new self-review-impl-* runner skills). Installed into the
// target repo at `.cheshire/prompts/implementation/` on first fan-out.
export type PackCategory = 'owasp' | 'maintainability' | 'threat-modeling' | 'governance' | 'implementation';

export interface PromptPackSelection {
  owasp: string[];           // e.g., ["A03_injection", "A04_insecure_design"]
  maintainability: string[]; // e.g., ["complexity-reduction"]
  threatModeling: string[];  // e.g., ["tampering"]
}

export interface PromptPackInfo {
  id: string;                // e.g., "A03_injection" or "architecture"
  name: string;              // e.g., "Injection" or "Architecture Review"
  filename: string;          // e.g., "A03_injection.md"
  packDomain: PackDomain;    // which domain this pack belongs to
  category?: PackCategory;   // rabbit-hole uses owasp/maintainability/threat-modeling; looking-glass uses governance
  description?: string;      // UI description (always set for looking-glass, derived for rabbit-hole)
  required?: boolean;        // true for looking-glass 'default' pack
  available?: boolean;       // true if the .md file exists on disk
  content?: string;          // Loaded on demand
  domain?: string;           // looking-glass registry domain (general | architecture | security | information-risk | operations | custom) — drives pillar→pack derivation
}

export interface PromptMappings {
  codeql_to_owasp: Record<string, string>;
  owasp_categories: Record<string, OwaspCategory>;
  maintainability_triggers: Record<string, MaintainabilityTrigger>;
  severity_mapping: Record<string, string>;
  label_mapping: Record<string, string>;
}

export interface OwaspCategory {
  name: string;
  prompt_file: string;
  threat_model: string[];
  maintainability: string[];
}

export interface MaintainabilityTrigger {
  prompt_file: string;
  keywords: string[];
}

// ============================================================================
// Issue Templates
// ============================================================================

export interface IssueTemplate {
  id: string;
  name: string;
  defaultPacks: PromptPackSelection;
  descriptionHint: string;
}
