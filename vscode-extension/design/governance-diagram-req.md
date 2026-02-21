# Cheshire: Looking Glass Architecture Design Surface
## Requirements Specification

**Version:** 0.4.0
**Date:** February 19, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance
**Status:** Phase 2 Complete

---

## 1. Overview

The Looking Glass design surface is a core capability of the Cheshire VSCode extension that provides a bidirectional, interactive architecture diagramming environment. Architects can visualize, manipulate, and author CALM-based architecture diagrams directly within VSCode, with all changes persisted to the Business Application Repository (BAR) as version-controlled governance artifacts.

The design surface treats CALM JSON as the single source of truth for architectural structure, layout JSON as persisted visual metadata, and exported PNGs as documentation snapshots. Changes flow bidirectionally: edits to CALM source files re-render in the design surface, and visual edits on the design surface (adding nodes, modifying relationships, restructuring) write back to the CALM JSON.

### 1.1 Design Principles

**Governance-native.** Every visual action produces a governance artifact. Dragging a container onto the canvas is not a drawing exercise. It is an architecture decision that updates the machine-readable model, triggers fitness function validation, and flows through the BAR's PR-based governance workflow.

**CALM-first.** The Common Architecture Language Model (CALM 1.2) is the canonical representation. The design surface is a view into CALM, not a replacement for it. Architects who prefer to author CALM JSON directly should see their changes reflected on the canvas immediately. Architects who prefer to work visually should never need to touch JSON.

**Layout-preserving.** Automatic layout (ELK) handles initial positioning. Architect-adjusted positions are persisted and survive structural changes. New nodes receive automatic positions. Removed nodes are cleaned from layout files gracefully.

**Export-ready.** The BAR requires PNG artifacts in the `architecture/` folder. The design surface must export publication-quality renders without external tooling.

---

## 2. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Canvas renderer | ReactFlow v12 (@xyflow/react) | Interactive node-based editor with drag, zoom, pan, selection, and custom node components. Runs natively in VSCode webview. |
| Automatic layout | ELK.js (elkjs/lib/elk.bundled.js) | Layered layout algorithm with ORTHOGONAL edge routing and LAYER_SWEEP crossing minimization. Handles compound (nested) nodes for container views. |
| Edge routing | SmoothStep (ReactFlow) + post-layout handle assignment | Orthogonal edge paths with rounded corners. Custom angle-based algorithm assigns edges to optimal node handles after ELK positioning. |
| Sequence rendering | Mermaid.js *(Phase 3)* | Mermaid handles sequence diagrams well. Sequence is generated from logical diagram relationships, not authored directly. |
| Webview host | VSCode Webview API | Standard extension webview panel. Communicates with extension host via message passing. |
| Architecture DSL | CALM 1.2 (FINOS) | Common Architecture Language Model. Uses `*.arch.json` files with nodes, relationships, and flows. |
| CALM parser | CalmAdapter.ts (custom) | Transforms CALM JSON to ReactFlow node/edge schema. Separate adapters for context and logical diagram types. Merges bidirectional edges. |
| PNG export | html-to-image (toPng) | DOM-to-PNG capture of the ReactFlow viewport. Reliably captures SVG edge layers and marker definitions. Toast notification provides export feedback. |
| CSS bundling | esbuild inline-css plugin | Custom esbuild plugin converts CSS imports to runtime `<style>` injection, eliminating the need for separate CSS files or HTML `<link>` tags in the webview. |
| File watching | VSCode FileSystemWatcher | Detects external CALM JSON edits and triggers re-render. |

### 2.1 CALM 1.2 Dependency

The extension targets CALM 1.2 as the minimum supported version. CALM 1.2 introduced decorator support, which is required for annotating nodes with business capability metadata. The CALM adapter layer should validate the CALM version field in each JSON file and surface a warning if the file uses a version below 1.2.

### 2.2 ReactFlow Configuration

ReactFlow v12 provides the following capabilities used by the design surface:

**Implemented (Phase 1):**
- Node dragging with debounced position persistence (`onNodesChange`)
- Zoom and pan with viewport persistence (scroll + trackpad)
- Snap-to-grid (20px grid)
- Interactive MiniMap (pannable, zoomable) for large diagrams
- Controls widget (zoom in/out, fit view)
- Node grouping (parent/child relationships for compound container nodes)
- 7 custom node types: SystemNode, ActorNode, ExternalSystemNode, ContainerNode, ServiceNode, DataStoreNode, NetworkNode
- Custom ProtocolEdge type using SmoothStep (orthogonal) routing with protocol labels
- 8 handles per node (source + target on all 4 sides) for directional edge routing
- Background dots grid for visual reference

**Planned (Phase 2):**
- Edge connection (drag from source handle to target handle)
- Multi-select and bulk move (shift-click or marquee)
- Inline label editing (double-click on nodes/edges)

### 2.3 ELK.js Layout Options

ELK uses the **layered** algorithm for all diagram types with diagram-type-specific configuration:

| Option | Context Diagram | Logical Diagram |
|--------|----------------|-----------------|
| Direction | `DOWN` (top-to-bottom) | `RIGHT` (left-to-right) |
| Node spacing | 80px | 50px |
| Layer spacing | 100px | 80px |
| Edge routing | `ORTHOGONAL` | `ORTHOGONAL` |
| Crossing minimization | `LAYER_SWEEP` | `LAYER_SWEEP` |
| Container padding | — | `top=48, left=32, bottom=28, right=32` |

