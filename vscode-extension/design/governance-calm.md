# CALM as the DSL for the BAR Architecture Folder

## The Question

Can CALM (Common Architecture Language Model) serve as the domain-specific language that generates the four architectural views referenced in the BAR's `architecture/` folder: **context**, **logical**, **sequence**, and **conceptual** diagrams? And specifically, how should hierarchical business capabilities (L1, L2, L3) be modeled: through CALM's metadata or its decorators mechanism?

## The Verdict

**All four views are now fully addressable in CALM.** With the release of Schema 1.2 on February 13, 2026, CALM's decorators mechanism is production-ready and provides the definitive approach for modeling hierarchical business capabilities. Context, logical, and sequence views map natively to CALM's established primitives. The conceptual view, which depends on L1/L2/L3 capability hierarchies, is served by decorators. There is no longer a gap. The deeper finding is that CALM becomes the single source of truth from which the entire BAR is derived, not just the architecture/ folder.

---

## Decorators vs. Metadata: The Right Tool for Business Capabilities

This is a foundational design decision because it determines how the conceptual view is generated and, more broadly, how the BAR connects business intent to technical implementation across the entire portfolio.

### Why This Matters for the Conceptual View

Business capabilities are inherently:
- **Hierarchical**: L1 (Insurance Operations) decomposes into L2 (Claims Management) which decomposes into L3 (Claims Adjudication, Claims Intake, Claims Settlement)
- **Cross-cutting**: A single L2 capability like "Customer Communication" might be realized by services across multiple business applications
- **Independently managed**: The capability map is an enterprise artifact, not an application artifact. It exists before any specific application architecture and outlives individual implementations
- **Structurally significant**: Capability mappings drive governance decisions, investment prioritization, and rationalization. They are not supplementary context; they are strategic data

### Metadata: What It Is and Why It Falls Short

CALM metadata is an arbitrary collection of key-value objects that can be attached to nodes, relationships, or the entire architecture. The documentation describes it as a way to capture "additional information that doesn't fit neatly into nodes or relationships." Common uses include compliance tags, versioning information, and custom extensions.

A capability mapping in metadata would look like this:

```json
{
  "metadata": [
    {
      "key": "business-capabilities",
      "value": {
        "l1": "insurance-operations",
        "l2": "claims-management",
        "l3": ["claims-adjudication", "claims-intake", "claims-settlement"]
      }
    }
  ]
}
```

**The problems:**

1. **No schema validation.** Metadata accepts any structure. There is nothing preventing one team from writing `"l1": "insurance-operations"` and another from writing `"level-1-capability": "Insurance Ops"`. Across a portfolio of hundreds of BARs, this inconsistency makes aggregation and the enterprise-wide conceptual view unreliable.

2. **Flat by nature.** Metadata is a list of key-value pairs. Encoding a three-level hierarchy requires convention, and convention without enforcement is a governance gap. The BAR article's core thesis is that governance gaps get exploited.

3. **Application-scoped.** Metadata lives inside the architecture file. The capability hierarchy, however, is an enterprise concern that should be defined once and referenced by many BARs. Embedding it in each application's metadata means the capability map is distributed across hundreds of files with no authoritative source.

4. **Not designed for cross-cutting concerns.** Metadata enriches a single architecture model. Business capabilities cut across multiple models, multiple applications, and multiple BAR repositories. Metadata has no mechanism for this.

### Decorators: What They Are and Why They Fit

CALM decorators, released in Schema 1.2 (February 13, 2026), are purpose-built for cross-cutting architecture information. They layer structured, validated, cross-cutting context onto existing architecture models without modifying the core architectural definition. The feature originated from issue #1864 ("Add decorators for cross-cutting architecture information") and was finalized through the schema governance process as PR #1871.

The key architectural distinction: **metadata enriches a model from the inside; decorators enrich a model from the outside.**

This distinction is precisely what hierarchical business capabilities require. The capability map is an enterprise-level overlay that decorates application-level architectures with business context. It is not an intrinsic property of any single application; it is a cross-cutting lens through which the enterprise views its portfolio.

**A decorator-based capability mapping works like this:**

The enterprise maintains a single, authoritative business capability model as a standalone CALM artifact:

