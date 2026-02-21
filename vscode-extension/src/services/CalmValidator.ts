// CalmValidator — structural validation for CALM JSON after mutations
// Checks referential integrity, required fields, and schema consistency

export interface CalmValidationError {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  nodeId?: string;
}

/**
 * Validate a CALM architecture document for structural correctness.
 * Returns an array of errors/warnings/info messages.
 */
export function validate(calm: Record<string, unknown>): CalmValidationError[] {
  const errors: CalmValidationError[] = [];
  const nodes = (calm.nodes || []) as Record<string, unknown>[];
  const relationships = (calm.relationships || []) as Record<string, unknown>[];

  const nodeIds = new Set<string>();
  const relIds = new Set<string>();

  // Validate nodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const id = node['unique-id'] as string;
    const path = `nodes[${i}]`;

    if (!id) {
      errors.push({ severity: 'error', message: 'Node missing unique-id', path });
      continue;
    }

    if (nodeIds.has(id)) {
      errors.push({ severity: 'error', message: `Duplicate node unique-id: ${id}`, path, nodeId: id });
    }
    nodeIds.add(id);

    if (!node['node-type']) {
      errors.push({ severity: 'error', message: `Node ${id} missing node-type`, path, nodeId: id });
    } else {
      const validTypes = ['system', 'actor', 'service', 'database', 'network'];
      if (!validTypes.includes(node['node-type'] as string)) {
        errors.push({
          severity: 'warning',
          message: `Node ${id} has non-standard node-type: ${node['node-type']}`,
          path,
          nodeId: id,
        });
      }
    }

    if (!node.name) {
      errors.push({ severity: 'warning', message: `Node ${id} has no name`, path, nodeId: id });
    }

    if (!node.description) {
      errors.push({ severity: 'info', message: `Node ${id} has no description`, path, nodeId: id });
    }

    if (!node['data-classification']) {
      errors.push({ severity: 'info', message: `Node ${id} has no data-classification`, path, nodeId: id });
    }
  }

  // Validate relationships
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    const id = rel['unique-id'] as string;
    const path = `relationships[${i}]`;

    if (!id) {
      errors.push({ severity: 'error', message: 'Relationship missing unique-id', path });
      continue;
    }

    if (relIds.has(id)) {
      errors.push({ severity: 'error', message: `Duplicate relationship unique-id: ${id}`, path });
    }
    relIds.add(id);

    const rt = rel['relationship-type'] as Record<string, unknown> | undefined;
    if (!rt) {
      errors.push({ severity: 'error', message: `Relationship ${id} missing relationship-type`, path });
      continue;
    }

    // Validate connects references
    if (rt.connects) {
      const conn = rt.connects as Record<string, unknown>;
      const source = conn.source as Record<string, unknown> | undefined;
      const dest = conn.destination as Record<string, unknown> | undefined;

      if (source?.node && !nodeIds.has(source.node as string)) {
        errors.push({
          severity: 'error',
          message: `Relationship ${id} references non-existent source node: ${source.node}`,
          path: `${path}.relationship-type.connects.source.node`,
        });
      }
      if (dest?.node && !nodeIds.has(dest.node as string)) {
        errors.push({
          severity: 'error',
          message: `Relationship ${id} references non-existent destination node: ${dest.node}`,
          path: `${path}.relationship-type.connects.destination.node`,
        });
      }
    }

    // Validate interacts references
    if (rt.interacts) {
      const inter = rt.interacts as Record<string, unknown>;
      if (inter.actor && !nodeIds.has(inter.actor as string)) {
        errors.push({
          severity: 'error',
          message: `Relationship ${id} references non-existent actor: ${inter.actor}`,
          path: `${path}.relationship-type.interacts.actor`,
        });
      }
      if (Array.isArray(inter.nodes)) {
        for (const nid of inter.nodes) {
          if (!nodeIds.has(nid as string)) {
            errors.push({
              severity: 'error',
              message: `Relationship ${id} references non-existent node: ${nid}`,
              path: `${path}.relationship-type.interacts.nodes`,
            });
          }
        }
      }
    }

    // Validate composed-of references
    if (rt['composed-of']) {
      const comp = rt['composed-of'] as Record<string, unknown>;
      if (comp.container && !nodeIds.has(comp.container as string)) {
        errors.push({
          severity: 'error',
          message: `Relationship ${id} references non-existent container: ${comp.container}`,
          path: `${path}.relationship-type.composed-of.container`,
        });
      }
      if (Array.isArray(comp.nodes)) {
        for (const nid of comp.nodes) {
          if (!nodeIds.has(nid as string)) {
            errors.push({
              severity: 'error',
              message: `Relationship ${id} references non-existent child node: ${nid}`,
              path: `${path}.relationship-type.composed-of.nodes`,
            });
          }
        }
      }
    }
  }

  // Validate flow references
  if (Array.isArray(calm.flows)) {
    for (let i = 0; i < (calm.flows as Record<string, unknown>[]).length; i++) {
      const flow = (calm.flows as Record<string, unknown>[])[i];
      const path = `flows[${i}]`;

      if (Array.isArray(flow.transitions)) {
        for (const t of flow.transitions as Record<string, unknown>[]) {
          const relRef = t['relationship-unique-id'] as string;
          if (relRef && !relIds.has(relRef)) {
            errors.push({
              severity: 'warning',
              message: `Flow transition references non-existent relationship: ${relRef}`,
              path: `${path}.transitions`,
            });
          }
        }
      }
    }
  }

  return errors;
}