The `RIGHT` direction for logical diagrams produces natural intake-to-processing-to-storage flow for event-driven architectures. The `DOWN` direction for context diagrams creates a clear system-of-interest focus with actors and external systems arranged around it.

ELK layout is invoked on first render, when new nodes are added without saved positions, and on explicit "Re-layout" command. ELK never overrides architect-saved positions unless explicitly requested.

**Decided against:** `force` and `rectpacking` algorithms were considered but deferred. The `layered` algorithm with diagram-type-specific options produces professional results for both star-topology context diagrams and hierarchical event-driven logical diagrams.

---

## 3. File Architecture

### 3.1 BAR Integration

The design surface reads from and writes to the following files within a Business Application Repository:

```
/<business-application>/
|
+-- app.yaml                          # Metadata, criticality, lifecycle, component repo index
|
+-- architecture/                     # Design surface working directory
|   +-- bar.arch.json                 # CALM source: unified architecture (context + logical views derived)
|   +-- context.layout.json           # Persisted node positions and viewport for context projection
|   +-- context.png                   # Exported context render
|   |
|   +-- logical.layout.json           # Persisted layout for logical projection
|   +-- logical.png                   # Exported logical render
|   |
|   +-- sequence.mermaid              # Generated from logical relationships (Phase 3)
|   +-- sequence.png                  # Exported render (Phase 3)
|   |
|   +-- component.arch.json           # CALM source: component diagram (Phase 3)
|   +-- component.layout.json         # Persisted layout (Phase 3)
|   +-- component.png                 # Exported render (Phase 3)
|   |
|   +-- ADRs/
|       +-- ADR-0001.md
```

> **Note:** CALM files use the `*.arch.json` extension (not `*.calm.json` as originally specified). This convention was already established in the governance-mesh repository. See decision D18. As of D31, context and logical architecture data are unified into a single `bar.arch.json` file. Context and logical views are projections derived from this single source: the context view shows actors, the system-of-interest (collapsed), and external systems; the logical view shows the system-of-interest expanded as a container with its composed-of children. See decisions D31–D32.

Sequence diagrams have no CALM source or layout file. They are derived from the logical projection's relationship metadata, rendered via Mermaid, and exported as PNG. The `.mermaid` file is the generated intermediate representation, version-controlled for auditability but not hand-authored.

### 3.2 Layout File Schema

The layout file stores visual metadata separate from structural data. It is intentionally small and merge-friendly for Git workflows.

```json
{
  "version": "1.0",
  "diagramType": "context",
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1.0
  },
  "nodes": {
    "node-id-1": {
      "x": 250,
      "y": 100,
      "width": 200,
      "height": 120,
      "collapsed": false
    },
    "node-id-2": {
      "x": 600,
      "y": 100,
      "width": 200,
      "height": 120,
      "collapsed": false
    }
  },
  "edges": {
    "edge-id-1": {
      "waypoints": [],
      "labelPosition": { "x": 425, "y": 80 }
    }
  },
  "gridSize": 20,
  "snapToGrid": true,
  "lastModified": "2026-02-19T14:30:00Z"
}
```

### 3.3 Layout Reconciliation Rules

| Scenario | Behavior |
|----------|----------|
| Node in CALM, not in layout | ELK computes position. Position saved to layout on next save. |
| Node in layout, not in CALM | Layout entry removed on next save (silent cleanup). |
| Node in both | Layout position used. ELK is not invoked for this node. |
| Edge in CALM, not in layout | ReactFlow uses default edge routing. |
| Edge in layout, not in CALM | Layout entry removed on next save. |
| Architect requests "Re-layout" | ELK recomputes all positions. Architect prompted to confirm. |

---

## 4. Diagram Types

### 4.1 Context Diagram (ReactFlow + ELK)

**Purpose:** Shows the system under design and its relationships with external actors, systems, and services. Equivalent to C4 Level 1.

**CALM mapping:**

- `system-of-interest` node: central system box (emphasized styling)
- `actor` nodes: person/role shapes (stick figure or labeled oval)
- `external-system` nodes: external system boxes (dashed border)
- `relationship` edges: labeled arrows with protocol/description

**Custom ReactFlow nodes (implemented):**

- `SystemNode`: Rounded rectangle, accent color fill, system name + description, data classification badge
- `ActorNode`: Person icon with label below, muted styling
- `ExternalSystemNode`: Rounded rectangle, dashed border, muted fill, description text

**Deferred:** `BoundaryNode` (trust boundary grouping) was deferred from Phase 1. Trust boundaries are a visual overlay that does not map directly to a CALM node type. Will revisit when CALM decorator support enables trust boundary annotations.

**Editing:** Read-only in Phase 1. Full bidirectional editing planned for Phase 2.

### 4.2 Logical Diagram (ReactFlow + ELK)

**Purpose:** Shows internal containers, services, and data stores within the system boundary. Equivalent to C4 Level 2. Also serves as the source data for inferred sequence diagrams.

**CALM mapping:**

- `container` nodes: container boxes with technology tags
- `service` nodes: service boxes within container groups
- `data-store` nodes: cylinder shapes
- `relationship` edges: labeled arrows with protocol, data flow, and optional sequence metadata

**Custom ReactFlow nodes (implemented):**

