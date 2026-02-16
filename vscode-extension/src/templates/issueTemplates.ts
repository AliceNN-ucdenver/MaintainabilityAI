import type { IssueTemplate } from '../types';

// DRY principle and fitness functions are always included — they apply to every feature type.
const ALWAYS_MAINTAINABILITY = ['dry-principle', 'fitness-functions'];

function withDefaults(packs: string[]): string[] {
  const merged = new Set([...ALWAYS_MAINTAINABILITY, ...packs]);
  return [...merged];
}

export const ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    id: 'api-endpoint',
    name: 'New API Endpoint',
    defaultPacks: {
      owasp: ['A03_injection', 'A07_authn_failures'],
      maintainability: withDefaults(['complexity-reduction']),
      threatModeling: ['tampering'],
    },
    descriptionHint:
      'Describe the API endpoint: HTTP method, path, request/response format, authorization requirements, data validation needs...',
  },
  {
    id: 'auth-feature',
    name: 'Authentication Feature',
    defaultPacks: {
      owasp: ['A07_authn_failures', 'A02_crypto_failures'],
      maintainability: withDefaults([]),
      threatModeling: ['spoofing'],
    },
    descriptionHint:
      'Describe the auth flow: OAuth, JWT, session-based? MFA? Password requirements? Account lockout policy?...',
  },
  {
    id: 'data-pipeline',
    name: 'Data Processing Pipeline',
    defaultPacks: {
      owasp: ['A03_injection', 'A04_insecure_design'],
      maintainability: withDefaults(['complexity-reduction']),
      threatModeling: ['tampering'],
    },
    descriptionHint:
      'Describe the data flow: input source, transformations, output destination, validation needs, error handling...',
  },
  {
    id: 'frontend-component',
    name: 'Frontend Component',
    defaultPacks: {
      owasp: ['A03_injection', 'A05_security_misconfig'],
      maintainability: withDefaults(['single-responsibility']),
      threatModeling: ['information-disclosure'],
    },
    descriptionHint:
      'Describe the component: user interactions, data displayed, forms, client-side validation, CSP requirements...',
  },
];
