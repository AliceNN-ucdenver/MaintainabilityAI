// ============================================================================
// Architecture Archetype Templates
// Pattern-starter CALM generators for common architectural patterns
// Each returns a single unified bar.arch.json string (context + logical merged)
// ============================================================================

export type ArchetypeId = 'three-tier' | 'event-driven' | 'data-pipeline';

export interface ArchetypeInfo {
  id: ArchetypeId;
  name: string;
  description: string;
}

export const ARCHETYPES: ArchetypeInfo[] = [
  {
    id: 'three-tier',
    name: 'Three-Tier Web Application',
    description: 'Classic layered architecture: web client, API server, auth service, database, identity provider.',
  },
  {
    id: 'event-driven',
    name: 'Event-Driven Microservices',
    description: 'API gateway, message broker, independent services, event store. Async messaging patterns.',
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    description: 'Ingestion, transformation, serving layers with orchestrator. Batch and streaming flows.',
  },
];

const SCHEMA = 'https://calm.finos.org/release/1.2/meta/core.json';

export function generateArchetype(id: ArchetypeId, appName: string, appId: string): string {
  switch (id) {
    case 'three-tier':
      return generateThreeTier(appName, appId);
    case 'event-driven':
      return generateEventDriven(appName, appId);
    case 'data-pipeline':
      return generateDataPipeline(appName, appId);
  }
}

// ============================================================================
// Three-Tier Web Application
// ============================================================================

function generateThreeTier(appName: string, appId: string): string {
  const pfx = appId.toLowerCase();

  return JSON.stringify({
    $schema: SCHEMA,
    nodes: [
      // Context-level
      { 'unique-id': `${pfx}-user`, 'node-type': 'actor', name: 'Web User', description: 'End user accessing the application via browser' },
      { 'unique-id': `${pfx}-system`, 'node-type': 'system', name: appName, description: `${appName} — three-tier web application` },
      { 'unique-id': `${pfx}-db`, 'node-type': 'system', name: 'Database', description: 'Relational database for persistent storage' },
      { 'unique-id': `${pfx}-idp`, 'node-type': 'system', name: 'Identity Provider', description: 'External identity and authentication provider (OAuth 2.0 / OIDC)' },
      // Logical-level (composed-of children)
      { 'unique-id': `${pfx}-web-frontend`, 'node-type': 'service', name: 'Web Frontend', description: 'Single-page application served to the browser' },
      { 'unique-id': `${pfx}-api-server`, 'node-type': 'service', name: 'API Server', description: 'RESTful API handling business logic' },
      { 'unique-id': `${pfx}-auth-service`, 'node-type': 'service', name: 'Auth Service', description: 'Authentication and authorization middleware' },
      { 'unique-id': `${pfx}-app-db`, 'node-type': 'database', name: 'Application DB', description: 'Primary relational database', 'data-classification': 'confidential' },
    ],
    relationships: [
      // Context-level
      {
        'unique-id': `${pfx}-user-to-system`,
        description: 'User accesses the web application',
        protocol: 'HTTPS',
        'relationship-type': { interacts: { actor: `${pfx}-user`, nodes: [`${pfx}-system`] } },
      },
      {
        'unique-id': `${pfx}-system-to-db`,
        description: 'Application reads/writes persistent data',
        protocol: 'TCP/SQL',
        'relationship-type': { connects: { source: { node: `${pfx}-system` }, destination: { node: `${pfx}-db` } } },
      },
      {
        'unique-id': `${pfx}-system-to-idp`,
        description: 'Application authenticates users via identity provider',
        protocol: 'HTTPS/OIDC',
        'relationship-type': { connects: { source: { node: `${pfx}-system` }, destination: { node: `${pfx}-idp` } } },
      },
      // Logical-level: composition
      {
        'unique-id': `${pfx}-composed-of`,
        'relationship-type': { 'composed-of': { container: `${pfx}-system`, nodes: [`${pfx}-web-frontend`, `${pfx}-api-server`, `${pfx}-auth-service`, `${pfx}-app-db`] } },
      },
      // Logical-level: internal connects
      {
        'unique-id': `${pfx}-frontend-to-api`,
        description: 'Frontend calls API endpoints',
        protocol: 'HTTPS/REST',
        'relationship-type': { connects: { source: { node: `${pfx}-web-frontend` }, destination: { node: `${pfx}-api-server` } } },
      },
      {
        'unique-id': `${pfx}-api-to-auth`,
        description: 'API validates tokens with auth service',
        protocol: 'Internal/gRPC',
        'relationship-type': { connects: { source: { node: `${pfx}-api-server` }, destination: { node: `${pfx}-auth-service` } } },
      },
      {
        'unique-id': `${pfx}-api-to-db`,
        description: 'API reads/writes application data',
        protocol: 'TCP/SQL',
        'relationship-type': { connects: { source: { node: `${pfx}-api-server` }, destination: { node: `${pfx}-app-db` } } },
      },
    ],
    flows: [
      {
        'unique-id': `${pfx}-user-request-flow`,
        name: 'User Request',
        description: 'End-to-end user request flow through the three tiers',
        transitions: [
          { 'relationship-unique-id': `${pfx}-frontend-to-api`, 'sequence-number': 1, summary: 'Browser sends API request' },
          { 'relationship-unique-id': `${pfx}-api-to-auth`, 'sequence-number': 2, summary: 'API validates authentication' },
          { 'relationship-unique-id': `${pfx}-api-to-db`, 'sequence-number': 3, summary: 'API queries database' },
        ],
      },
    ],
  }, null, 2);
}