- `ContainerNode`: Compound/group node with header bar and accent background. Contains child service nodes via ReactFlow's `parentId` relationship. ELK computes child positions within container bounds.
- `ServiceNode`: Smaller boxes within containers with description text. Draggable within container bounds (`extent: 'parent'`).
- `DataStoreNode`: Cylinder shape with name and data classification badge.
- `NetworkNode`: Network/event broker node (added during implementation — emerged from real CALM data where `node-type: 'network'` represents message brokers and event buses).

**Bidirectional edge merging:** The adapter detects A→B and B→A connect pairs in CALM relationships and merges them into a single bidirectional edge rendered with double arrowheads and gold color. This significantly reduces visual clutter in event-driven architectures where services both publish to and subscribe from a broker.

**Deferred:** Container collapsibility deferred. Drag between containers deferred to Phase 2.

**Editing:** Read-only in Phase 1. Full bidirectional editing planned for Phase 2.

**Relationship enrichment for sequence inference:**

Relationships in the logical diagram can carry optional `flows` metadata that enables sequence diagram generation:

```json
{
  "id": "rel-001",
  "source": "api-gateway",
  "target": "auth-service",
  "description": "Validates JWT token",
  "technology": "gRPC",
  "flows": [
    {
      "name": "User Login",
      "order": 1,
      "request": "ValidateToken(jwt)",
      "response": "TokenResult(valid, claims)"
    }
  ]
}
```

The `flows` array is optional. When present, it tags the relationship with named use cases and a sequence position. Multiple relationships tagged with the same flow `name` produce a complete sequence diagram for that use case.

### 4.3 Component Diagram (ReactFlow + ELK)

**Purpose:** Decomposes a single container into its internal components. Equivalent to C4 Level 3.

**CALM mapping:**

- `component` nodes: component boxes with type annotations
- `interface` edges: dependency arrows between components

**Custom ReactFlow nodes:**

- `ComponentNode`: Box with stereotype label (e.g., \<\<Service\>\>, \<\<Repository\>\>, \<\<Controller\>\>)

**Editing:** Full bidirectional. All changes write back to `component.arch.json`.

### 4.4 Sequence Diagram (Mermaid, Derived from Logical)

**Purpose:** Shows interaction flows between containers and services over time for a specific use case.

**Source:** The logical diagram's relationship data. Sequence diagrams are not authored directly. They are derived from `flows` metadata on logical relationships.

**Generation workflow:**

1. Architect selects "Generate Sequence" from the logical diagram toolbar or right-clicks a relationship and selects "Show in Sequence."
2. The extension scans all relationships in `bar.arch.json` for `flows` entries.
3. Available flow names are presented as a picker (e.g., "User Login," "Process Payment," "Submit Claim").
4. The selected flow is extracted: all relationships with matching flow `name`, ordered by `order` field.
5. A Mermaid sequence diagram is generated:

```
sequenceDiagram
    participant AG as API Gateway
    participant AS as Auth Service
    participant US as User Store
    AG->>AS: ValidateToken(jwt)
    AS->>US: LookupUser(claims.sub)
    US-->>AS: UserRecord
    AS-->>AG: TokenResult(valid, claims)
```

6. The generated Mermaid source is written to `sequence.mermaid` (or `sequence-{flow-name}.mermaid` for multiple flows).
7. Mermaid.js renders the diagram in a webview panel and exports the PNG.

**Editing model:** Read-only in terms of structure. To change the sequence, the architect modifies the `flows` metadata on the logical diagram's relationships (either visually through an edge property panel or directly in `bar.arch.json`) and regenerates. This keeps the unified CALM model as the single source of truth.

**Multiple sequences:** If the logical diagram contains multiple named flows, each generates a separate file:

```
+-- sequence-user-login.mermaid
+-- sequence-user-login.png
+-- sequence-process-payment.mermaid
+-- sequence-process-payment.png
```

---

## 5. Bidirectional Editing

This is the core differentiator of the design surface. The CALM JSON is both readable and writable from the canvas.

### 5.1 Canvas to CALM (Visual Edits Update JSON)

| Canvas Action | CALM JSON Update |
|--------------|-----------------|
| Add node from palette | New node object appended to `nodes` array with generated ID, default properties, and type based on diagram context. |
| Delete node (select + Delete key) | Node removed from `nodes` array. All edges referencing the node removed. |
| Add edge (drag handle to handle) | New relationship appended to `relationships` array with source, target, and default label. |
| Delete edge (select + Delete key) | Relationship removed from `relationships` array. |
| Edit node label (double-click) | Node `name` and/or `description` updated in-place. |
| Edit edge label (double-click) | Relationship `description` or `technology` updated in-place. |
| Edit edge flows (property panel) | Relationship `flows` array updated. Triggers sequence regeneration if applicable. |
| Change node type (context menu) | Node `type` field updated. |
| Reparent node (drag into group) | Node `parent` reference updated. |
| Move node | Layout JSON only. CALM is not modified for position changes. |
| Resize node | Layout JSON only. |

### 5.2 CALM to Canvas (JSON Edits Update Visual)

The extension host watches `*.arch.json` files using `vscode.workspace.createFileSystemWatcher`. On change:

1. Parse the updated CALM JSON.
2. Diff against the current ReactFlow state to identify added, removed, and modified nodes/edges.
3. Additions: new nodes receive ELK-computed positions (existing layout is not disturbed).
4. Removals: nodes/edges removed from the canvas with a brief fade-out animation.
5. Modifications: labels, types, and properties updated in-place. Positions preserved.

