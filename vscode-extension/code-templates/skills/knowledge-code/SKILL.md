---
name: knowledge-code
description: Shallow-clone + index ONE target code repo. Returns structural snapshot (top-level dirs, language stats, key entrypoints) for the code-design agent.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-knowledge-code
---

# Knowledge Code Skill

The code-design agent calls this once per `target_code_repos[]` entry. Returns enough structural detail that the agent can author a code-grounded design without having to clone repos itself.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `repoUrl` | `string` | yes | — | Full URL `https://github.com/<org>/<repo>`. |
| `ref` | `string` | no | `HEAD` | Branch or tag. |
| `maxFiles` | `integer` | no | 200 | Cap on file-walk depth. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `repo` | `{ owner, name, ref, sha }` | Identity + the actual SHA indexed. |
| `structure` | `{ topDirs, languages, packageManifests }` | Top-level shape (no source contents). |
| `entryPoints` | `{ path, kind: "api" \| "ui" \| "worker" \| "cli", framework }[]` | Detected entrypoints from manifests. |

## Invocation

```sh
echo '{"repoUrl":"https://github.com/acme/celeb-api"}' \
  | npx @maintainabilityai/research-runner skill-knowledge-code
```

## Implementation

Shallow clone (`depth=1`, single branch) into a tmp dir, walk + classify. CLI subcommand backend lands in B-PR1a. Phase D only — `code-design-agent` is the sole caller.

## Error contract

Auth retry uses the Queen's Keyring token (B15). `{ok: false, reason: 'repo-unreachable'}` after 1 auth-refresh — agent stops if this is a target repo, continues if a reference repo.
