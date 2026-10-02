export type GapLanguageCandidate = {
  text: string;
  confidence: number;
};

export type GapCandidateRequest = {
  before: string[];
  after: string[];
  estimatedCharacters: number;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function outputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text.trim();
      }
    }
  }
  return null;
}

const COMMON_CAPITALISED = new Set([
  "a", "an", "and", "as", "at", "but", "for", "from", "he", "her", "his", "i", "in",
  "it", "its", "my", "of", "on", "or", "our", "she", "so", "that", "the", "their",
  "they", "this", "to", "we", "with", "you", "your",
]);

function cleanToken(value: string) {
  const clean = value
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b\S+@\S+\.\S+\b/g, "")
    .replace(/\b\+?\d[\d\s().-]{6,}\d\b/g, "")
    .replace(/[^A-Za-z'’-]/g, "")
    .slice(0, 32)
    .trim();

  if (
    /^[A-Z][a-z]+$/.test(clean)
    && !COMMON_CAPITALISED.has(clean.toLocaleLowerCase("en-GB"))
  ) {
    return "[name]";
  }

  return clean;
}

function minimiseContext(tokens: string[], takeFromEnd: boolean) {
  const cleaned = tokens
    .map(cleanToken)
    .filter(Boolean);

  return takeFromEnd
    ? cleaned.slice(-6)
    : cleaned.slice(0, 6);
}

export function gapModelEnabled() {
  if (!process.env.OPENAI_API_KEY) return false;
  if (process.env.BUDDY_GAP_MODEL_ENABLED === "false") return false;
  if (process.env.BUDDY_GAP_MODEL_ENABLED === "true") return true;
  return process.env.BUDDY_MODEL_FALLBACK_ENABLED === "true";
}

export async function suggestGapCandidates(
  input: GapCandidateRequest,
): Promise<GapLanguageCandidate[]> {
  if (!gapModelEnabled()) return [];

  const before = minimiseContext(input.before, true);
  const after = minimiseContext(input.after, false);
  const estimatedCharacters = Math.max(1, Math.min(14, Math.round(input.estimatedCharacters)));
  if (!before.length || !after.length) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.BUDDY_GAP_MODEL || process.env.BUDDY_EXPLAIN_MODEL || "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "none" },
      input: [
        {
          role: "system",
          content:
            "You are a tightly constrained missing-word candidate scorer inside Buddy, a child-facing reading companion. A photographed printed sentence contains one OCR gap between known words. Propose only single-word candidates that make grammatical and semantic sense in that exact gap. Do not rewrite the sentence, explain your reasoning, invent story details, or add punctuation outside the candidate word. The estimated character count is approximate, not absolute. Return at most five candidates ordered strongest first. Confidence is how plausible the word is from language context alone, not certainty about what is printed. If context is too ambiguous, return low confidences rather than pretending to know the text.",
        },
        {
          role: "user",
          content: JSON.stringify({
            words_before_gap: before,
            words_after_gap: after,
            approximate_character_count: estimatedCharacters,
          }),
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "buddy_gap_candidates",
          strict: true,
          schema: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["text", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["candidates"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 180,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return [];
  const payload = (await response.json()) as OpenAIResponse;
  const text = outputText(payload);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as {
      candidates?: Array<{ text?: string; confidence?: number }>;
    };

    return (parsed.candidates ?? [])
      .flatMap((candidate) => {
        const token = cleanToken(candidate.text ?? "");
        const confidence = Number(candidate.confidence);
        if (
          !token
          || token.includes(" ")
          || !/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(token)
          || !Number.isFinite(confidence)
        ) {
          return [];
        }

        return [{
          text: token,
          confidence: Math.max(0, Math.min(1, confidence)),
        }];
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  } catch {
    return [];
  }
}