### 5.3 Write-Back Strategy

CALM JSON writes are debounced (500ms after last visual edit) to avoid excessive file writes during rapid editing. Writes are performed through the VSCode workspace API (`vscode.workspace.fs.writeFile`) to ensure proper integration with source control and file watchers.

The write-back produces minimal diffs. Rather than serializing the entire CALM document from scratch (which would reorder keys and destroy formatting), the extension maintains the original parsed structure and applies targeted mutations. This ensures that `git diff` shows only the architect's actual changes, not cosmetic reformatting.

### 5.4 CALM Schema Validation

The extension validates CALM JSON against the CALM 1.2 JSON Schema on every write-back. Validation errors appear in the VSCode Problems panel with severity levels:

- **Error:** Invalid CALM structure (missing required fields, type mismatches). Blocks export.
- **Warning:** Deprecated constructs or fields that may be removed in future CALM versions.
- **Info:** Schema-valid but potentially incomplete (e.g., node without description, relationship without technology).

Validation runs asynchronously and does not block the canvas interaction. The architect can continue editing while validation results populate. This provides continuous feedback without introducing friction during active design sessions.

### 5.5 Conflict Resolution

BARs are stored in GitHub, and version control is the primary concurrency mechanism. The extension does not support multi-user real-time collaborative editing. If both the canvas and an external editor modify the same CALM file simultaneously within a single session:

1. The file watcher detects the external change.
2. The extension compares the external change against pending (unsaved) canvas edits.
3. If no conflict (changes affect different nodes/edges): both are merged.
4. If conflict (same node modified in both): the user is prompted with a diff view showing both versions.

For multi-user scenarios across machines, standard Git branch and PR workflows apply. Each architect works on their branch; conflicts are resolved at merge time through GitHub's PR process.

---

## 6. Node Palette and Creation

### 6.1 Palette Panel

A collapsible side panel within the webview provides drag-and-drop node creation. The palette contents are context-sensitive based on the active diagram type:

| Diagram Type | Palette Nodes |
|-------------|--------------|
| Context | Actor, System, External System, Trust Boundary |
| Logical | Container, Service, Data Store, Message Bus, API Gateway |
| Component | Component (with stereotype selector: Service, Controller, Repository, Client, Utility) |

### 6.2 Node Creation Workflow

1. Architect drags a node type from the palette onto the canvas.
2. ReactFlow's `onDrop` handler fires with the drop position and node type.
3. A new CALM node is generated with:
   - Auto-generated ID (format: `{diagramType}-{type}-{timestamp}`)
   - Default name: "{Type} (unnamed)"
   - Type-appropriate default properties
4. The node appears on the canvas at the drop position.
5. The name field is immediately editable (inline text input, auto-focused).
6. On confirmation (Enter or click-away), the CALM JSON is updated via the debounced write-back.
7. The layout file is updated with the drop position.

### 6.3 Edge Creation Workflow

1. Architect hovers over a node. Source handles appear on the node edges.
2. Architect drags from a source handle toward another node.
3. On drop over a valid target node, the edge is created.
4. A default label is assigned based on diagram type:
   - Context: "Uses"
   - Logical: "Calls" with technology field blank
   - Component: "Depends on"
5. The label is immediately editable (inline text input).
6. A new relationship is appended to the CALM JSON via debounced write-back.

### 6.4 Property Panel

Selecting a node or edge opens a 260px right-side property panel displaying all editable CALM fields for that element. The panel uses **sub-view navigation** — Capabilities and Controls are accessed via link buttons that replace the panel content (with a back arrow to return to main properties).

