// ============================================================================
// CapabilityModelService — Enterprise business capability model management
// Reads/writes capability models, builds reverse BAR-to-capability index
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type {
  CapabilityModelFile,
  CapabilityModelType,
  CapabilityModelSummary,
  CapabilityNode,
  CapabilityDefinition,
  BarSummary,
} from '../types';
import {
  generateInsuranceCapabilityModel,
  generateBankingCapabilityModel,
} from '../templates/scaffolding/capabilityModelTemplates';

// ============================================================================
// Service
// ============================================================================

export class CapabilityModelService {

  /**
   * Read the active capability model from decorators/capability-model.json.
   */
  readModel(meshPath: string): CapabilityModelFile | null {
    const modelPath = path.join(meshPath, 'decorators', 'capability-model.json');
    if (!fs.existsSync(modelPath)) { return null; }
    try {
      return JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Write a capability model to decorators/capability-model.json.
   */
  writeModel(meshPath: string, model: CapabilityModelFile): void {
    const decoratorsDir = path.join(meshPath, 'decorators');
    if (!fs.existsSync(decoratorsDir)) {
      fs.mkdirSync(decoratorsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(decoratorsDir, 'capability-model.json'),
      JSON.stringify(model, null, 2),
      'utf-8'
    );
  }

  /**
   * Initialize the decorators/ directory with a built-in model during mesh init.
   */
  initializeModel(meshPath: string, modelType: CapabilityModelType): void {
    const decoratorsDir = path.join(meshPath, 'decorators');
    if (!fs.existsSync(decoratorsDir)) {
      fs.mkdirSync(decoratorsDir, { recursive: true });
    }

    if (modelType === 'custom') {
      // Write a minimal placeholder for custom models
      const placeholder: CapabilityModelFile = {
        $schema: 'https://calm.finos.org/release/1.2/meta/decorator.json',
        $id: 'decorators/capability-model.json',
        'unique-id': 'custom-capability-map',
        name: 'Custom Capability Map',
        'model-type': 'custom',
        'decorator-type': 'business-capability',
        definitions: {},
      };
      fs.writeFileSync(
        path.join(decoratorsDir, 'capability-model.json'),
        JSON.stringify(placeholder, null, 2),
        'utf-8'
      );
    } else {
      const json = modelType === 'banking'
        ? generateBankingCapabilityModel()
        : generateInsuranceCapabilityModel();
      fs.writeFileSync(
        path.join(decoratorsDir, 'capability-model.json'),
        json,
        'utf-8'
      );
    }
  }

  /**
   * Switch the active capability model (overwrites decorators/capability-model.json).
   */
  switchModel(meshPath: string, modelType: CapabilityModelType): void {
    this.initializeModel(meshPath, modelType);
  }

  /**
   * Upload a custom model from JSON content. Validates structure before writing.
   */
  uploadCustomModel(meshPath: string, jsonContent: string): CapabilityModelFile {
    const parsed = JSON.parse(jsonContent);

    // Basic validation
    if (!parsed.definitions || typeof parsed.definitions !== 'object') {
      throw new Error('Invalid capability model: missing "definitions" object.');
    }
    if (!parsed.name) {
      throw new Error('Invalid capability model: missing "name" field.');
    }

    // Normalize required fields
    const model: CapabilityModelFile = {
      $schema: parsed.$schema || 'https://calm.finos.org/release/1.2/meta/decorator.json',
      $id: 'decorators/capability-model.json',
      'unique-id': parsed['unique-id'] || 'custom-capability-map',
      name: parsed.name,
      'model-type': 'custom',
      'decorator-type': 'business-capability',
      definitions: parsed.definitions,
    };

    this.writeModel(meshPath, model);
    return model;
  }

  /**
   * Build full capability summary including reverse BAR mapping.
   */
  buildCapabilityModelSummary(
    meshPath: string,
    allBars: BarSummary[],
  ): CapabilityModelSummary | null {
    const model = this.readModel(meshPath);
    if (!model) { return null; }

    // 1. Flatten the hierarchical definitions into CapabilityNode records
    const allNodes = this.flattenDefinitions(model.definitions, null);

    // 2. Build reverse index: capability key → [bar paths]
    const barIndex = this.buildBarCapabilityIndex(allBars);

    // 3. Count BARs in subtree for each node
    for (const [key, node] of Object.entries(allNodes)) {
      node.barCount = this.countSubtreeBars(key, allNodes, barIndex);
    }

    // 4. Extract L1 nodes
    const l1Capabilities = Object.values(allNodes).filter(n => n.level === 'L1');

    return {
      modelName: model.name,
      modelType: model['model-type'],
      l1Capabilities,
      allNodes,
      capabilityToBarMap: barIndex,
    };
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Scan all BAR decorator mappings and build reverse index: capability key → [bar paths].
   * Reads bar.arch.json from each BAR's architecture directory.
   */
  private buildBarCapabilityIndex(allBars: BarSummary[]): Record<string, string[]> {
    const index: Record<string, string[]> = {};

    for (const bar of allBars) {
      const capabilities = this.extractBarCapabilities(bar.path);
      for (const capKey of capabilities) {
        if (!index[capKey]) { index[capKey] = []; }
        if (!index[capKey].includes(bar.path)) {
          index[capKey].push(bar.path);
        }
      }
    }

    return index;
  }

  /**
   * Extract all capability paths from a BAR's architecture decorator files.
   */
  private extractBarCapabilities(barPath: string): string[] {
    const capabilities: string[] = [];
    const archDir = path.join(barPath, 'architecture');

    // Read unified bar.arch.json for decorator mappings
    const barArchPath = path.join(archDir, 'bar.arch.json');
    if (fs.existsSync(barArchPath)) {
      try {
        const arch = JSON.parse(fs.readFileSync(barArchPath, 'utf-8'));
        if (arch.decorators && Array.isArray(arch.decorators)) {
          for (const dec of arch.decorators) {
            if (!dec.mappings) { continue; }
            for (const mapping of Object.values(dec.mappings as Record<string, { capabilities?: string[] }>)) {
              if (Array.isArray(mapping.capabilities)) {
                for (const capPath of mapping.capabilities) {
                  if (!capabilities.includes(capPath)) {
                    capabilities.push(capPath);
                  }
                }
              }
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Also check standalone decorator.json
    const decoratorPath = path.join(archDir, 'decorator.json');
    if (fs.existsSync(decoratorPath)) {
      try {
        const dec = JSON.parse(fs.readFileSync(decoratorPath, 'utf-8'));
        if (dec.mappings && typeof dec.mappings === 'object') {
          for (const mapping of Object.values(dec.mappings as Record<string, { capabilities?: string[] }>)) {
            if (Array.isArray(mapping.capabilities)) {
              for (const capPath of mapping.capabilities) {
                if (!capabilities.includes(capPath)) {
                  capabilities.push(capPath);
                }
              }
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    return capabilities;
  }

  /**
   * Flatten hierarchical definitions into a flat Record<key, CapabilityNode>.
   * Keys use slash-separated paths: "insurance-operations/claims-management/claims-adjudication"
   */
  private flattenDefinitions(
    definitions: Record<string, CapabilityDefinition>,
    parentKey: string | null,
  ): Record<string, CapabilityNode> {
    const result: Record<string, CapabilityNode> = {};

    for (const [id, def] of Object.entries(definitions)) {
      const key = parentKey ? `${parentKey}/${id}` : id;
      const childKeys: string[] = [];

      if (def.children) {
        for (const childId of Object.keys(def.children)) {
          childKeys.push(`${key}/${childId}`);
        }
      }

      result[key] = {
        key,
        level: def.level,
        name: def.name,
        description: def.description,
        childCount: childKeys.length,
        barCount: 0, // computed later
        childKeys,
        parentKey,
      };

      // Recurse into children
      if (def.children) {
        const childNodes = this.flattenDefinitions(def.children, key);
        Object.assign(result, childNodes);
      }
    }

    return result;
  }

  /**
   * Count BARs in the entire subtree for a given capability node.
   * Unions BAR sets from the node itself and all descendants.
   */
  private countSubtreeBars(
    nodeKey: string,
    allNodes: Record<string, CapabilityNode>,
    barIndex: Record<string, string[]>,
  ): number {
    const barPaths = new Set<string>();

    // Collect BARs from this node and all descendants
    for (const [key, bars] of Object.entries(barIndex)) {
      if (key === nodeKey || key.startsWith(nodeKey + '/')) {
        for (const bp of bars) {
          barPaths.add(bp);
        }
      }
    }

    return barPaths.size;
  }
}