```json
{
  "$schema": "https://calm.finos.org/release/1.2/meta/decorator.json",
  "$id": "https://bar.example.com/enterprise/capability-map.decorator.json",
  "unique-id": "enterprise-capability-map",
  "name": "Enterprise Business Capability Map",
  "description": "Authoritative L1/L2/L3 business capability hierarchy for portfolio governance.",
  "decorator-type": "business-capability",
  "definitions": {
    "insurance-operations": {
      "level": "L1",
      "name": "Insurance Operations",
      "description": "Core insurance business functions spanning underwriting, claims, and servicing.",
      "children": {
        "claims-management": {
          "level": "L2",
          "name": "Claims Management",
          "description": "End-to-end claims lifecycle from intake through settlement.",
          "children": {
            "claims-adjudication": {
              "level": "L3",
              "name": "Claims Adjudication",
              "description": "Evaluation of claims against policy terms and coverage limits."
            },
            "claims-intake": {
              "level": "L3",
              "name": "Claims Intake",
              "description": "First notice of loss capture and initial claim registration."
            },
            "claims-settlement": {
              "level": "L3",
              "name": "Claims Settlement",
              "description": "Payment determination and disbursement for approved claims."
            }
          }
        },
        "customer-communication": {
          "level": "L2",
          "name": "Customer Communication",
          "description": "Policyholder notifications, correspondence, and self-service interactions.",
          "children": {
            "status-notifications": {
              "level": "L3",
              "name": "Status Notifications",
              "description": "Automated claim and policy status updates to policyholders."
            },
            "document-delivery": {
              "level": "L3",
              "name": "Document Delivery",
              "description": "Generation and delivery of policy documents and correspondence."
            }
          }
        }
      }
    }
  }
}
```

Individual application architectures then reference the decorator, mapping their nodes to specific capabilities:

```json
{
  "decorators": [
    {
      "$ref": "https://bar.example.com/enterprise/capability-map.decorator.json",
      "applications": {
        "claims-processing": {
          "capabilities": [
            "insurance-operations/claims-management/claims-adjudication",
            "insurance-operations/claims-management/claims-intake",
            "insurance-operations/claims-management/claims-settlement"
          ]
        },
        "claims-api": {
          "capabilities": [
            "insurance-operations/claims-management/claims-intake"
          ]
        },
        "claims-engine": {
          "capabilities": [
            "insurance-operations/claims-management/claims-adjudication"
          ]
        },
        "notification-service": {
          "capabilities": [
            "insurance-operations/customer-communication/status-notifications"
          ]
        }
      }
    }
  ]
}
```

**Why this works for hierarchical capabilities:**

1. **Single authoritative source.** The capability hierarchy is defined once and referenced by every BAR. When L2 "Claims Management" splits into L2 "Claims Processing" and L2 "Claims Recovery," the change happens in one file and propagates to every application that references it.

2. **Hierarchy is structural, not conventional.** The parent-child relationship between L1, L2, and L3 is encoded in the tree structure of the decorator definition, not in naming conventions that each team interprets differently.

3. **Cross-cutting by design.** The same L3 capability "Status Notifications" can be mapped to nodes in the Claims Processing BAR, the Policy Administration BAR, and the Billing BAR. The enterprise conceptual view aggregates these references to show which applications realize which capabilities, something metadata cannot do without external tooling.

4. **Separately governed.** The capability map decorator can live in its own repository with its own governance (owned by business architecture). Application teams reference it but cannot modify it. This is the same separation of concerns the BAR uses between architecture/ and governance/.

5. **Schema-validatable.** Because decorators have a defined schema in the 1.2 release, the CALM CLI can validate that every capability reference in an application's decorator mapping actually exists in the enterprise capability hierarchy. Typos, stale references, and invented capabilities are caught in the PR pipeline.

### The Comparison in Summary

| Criterion | Metadata | Decorators |
|---|---|---|
| Schema validation of hierarchy | No, arbitrary structure | Yes, structured and validatable |
| Hierarchy modeling | Flat key-value, convention-dependent | Native tree structure |
| Scope | Application-internal | Cross-cutting, enterprise-wide |
| Authoritative source | Distributed across BARs | Single enterprise artifact, referenced |
| Governance separation | Embedded in app model | Independently managed and versioned |
| Enterprise aggregation | Requires external tooling | Native, decorator refs are aggregatable |
| CALM version support | 1.0-rc1 and later | Schema 1.2 (released Feb 13, 2026) |

**Recommendation: Decorators.** There is no reason to use metadata for business capabilities now that Schema 1.2 is released. Decorators are the right mechanism by design intent, by schema capability, and by governance alignment. Metadata remains the right choice for application-specific enrichment that does not cross BAR boundaries (for example, ADR references, team ownership, or custom operational tags).

---

## View-by-View Mapping

### 1. Context View --> CALM Native Fit: Excellent

