---
name: knowledge-reference-repos
description: Optional exemplar grounding for the code-design-agent. Clones + indexes a per-mesh-configured list of "patterns we want the agent to honor" from mesh/.caterpillar/reference-repos/. Same shape as knowledge-code, but the agent treats every returned repo as a reference EXEMPLAR — never as an edit target.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-reference-repos
---

# Knowledge Reference Repos Skill (D-PR3)

The code-design-agent (Phase D / WHAT) calls this **at most once per
run**, AFTER per-target-repo `knowledge-code` calls, to optionally
ground its design against a curated list of "build this like that"
reference patterns.

## Why this Skill exists

Greenfield WHAT runs have no in-repo grounding (the target repo is
about to be created; there's nothing there to read). Without an
exemplar Skill, a greenfield agent either:

1. Invents from prompt-pack content alone — low quality, no
   architectural anchor; the resulting design rarely lines up with how
   the org actually builds things.
2. Copies the in-org reference verbally without auditability — the
   chain records "the agent referenced our auth service" but never
   names which files / commits / patterns it actually pulled.

This Skill closes that gap: the team configures a curated list of
"build this like that" exemplars in
`mesh/.caterpillar/reference-repos/` (one YAML file per exemplar with
the repo URL + a short rationale); the Skill clones, classifies, and
returns them with `reference: true` so the agent treats them as
read-only patterns to honor, not as edit targets.

Brownfield runs may ALSO benefit (e.g., "make the new endpoint look
like the auth pattern in our existing reference-auth-service"), but
the primary motivation is greenfield.

## How the mesh configures reference-repos

A team that wants exemplar grounding adds one YAML file per reference
repo under `mesh/.caterpillar/reference-repos/`:

```yaml
# mesh/.caterpillar/reference-repos/reference-auth-service.yml
repo: https://github.com/<your-org>/reference-auth-service
ref: main                                    # optional — defaults to default branch
rationale: "Canonical OAuth2 + JWT issuer pattern; new auth code SHOULD mirror this layout."
calm_layer: identity                          # optional — used to filter exemplars by CALM layer
applies_to_languages: [typescript, javascript]  # optional — narrow exemplar applicability
```

If no files exist under `mesh/.caterpillar/reference-repos/`, the
Skill returns `{ ok: true, mode: 'reference', repos: [] }` and the
agent proceeds without exemplar grounding (greenfield design quality
will be lower but the run is not blocked).

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | OKR id; threaded into audit metadata so the chain links the call to the right run. |
| `barId` | `string` | no | — | BAR id for the OKR's primary affected app; used to filter reference-repos by `calm_layer` if the BAR's primary layer is set. Pass to enable filtering; omit to load all configured reference-repos. |
| `primaryLanguage` | `string` | no | — | Optional language hint (typically the target repo's `knowledge-code.primary_language`); used to filter reference-repos by `applies_to_languages` when set. |
| `maxFiles` | `integer` | no | 200 | Cap on the file-walk depth per reference-repo (same as `knowledge-code`). |

## Outputs (stdout JSON)

Two shapes — happy path + discriminated failure modes per the
Phase E source-atomicity discipline:

### Happy path

```json
{
  "ok": true,
  "mode": "reference",
  "repos": [
    {
      "ok": true,
      "repo": { "owner": "...", "name": "...", "ref": "...", "sha": "..." },
      "reference": true,
      "rationale": "Canonical OAuth2 + JWT issuer pattern; new auth code SHOULD mirror this layout.",
      "calm_layer": "identity",
      "structure": {
        "topDirs": ["src", "test", "docs"],
        "languages": { "typescript": 142, "javascript": 8 },
        "manifests": ["package.json", "tsconfig.json"],
        "entryPoints": [
          { "path": "src/server.ts", "framework": "express" }
        ],
        "files": [/* same shape as knowledge-code, role-classified */],
        "modules": [/* same shape as knowledge-code */],
        "routes": [/* same shape as knowledge-code */],
        "tests": [/* same shape as knowledge-code */]
      },
      "inventory_paths": ["src/server.ts", "src/auth.ts", "..."]
    }
  ]
}
```

### Mesh has no reference-repos configured (not an error)

```json
{
  "ok": true,
  "mode": "reference",
  "repos": [],
  "reason": "mesh-has-no-reference-repos"
}
```

The agent SHOULD continue with greenfield design from prompt-pack
content alone; the chain records the absence of exemplars explicitly.

### Per-repo discriminated failure (suppress-non-canonical pattern)

When one reference-repo's clone partially fails, the per-repo entry
in `repos[]` gets a discriminated status; the OTHER reference-repos
still return cleanly. The agent decides whether to proceed or
refuse:

```json
{
  "ok": true,
  "mode": "reference",
  "repos": [
    {
      "ok": false,
      "repo": { "owner": "...", "name": "reference-auth-service", "ref": "main" },
      "status": "fetch-error",
      "reason": "git clone failed: <git stderr verbatim>"
    },
    {
      "ok": true,
      "repo": { "owner": "...", "name": "reference-event-bus", "ref": "main", "sha": "..." },
      "reference": true,
      "structure": { /* ... */ }
    }
  ]
}
```

Per-repo `status` values: `ok`, `fetch-error`, `mesh-config-malformed`,
`ref-not-found`. Each maps to a distinct fix path. NEVER collapse to
a generic `failed`.

### Hard refuse (whole-Skill failure)

```json
{
  "ok": false,
  "reason": "mesh-config-dir-unreadable",
  "remediation": "Check `.caterpillar/reference-repos/` directory permissions on the mesh checkout."
}
```

## Determinism contract

Same `(repo URL, ref hash, maxFiles)` in → same JSON out. The Skill:

- Resolves `ref` to a commit SHA before classifying (so the response
  is reproducible even when `main` advances between calls).
- Sorts every array deterministically (file paths, languages, etc.).
- Does NOT read environment variables except `cwd`.
- Does NOT touch the clock (no timestamps in the response).

The audit chain records `(repo URL, resolved SHA)` per
reference-repo in the `skill_call` event's payload so a reviewer
can re-run with identical input.

## How the agent uses the response

After getting back `{ ok: true, mode: 'reference', repos: [...] }`,
the code-design-agent treats every returned repo as an EXEMPLAR
(`reference: true`):

- **Citable as patterns to honor**: §1 Project Structure can say "new
  auth code follows the layout of `reference-auth-service/src/auth/*`
  per the exemplar grounding."
- **NOT editable**: the design MUST NOT propose changes to files
  inside any reference-repo. The workflow's path-citation gate
  cross-checks: if the agent cites a `reference-auth-service/...`
  path in a per-repo subsection's `cited_paths:` list, the structural
  verdict fails with `cited-reference-repo-as-edit-target:<path>`.
- **Recorded in §10 rationale**: every reference-repo whose pattern
  the design borrows MUST be cited by short slug (e.g.
  "reference-auth-service") in §10 with a one-line note on which
  decision the pattern informed.

## Audit event shape

Per-Skill-call (auto-emitted by the runner):

```json
{
  "event_kind": "skill_call",
  "payload": {
    "skill": "knowledge-reference-repos",
    "ok": true,
    "okrId": "OKR-...",
    "reference_repos": [
      { "url": "https://github.com/.../reference-auth-service", "sha": "abc123..." },
      { "url": "https://github.com/.../reference-event-bus", "sha": "def456..." }
    ]
  }
}
```

The chain proves: which exemplars the agent loaded, at which SHA, for
which OKR. Re-running the Skill against the same SHAs is bit-for-bit
reproducible.

## Skipping the Skill

When the mesh has no `.caterpillar/reference-repos/` directory or
the directory is empty, the agent SHOULD STILL call this Skill once
per run; the empty response is recorded in the chain (which is what
makes "the team has no exemplars configured" auditable rather than
"the agent forgot to ground"). The workflow's required skill_call
manifest tolerates an empty `repos` array but rejects the call being
absent entirely.
