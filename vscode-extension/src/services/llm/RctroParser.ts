import type { RctroPrompt } from '../../types';

function toParseErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  throw new Error(`Failed to parse LLM response as RCTRO JSON — no JSON found. Raw response:\n${text.substring(0, 500)}`);
}

export function parseRctroResponse(text: string): RctroPrompt {
  const jsonStr = extractJson(text);

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title || undefined,
      role: parsed.role || '',
      context: parsed.context || '',
      task: parsed.task || '',
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.map((r: Record<string, unknown>) => ({
            title: String(r.title || ''),
            details: Array.isArray(r.details) ? r.details.map(String) : [],
            validation: String(r.validation || ''),
          }))
        : [],
      output: parsed.output || '',
    };
  } catch (err) {
    throw new Error(`Failed to parse LLM response as RCTRO JSON. Error: ${toParseErrorMessage(err)}\nRaw response:\n${text.substring(0, 500)}`);
  }
}
