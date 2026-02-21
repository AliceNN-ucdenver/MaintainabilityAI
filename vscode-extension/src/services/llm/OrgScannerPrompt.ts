import type { OrgRepo, ExistingStructureContext } from '../../types';

export function buildSystemPrompt(existingContext?: ExistingStructureContext): string {
  let prompt = `You are an enterprise architecture advisor. Your task is to analyze a GitHub organization's repositories and recommend how they should be organized into a governance structure.

The governance structure follows this hierarchy:
- **Platform**: A logical grouping of related business applications by domain, team, or capability (e.g., "Customer Experience", "Data Platform", "Internal Tools")
- **BAR (Business Application Repository)**: A governance unit representing one business application. A BAR may contain one or more code repositories (e.g., a frontend repo + backend repo + shared library = one BAR)

Your job:
1. Analyze each repository's name, description, primary language, topics, and README content
2. Group repositories into logical Platforms
3. Within each Platform, group related repositories into BARs
4. A single repo can belong to exactly one BAR
5. Multiple related repos (e.g., frontend + backend, service + shared lib) should be grouped into the same BAR
6. Suggest a concise platform abbreviation (2-4 uppercase letters) for each Platform
7. Assign a criticality level to each BAR based on signals:
   - "critical": production-facing, handles sensitive data, core business logic
   - "high": important services, user-facing applications
   - "medium": internal tools, supporting services
   - "low": utilities, experiments, documentation
8. Place repositories that don't clearly belong to any group into the "unassigned" array`;

  if (existingContext && existingContext.platforms.length > 0) {
    // Build existing structure summary
    const structureLines = existingContext.platforms.map(p => {
      const barLines = p.bars.map(b => {
        const repoNames = b.repos.map(r => {
          try { return r.split('/').pop()?.replace('.git', '') || r; } catch { return r; }
        });
        return `  BAR "${b.name}" (${b.id}) — repos: ${repoNames.length > 0 ? repoNames.join(', ') : '(none)'}`;
      });
      return `Platform "${p.name}" (${p.id})\n${barLines.join('\n')}`;
    });

    prompt += `

EXISTING GOVERNANCE STRUCTURE:
The organization already has the following platforms and BARs configured. When repos clearly belong with existing BARs, add them there via the "updates" array instead of creating new structures.

${structureLines.join('\n\n')}

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "platforms": [
    {
      "name": "Platform Name",
      "abbreviation": "ABBR",
      "rationale": "Brief explanation",
      "bars": [
        {
          "name": "Application Name",
          "criticality": "high",
          "rationale": "Brief explanation",
          "repos": ["repo-name-1", "repo-name-2"]
        }
      ]
    }
  ],
  "unassigned": ["repo-name-3"],
  "updates": [
    {
      "barId": "APP-INS-001",
      "addRepos": ["repo-name-4"],
      "rationale": "This repo is related to the existing BAR"
    }
  ]
}

Important:
- "platforms" contains ONLY new platforms/BARs (do not duplicate existing ones)
- "updates" contains additions to EXISTING BARs (use the barId from the structure above)
- Every repo must appear exactly once — in a new BAR, in "unassigned", or in an update
- Prefer adding to existing BARs over creating new single-repo BARs when the fit is clear
- Platform names should be human-readable (Title Case)
- BAR names should be human-readable application names (not repo slugs)
- Prefer fewer, larger platforms over many small ones
- It's better to put uncertain repos in "unassigned" than force a bad grouping`;
  } else {
    prompt += `

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "platforms": [
    {
      "name": "Platform Name",
      "abbreviation": "ABBR",
      "rationale": "Brief explanation of why these repos belong together",
      "bars": [
        {
          "name": "Application Name",
          "criticality": "high",
          "rationale": "Brief explanation",
          "repos": ["repo-name-1", "repo-name-2"]
        }
      ]
    }
  ],
  "unassigned": ["repo-name-3"]
}

Important:
- The "repos" arrays in BARs contain repo NAME strings (not full names)
- Every repo must appear exactly once — either in a BAR or in "unassigned"
- Platform names should be human-readable (Title Case)
- BAR names should be human-readable application names (not repo slugs)
- Prefer fewer, larger platforms over many small ones
- It's better to put uncertain repos in "unassigned" than force a bad grouping`;
  }

  return prompt;
}

export function buildUserPrompt(repos: OrgRepo[], org: string): string {
  const repoSummaries = repos.map(r => {
    let summary = `### ${r.name}`;
    if (r.description) { summary += `\nDescription: ${r.description}`; }
    if (r.language) { summary += `\nLanguage: ${r.language}`; }
    if (r.topics.length > 0) { summary += `\nTopics: ${r.topics.join(', ')}`; }
    if (r.readme) {
      // Take first 500 chars of README for context
      const readmeExcerpt = r.readme.length > 500 ? r.readme.slice(0, 500) + '...' : r.readme;
      summary += `\nREADME excerpt:\n${readmeExcerpt}`;
    }
    return summary;
  }).join('\n\n');

  return `Analyze the following ${repos.length} repositories from the "${org}" GitHub organization and recommend a platform/BAR governance structure.

${repoSummaries}

Return the JSON structure as specified. Remember: every repo name must appear exactly once.`;
}