The context view shows the business application in its environment: external actors, neighboring systems, and the high-level interactions between them. In CALM, this is the natural first-order model.

**CALM primitives used:**
- Nodes with `node-type: system` (the application itself and neighboring systems)
- Nodes with `node-type: actor` (users, external parties)
- Relationships with `relationship-type: interacts` (the arrows between them)

**How it works:** You define only the outermost boundary. The business application is a single node of type `system`. Every external entity it touches is another node. The `interacts` relationship captures the nature of each interaction. No interfaces are required at this level; they are implicit, which keeps the context view clean and intentional.

**Visualization:** `calm visualize` generates an SVG from this model directly. The `calm docify` and `calm template` commands can produce Mermaid, PlantUML, or static diagrams through template bundles.

### 2. Logical View --> CALM Native Fit: Strong

The logical view decomposes the system into its internal components: services, databases, networks, and the connections between them. CALM handles this through hierarchical decomposition.

**CALM primitives used:**
- The `composed-of` relationship type links the parent system node to its child service/database/network nodes
- `connects` relationships with explicit `interfaces` (host-port, URL, JDBC) show how internal components wire together
- The `details` property on the parent node links to the detailed architecture (this is CALM's drill-down mechanism)
- `data-classification` on nodes carrying sensitive data (feeds directly into `information-risk/data-classification.yaml`)
- `controls` on relationships encode security and compliance requirements

**How it works:** As of D31, the context and logical views live in a single unified `bar.arch.json` file. The context view and the logical view are projections derived from this single source, not separate files. The context projection shows actors, the system-of-interest (collapsed), and external systems. The logical projection shows the system-of-interest expanded as a container with its composed-of children (see D32). This eliminates cross-file consistency issues while preserving the distinct visual representations. Governance teams can still validate context-level concerns independently because the projection rules produce a clean separation of concerns at the view level.

### 3. Sequence View --> CALM Native Fit: Direct

The sequence view shows ordered interactions across components for a specific scenario. CALM's `flows` with `transitions` are purpose-built for this.

**CALM primitives used:**
- `flows` array containing named flow objects
- Each flow has `transitions` with:
  - `relationship-unique-id` referencing an existing relationship
  - `sequence-number` ordering the steps
  - `summary` describing what happens at each step

**How it works:** Flows reference relationships that already exist in the model. They do not invent new connections; they trace a path through the existing architecture for a specific use case. This is a powerful constraint: a sequence diagram cannot reference a connection that does not exist in the logical view, which means the two views are structurally consistent by construction.

**Visualization:** The CALM template system supports flow-to-Mermaid-sequence-diagram generation. The template bundle `flow-visualizer` (referenced in CALM issue #890) transforms transitions into sequence diagrams.

### 4. Conceptual View --> CALM Fit via Decorators: Strong

The conceptual view shows business capabilities and the mapping of capabilities to systems. CALM Schema 1.2's decorators provide the mechanism.

**CALM primitives used:**
- A standalone **decorator** artifact defining the enterprise capability hierarchy (L1/L2/L3)
- **Decorator references** in each application's CALM model mapping nodes to specific L3 capabilities
- The tree structure in the decorator definition mirrors the L1 > L2 > L3 decomposition natively

**How it works:** The conceptual view is generated by inverting the decorator mappings. Instead of asking "what capabilities does this application realize?" (the application-level question), the template asks "which applications realize this capability?" (the enterprise-level question). A template bundle traverses all BARs that reference the enterprise capability decorator and produces a heat map, matrix, or tree diagram showing capability coverage across the portfolio.

**This is the only view that requires information from outside the individual BAR.** Context, logical, and sequence views are self-contained. The conceptual view is inherently a portfolio-level aggregation. This is precisely why decorators, not metadata, are the right mechanism: they create the cross-BAR references that make enterprise-level visualization possible.

---

## The Bigger Opportunity: CALM Beyond the Architecture Folder

The BAR article positions the `architecture/` folder as Pillar 1. But a single CALM model, augmented with decorators, controls, and data-classification properties, actually feeds artifacts across all four pillars.

| BAR Artifact | Pillar | CALM Source |
|---|---|---|
| `architecture/context.png` | 1 | `bar.arch.json` context projection: actors + system-of-interest + external systems |
| `architecture/logical.png` | 1 | `bar.arch.json` logical projection: composed-of decomposition + connects relationships |
| `architecture/sequence.png` | 1 | `bar.arch.json`: flows with transitions |
| `architecture/conceptual.png` | 1 | Decorator: capability hierarchy + node-to-capability mappings |
| `security/threat-model.json` | 4 | `bar.arch.json`: logical nodes + interfaces + data-classification + controls |
| `information-risk/data-classification.yaml` | 2 | `bar.arch.json`: `data-classification` property on nodes |
| `operations/service-mapping.yaml` | 3 | `bar.arch.json`: connects relationships + interfaces + deployed-in relationships |
| `governance/decisions.yaml` | All | `bar.arch.json`: controls + metadata linking to ADRs |

The threat model ingests logical, context, and sequence views plus data classification, all of which live in the CALM model. The service mapping is the connects/deployed-in relationships exported as YAML. The data classification fields are a direct extraction of `data-classification` properties from nodes. The governance decisions can be linked via CALM's controls mechanism, where each control references the ADR that justified it.

**This means the CALM model is not just the source for the architecture/ folder. It is the single source of truth from which the entire BAR is derived.** The other YAML and JSON files in the BAR become generated artifacts, not hand-maintained ones. And that is where the autonomous governance promise lands: change the CALM model, and the pipeline regenerates the derived artifacts, validates cross-file consistency, and triggers the appropriate governance reviews.

---

## Working Example: A Sample Business Application in CALM

Below is a concrete example for a "Claims Processing" business application, showing how one CALM model produces the context, logical, and sequence views, and how a decorator provides the capability mapping for the conceptual view. All examples target CALM Schema 1.2.

### Enterprise Capability Map Decorator (`enterprise/capability-map.decorator.json`)

This file lives outside any individual BAR. It is the enterprise's authoritative capability hierarchy, owned by business architecture.

```json
{
  "$schema": "https://calm.finos.org/release/1.2/meta/decorator.json",
  "$id": "https://bar.example.com/enterprise/capability-map.decorator.json",
  "unique-id": "enterprise-capability-map",
  "name": "Insurance Enterprise Capability Map",
  "description": "Authoritative L1/L2/L3 business capability hierarchy governing portfolio architecture.",
  "decorator-type": "business-capability",
  "definitions": {
    "insurance-operations": {
      "level": "L1",
      "name": "Insurance Operations",
      "description": "Core insurance business functions.",
      "children": {
        "claims-management": {
          "level": "L2",
          "name": "Claims Management",
          "description": "End-to-end claims lifecycle.",
          "children": {
            "claims-adjudication": {
              "level": "L3",
              "name": "Claims Adjudication",
              "description": "Evaluation of claims against policy terms and coverage limits."
            },
            "claims-intake": {
              "level": "L3",
              "name": "Claims Intake",
              "description": "First notice of loss capture and initial claim registration."
            },
            "claims-settlement": {
              "level": "L3",
              "name": "Claims Settlement",
              "description": "Payment determination and disbursement for approved claims."
            }
          }
        },
        "customer-communication": {
          "level": "L2",
          "name": "Customer Communication",
          "description": "Policyholder notifications and self-service interactions.",
          "children": {
            "status-notifications": {
              "level": "L3",
              "name": "Status Notifications",
              "description": "Automated claim and policy status updates."
            },
            "document-delivery": {
              "level": "L3",
              "name": "Document Delivery",
              "description": "Generation and delivery of policy documents."
            }
          }
        },
        "fraud-prevention": {
          "level": "L2",
          "name": "Fraud Prevention",
          "description": "Detection and mitigation of fraudulent claims activity.",
          "children": {
            "fraud-scoring": {
              "level": "L3",
              "name": "Fraud Scoring",
              "description": "AI-powered risk scoring of incoming claims."
            },
            "fraud-investigation": {
              "level": "L3",
              "name": "Fraud Investigation",
              "description": "Case management for flagged claims requiring manual review."
            }
          }
        }
      }
    },
    "policy-management": {
      "level": "L1",
      "name": "Policy Management",
      "description": "Policy lifecycle from underwriting through renewal.",
      "children": {
        "policy-administration": {
          "level": "L2",
          "name": "Policy Administration",
          "description": "Policy issuance, endorsements, and maintenance.",
          "children": {
            "coverage-management": {
              "level": "L3",
              "name": "Coverage Management",
              "description": "Coverage definition, limits, and exclusions."
            },
            "policy-renewal": {
              "level": "L3",
              "name": "Policy Renewal",
              "description": "Automated and manual renewal workflows."
            }
          }
        }
      }
    }
  }
}
```

### Unified Architecture (`claims-processing/architecture/bar.arch.json`)

> **Design decision D31:** All CALM data lives in a single `bar.arch.json`. Context and logical are projections, not separate sources. The context projection shows actors + system-of-interest (collapsed) + external systems. The logical projection shows system-of-interest expanded as container + composed-of children (D32). CALM 1.2 schema is stored locally at `src/schemas/calm/1.2/` (D33).

```json
{
  "$schema": "https://calm.finos.org/release/1.2/meta/core.json",
  "nodes": [
    {
      "unique-id": "claims-processing",
      "node-type": "system",
      "name": "Claims Processing System",
      "description": "Core claims adjudication and processing platform for insurance claims lifecycle management.",
      "data-classification": "PII",
      "details": {
        "required-pattern": "https://bar.example.com/patterns/three-tier-api.pattern.json"
      }
    },
    {
      "unique-id": "claims-adjuster",
      "node-type": "actor",
      "name": "Claims Adjuster",
      "description": "Internal employee who reviews and adjudicates insurance claims."
    },
    {
      "unique-id": "policyholder",
      "node-type": "actor",
      "name": "Policyholder",
      "description": "Customer who submits and tracks insurance claims."
    },
    {
      "unique-id": "policy-admin",
      "node-type": "system",
      "name": "Policy Administration System",
      "description": "System of record for policy details, coverage limits, and endorsements."
    },
    {
      "unique-id": "payment-gateway",
      "node-type": "system",
      "name": "Payment Gateway",
      "description": "External payment processing for claim settlements and disbursements."
    },
    {
      "unique-id": "fraud-detection",
      "node-type": "system",
      "name": "Fraud Detection Service",
      "description": "AI-powered fraud scoring and anomaly detection for incoming claims."
    },
    {
      "unique-id": "claims-api",
      "node-type": "service",
      "name": "Claims API Gateway",
      "description": "REST API gateway handling claim submission, status queries, and adjudication workflows.",
      "interfaces": [
        {
          "unique-id": "claims-api-endpoint",
          "host": "claims-api.internal.example.com",
          "port": 443
        }
      ],
      "data-classification": "PII"
    },
    {
      "unique-id": "claims-engine",
      "node-type": "service",
      "name": "Claims Adjudication Engine",
      "description": "Business rules engine that evaluates claims against policy coverage and adjudication criteria.",
      "interfaces": [
        {
          "unique-id": "engine-grpc",
          "host": "claims-engine.internal.example.com",
          "port": 9090
        }
      ]
    },
    {
      "unique-id": "claims-db",
      "node-type": "database",
      "name": "Claims Database",
      "description": "PostgreSQL database storing claim records, documents, and adjudication history.",
      "interfaces": [
        {
          "unique-id": "claims-db-jdbc",
          "host": "claims-db.internal.example.com",
          "port": 5432,
          "database": "claims",
          "username": "${DB_USERNAME}",
          "password": "${DB_PASSWORD}"
        }
      ],
      "data-classification": "PII"
    },
    {
      "unique-id": "notification-service",
      "node-type": "service",
      "name": "Notification Service",
      "description": "Sends claim status updates to policyholders via email and SMS.",
      "interfaces": [
        {
          "unique-id": "notification-api",
          "host": "notifications.internal.example.com",
          "port": 443
        }
      ]
    },
    {
      "unique-id": "claims-event-bus",
      "node-type": "network",
      "name": "Claims Event Bus",
      "description": "Kafka-based event bus for asynchronous claim lifecycle events.",
      "interfaces": [
        {
          "unique-id": "kafka-broker",
          "host": "kafka.internal.example.com",
          "port": 9092
        }
      ]
    }
  ],
  "relationships": [
    {
      "unique-id": "policyholder-submits-claim",
      "description": "Policyholder submits new claims and checks claim status.",
      "relationship-type": {
        "interacts": {
          "actor": "policyholder",
          "nodes": ["claims-processing"]
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "adjuster-reviews-claim",
      "description": "Claims adjuster reviews, adjudicates, and updates claim decisions.",
      "relationship-type": {
        "interacts": {
          "actor": "claims-adjuster",
          "nodes": ["claims-processing"]
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "claims-to-policy",
      "description": "Claims processing retrieves policy details and coverage information.",
      "relationship-type": {
        "interacts": {
          "actor": "claims-processing",
          "nodes": ["policy-admin"]
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "claims-to-payment",
      "description": "Claims processing initiates settlement payments.",
      "relationship-type": {
        "interacts": {
          "actor": "claims-processing",
          "nodes": ["payment-gateway"]
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "claims-to-fraud",
      "description": "Claims processing sends claim data for fraud scoring before adjudication.",
      "relationship-type": {
        "interacts": {
          "actor": "claims-processing",
          "nodes": ["fraud-detection"]
        }
      },
      "protocol": "gRPC"
    },
    {
      "unique-id": "system-composed-of-api",
      "description": "Claims Processing is composed of the Claims API Gateway.",
      "relationship-type": {
        "composed-of": {
          "container": "claims-processing",
          "nodes": ["claims-api"]
        }
      }
    },
    {
      "unique-id": "system-composed-of-engine",
      "description": "Claims Processing is composed of the Adjudication Engine.",
      "relationship-type": {
        "composed-of": {
          "container": "claims-processing",
          "nodes": ["claims-engine"]
        }
      }
    },
    {
      "unique-id": "system-composed-of-db",
      "description": "Claims Processing is composed of the Claims Database.",
      "relationship-type": {
        "composed-of": {
          "container": "claims-processing",
          "nodes": ["claims-db"]
        }
      }
    },
    {
      "unique-id": "system-composed-of-notifications",
      "description": "Claims Processing is composed of the Notification Service.",
      "relationship-type": {
        "composed-of": {
          "container": "claims-processing",
          "nodes": ["notification-service"]
        }
      }
    },
    {
      "unique-id": "system-composed-of-eventbus",
      "description": "Claims Processing is composed of the Claims Event Bus.",
      "relationship-type": {
        "composed-of": {
          "container": "claims-processing",
          "nodes": ["claims-event-bus"]
        }
      }
    },
    {
      "unique-id": "api-to-engine",
      "description": "API Gateway routes adjudication requests to the Claims Engine.",
      "relationship-type": {
        "connects": {
          "source": { "node": "claims-api" },
          "destination": { "node": "claims-engine", "interfaces": ["engine-grpc"] }
        }
      },
      "protocol": "gRPC"
    },
    {
      "unique-id": "engine-to-db",
      "description": "Claims Engine reads and writes claim records.",
      "relationship-type": {
        "connects": {
          "source": { "node": "claims-engine" },
          "destination": { "node": "claims-db", "interfaces": ["claims-db-jdbc"] }
        }
      },
      "protocol": "JDBC"
    },
    {
      "unique-id": "engine-to-eventbus",
      "description": "Claims Engine publishes claim lifecycle events.",
      "relationship-type": {
        "connects": {
          "source": { "node": "claims-engine" },
          "destination": { "node": "claims-event-bus", "interfaces": ["kafka-broker"] }
        }
      },
      "protocol": "Kafka"
    },
    {
      "unique-id": "eventbus-to-notifications",
      "description": "Event bus triggers notification service on claim status changes.",
      "relationship-type": {
        "connects": {
          "source": { "node": "claims-event-bus" },
          "destination": { "node": "notification-service", "interfaces": ["notification-api"] }
        }
      },
      "protocol": "HTTPS"
    }
  ],
  "flows": [
    {
      "unique-id": "flow-claim-submission",
      "name": "Claim Submission Flow",
      "description": "End-to-end flow when a policyholder submits a new insurance claim through adjudication and notification.",
      "transitions": [
        {
          "relationship-unique-id": "api-to-engine",
          "sequence-number": 1,
          "summary": "Claims API receives submission and routes to Adjudication Engine"
        },
        {
          "relationship-unique-id": "engine-to-db",
          "sequence-number": 2,
          "summary": "Adjudication Engine persists claim record and initiates rules evaluation"
        },
        {
          "relationship-unique-id": "engine-to-eventbus",
          "sequence-number": 3,
          "summary": "Engine publishes claim-created event to event bus"
        },
        {
          "relationship-unique-id": "eventbus-to-notifications",
          "sequence-number": 4,
          "summary": "Notification service consumes event and sends confirmation to policyholder"
        }
      ]
    }
  ],
  "decorators": [
    {
      "$ref": "https://bar.example.com/enterprise/capability-map.decorator.json",
      "mappings": {
        "claims-processing": {
          "capabilities": [
            "insurance-operations/claims-management/claims-adjudication",
            "insurance-operations/claims-management/claims-intake",
            "insurance-operations/claims-management/claims-settlement"
          ]
        },
        "fraud-detection": {
          "capabilities": [
            "insurance-operations/fraud-prevention/fraud-scoring"
          ]
        },
        "policy-admin": {
          "capabilities": [
            "policy-management/policy-administration/coverage-management"
          ]
        },
        "claims-api": {
          "capabilities": [
            "insurance-operations/claims-management/claims-intake"
          ]
        },
        "claims-engine": {
          "capabilities": [
            "insurance-operations/claims-management/claims-adjudication",
            "insurance-operations/claims-management/claims-settlement"
          ]
        },
        "notification-service": {
          "capabilities": [
            "insurance-operations/customer-communication/status-notifications"
          ]
        }
      }
    }
  ],
  "controls": {
    "encryption-at-rest": {
      "description": "All PII data must be encrypted at rest using AES-256.",
      "requirements": [
        {
          "control-requirement-url": "https://bar.example.com/standards/encryption-at-rest.json",
          "control-config-url": "https://bar.example.com/claims-processing/controls/encryption-config.json"
        }
      ]
    },
    "access-control": {
      "description": "Role-based access control enforced on all API endpoints.",
      "requirements": [
        {
          "control-requirement-url": "https://bar.example.com/standards/rbac-standard.json",
          "control-config-url": "https://bar.example.com/claims-processing/controls/rbac-config.json"
        }
      ]
    }
  }
}
```

### What Gets Generated From `bar.arch.json`

| Generated Artifact | Source in CALM | Destination in BAR |
|---|---|---|
| Context diagram (SVG/PNG) | `bar.arch.json` context projection: actors + system-of-interest (collapsed) + external systems | `architecture/context.png` |
| Logical diagram (SVG/PNG) | `bar.arch.json` logical projection: system-of-interest expanded + composed-of + connects | `architecture/logical.png` |
| Sequence diagram (Mermaid/PNG) | `bar.arch.json`: flows.transitions | `architecture/sequence.png` |
| Conceptual diagram (SVG/PNG) | Decorator: capability hierarchy + node mappings | `architecture/conceptual.png` |
| Service mapping | `bar.arch.json`: connects relationships | `operations/service-mapping.yaml` |
| Data classification | `bar.arch.json`: data-classification on nodes | `information-risk/data-classification.yaml` |
| Threat model inputs | Logical arch: nodes + interfaces + data-classification + controls | `security/threat-model.json` (input) |
| Governance controls | Logical arch: controls object | `governance/decisions.yaml` (input) |

---

## How Decorators Enable the Enterprise Conceptual View

The individual BAR's conceptual view shows which capabilities that application realizes. But the real power of the decorator approach is the portfolio-level conceptual view.

Because every BAR references the same enterprise capability decorator, an aggregation pipeline can:

1. **Scan all BARs** in the portfolio for decorator references to the capability map
2. **Invert the mapping**: instead of "Claims Processing realizes Claims Adjudication," produce "Claims Adjudication is realized by Claims Processing, Claims Recovery, and Legacy Claims"
3. **Generate a capability heat map**: which L2 capabilities have multiple realizing applications (rationalization candidates), which L3 capabilities have zero applications (gaps), which capabilities are over-invested

This is the Looking Glass dashboard concept taken to its logical conclusion. The decorator mechanism provides the structured, cross-BAR linkage that makes it possible without scraping metadata or relying on naming conventions.

### Example: Portfolio Capability Matrix (generated from aggregated decorators)

```
L1: Insurance Operations
  L2: Claims Management
    L3: Claims Adjudication .... Claims Processing [active], Legacy Claims [sunset]
    L3: Claims Intake ......... Claims Processing [active], Mobile Claims [beta]
    L3: Claims Settlement ..... Claims Processing [active], Payment Hub [active]
  L2: Customer Communication
    L3: Status Notifications .. Claims Processing [active], Policy Portal [active]
    L3: Document Delivery ..... DocGen Platform [active]
  L2: Fraud Prevention
    L3: Fraud Scoring ......... Fraud Detection Service [active]
    L3: Fraud Investigation ... [NO APPLICATION - GAP]
```

That gap row ("Fraud Investigation" with no realizing application) is a finding that traditional architecture practices surface only in manual portfolio reviews. With decorators, it surfaces automatically.

---

## Pipeline Integration: From CALM to BAR

The BAR article describes a GitHub Actions workflow where PRs trigger governance validation. Here is how CALM fits into that pipeline:

```
PR modifies CALM model files
        |
        v
calm validate --pattern <required-pattern> --architecture <arch-file>
        |  (schema validation against 1.2, structural rules,
        |   pattern conformance, decorator reference validation)
        v
calm template --architecture <arch-file> --bundle context-diagram --output architecture/
calm template --architecture <arch-file> --bundle logical-diagram --output architecture/
calm template --architecture <arch-file> --bundle sequence-diagram --output architecture/
calm template --architecture <arch-file> --bundle capability-map --output architecture/
        |  (regenerate all four views from the model)
        v
calm template --architecture <arch-file> --bundle service-mapping --output operations/
calm template --architecture <arch-file> --bundle data-classification --output information-risk/
        |  (regenerate cross-pillar artifacts)
        v
Cross-file consistency checks (all derived, so consistency is structural)
        |
        v
Threat model regeneration (ingest updated CALM outputs)
        |
        v
Governance review assignment by domain
```

The critical insight: because the CALM model is the single source, the cascade validation the BAR article describes ("if logical changes but threat model hasn't been updated, block the PR") becomes unnecessary for CALM-derived artifacts. They are regenerated from the same source in the same pipeline run. The cascade logic only applies to artifacts that require human judgment: the threat model's risk scoring, the ADR narrative, or the information risk assessment's qualitative analysis.

Additionally, decorator validation catches a new class of governance violations: if a team removes a capability mapping without updating their architecture to reflect the changed scope, the validator flags the inconsistency. And because the enterprise capability map is an external reference, if business architecture reorganizes the capability hierarchy, every BAR that references a renamed or removed capability will fail validation on its next PR, surfacing the impact immediately rather than allowing stale mappings to accumulate silently.

---

## Timelines: Architecture Evolution in the BAR

Schema 1.2 also introduced Timelines, which allow CALM models to express planned architectural transitions. For the BAR, this means the architecture/ folder no longer needs to be a point-in-time snapshot. A single CALM model can express both the current state and the planned target state, with timeline markers indicating when each transition is scheduled.

This replaces the traditional "as-is" and "to-be" diagram pair with a version-controlled timeline that the pipeline can validate: are the planned transitions consistent with the target pattern? Do the timelines align with the capability roadmap expressed in the enterprise decorator? These questions become answerable through automation rather than architecture review boards.

---

## Buildable Now: Action Plan

With Schema 1.2 released, every component of this design is available today. There is no waiting. The action plan is:

### Phase 1: Reference BAR (Weeks 1-2)
Build a single, complete BAR for a representative business application using CALM 1.2. This includes the context, logical, and sequence architecture files, a decorator-based capability mapping referencing an enterprise capability hierarchy, and the full BAR folder structure. Validate end-to-end with the CALM CLI.

### Phase 2: Template Bundles (Weeks 3-4)
Build the `bar-views` template bundle for the CALM CLI that generates context, logical, sequence, and conceptual diagrams from a CALM architecture. The conceptual view template reads decorator mappings and produces the capability-to-node visualization. Also build the `service-mapping` and `data-classification` extraction templates for the cross-pillar artifacts.

### Phase 3: Pipeline Integration (Weeks 5-6)
Wire the BAR into a GitHub Actions workflow that validates CALM models, regenerates derived artifacts, checks cross-file consistency, and assigns governance reviewers by domain. Demonstrate the full cycle: modify the CALM model, watch the pipeline regenerate the BAR, see the governance review trigger.

### Phase 4: Portfolio Aggregation (Weeks 7-8)
Build the aggregation pipeline that traverses all BAR repositories, collects decorator references, and produces the portfolio-level capability heat map. This is the Looking Glass integration point. Determine whether CalmHub or a lightweight GitHub Action is the right aggregation mechanism.

### Phase 5: FINOS Contribution
Propose the business-capability decorator type as a standardized decorator schema to the FINOS community. This positions the BAR concept as a reference implementation and gives the broader enterprise architecture community a shared vocabulary for capability-to-architecture mapping in CALM.

---

## Summary

CALM 1.2 provides full coverage for all four BAR architectural views. Context, logical, and sequence map natively to nodes, relationships, and flows. The conceptual view, which requires hierarchical L1/L2/L3 business capabilities, is served by Schema 1.2's decorators, not metadata.

The argument for decorators over metadata is definitive: business capabilities are hierarchical, cross-cutting, independently governed, and strategically significant. Metadata is flat, application-scoped, convention-dependent, and unvalidatable. Decorators maintain a single authoritative source for the capability hierarchy, enforce structural consistency through schema validation, enable enterprise-level portfolio aggregation, and separate the governance of the capability map from the governance of individual applications.

The CALM model is not just a diagram generator for the BAR's architecture/ folder. It is the single source of truth from which the entire BAR is derived across all four governance pillars. When combined with the capability decorator, it also becomes the bridge between application-level architecture and enterprise-level strategy, making the Looking Glass dashboard's portfolio visibility a function of the data rather than a manual aggregation exercise.

Everything required to build this is available today. CALM 1.2 is released. The CLI tooling supports template bundles and decorator validation. The BAR structure is defined. The only remaining work is building the template bundles, wiring the pipeline, and contributing the business-capability decorator standard to FINOS. That work starts now.