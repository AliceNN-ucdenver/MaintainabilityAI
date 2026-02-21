// ============================================================================
// CALM (Common Architecture Language Model) Template Generators
// Schema 1.2 — unified bar.arch.json (single file per BAR)
// Context and logical views are projections of the same data.
// ============================================================================

// --------------------------------------------------------------------------
// Generic CALM skeleton (for new BARs)
// --------------------------------------------------------------------------

export function generateCalmBarArch(appName: string, appId: string): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/core.json',
    nodes: [
      {
        'unique-id': appId.toLowerCase(),
        'node-type': 'system',
        name: appName,
        description: '',
      },
    ],
    relationships: [],
    flows: [],
  }, null, 2);
}

export function generateCalmDecorator(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/decorator.json',
    'unique-id': 'capability-map',
    name: 'Business Capability Map',
    description: 'Enterprise L1/L2/L3 business capability hierarchy.',
    'decorator-type': 'business-capability',
    definitions: {},
  }, null, 2);
}

// --------------------------------------------------------------------------
// Sample data: Claims Processing (Insurance Operations)
// Unified bar.arch.json — all context + logical nodes, relationships, flows,
// controls, and decorators in a single file.
// --------------------------------------------------------------------------

export function generateSampleClaimsProcessingArch(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/core.json',
    nodes: [
      // ---- Context-level actors ----
      {
        'unique-id': 'policyholder',
        'node-type': 'actor',
        name: 'Policyholder',
        description: 'Customer who registers, submits insurance claims with supporting documents, and tracks claim status.',
      },
      {
        'unique-id': 'claims-adjuster',
        'node-type': 'actor',
        name: 'Claims Adjuster',
        description: 'Internal employee who reviews complex or flagged claims requiring manual adjudication.',
      },
      {
        'unique-id': 'third-party-vendor',
        'node-type': 'actor',
        name: 'Third-Party Vendor',
        description: 'External service providers — repair shops, medical providers, and appraisers — coordinated for claim fulfillment.',
      },
      // ---- System-of-interest (container for logical view) ----
      {
        'unique-id': 'claims-processing',
        'node-type': 'system',
        name: 'Claims Processing System',
        description: 'Event-driven insurance claims platform with signup, FNOL, document processing, fraud detection, settlement, and vendor coordination — all choreographed via a central event broker.',
        'data-classification': 'PII',
        details: {
          'required-pattern': 'https://bar.example.com/patterns/event-driven-choreography.pattern.json',
        },
      },
      // ---- Sub-containers (bounded contexts in logical view) ----
      {
        'unique-id': 'customer-engagement',
        'node-type': 'system',
        name: 'Customer Engagement',
        description: 'Customer-facing boundary — registration, claim submission, profile management, and real-time notifications.',
        'data-classification': 'PII',
      },
      {
        'unique-id': 'claims-adjudication',
        'node-type': 'system',
        name: 'Claims Adjudication',
        description: 'Core claims lifecycle — validation, acceptance/rejection, settlement calculation, and payment initiation.',
        'data-classification': 'PII',
      },
      {
        'unique-id': 'claim-processing-services',
        'node-type': 'system',
        name: 'Claim Processing Services',
        description: 'Specialized verification and fulfillment — document OCR processing, fraud detection, and third-party vendor coordination.',
        'data-classification': 'Confidential',
      },
      // ---- External systems (context view) ----
      {
        'unique-id': 'policy-admin',
        'node-type': 'system',
        name: 'Policy Administration System',
        description: 'System of record for policy details, coverage limits, and endorsements.',
      },
      {
        'unique-id': 'payment-gateway',
        'node-type': 'system',
        name: 'Payment Gateway',
        description: 'External payment processing for claim settlements and disbursements.',
      },
      {
        'unique-id': 'fraud-detection',
        'node-type': 'system',
        name: 'Fraud Detection Service',
        description: 'AI-powered fraud scoring and anomaly detection using document analysis and behavioral patterns.',
        'data-classification': 'Confidential',
      },
      {
        'unique-id': 'document-management',
        'node-type': 'system',
        name: 'Document Management System',
        description: 'Enterprise document storage and OCR/Textract processing for claim evidence, medical records, and correspondence.',
        'data-classification': 'PII',
      },
      // ---- Logical-level services (composed-of children) ----
      {
        'unique-id': 'signup-service',
        'node-type': 'service',
        name: 'Signup Service',
        description: 'Customer registration and onboarding — captures personal details, address, and vehicle information, then emits Customer.Created event.',
        interfaces: [{ 'unique-id': 'signup-api', host: 'signup.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'fnol-service',
        'node-type': 'service',
        name: 'FNOL Service',
        description: 'First Notice of Loss — policyholder files a new claim with incident details and uploads supporting documents (photos, police reports, medical records).',
        interfaces: [{ 'unique-id': 'fnol-api', host: 'fnol.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'customer-service',
        'node-type': 'service',
        name: 'Customer Service',
        description: 'Customer profile management — address updates, vehicle changes, policy lookups, and customer data enrichment.',
        interfaces: [{ 'unique-id': 'customer-api', host: 'customer.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'claims-event-broker',
        'node-type': 'network',
        name: 'Claims Event Broker',
        description: 'EventBridge custom event bus — central choreography backbone connecting intake and processing services via domain events (Customer.Created, Claim.Filed, Document.Processed, Fraud.Clear, Settlement.Completed).',
        interfaces: [{ 'unique-id': 'event-broker-endpoint', host: 'events.internal.example.com', port: 443 }],
      },
      {
        'unique-id': 'claims-service',
        'node-type': 'service',
        name: 'Claims Service',
        description: 'Claims lifecycle management — validates FNOL data, persists claim records, and emits Claim.Accepted or Claim.Rejected events.',
        interfaces: [{ 'unique-id': 'claims-api', host: 'claims.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'document-service',
        'node-type': 'service',
        name: 'Document Service',
        description: 'Document processing with OCR/Textract — extracts structured data from uploaded claim documents (driver licenses, vehicle images, medical records) and emits Document.Processed event.',
        interfaces: [{ 'unique-id': 'document-api', host: 'documents.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'fraud-service',
        'node-type': 'service',
        name: 'Fraud Service',
        description: 'Fraud detection — validates extracted document data against submitted information, detects mismatches (name discrepancies, vehicle color inconsistencies), and emits Fraud.Detected or Fraud.Clear event.',
        interfaces: [{ 'unique-id': 'fraud-api', host: 'fraud.internal.example.com', port: 443 }],
        'data-classification': 'Confidential',
      },
      {
        'unique-id': 'settlement-service',
        'node-type': 'service',
        name: 'Settlement Service',
        description: 'Settlement calculation and payment initiation — computes approved claim amounts based on coverage, deductibles, and depreciation, then initiates payment via Payment Gateway.',
        interfaces: [{ 'unique-id': 'settlement-api', host: 'settlement.internal.example.com', port: 443 }],
      },
      {
        'unique-id': 'vendor-service',
        'node-type': 'service',
        name: 'Vendor Service',
        description: 'Third-party vendor coordination — dispatches repair shops, medical providers, and appraisers for claim fulfillment, tracks vendor status and invoices.',
        interfaces: [{ 'unique-id': 'vendor-api', host: 'vendor.internal.example.com', port: 443 }],
      },
      {
        'unique-id': 'notification-service',
        'node-type': 'service',
        name: 'Notification Service',
        description: 'Real-time notifications via WebSocket/AppSync — subscribes to all lifecycle events and pushes status updates, payment confirmations, and alerts to policyholders and adjusters.',
        interfaces: [{ 'unique-id': 'notification-api', host: 'notifications.internal.example.com', port: 443 }],
      },
      // ---- Data stores ----
      {
        'unique-id': 'claims-db',
        'node-type': 'database',
        name: 'Claims Database',
        description: 'DynamoDB/PostgreSQL storing customer profiles, claim records, adjudication history, and settlement details.',
        interfaces: [{ 'unique-id': 'claims-db-endpoint', host: 'claims-db.internal.example.com', port: 5432, database: 'claims' }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'document-store',
        'node-type': 'database',
        name: 'Document Store',
        description: 'S3 object storage for claim documents — photos, police reports, medical records, driver licenses, and vendor invoices.',
        interfaces: [{ 'unique-id': 'doc-store-s3', host: 'docs.s3.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
    ],
    relationships: [
      // ---- Context-level: actor interacts ----
      {
        'unique-id': 'policyholder-submits-claim',
        description: 'Policyholder registers, submits new claims with documents, and checks claim status.',
        'relationship-type': { interacts: { actor: 'policyholder', nodes: ['claims-processing'] } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'adjuster-reviews-claim',
        description: 'Claims adjuster reviews flagged claims requiring manual adjudication.',
        'relationship-type': { interacts: { actor: 'claims-adjuster', nodes: ['claims-processing'] } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'vendor-fulfills-claim',
        description: 'Third-party vendors receive work assignments and submit invoices for claim fulfillment.',
        'relationship-type': { interacts: { actor: 'third-party-vendor', nodes: ['claims-processing'] } },
        protocol: 'HTTPS',
      },
      // ---- Context-level: system-to-system ----
      {
        'unique-id': 'claims-to-policy',
        description: 'Claims processing retrieves policy details and coverage limits for validation.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'policy-admin' } } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'claims-to-payment',
        description: 'Claims processing initiates settlement payments via payment gateway.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'payment-gateway' } } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'claims-to-fraud',
        description: 'Claims processing sends claim data for real-time fraud scoring and document validation.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'fraud-detection' } } },
        protocol: 'gRPC',
      },
      {
        'unique-id': 'claims-to-dms',
        description: 'Claims processing stores and retrieves claim documents, photos, and medical records.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'document-management' } } },
        protocol: 'HTTPS',
      },
      // ---- Logical-level: composition (hierarchical — 3 bounded contexts) ----
      // Top-level: claims-processing contains sub-containers + shared infra
      // IMPORTANT: claims-processing composed-of entries must come FIRST
      // (CalmAdapter context view uses first composed-of container as system-of-interest)
      { 'unique-id': 'composed-of-engagement', description: 'System contains Customer Engagement boundary.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['customer-engagement'] } } },
      { 'unique-id': 'composed-of-adjudication', description: 'System contains Claims Adjudication boundary.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['claims-adjudication'] } } },
      { 'unique-id': 'composed-of-processing', description: 'System contains Claim Processing Services boundary.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['claim-processing-services'] } } },
      { 'unique-id': 'composed-of-broker', description: 'System contains Claims Event Broker.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['claims-event-broker'] } } },
      { 'unique-id': 'composed-of-db', description: 'System contains Claims Database.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['claims-db'] } } },
      { 'unique-id': 'composed-of-docstore', description: 'System contains Document Store.', 'relationship-type': { 'composed-of': { container: 'claims-processing', nodes: ['document-store'] } } },
      // Customer Engagement contains intake + notification services
      { 'unique-id': 'composed-of-signup', description: 'Customer Engagement contains Signup Service.', 'relationship-type': { 'composed-of': { container: 'customer-engagement', nodes: ['signup-service'] } } },
      { 'unique-id': 'composed-of-fnol', description: 'Customer Engagement contains FNOL Service.', 'relationship-type': { 'composed-of': { container: 'customer-engagement', nodes: ['fnol-service'] } } },
      { 'unique-id': 'composed-of-customer', description: 'Customer Engagement contains Customer Service.', 'relationship-type': { 'composed-of': { container: 'customer-engagement', nodes: ['customer-service'] } } },
      { 'unique-id': 'composed-of-notification', description: 'Customer Engagement contains Notification Service.', 'relationship-type': { 'composed-of': { container: 'customer-engagement', nodes: ['notification-service'] } } },
      // Claims Adjudication contains core business logic
      { 'unique-id': 'composed-of-claims', description: 'Claims Adjudication contains Claims Service.', 'relationship-type': { 'composed-of': { container: 'claims-adjudication', nodes: ['claims-service'] } } },
      { 'unique-id': 'composed-of-settlement', description: 'Claims Adjudication contains Settlement Service.', 'relationship-type': { 'composed-of': { container: 'claims-adjudication', nodes: ['settlement-service'] } } },
      // Claim Processing Services contains verification + fulfillment
      { 'unique-id': 'composed-of-fraud', description: 'Claim Processing Services contains Fraud Service.', 'relationship-type': { 'composed-of': { container: 'claim-processing-services', nodes: ['fraud-service'] } } },
      { 'unique-id': 'composed-of-document', description: 'Claim Processing Services contains Document Service.', 'relationship-type': { 'composed-of': { container: 'claim-processing-services', nodes: ['document-service'] } } },
      { 'unique-id': 'composed-of-vendor', description: 'Claim Processing Services contains Vendor Service.', 'relationship-type': { 'composed-of': { container: 'claim-processing-services', nodes: ['vendor-service'] } } },
      // ---- Logical-level: internal connects ----
      { 'unique-id': 'signup-to-broker', description: 'Signup Service publishes Customer.Created event after successful registration.', 'relationship-type': { connects: { source: { node: 'signup-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'fnol-to-broker', description: 'FNOL Service publishes Claim.Filed event with incident details and document references.', 'relationship-type': { connects: { source: { node: 'fnol-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'customer-to-broker', description: 'Customer Service publishes Customer.Updated event on profile changes.', 'relationship-type': { connects: { source: { node: 'customer-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-claims', description: 'Claims Service consumes Claim.Filed events — validates FNOL data and emits Claim.Accepted or Claim.Rejected.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'claims-service', interfaces: ['claims-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-document', description: 'Document Service consumes Claim.Accepted events — processes uploaded documents via OCR/Textract.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'document-service', interfaces: ['document-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-fraud', description: 'Fraud Service consumes Document.Processed events — validates extracted data against submission for discrepancies.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'fraud-service', interfaces: ['fraud-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-settlement', description: 'Settlement Service consumes Fraud.Clear events — calculates approved settlement amount.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'settlement-service', interfaces: ['settlement-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-vendor', description: 'Vendor Service consumes Claim.Accepted events — coordinates third-party repair shops, medical providers, and appraisers.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'vendor-service', interfaces: ['vendor-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'claims-to-broker', description: 'Claims Service publishes Claim.Accepted or Claim.Rejected event after validation.', 'relationship-type': { connects: { source: { node: 'claims-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'document-to-broker', description: 'Document Service publishes Document.Processed event with extracted structured data.', 'relationship-type': { connects: { source: { node: 'document-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'fraud-to-broker', description: 'Fraud Service publishes Fraud.Detected or Fraud.Clear event with risk assessment.', 'relationship-type': { connects: { source: { node: 'fraud-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'settlement-to-broker', description: 'Settlement Service publishes Settlement.Completed event after payment initiation.', 'relationship-type': { connects: { source: { node: 'settlement-service' }, destination: { node: 'claims-event-broker', interfaces: ['event-broker-endpoint'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'broker-to-notification', description: 'Notification Service subscribes to all lifecycle events — sends real-time status updates to policyholders and adjusters.', 'relationship-type': { connects: { source: { node: 'claims-event-broker' }, destination: { node: 'notification-service', interfaces: ['notification-api'] } } }, protocol: 'EventBridge' },
      { 'unique-id': 'fnol-to-docstore', description: 'FNOL Service stores uploaded claim documents (photos, police reports, medical records) in S3.', 'relationship-type': { connects: { source: { node: 'fnol-service' }, destination: { node: 'document-store', interfaces: ['doc-store-s3'] } } }, protocol: 'HTTPS' },
      { 'unique-id': 'document-to-docstore', description: 'Document Service reads raw documents from S3 for OCR/Textract processing.', 'relationship-type': { connects: { source: { node: 'document-service' }, destination: { node: 'document-store', interfaces: ['doc-store-s3'] } } }, protocol: 'HTTPS' },
      { 'unique-id': 'claims-to-db', description: 'Claims Service reads and writes claim records, validation results, and status history.', 'relationship-type': { connects: { source: { node: 'claims-service' }, destination: { node: 'claims-db', interfaces: ['claims-db-endpoint'] } } }, protocol: 'JDBC' },
      { 'unique-id': 'customer-to-db', description: 'Customer Service reads and writes customer profiles, addresses, and vehicle records.', 'relationship-type': { connects: { source: { node: 'customer-service' }, destination: { node: 'claims-db', interfaces: ['claims-db-endpoint'] } } }, protocol: 'JDBC' },
      { 'unique-id': 'settlement-to-db', description: 'Settlement Service persists settlement calculations, payment records, and audit trail.', 'relationship-type': { connects: { source: { node: 'settlement-service' }, destination: { node: 'claims-db', interfaces: ['claims-db-endpoint'] } } }, protocol: 'JDBC' },
    ],
    flows: [
      {
        'unique-id': 'flow-claim-submission',
        name: 'Claim Submission & Processing',
        description: 'Event-driven choreography: FNOL → Claims validation → Document processing → Fraud detection → Settlement → Vendor coordination → Notification.',
        transitions: [
          { 'relationship-unique-id': 'fnol-to-docstore', 'sequence-number': 1, summary: 'Policyholder uploads claim documents to S3 via FNOL Service' },
          { 'relationship-unique-id': 'fnol-to-broker', 'sequence-number': 2, summary: 'FNOL Service publishes Claim.Filed event with incident details' },
          { 'relationship-unique-id': 'broker-to-claims', 'sequence-number': 3, summary: 'Claims Service validates FNOL data and accepts or rejects the claim' },
          { 'relationship-unique-id': 'claims-to-broker', 'sequence-number': 4, summary: 'Claims Service publishes Claim.Accepted event' },
          { 'relationship-unique-id': 'broker-to-document', 'sequence-number': 5, summary: 'Document Service processes uploaded documents via OCR/Textract' },
          { 'relationship-unique-id': 'document-to-broker', 'sequence-number': 6, summary: 'Document Service publishes Document.Processed with extracted structured data' },
          { 'relationship-unique-id': 'broker-to-fraud', 'sequence-number': 7, summary: 'Fraud Service validates extracted data against submission for discrepancies' },
          { 'relationship-unique-id': 'fraud-to-broker', 'sequence-number': 8, summary: 'Fraud Service publishes Fraud.Clear (or Fraud.Detected) event' },
          { 'relationship-unique-id': 'broker-to-settlement', 'sequence-number': 9, summary: 'Settlement Service calculates approved amount based on coverage and deductibles' },
          { 'relationship-unique-id': 'settlement-to-broker', 'sequence-number': 10, summary: 'Settlement Service publishes Settlement.Completed event' },
          { 'relationship-unique-id': 'broker-to-vendor', 'sequence-number': 11, summary: 'Vendor Service coordinates repair shops and medical providers for claim fulfillment' },
          { 'relationship-unique-id': 'broker-to-notification', 'sequence-number': 12, summary: 'Notification Service sends real-time status update to policyholder' },
        ],
      },
      {
        'unique-id': 'flow-customer-onboarding',
        name: 'Customer Onboarding',
        description: 'New customer registration flow — signup creates customer record, Claims Service receives context, Notification Service sends welcome confirmation.',
        transitions: [
          { 'relationship-unique-id': 'signup-to-broker', 'sequence-number': 1, summary: 'Signup Service publishes Customer.Created event after registration' },
          { 'relationship-unique-id': 'broker-to-claims', 'sequence-number': 2, summary: 'Claims Service receives new customer context for future claim lookups' },
          { 'relationship-unique-id': 'broker-to-notification', 'sequence-number': 3, summary: 'Notification Service sends welcome confirmation to new policyholder' },
        ],
      },
    ],
    decorators: [
      {
        $ref: 'decorators/capability-model.json',
        mappings: {
          'claims-processing': {
            capabilities: [
              'insurance-operations/claims-management/claims-adjudication',
              'insurance-operations/claims-management/claims-intake',
              'insurance-operations/claims-management/claims-settlement',
            ],
          },
          'fraud-detection': {
            capabilities: ['insurance-operations/fraud-prevention/fraud-scoring'],
          },
          'policy-admin': {
            capabilities: ['policy-management/policy-administration/coverage-management'],
          },
          'customer-engagement': { capabilities: ['insurance-operations/claims-management/claims-intake', 'insurance-operations/customer-communication/status-notifications'] },
          'claims-adjudication': { capabilities: ['insurance-operations/claims-management/claims-adjudication', 'insurance-operations/claims-management/claims-settlement'] },
          'claim-processing-services': { capabilities: ['insurance-operations/fraud-prevention/fraud-scoring', 'insurance-operations/claims-management/claims-intake'] },
          'signup-service': { capabilities: ['insurance-operations/claims-management/claims-intake'] },
          'fnol-service': { capabilities: ['insurance-operations/claims-management/claims-intake'] },
          'customer-service': { capabilities: ['insurance-operations/customer-communication/status-notifications'] },
          'claims-service': { capabilities: ['insurance-operations/claims-management/claims-adjudication'] },
          'document-service': { capabilities: ['insurance-operations/claims-management/claims-intake'] },
          'fraud-service': { capabilities: ['insurance-operations/fraud-prevention/fraud-scoring'] },
          'settlement-service': { capabilities: ['insurance-operations/claims-management/claims-settlement'] },
          'vendor-service': { capabilities: ['insurance-operations/claims-management/claims-settlement'] },
          'notification-service': { capabilities: ['insurance-operations/customer-communication/status-notifications'] },
        },
      },
    ],
    controls: {
      'identification-authentication': {
        description: 'NIST IA-2: Multi-factor authentication required for all user-facing endpoints (Signup, FNOL). mTLS for service-to-service via event broker.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/ia-2-identification-auth.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/auth-config.json' }],
      },
      'boundary-protection': {
        description: 'NIST SC-7: Network segmentation between intake services, event broker, and processing services. WAF on all external-facing endpoints.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-7-boundary-protection.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/firewall-config.json' }],
      },
      'protection-at-rest': {
        description: 'NIST SC-28: All PII data encrypted at rest using AES-256-GCM in Claims Database and Document Store (S3 SSE-KMS).',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-28-protection-at-rest.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/encryption-config.json' }],
      },
      'access-control': {
        description: 'NIST AC-6: Least-privilege RBAC. Adjusters limited to assigned claims. Vendor Service scoped to assigned work orders only.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/ac-6-least-privilege.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/rbac-config.json' }],
      },
      'audit-events': {
        description: 'NIST AU-2: All domain events logged to immutable audit trail — Customer.Created, Claim.Filed, Document.Processed, Fraud.Clear, Settlement.Completed.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/au-2-audit-events.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/audit-config.json' }],
      },
      'system-monitoring': {
        description: 'NIST SI-4: Real-time monitoring of event broker throughput, fraud detection accuracy, settlement processing latency, and dead-letter queue depth.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/si-4-system-monitoring.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/monitoring-config.json' }],
      },
      'cryptographic-protection': {
        description: 'NIST SC-13: TLS 1.3 for all transit. Document Store uses envelope encryption with KMS-managed keys. Event payloads signed with HMAC.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-13-cryptographic-protection.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/crypto-config.json' }],
      },
      'incident-handling': {
        description: 'NIST IR-4: Automated incident response for Fraud.Detected events. Dead-letter queue alerting for failed event processing. Vendor SLA breach escalation.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/ir-4-incident-handling.json', 'control-config-url': 'https://bar.example.com/claims-processing/controls/incident-config.json' }],
      },
    },
  }, null, 2);
}

// --------------------------------------------------------------------------
// Sample data: Policy Administration (linked to Claims Processing)
// --------------------------------------------------------------------------

export function generateSamplePolicyAdminArch(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/core.json',
    nodes: [
      // ---- Context-level actors ----
      {
        'unique-id': 'underwriter',
        'node-type': 'actor',
        name: 'Underwriter',
        description: 'Insurance underwriter who evaluates risk and sets policy terms.',
      },
      {
        'unique-id': 'policyholder',
        'node-type': 'actor',
        name: 'Policyholder',
        description: 'Customer who holds and manages insurance policies.',
      },
      // ---- System-of-interest ----
      {
        'unique-id': 'policy-admin',
        'node-type': 'system',
        name: 'Policy Administration System',
        description: 'System of record for policy details, coverage limits, endorsements, and renewal workflows.',
        'data-classification': 'PII',
      },
      // ---- External systems ----
      {
        'unique-id': 'claims-processing',
        'node-type': 'system',
        name: 'Claims Processing System',
        description: 'Core claims adjudication platform that retrieves policy details for coverage validation.',
      },
      {
        'unique-id': 'billing-system',
        'node-type': 'system',
        name: 'Billing System',
        description: 'Premium billing and payment collection system.',
      },
      // ---- Logical-level services ----
      {
        'unique-id': 'policy-api',
        'node-type': 'service',
        name: 'Policy API',
        description: 'REST API for policy CRUD operations, endorsements, and renewal triggers.',
        interfaces: [{ 'unique-id': 'policy-api-endpoint', host: 'policy-api.internal.example.com', port: 443 }],
        'data-classification': 'PII',
      },
      {
        'unique-id': 'underwriting-engine',
        'node-type': 'service',
        name: 'Underwriting Engine',
        description: 'Rules engine that evaluates risk factors and determines policy terms.',
        interfaces: [{ 'unique-id': 'uw-engine-grpc', host: 'uw-engine.internal.example.com', port: 9090 }],
      },
      {
        'unique-id': 'policy-db',
        'node-type': 'database',
        name: 'Policy Database',
        description: 'PostgreSQL database storing policy records, endorsements, and coverage history.',
        interfaces: [{ 'unique-id': 'policy-db-jdbc', host: 'policy-db.internal.example.com', port: 5432, database: 'policies' }],
        'data-classification': 'PII',
      },
    ],
    relationships: [
      // ---- Context-level ----
      {
        'unique-id': 'underwriter-manages-policy',
        description: 'Underwriter creates and modifies policy terms, coverage, and endorsements.',
        'relationship-type': { interacts: { actor: 'underwriter', nodes: ['policy-admin'] } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'policyholder-views-policy',
        description: 'Policyholder views policy details and requests changes.',
        'relationship-type': { interacts: { actor: 'policyholder', nodes: ['policy-admin'] } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'claims-reads-policy',
        description: 'Claims processing retrieves policy coverage details for adjudication.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'policy-admin' } } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'policy-to-billing',
        description: 'Policy administration triggers premium calculations and billing schedules.',
        'relationship-type': { connects: { source: { node: 'policy-admin' }, destination: { node: 'billing-system' } } },
        protocol: 'HTTPS',
      },
      // ---- Logical-level: composition ----
      { 'unique-id': 'system-composed-of-api', description: 'Policy Admin composed of Policy API.', 'relationship-type': { 'composed-of': { container: 'policy-admin', nodes: ['policy-api'] } } },
      { 'unique-id': 'system-composed-of-uw', description: 'Policy Admin composed of Underwriting Engine.', 'relationship-type': { 'composed-of': { container: 'policy-admin', nodes: ['underwriting-engine'] } } },
      { 'unique-id': 'system-composed-of-db', description: 'Policy Admin composed of Policy Database.', 'relationship-type': { 'composed-of': { container: 'policy-admin', nodes: ['policy-db'] } } },
      // ---- Logical-level: internal connects ----
      { 'unique-id': 'api-to-uw', description: 'Policy API routes underwriting requests to the engine.', 'relationship-type': { connects: { source: { node: 'policy-api' }, destination: { node: 'underwriting-engine', interfaces: ['uw-engine-grpc'] } } }, protocol: 'gRPC' },
      { 'unique-id': 'api-to-db', description: 'Policy API reads and writes policy records.', 'relationship-type': { connects: { source: { node: 'policy-api' }, destination: { node: 'policy-db', interfaces: ['policy-db-jdbc'] } } }, protocol: 'JDBC' },
    ],
    decorators: [
      {
        $ref: 'decorators/capability-model.json',
        mappings: {
          'policy-admin': {
            capabilities: [
              'policy-management/policy-administration/coverage-management',
              'policy-management/policy-administration/policy-renewal',
            ],
          },
        },
      },
    ],
    controls: {
      'identification-authentication': {
        description: 'NIST IA-2: Multi-factor authentication required for underwriter and policyholder access.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/ia-2-identification-auth.json', 'control-config-url': 'https://bar.example.com/policy-admin/controls/auth-config.json' }],
      },
      'boundary-protection': {
        description: 'NIST SC-7: Network segmentation between policy API and underwriting engine.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-7-boundary-protection.json', 'control-config-url': 'https://bar.example.com/policy-admin/controls/firewall-config.json' }],
      },
      'protection-at-rest': {
        description: 'NIST SC-28: All PII policy data encrypted at rest using AES-256-GCM.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-28-protection-at-rest.json', 'control-config-url': 'https://bar.example.com/policy-admin/controls/encryption-config.json' }],
      },
    },
  }, null, 2);
}

// --------------------------------------------------------------------------
// Sample data: Fraud Detection (linked to Claims Processing)
// --------------------------------------------------------------------------

export function generateSampleFraudDetectionArch(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/core.json',
    nodes: [
      // ---- Context-level actors ----
      {
        'unique-id': 'fraud-analyst',
        'node-type': 'actor',
        name: 'Fraud Analyst',
        description: 'Specialist who investigates flagged claims and manages fraud case workflows.',
      },
      // ---- System-of-interest ----
      {
        'unique-id': 'fraud-detection',
        'node-type': 'system',
        name: 'Fraud Detection Service',
        description: 'AI-powered fraud scoring and anomaly detection for insurance claims and policy applications.',
        'data-classification': 'Confidential',
      },
      // ---- External systems ----
      {
        'unique-id': 'claims-processing',
        'node-type': 'system',
        name: 'Claims Processing System',
        description: 'Core claims adjudication platform that sends claim data for fraud scoring.',
      },
      {
        'unique-id': 'siu-system',
        'node-type': 'system',
        name: 'Special Investigations Unit',
        description: 'Case management system for detailed fraud investigations.',
      },
      // ---- Logical-level services ----
      {
        'unique-id': 'fraud-scoring-api',
        'node-type': 'service',
        name: 'Fraud Scoring API',
        description: 'gRPC service providing real-time fraud risk scores for incoming claims.',
        interfaces: [{ 'unique-id': 'scoring-grpc', host: 'fraud-scoring.internal.example.com', port: 9090 }],
      },
      {
        'unique-id': 'ml-pipeline',
        'node-type': 'service',
        name: 'ML Model Pipeline',
        description: 'Machine learning pipeline for training and serving fraud detection models.',
        interfaces: [{ 'unique-id': 'ml-api', host: 'ml-pipeline.internal.example.com', port: 8080 }],
      },
      {
        'unique-id': 'fraud-db',
        'node-type': 'database',
        name: 'Fraud Analytics Database',
        description: 'Time-series database storing fraud scores, model predictions, and investigation outcomes.',
        interfaces: [{ 'unique-id': 'fraud-db-conn', host: 'fraud-db.internal.example.com', port: 5432, database: 'fraud_analytics' }],
        'data-classification': 'Confidential',
      },
    ],
    relationships: [
      // ---- Context-level ----
      {
        'unique-id': 'claims-sends-for-scoring',
        description: 'Claims processing sends claim data for real-time fraud scoring before adjudication.',
        'relationship-type': { connects: { source: { node: 'claims-processing' }, destination: { node: 'fraud-detection' } } },
        protocol: 'gRPC',
      },
      {
        'unique-id': 'analyst-reviews-flags',
        description: 'Fraud analyst reviews flagged claims and manages investigation workflows.',
        'relationship-type': { interacts: { actor: 'fraud-analyst', nodes: ['fraud-detection'] } },
        protocol: 'HTTPS',
      },
      {
        'unique-id': 'fraud-to-siu',
        description: 'Fraud detection escalates high-risk claims to the Special Investigations Unit.',
        'relationship-type': { connects: { source: { node: 'fraud-detection' }, destination: { node: 'siu-system' } } },
        protocol: 'HTTPS',
      },
      // ---- Logical-level: composition ----
      { 'unique-id': 'system-composed-of-scoring', description: 'Fraud Detection composed of Scoring API.', 'relationship-type': { 'composed-of': { container: 'fraud-detection', nodes: ['fraud-scoring-api'] } } },
      { 'unique-id': 'system-composed-of-ml', description: 'Fraud Detection composed of ML Pipeline.', 'relationship-type': { 'composed-of': { container: 'fraud-detection', nodes: ['ml-pipeline'] } } },
      { 'unique-id': 'system-composed-of-db', description: 'Fraud Detection composed of Analytics Database.', 'relationship-type': { 'composed-of': { container: 'fraud-detection', nodes: ['fraud-db'] } } },
      // ---- Logical-level: internal connects ----
      { 'unique-id': 'scoring-to-ml', description: 'Scoring API invokes ML models for real-time prediction.', 'relationship-type': { connects: { source: { node: 'fraud-scoring-api' }, destination: { node: 'ml-pipeline', interfaces: ['ml-api'] } } }, protocol: 'HTTPS' },
      { 'unique-id': 'scoring-to-db', description: 'Scoring API logs predictions and outcomes.', 'relationship-type': { connects: { source: { node: 'fraud-scoring-api' }, destination: { node: 'fraud-db', interfaces: ['fraud-db-conn'] } } }, protocol: 'JDBC' },
    ],
    decorators: [
      {
        $ref: 'decorators/capability-model.json',
        mappings: {
          'fraud-detection': {
            capabilities: [
              'insurance-operations/fraud-prevention/fraud-scoring',
              'insurance-operations/fraud-prevention/fraud-investigation',
            ],
          },
        },
      },
    ],
    controls: {
      'identification-authentication': {
        description: 'NIST IA-2: Service-to-service mTLS authentication for fraud scoring API.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/ia-2-identification-auth.json', 'control-config-url': 'https://bar.example.com/fraud-detection/controls/auth-config.json' }],
      },
      'protection-at-rest': {
        description: 'NIST SC-28: Fraud analytics data encrypted at rest using AES-256-GCM.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/nist/sc-28-protection-at-rest.json', 'control-config-url': 'https://bar.example.com/fraud-detection/controls/encryption-config.json' }],
      },
      'model-governance': {
        description: 'ML models must be versioned, auditable, and bias-tested before deployment.',
        requirements: [{ 'control-requirement-url': 'https://bar.example.com/standards/ml-governance.json', 'control-config-url': 'https://bar.example.com/fraud-detection/controls/ml-config.json' }],
      },
    },
  }, null, 2);
}

export function generateSampleCalmDecorator(): string {
  return JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/decorator.json',
    $id: 'https://bar.example.com/enterprise/capability-map.decorator.json',
    'unique-id': 'enterprise-capability-map',
    name: 'Insurance Enterprise Capability Map',
    description: 'Authoritative L1/L2/L3 business capability hierarchy governing portfolio architecture.',
    'decorator-type': 'business-capability',
    definitions: {
      'insurance-operations': {
        level: 'L1', name: 'Insurance Operations', description: 'Core insurance business functions.',
        children: {
          'claims-management': {
            level: 'L2', name: 'Claims Management', description: 'End-to-end claims lifecycle.',
            children: {
              'claims-adjudication': { level: 'L3', name: 'Claims Adjudication', description: 'Evaluation of claims against policy terms and coverage limits.' },
              'claims-intake': { level: 'L3', name: 'Claims Intake', description: 'First notice of loss capture and initial claim registration.' },
              'claims-settlement': { level: 'L3', name: 'Claims Settlement', description: 'Payment determination and disbursement for approved claims.' },
            },
          },
          'customer-communication': {
            level: 'L2', name: 'Customer Communication', description: 'Policyholder notifications and self-service interactions.',
            children: {
              'status-notifications': { level: 'L3', name: 'Status Notifications', description: 'Automated claim and policy status updates.' },
              'document-delivery': { level: 'L3', name: 'Document Delivery', description: 'Generation and delivery of policy documents.' },
            },
          },
          'fraud-prevention': {
            level: 'L2', name: 'Fraud Prevention', description: 'Detection and mitigation of fraudulent claims activity.',
            children: {
              'fraud-scoring': { level: 'L3', name: 'Fraud Scoring', description: 'AI-powered risk scoring of incoming claims.' },
              'fraud-investigation': { level: 'L3', name: 'Fraud Investigation', description: 'Case management for flagged claims requiring manual review.' },
            },
          },
        },
      },
      'policy-management': {
        level: 'L1', name: 'Policy Management', description: 'Policy lifecycle from underwriting through renewal.',
        children: {
          'policy-administration': {
            level: 'L2', name: 'Policy Administration', description: 'Policy issuance, endorsements, and maintenance.',
            children: {
              'coverage-management': { level: 'L3', name: 'Coverage Management', description: 'Coverage definition, limits, and exclusions.' },
              'policy-renewal': { level: 'L3', name: 'Policy Renewal', description: 'Automated and manual renewal workflows.' },
            },
          },
        },
      },
    },
  }, null, 2);
}
