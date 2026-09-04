import { normaliseWord } from "@/lib/literacy/engine";

export type ModelWordExplanation = {
  meaning: string;
  example: string;
  confidence: "high" | "medium" | "low";
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

const COMMON_CAPITALISED = new Set([
  "a", "an", "and", "as", "at", "but", "for", "from", "he", "her", "his", "i", "in", "it", "its", "my", "of", "on", "or", "our", "she", "so", "that", "the", "their", "they", "this", "to", "we", "with", "you", "your",
]);

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

function tidy(value: string, max = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trim()}…`;
}

/**
 * Build the smallest useful context window for a lexical explanation.
 *
 * We deliberately do not send the photographed page, learning history, audio,
 * account details, or the whole OCR result to the model. Obvious proper-name
 * shaped tokens are redacted from the nearby word window as an additional
 * privacy guard for the child-facing alpha.
 */
export function minimiseLexicalContext(context: string, selectedWord: string) {
  const word = normaliseWord(selectedWord);
  if (!context || !word) return null;

  const raw = context
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b\S+@\S+\.\S+\b/g, " ")
    .replace(/\b\+?\d[\d\s().-]{6,}\d\b/g, " ")
    .slice(0, 320);

  const tokens = raw.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? [];
  const selectedIndex = tokens.findIndex((token) => normaliseWord(token) === word);
  if (selectedIndex < 0) return null;

  const start = Math.max(0, selectedIndex - 6);
  const end = Math.min(tokens.length, selectedIndex + 7);

  const window = tokens.slice(start, end).map((token, index) => {
    const tokenWord = normaliseWord(token);
    const absoluteIndex = start + index;
    const looksLikeName =
      absoluteIndex > 0 &&
      /^[A-Z][a-z]+$/.test(token) &&
      tokenWord !== word &&
      !COMMON_CAPITALISED.has(tokenWord);
    return looksLikeName ? "[name]" : token;
  });

  return tidy(window.join(" "), 150) || null;
}

export function modelWordFallbackEnabled() {
  return process.env.BUDDY_MODEL_FALLBACK_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
}

export async function explainWordWithModel(input: {
  word: string;
  context?: string | null;
  existingMeaning?: string | null;
  partOfSpeech?: string | null;
}): Promise<ModelWordExplanation | null> {
  if (!modelWordFallbackEnabled()) return null;

  const word = normaliseWord(input.word);
  if (!word) return null;

  const lexicalContext = minimiseLexicalContext(input.context ?? "", word);
  const existingMeaning = input.existingMeaning ? tidy(input.existingMeaning, 180) : null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.BUDDY_EXPLAIN_MODEL || "gpt-5.6",
      store: false,
      reasoning: { effort: "none" },
      input: [
        {
          role: "system",
          content:
            "You are the tightly scoped vocabulary explanation layer inside Buddy, a child-facing reading companion. Explain only the selected English word. Use the nearby lexical context only to choose the likely sense. Give one short, concrete, age-appropriate meaning in plain British English and one short example sentence. Do not address the child directly, praise them, ask questions, give advice, discuss personal information, or add anything outside the requested fields. If the word is unusual or the sense is uncertain, be cautious and mark confidence low rather than inventing detail.",
        },
        {
          role: "user",
          content: JSON.stringify({
            word,
            nearby_words: lexicalContext,
            existing_dictionary_meaning: existingMeaning,
            part_of_speech: input.partOfSpeech ?? null,
          }),
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "buddy_word_explanation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              meaning: { type: "string" },
              example: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["meaning", "example", "confidence"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 120,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as OpenAIResponse;
  const text = outputText(payload);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<ModelWordExplanation>;
    if (
      typeof parsed.meaning !== "string" ||
      typeof parsed.example !== "string" ||
      !["high", "medium", "low"].includes(parsed.confidence ?? "")
    ) {
      return null;
    }

    const meaning = tidy(parsed.meaning, 150);
    const example = tidy(parsed.example, 170);
    if (!meaning || !example) return null;

    return {
      meaning,
      example,
      confidence: parsed.confidence as ModelWordExplanation["confidence"],
    };
  } catch {
    return null;
  }
}