// ============================================================================
// Event-Driven Microservices
// ============================================================================

function generateEventDriven(appName: string, appId: string): string {
  const pfx = appId.toLowerCase();

  return JSON.stringify({
    $schema: SCHEMA,
    nodes: [
      // Context-level
      { 'unique-id': `${pfx}-client`, 'node-type': 'actor', name: 'Client Applications', description: 'External client applications consuming the platform APIs' },
      { 'unique-id': `${pfx}-platform`, 'node-type': 'system', name: appName, description: `${appName} — event-driven microservices platform` },
      { 'unique-id': `${pfx}-event-bus`, 'node-type': 'system', name: 'Event Bus', description: 'Managed event streaming infrastructure (Kafka/EventBridge)' },
      { 'unique-id': `${pfx}-monitoring`, 'node-type': 'system', name: 'Monitoring', description: 'Observability platform for metrics, logs, and traces' },
      // Logical-level (composed-of children)
      { 'unique-id': `${pfx}-api-gateway`, 'node-type': 'service', name: 'API Gateway', description: 'Edge service handling routing, rate limiting, and authentication' },
      { 'unique-id': `${pfx}-message-broker`, 'node-type': 'network', name: 'Message Broker', description: 'Internal message bus for async inter-service communication' },
      { 'unique-id': `${pfx}-service-a`, 'node-type': 'service', name: 'Order Service', description: 'Handles order creation and lifecycle management' },
      { 'unique-id': `${pfx}-service-b`, 'node-type': 'service', name: 'Inventory Service', description: 'Manages product inventory and stock levels' },
      { 'unique-id': `${pfx}-service-c`, 'node-type': 'service', name: 'Notification Service', description: 'Sends notifications (email, SMS, push) on events' },
      { 'unique-id': `${pfx}-event-store`, 'node-type': 'database', name: 'Event Store', description: 'Append-only event log for event sourcing', 'data-classification': 'confidential' },
    ],
    relationships: [
      // Context-level
      {
        'unique-id': `${pfx}-client-to-platform`,
        description: 'Clients interact with the platform via API',
        protocol: 'HTTPS/REST',
        'relationship-type': { interacts: { actor: `${pfx}-client`, nodes: [`${pfx}-platform`] } },
      },
      {
        'unique-id': `${pfx}-platform-to-bus`,
        description: 'Platform publishes and consumes events',
        protocol: 'AMQP/Kafka',
        'relationship-type': { connects: { source: { node: `${pfx}-platform` }, destination: { node: `${pfx}-event-bus` } } },
      },
      {
        'unique-id': `${pfx}-bus-to-platform`,
        description: 'Event bus delivers events to platform services',
        protocol: 'AMQP/Kafka',
        'relationship-type': { connects: { source: { node: `${pfx}-event-bus` }, destination: { node: `${pfx}-platform` } } },
      },
      {
        'unique-id': `${pfx}-platform-to-monitoring`,
        description: 'Platform sends telemetry data',
        protocol: 'OTLP',
        'relationship-type': { connects: { source: { node: `${pfx}-platform` }, destination: { node: `${pfx}-monitoring` } } },
      },
      // Logical-level: composition
      {
        'unique-id': `${pfx}-composed-of`,
        'relationship-type': { 'composed-of': { container: `${pfx}-platform`, nodes: [`${pfx}-api-gateway`, `${pfx}-message-broker`, `${pfx}-service-a`, `${pfx}-service-b`, `${pfx}-service-c`, `${pfx}-event-store`] } },
      },
      // Logical-level: internal connects
      {
        'unique-id': `${pfx}-gw-to-order`,
        description: 'Gateway routes order requests',
        protocol: 'HTTPS/REST',
        'relationship-type': { connects: { source: { node: `${pfx}-api-gateway` }, destination: { node: `${pfx}-service-a` } } },
      },
      {
        'unique-id': `${pfx}-order-to-broker`,
        description: 'Order service publishes order events',
        protocol: 'AMQP',
        'relationship-type': { connects: { source: { node: `${pfx}-service-a` }, destination: { node: `${pfx}-message-broker` } } },
      },
      {
        'unique-id': `${pfx}-broker-to-inventory`,
        description: 'Broker delivers events to inventory service',
        protocol: 'AMQP',
        'relationship-type': { connects: { source: { node: `${pfx}-message-broker` }, destination: { node: `${pfx}-service-b` } } },
      },
      {
        'unique-id': `${pfx}-broker-to-notification`,
        description: 'Broker delivers events to notification service',
        protocol: 'AMQP',
        'relationship-type': { connects: { source: { node: `${pfx}-message-broker` }, destination: { node: `${pfx}-service-c` } } },
      },
      {
        'unique-id': `${pfx}-order-to-store`,
        description: 'Order service persists events',
        protocol: 'TCP/SQL',
        'relationship-type': { connects: { source: { node: `${pfx}-service-a` }, destination: { node: `${pfx}-event-store` } } },
      },
    ],
    flows: [
      {
        'unique-id': `${pfx}-order-flow`,
        name: 'Place Order',
        description: 'Order placed by client, events propagated to downstream services',
        transitions: [
          { 'relationship-unique-id': `${pfx}-gw-to-order`, 'sequence-number': 1, summary: 'API gateway routes order request' },
          { 'relationship-unique-id': `${pfx}-order-to-store`, 'sequence-number': 2, summary: 'Order service persists event' },
          { 'relationship-unique-id': `${pfx}-order-to-broker`, 'sequence-number': 3, summary: 'Order service publishes OrderCreated event' },
          { 'relationship-unique-id': `${pfx}-broker-to-inventory`, 'sequence-number': 4, summary: 'Inventory service reserves stock' },
          { 'relationship-unique-id': `${pfx}-broker-to-notification`, 'sequence-number': 5, summary: 'Notification service sends confirmation' },
        ],
      },
    ],
  }, null, 2);
}