**Node properties:**
- Core fields (inline): unique-id (read-only), node-type (read-only), name, description, data-classification
- **Interfaces** (inline section): List of `CalmInterface` entries with unique-id, host, port. Add/remove inline. Produces `setInterfaces` patch. Hidden for actor nodes (which don't have interfaces).
- **Capabilities** (sub-view link): Shows count badge from `decorators[0].mappings[nodeId].capabilities`. "Edit Capabilities →" opens CapabilitiesEditor with tree picker built from the CapabilityModelSummary. Disabled when no capability model is loaded.
- **Controls** (sub-view link): Shows count badge from `Object.keys(controls)`. "Edit Controls →" opens ControlsEditor. Controls are architecture-level (apply to whole architecture, not individual nodes).

**Edge properties:**
- Core fields: unique-id (read-only), direction, source, target, protocol, description
- **Target Interface** (dropdown): For `connects` relationships, shows a dropdown of interfaces defined on the target node. Reads from `destination.interfaces[0]`. Changes produce `updateField` patch.
- **Controls** (sub-view link): Same as node controls.

**Sub-views:**
- **CapabilitiesEditor**: Displays currently mapped capabilities as removable chips with L1 > L2 > L3 breadcrumb. Collapsible tree browser built from `capabilityModel.allNodes` for toggling L3 capabilities. Produces `setCapabilities` patches.
- **ControlsEditor**: Lists all architecture controls as editable cards (key, description, requirement URL). Supports add/edit/remove. Produces `setControl` and `removeControl` patches.

All property panel edits write back to CALM JSON via the patch pipeline (CalmMutator → postMessage → CalmWriteService).

---

## 7. Architecture Archetypes (formerly "Scaffold Templates")

> **Naming decision (D19, D24):** The `cheshire.scaffold` command is already used for code-based BAR directory and file scaffolding. To avoid overloading the term "scaffold," pre-populated CALM architecture starting points are named **"Archetypes"** — pattern-starter templates that provide canonical architecture patterns as starting points. Archetype selection is a contextual action on the BAR detail page (not a command palette command), and generates CALM files within the BAR's `architecture/` directory.

### 7.1 Archetype Library

Three archetypes ship with Phase 2:

**Three-Tier Web Application**
Pre-populated CALM with:
- Context: web client (actor), application system (system-of-interest), database (external system), identity provider (external system)
- Logical: web frontend (container), API server (container), application database (data store), auth service (service)
- Relationships: standard request/response flows between tiers
- Sequence flow: "User Request" with order annotations across the three tiers

**Event-Driven Microservices**
Pre-populated CALM with:
- Context: client applications (actor), platform (system-of-interest), event bus (external system), monitoring (external system)
- Logical: API gateway (container), message broker (container), three placeholder services (containers), event store (data store)
- Relationships: async messaging between services, sync API calls from gateway
- Sequence flows: "Publish Event" and "Consume Event" with order annotations

**Data Pipeline**
Pre-populated CALM with:
- Context: source systems (actor), data platform (system-of-interest), analytics consumers (actor), data lake (external system)
- Logical: ingestion layer (container), transformation engine (container), serving layer (container), orchestrator (service), raw store (data store), curated store (data store)
- Relationships: batch and streaming data flows
- Sequence flow: "Batch Ingest" with order annotations across pipeline stages

### 7.2 Archetype Output

Each archetype generates pre-populated CALM architecture files within the existing BAR structure (assumes `cheshire.scaffold` has already created the directory structure):

```
/<business-application>/
|
+-- app.yaml                          # Pre-filled with template defaults, architect updates
|
+-- architecture/
|   +-- bar.arch.json                 # Pre-populated from template (unified context + logical)
|   +-- ADRs/
|       +-- ADR-0001.md               # Template: "Initial architecture decision"
|
+-- security/
|   +-- threat-model.json             # Empty scaffold with CALM references
|
+-- information-risk/
|   +-- ira.md                        # Template with section headings
|   +-- vism.yaml                     # Empty scaffold
|   +-- data-classification.yaml      # Empty scaffold with field templates
|
+-- operations/
|   +-- application-runbook.md        # Template with section headings
|   +-- service-mapping.yaml          # Pre-populated from logical diagram containers
|
+-- governance/
    +-- decisions.yaml                # Empty scaffold
```

The architect opens the BAR in VSCode, runs `cheshire.rabbitHole`, and immediately sees a populated context diagram they can rearrange, rename, and extend. The cold-start problem is eliminated: the architect starts from a reasonable default rather than a blank canvas.

> **Resolved:** Archetypes generate into an existing BAR (created by `cheshire.scaffold`). The two actions are intentionally separate: `scaffold` creates the governance directory structure, archetypes populate the architecture. This allows architects to scaffold without committing to a specific architecture pattern, and to apply an archetype to an existing BAR retroactively. Archetype selection is presented on the BAR detail page in Looking Glass as a contextual action.

---

## 8. Export

### 8.1 PNG Export (Implemented)

The design surface exports publication-quality PNGs for inclusion in the BAR's `architecture/` folder.

**Export workflow (actual implementation):**

1. Architect clicks "Export PNG" button in the diagram toolbar (top-right corner).
2. A toast notification appears: "Exporting PNG..."
3. The `html-to-image` library's `toPng` function captures the ReactFlow viewport DOM element, including SVG edge layers, arrowhead marker definitions, and custom node components.
4. The data URL is passed to the extension host via webview message passing.
5. The extension host writes the PNG to the appropriate path in the BAR (e.g., `architecture/context.png` for the context projection or `architecture/logical.png` for the logical projection).
6. A success toast confirms: "PNG exported successfully."

**Implementation note:** An initial approach using foreignObject SVG capture failed because ReactFlow renders edges in a sibling SVG layer with `<defs>` marker definitions. The `html-to-image` library was chosen because it captures the full DOM tree including all SVG layers, as recommended by the ReactFlow team.

**Auto-export option:** A setting (`cheshire.autoExport`) that regenerates PNGs on every CALM save. Planned for Phase 2. Disabled by default to avoid noisy Git diffs on binary files.

### 8.2 SVG Export

Optional secondary export format. Useful for embedding in markdown, wikis, and web documentation. Written alongside the PNG (e.g., `context.svg`).

---

## 9. Cheshire Command Integration

The design surface integrates with the broader Cheshire command palette:

| Command | ID | Status | Behavior |
|---------|-----|--------|----------|
| **Looking Glass** | `cheshire.lookingGlass` | **Implemented** | Opens the governance mesh dashboard. Includes diagram tabs (Context, Logical) with embedded ReactFlow design surface. |
| **Rabbit Hole** | `cheshire.rabbitHole` | **Implemented** | Opens the design surface for the current BAR. Detects CALM files in the `architecture/` directory and renders available diagram types. |
| **Scaffold** | `cheshire.scaffold` | **Implemented** (code generation only) | Creates BAR directory structure and starter files. Architecture Archetypes (Section 7) are a separate BAR-page action, not a scaffold sub-command. |
| **Export** | `cheshire.export` | **Implemented** (via toolbar button) | Exports the active diagram to PNG via the "Export PNG" button in the diagram toolbar. Command palette trigger planned for Phase 2. |
| **Re-layout** | — | **Implemented** (via toolbar button) | Re-layout button in diagram toolbar invokes ELK to recompute all node positions without confirmation prompt. |
| **Generate Sequence** | `cheshire.generateSequence` | *Phase 3* | Scans the active logical diagram for flow metadata and generates Mermaid sequence diagrams. |
| ~~**Grin**~~ | ~~`cheshire.grin`~~ | **Decided against** | Quick governance status check. Removed from scope — governance status is better surfaced through the Looking Glass dashboard (Phase 4) and inline canvas warnings rather than a separate command. The four-pillar pass/fail model was too coarse; governance signals should be contextual and continuous, not a point-in-time snapshot. |

---

## 10. Governance Integration

### 10.1 Fitness Function Hooks

On every CALM write-back, the extension can optionally invoke fitness function checks registered in the BAR's governance configuration:

- **Structural rules:** Every container must have at least one relationship. Every external system must have a defined trust boundary. No orphan nodes.
- **Completeness rules:** The unified `bar.arch.json` must contain both context-level and logical-level nodes. All containers referenced in composed-of relationships must be defined as nodes. Threat model must reference all containers.
- **Naming conventions:** Node names must follow organizational naming standards.
- **Cross-diagram consistency:** Nodes referenced in `security/threat-model.json` must exist in the logical projection of `bar.arch.json`.

Violations appear as inline warnings on the canvas (yellow/red badges on affected nodes) and in the VSCode Problems panel.

### 10.2 PR Trigger Awareness

The design surface displays a visual indicator when the current BAR has pending governance changes that would trigger PR validation rules. For example, if the architect has modified the logical diagram but the threat model has not been updated, the design surface shows a notification: "Threat model update required before PR will pass. Logical architecture has changed."

This surfaces the cascade logic from the BAR workflow directly in the architect's working environment, before they push, not after.

---

## 11. MVP Phasing

### Phase 1: Read-only Canvas with Layout Persistence — COMPLETE

**Delivered February 19, 2026.**

All Phase 1 requirements were implemented and validated against the Claims Processing BAR (insurance-operations platform):

- [x] Parse CALM 1.2 JSON (`*.arch.json`) and render context and logical diagrams in ReactFlow v12.
- [x] 7 custom node types: SystemNode, ActorNode, ExternalSystemNode, ContainerNode, ServiceNode, DataStoreNode, NetworkNode (NetworkNode added — not in original spec, emerged from real CALM data).
- [x] Custom ProtocolEdge with SmoothStep orthogonal routing, protocol labels, and bidirectional arrow support.
- [x] ELK automatic layout on first render with diagram-type-specific options (DOWN for context, RIGHT for logical).
- [x] Post-layout handle assignment: angle-based algorithm with load balancing assigns edges to optimal node handles.
- [x] Bidirectional edge merging: detects A→B/B→A pairs and renders single edge with double arrowheads.
- [x] Drag nodes to adjust positions. Debounced save (500ms) to `.layout.json`.
- [x] Viewport persistence (zoom level, pan position) across sessions.
- [x] Export to PNG via html-to-image with toast notification feedback.
- [x] Re-layout button recomputes all positions via ELK (ignores saved positions).
- [x] Interactive MiniMap (pannable, zoomable) and Controls widget.
- [x] Snap-to-grid (20px), background dots, configurable zoom range (0.2x–3x).
- [x] CSS bundled via custom esbuild inline-css plugin (no separate CSS file).
- [ ] CALM schema validation on load — deferred to Phase 2 (not blocking for read-only viewing).

**Value delivered:** Architects can visualize and arrange their CALM models visually, export professional diagrams, and persist their layout choices. This replaces the need for external diagramming tools like draw.io or Lucidchart for architecture documentation.

### Phase 2: Bidirectional Editing and Architecture Archetypes

> **Naming decision (D24):** Pre-populated CALM architecture starting points are named **"Archetypes"** — pattern-starter templates representing canonical architecture patterns. The `cheshire.scaffold` command retains its code scaffolding role. Archetypes are selected from the BAR detail page in Looking Glass (D25), not from the command palette.

**Bidirectional editing:**
- [x] Node palette with drag-and-drop creation (context-sensitive by diagram type).
- [x] Edge creation via handle dragging.
- [x] Inline label editing (double-click on nodes and edges).
- [x] Delete nodes and edges (select + Delete key).
- [x] Write-back to CALM JSON with minimal diffs (targeted mutations, not full re-serialization).
- [x] CALM schema validation on every write-back (CalmValidator.ts with referential integrity, required fields, and info-level warnings).
- [x] File watcher for external CALM edits (`*.arch.json` file system watcher with echo suppression via content hash).
- [x] Property panel for node/edge CALM fields (260px right panel with sub-views for Capabilities and Controls).

**Architecture archetypes (3 at launch):**
- [x] Three-Tier Web Application
- [x] Event-Driven Microservices
- [x] Data Pipeline

Each archetype generates a pre-populated `bar.arch.json` with nodes, relationships, and flow metadata. Context and logical views are derived projections from this unified file. The architect opens the BAR, runs Rabbit Hole, and starts with a reasonable default rather than a blank canvas.

**Visual improvements:**
- [x] Container node collapsibility (expand/collapse child nodes).
- [x] Drag nodes between containers (reparenting with auto composed-of relationship management).
- [x] Multi-select and bulk move (shift-click or marquee via `selectionOnDrag` + `SelectionMode.Partial`).
- [ ] Auto-export option (`cheshire.autoExport` setting).
- [ ] SVG export as secondary format.
- [ ] Command palette triggers for Export and Re-layout.
- [ ] Context-to-logical drill-down (double-click container to navigate).

**Value:** Architects can author and modify architecture directly on the canvas. Archetypes eliminate cold-start friction. The design surface becomes the primary authoring environment for CALM.

### Phase 3: Sequence Generation and Component Diagrams

- Flow metadata editing on logical diagram relationships via property panel.
- Sequence diagram generation from flow metadata via Mermaid.
- Component diagram support (C4 Level 3) with ComponentNode type.
- Multiple named sequence export (per-flow `.mermaid` and `.png` files).

**Value:** The logical diagram becomes the single source of truth for both structural and behavioral views. Sequence diagrams are always consistent with the logical model because they are derived from it.

### Phase 4: Governance Integration

- Fitness function checks on CALM write-back (structural, completeness, naming rules).
- Inline violation warnings on canvas (yellow/red badges on affected nodes).
- PR trigger cascade awareness notifications.
- Governance health surfaced in Looking Glass dashboard (replaces the removed Grin command with continuous, contextual governance signals).
- Cross-diagram consistency validation (threat model references match logical diagram nodes).

**Value:** The design surface becomes a governance surface. Architecture decisions made visually are validated against enterprise rules in real time.

---

## 12. Design Decisions

The following decisions were made during requirements development and implementation, recorded here for traceability.

### Requirements Phase (pre-implementation)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Target CALM 1.2 as minimum version | CALM 1.2 introduced decorators, required for business capability annotations on architecture nodes. Extension validates CALM version on load. |
| D2 | No multi-user real-time collaborative editing | BARs are stored in GitHub. Version control (branching, PRs, merge) is the concurrency model. Single-user editing within VSCode is sufficient for MVP and foreseeable use. |
| D3 | Diagram drill-down (context to logical) deferred to Phase 2 | Double-clicking a container on the context diagram to navigate to its logical view is a natural interaction but adds Phase 1 complexity. |
| D4 | Three architecture archetypes at launch | Three-Tier Web Application, Event-Driven Microservices, and Data Pipeline cover the most common patterns. Additional archetypes can be added through a template registry without extension changes. |
| D5 | Continuous CALM schema validation on write-back | Validates every debounced write against CALM 1.2 JSON Schema. Errors in Problems panel, async execution, does not block canvas interaction. |
| D6 | Sequence diagrams derived from logical via Mermaid | Logical diagram is the single source of truth. Flow metadata on relationships drives generation. No separate CALM source for sequence diagrams. |
| D7 | ReactFlow + ELK for all interactive diagrams | Mermaid is insufficient for hierarchical/container views. ReactFlow provides interactive editing. ELK provides professional automatic layout. Mermaid used only for sequence diagrams. |
| D8 | Layout stored separately from CALM source | Positions are visual metadata, not architectural structure. `.layout.json` keeps CALM files clean, diffable, and tooling-agnostic. |

### Implementation Phase (Phase 1)

| # | Decision | Rationale |
|---|----------|-----------|
| D9 | SmoothStep (orthogonal) edge routing over bezier | Orthogonal paths with rounded corners produce cleaner architectural diagrams than curved bezier paths. Right-angle routing is the industry standard for architecture and systems diagrams. |
| D10 | Inline CSS injection via esbuild plugin | VSCode webview CSP allows `style-src 'unsafe-inline'`. A custom esbuild plugin converts CSS imports to runtime `<style>` injection, eliminating the need for separate CSS files or `<link>` tags. This solved a critical issue where ReactFlow CSS was not loading in the webview. |
| D11 | 8 handles per node (4 sides × source + target) with post-layout assignment | All nodes share a `NodeHandles` component providing handles on all 4 sides. After ELK computes positions, an angle-based algorithm assigns edges to optimal handles with load balancing (when one side has 3+ edges, it shifts to perpendicular alternatives). This produces clean directional edge routing without manual handle assignment. |
| D12 | Bidirectional edge merging in the CALM adapter | Event-driven architectures produce many A→B/B→A connect pairs (e.g., services both publish to and subscribe from a broker). The adapter merges these into single bidirectional edges with double arrowheads and gold color. This reduced edge count by ~30% in the Claims Processing logical diagram. |
| D13 | Diagram-type-specific ELK layout options | Context diagrams use `DOWN` direction (star topology, system-of-interest at center). Logical diagrams use `RIGHT` direction (natural intake→processing→storage flow for event-driven architectures). Each type has tuned spacing. |
| D14 | html-to-image for PNG export | An initial approach using foreignObject SVG capture failed because ReactFlow renders edges in a sibling SVG layer with separate `<defs>` marker definitions. `html-to-image` (toPng) captures the full DOM tree including all SVG layers. Recommended by the ReactFlow team. |
| D15 | NetworkNode type added for event brokers | Not in the original spec. CALM data uses `node-type: 'network'` for message brokers and event buses. A dedicated NetworkNode with distinct styling (warning/gold color, dashed border) was needed to visually distinguish network infrastructure from services. |
| D16 | Grin command removed | The four-pillar pass/fail governance snapshot was too coarse. Governance signals should be contextual and continuous — surfaced through the Looking Glass dashboard and inline canvas warnings (Phase 4) rather than a discrete command. |
| D17 | Handle IDs use `-src`/`-tgt` suffix convention | ReactFlow v12 deduplicates handles by ID within a node. Having the same ID (e.g., `"top"`) on both source and target handles causes one to be silently dropped. Using `"top-src"` and `"top-tgt"` ensures both handles are registered. |
| D18 | CALM files use `*.arch.json` extension (not `*.calm.json`) | The BAR structure uses `*.arch.json` rather than the originally specified `*.calm.json`. This convention was already established in the governance-mesh repository and the extension follows it. Superseded in part by D31: context and logical data are now unified into `bar.arch.json`. |
| D19 | Architecture templates vs code scaffolding naming — **resolved as "Archetypes"** | `cheshire.scaffold` is used for code-based BAR directory scaffolding. Pre-populated CALM architecture starting points are named **"Archetypes"** — pattern-starter templates representing canonical architecture patterns. See also D24, D25. |

### Implementation Phase (Phase 2)

| # | Decision | Rationale |
|---|----------|-----------|
| D20 | CalmMutator lives browser-side (webview) | The webview holds `state.calmData` in memory. Computing mutations locally provides immediate visual feedback without round-tripping to the extension host. Compact patches are sent over postMessage for file writes. |
| D21 | Bespoke CALM-aware patch format (not RFC 6902) | CALM mutations are domain-specific (`addNode`, `removeNode`, `addRelationship`, `removeRelationship`, `updateField`). A CALM-aware format is more readable in logs, easier to validate, and maps directly to CALM JSON structure — unlike generic JSON Patch operations. |
| D22 | Echo suppression via content MD5 hash on FileSystemWatcher | When the extension writes a CALM file, it records the content hash. When the file watcher fires, it compares hashes to distinguish self-writes from external edits. This prevents infinite write→watch→re-render loops without needing debounce timers or file locks. |
| D23 | All editing UI lives in React components (DiagramCanvas tree) | NodePalette, InlineNameEditor, PropertyPanel, and all editing handlers are React components rendered within the DiagramCanvas tree. This minimizes changes to the extension host (`LookingGlassPanel.ts`) and keeps the editing surface self-contained. |
| D24 | "Archetypes" naming for pattern-starter templates | Evaluated "Blueprints", "Starters", "Scaffolding". "Archetypes" best conveys canonical patterns while avoiding collision with the existing `cheshire.scaffold` command (which handles directory/file scaffolding). |
| D25 | Archetype selection is a BAR-page contextual action | Archetypes are selected from the BAR detail page in Looking Glass (shown when no CALM data exists, or as an action alongside existing diagrams), not from the command palette. This keeps archetype selection contextual to the BAR being worked on and avoids adding another top-level command. |
| D26 | Capabilities and Controls are sub-views within PropertyPanel | Interfaces are simple (add/remove list) so they render inline. Capabilities require a tree picker and Controls require a list editor — both too complex for inline rendering. Sub-views keep the editing surface cohesive in the same 260px panel without modals. |
| D27 | Capability tree picker uses existing CapabilityModelSummary | The Business lens in Looking Glass already loads the capability model into `state.capabilityModel`. Rather than re-fetching, it is passed through as a prop: lookingGlass → ReactBridge → DiagramCanvas → PropertyPanel → CapabilitiesEditor. |
| D28 | Controls are architecture-level, visible from any selection | CALM controls apply to the whole architecture, not individual nodes. The Controls editor shows ALL architecture controls regardless of which node/edge is selected. This matches the CALM schema where `controls` is a top-level object. |
| D29 | Four new CalmPatch operations extend the patch pipeline | `setControl`, `removeControl`, `setCapabilities`, `setInterfaces` — each handled in CalmMutator (browser-side), CalmWriteService (extension-host), and DiagramCanvas `handlePropertyChange`. This follows the same architecture as D20/D21. |
| D30 | Edge "Target Interface" uses dropdown of target node interfaces | For `connects` relationships, the destination may reference a specific interface on the target node via `destination.interfaces[]`. A dropdown populated from the target node's `interfaces` array provides a natural selection UI. Changes use the existing `updateField` patch with a nested field path. |
| D31 | Single `bar.arch.json` replaces `context.arch.json` + `logical.arch.json` | All CALM data lives in one unified file. Context and logical are projections (derived views), not separate sources. This eliminates cross-file consistency issues, simplifies write-back (one file to patch), and ensures the CALM model is a true single source of truth. Archetypes generate one file instead of two. |
| D32 | View derivation rules for context and logical projections | Context view shows actors + system-of-interest (collapsed) + external systems. Logical view shows system-of-interest expanded as container + composed-of children. The CalmAdapter applies these projection rules to produce diagram-type-specific ReactFlow node/edge sets from the single `bar.arch.json`. |
| D33 | CALM 1.2 schema stored locally at `src/schemas/calm/1.2/` | Local schema storage enables offline validation, deterministic builds, and version pinning. The extension validates against the local schema copy rather than fetching from the CALM CDN at runtime. Schema updates are explicit (committed to source control) rather than implicit. |