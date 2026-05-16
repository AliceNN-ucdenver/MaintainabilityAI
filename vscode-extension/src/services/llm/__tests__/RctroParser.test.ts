import { describe, expect, it } from 'vitest';
import { parseRctroResponse } from '../RctroParser';

describe('parseRctroResponse', () => {
  it('parses fenced JSON responses', () => {
    const result = parseRctroResponse(`Here is the RCTRO:

\`\`\`json
{
  "title": "Checkout governance",
  "role": "Principal architect",
  "context": "Payments extension",
  "task": "Generate governance prompts",
  "requirements": [
    {
      "title": "Preserve boundaries",
      "details": ["No UI imports from MCP"],
      "validation": "Run architecture fitness tests"
    }
  ],
  "output": "RCTRO prompt"
}
\`\`\``);

    expect(result).toEqual({
      title: 'Checkout governance',
      role: 'Principal architect',
      context: 'Payments extension',
      task: 'Generate governance prompts',
      requirements: [
        {
          title: 'Preserve boundaries',
          details: ['No UI imports from MCP'],
          validation: 'Run architecture fitness tests',
        },
      ],
      output: 'RCTRO prompt',
    });
  });

  it('parses JSON embedded in prose and normalizes optional fields', () => {
    const result = parseRctroResponse(`Use this:
{
  "role": "Reviewer",
  "requirements": [
    {
      "title": "Require tests",
      "details": ["unit", 42],
      "validation": "npm test"
    }
  ]
}
Thanks.`);

    expect(result).toEqual({
      title: undefined,
      role: 'Reviewer',
      context: '',
      task: '',
      requirements: [
        {
          title: 'Require tests',
          details: ['unit', '42'],
          validation: 'npm test',
        },
      ],
      output: '',
    });
  });

  it('rejects responses without JSON', () => {
    expect(() => parseRctroResponse('I cannot produce the prompt yet.')).toThrow(/no JSON found/);
  });

  it('includes parser errors for malformed JSON', () => {
    expect(() => parseRctroResponse('{"role": }')).toThrow(/Failed to parse LLM response as RCTRO JSON/);
  });
});