// ============================================================================
// Data Pipeline
// ============================================================================

function generateDataPipeline(appName: string, appId: string): string {
  const pfx = appId.toLowerCase();

  return JSON.stringify({
    $schema: SCHEMA,
    nodes: [
      // Context-level
      { 'unique-id': `${pfx}-sources`, 'node-type': 'actor', name: 'Source Systems', description: 'Upstream systems producing raw data (APIs, databases, files)' },
      { 'unique-id': `${pfx}-platform`, 'node-type': 'system', name: appName, description: `${appName} — data processing platform` },
      { 'unique-id': `${pfx}-consumers`, 'node-type': 'actor', name: 'Analytics Consumers', description: 'Downstream analytics tools, dashboards, and ML models' },
      { 'unique-id': `${pfx}-lake`, 'node-type': 'system', name: 'Data Lake', description: 'Cloud object storage for raw and processed data (S3/GCS/ADLS)' },
      // Logical-level (composed-of children)
      { 'unique-id': `${pfx}-ingestion`, 'node-type': 'service', name: 'Ingestion Layer', description: 'Collects and validates raw data from source systems (batch & streaming)' },
      { 'unique-id': `${pfx}-transform`, 'node-type': 'service', name: 'Transformation Engine', description: 'Cleans, enriches, and transforms data (Spark/dbt)' },
      { 'unique-id': `${pfx}-serving`, 'node-type': 'service', name: 'Serving Layer', description: 'Exposes curated data via APIs and query engines' },
      { 'unique-id': `${pfx}-orchestrator`, 'node-type': 'service', name: 'Orchestrator', description: 'Workflow scheduler (Airflow/Dagster) managing pipeline DAGs' },
      { 'unique-id': `${pfx}-raw-store`, 'node-type': 'database', name: 'Raw Store', description: 'Raw data landing zone', 'data-classification': 'internal' },
      { 'unique-id': `${pfx}-curated-store`, 'node-type': 'database', name: 'Curated Store', description: 'Transformed, queryable data warehouse', 'data-classification': 'confidential' },
    ],
    relationships: [
      // Context-level
      {
        'unique-id': `${pfx}-sources-to-platform`,
        description: 'Source systems push data to the platform',
        protocol: 'HTTPS/CDC',
        'relationship-type': { interacts: { actor: `${pfx}-sources`, nodes: [`${pfx}-platform`] } },
      },
      {
        'unique-id': `${pfx}-platform-to-lake`,
        description: 'Platform writes raw and curated data to the lake',
        protocol: 'S3 API',
        'relationship-type': { connects: { source: { node: `${pfx}-platform` }, destination: { node: `${pfx}-lake` } } },
      },
      {
        'unique-id': `${pfx}-consumers-to-platform`,
        description: 'Consumers query processed data via serving layer',
        protocol: 'HTTPS/SQL',
        'relationship-type': { interacts: { actor: `${pfx}-consumers`, nodes: [`${pfx}-platform`] } },
      },
      // Logical-level: composition
      {
        'unique-id': `${pfx}-composed-of`,
        'relationship-type': { 'composed-of': { container: `${pfx}-platform`, nodes: [`${pfx}-ingestion`, `${pfx}-transform`, `${pfx}-serving`, `${pfx}-orchestrator`, `${pfx}-raw-store`, `${pfx}-curated-store`] } },
      },
      // Logical-level: internal connects
      {
        'unique-id': `${pfx}-ingest-to-raw`,
        description: 'Ingestion writes raw data',
        protocol: 'S3/Parquet',
        'relationship-type': { connects: { source: { node: `${pfx}-ingestion` }, destination: { node: `${pfx}-raw-store` } } },
      },
      {
        'unique-id': `${pfx}-raw-to-transform`,
        description: 'Transformation reads raw data',
        protocol: 'S3/Parquet',
        'relationship-type': { connects: { source: { node: `${pfx}-raw-store` }, destination: { node: `${pfx}-transform` } } },
      },
      {
        'unique-id': `${pfx}-transform-to-curated`,
        description: 'Transformation writes curated data',
        protocol: 'SQL/Parquet',
        'relationship-type': { connects: { source: { node: `${pfx}-transform` }, destination: { node: `${pfx}-curated-store` } } },
      },
      {
        'unique-id': `${pfx}-curated-to-serving`,
        description: 'Serving reads curated data',
        protocol: 'SQL',
        'relationship-type': { connects: { source: { node: `${pfx}-curated-store` }, destination: { node: `${pfx}-serving` } } },
      },
      {
        'unique-id': `${pfx}-orch-to-ingest`,
        description: 'Orchestrator triggers ingestion jobs',
        protocol: 'Internal/gRPC',
        'relationship-type': { connects: { source: { node: `${pfx}-orchestrator` }, destination: { node: `${pfx}-ingestion` } } },
      },
      {
        'unique-id': `${pfx}-orch-to-transform`,
        description: 'Orchestrator triggers transformation jobs',
        protocol: 'Internal/gRPC',
        'relationship-type': { connects: { source: { node: `${pfx}-orchestrator` }, destination: { node: `${pfx}-transform` } } },
      },
    ],
    flows: [
      {
        'unique-id': `${pfx}-batch-ingest-flow`,
        name: 'Batch Ingest',
        description: 'Scheduled batch data ingestion through the pipeline',
        transitions: [
          { 'relationship-unique-id': `${pfx}-orch-to-ingest`, 'sequence-number': 1, summary: 'Orchestrator triggers ingestion job' },
          { 'relationship-unique-id': `${pfx}-ingest-to-raw`, 'sequence-number': 2, summary: 'Ingestion writes raw data' },
          { 'relationship-unique-id': `${pfx}-orch-to-transform`, 'sequence-number': 3, summary: 'Orchestrator triggers transformation' },
          { 'relationship-unique-id': `${pfx}-raw-to-transform`, 'sequence-number': 4, summary: 'Transform reads raw data' },
          { 'relationship-unique-id': `${pfx}-transform-to-curated`, 'sequence-number': 5, summary: 'Transform writes curated data' },
          { 'relationship-unique-id': `${pfx}-curated-to-serving`, 'sequence-number': 6, summary: 'Serving layer refreshes from curated store' },
        ],
      },
    ],
  }, null, 2);
}
