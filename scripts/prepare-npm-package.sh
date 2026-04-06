#!/usr/bin/env bash
# Build the MCP server bundle and copy it into the npm package directory.
#
# Usage:
#   ./scripts/prepare-npm-package.sh
#
# Prerequisites:
#   npm ci (in vscode-extension/)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building MCP server bundle..."
cd "${REPO_ROOT}/vscode-extension"
node esbuild.js --production

echo "==> Copying bundle to packages/redqueen-mcp/dist/"
mkdir -p "${REPO_ROOT}/packages/redqueen-mcp/dist"
cp dist/mcp-server.js "${REPO_ROOT}/packages/redqueen-mcp/dist/"

echo "==> Done. Package contents:"
cd "${REPO_ROOT}/packages/redqueen-mcp"
npm pack --dry-run 2>&1 || true

echo ""
echo "To publish: cd packages/redqueen-mcp && npm publish --access public"
