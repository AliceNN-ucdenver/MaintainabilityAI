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

export interface PromptPackSelection {
  owasp: string[];           // e.g., ["A03_injection", "A04_insecure_design"]
  maintainability: string[]; // e.g., ["complexity-reduction"]
  threatModeling: string[];  // e.g., ["tampering"]
}

export interface PromptPackInfo {
  id: string;                // e.g., "A03_injection"
  category: 'owasp' | 'maintainability' | 'threat-modeling';
  name: string;              // e.g., "Injection"
  filename: string;          // e.g., "A03_injection.md"
  content?: string;          // Loaded on demand
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
