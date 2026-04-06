/**
 * Red Queen MCP Server — Governance-Enforced Agent Intelligence
 *
 * Exposes the governance mesh as calm:// resources and tools to
 * MCP-compatible AI coding agents (Claude Code Action, Copilot).
 *
 * Usage (MCP server mode):
 *   node dist/mcp-server.js --mesh-path /path/to/governance-mesh
 *   RED_QUEEN_MESH_PATH=/path/to/mesh node dist/mcp-server.js
 *
 * Usage (scaffold mode — generates agent configs for a BAR):
 *   node dist/mcp-server.js --mesh-path /path/to/mesh --scaffold --bar "My BAR" [--output ./repo]
 */
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MeshReader } from '../core/mesh-reader';
import { registerResources } from './resources';
import { registerTools } from './tools';
import { registerPrompts } from './prompts';
import { scaffoldAgentConfig } from './config-scaffold';
import { RedQueenService } from '../services/RedQueenService';

// ============================================================================
// CLI argument parsing
// ============================================================================

function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) { return args[idx + 1]; }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function getMeshPath(): string {
  const fromArg = getArg('mesh-path');
  if (fromArg) { return fromArg; }

  if (process.env.RED_QUEEN_MESH_PATH) {
    return process.env.RED_QUEEN_MESH_PATH;
  }

  process.stderr.write(
    'Error: No mesh path provided.\n' +
    'Usage: node mcp-server.js --mesh-path /path/to/governance-mesh\n' +
    '   or: RED_QUEEN_MESH_PATH=/path/to/mesh node mcp-server.js\n'
  );
  process.exit(1);
}

// ============================================================================
// Scaffold mode
// ============================================================================

function runScaffold(meshPath: string): void {
  const barName = getArg('bar');
  if (!barName) {
    process.stderr.write('Error: --bar <name> required in scaffold mode.\n');
    process.exit(1);
  }

  const outputDir = getArg('output');
  const reader = new MeshReader(meshPath);
  const redQueen = new RedQueenService();
  const result = scaffoldAgentConfig(reader, barName, redQueen);

  if ('error' in result) {
    process.stderr.write(`Error: ${result.error}\n`);
    process.exit(1);
  }

  process.stderr.write(`Scaffolding agent config for ${result.barName} (tier: ${result.tier})\n`);

  if (outputDir) {
    // Write files to disk
    for (const [filePath, content] of Object.entries(result.files)) {
      const fullPath = path.join(outputDir, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
      fs.writeFileSync(fullPath, content, 'utf8');
      process.stderr.write(`  wrote: ${filePath}\n`);
    }
    process.stderr.write(`\n${Object.keys(result.files).length} files written to ${outputDir}\n`);
  } else {
    // Output JSON to stdout (for piping to other tools)
    process.stdout.write(JSON.stringify({
      barName: result.barName,
      barId: result.barId,
      tier: result.tier,
      files: result.files,
      manifest: result.manifest,
    }, null, 2) + '\n');
  }
}

// ============================================================================
// MCP server mode
// ============================================================================

async function runServer(meshPath: string): Promise<void> {
  const reader = new MeshReader(meshPath);

  const server = new McpServer(
    {
      name: 'red-queen',
      version: '0.2.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );

  // Register resources, tools, and prompts
  const redQueen = new RedQueenService();
  registerResources(server, reader);
  registerTools(server, reader, redQueen);
  registerPrompts(server, reader);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(`Red Queen MCP server started (mesh: ${meshPath})\n`);
}

// ============================================================================
// Entry point
// ============================================================================

async function main() {
  const meshPath = getMeshPath();

  // Validate mesh path exists
  if (!fs.existsSync(meshPath)) {
    process.stderr.write(`Error: Mesh path does not exist: ${meshPath}\n`);
    process.exit(1);
  }

  if (hasFlag('scaffold')) {
    runScaffold(meshPath);
  } else {
    await runServer(meshPath);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
