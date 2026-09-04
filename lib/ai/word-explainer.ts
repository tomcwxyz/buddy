import { normaliseWord } from "@/lib/literacy/engine";

export type ModelWordExplanation = {
  meaning: string;
  example: string;
  confidence: "high" | "medium" | "low";
  knownEnglishWord: boolean;
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
  lemma?: string | null;
  grammaticalForm?: string | null;
}): Promise<ModelWordExplanation | null> {
  if (!modelWordFallbackEnabled()) return null;

  const word = normaliseWord(input.word);
  if (!word) return null;

  const lexicalContext = minimiseLexicalContext(input.context ?? "", word);
  const existingMeaning = input.existingMeaning ? tidy(input.existingMeaning, 180) : null;
  const lemma = input.lemma ? normaliseWord(input.lemma) : null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.BUDDY_EXPLAIN_MODEL || "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "none" },
      input: [
        {
          role: "system",
          content:
            "You are the tightly scoped vocabulary explanation layer inside Buddy, a child-facing reading companion. Work only with the selected English word. Use nearby lexical context only to choose the likely sense. If trusted lexical evidence says the printed word is an inflected form of a lemma, keep the explanation in the sense and grammatical use supported by that evidence. A known English word may be common, inflected, borrowed, dialectal, literary, scientific or technical; do not treat proper names, OCR garbage or invented strings as ordinary English words. If the token is not a word you can identify with reasonable confidence, set known_english_word false and leave meaning and example empty. Otherwise give one short, concrete, age-appropriate meaning in plain British English and one short natural example sentence using the same sense. Prefer everyday words in the explanation. Do not address the child directly, praise them, ask questions, give advice, discuss personal information, explain pronunciation, or add anything outside the requested fields. If the sense is uncertain, be cautious and mark confidence low rather than inventing detail.",
        },
        {
          role: "user",
          content: JSON.stringify({
            word,
            lemma: lemma && lemma !== word ? lemma : null,
            grammatical_form: input.grammaticalForm ?? null,
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
              known_english_word: { type: "boolean" },
              meaning: { type: "string" },
              example: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["known_english_word", "meaning", "example", "confidence"],
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
    const parsed = JSON.parse(text) as {
      known_english_word?: boolean;
      meaning?: string;
      example?: string;
      confidence?: "high" | "medium" | "low";
    };
    if (
      typeof parsed.known_english_word !== "boolean" ||
      typeof parsed.meaning !== "string" ||
      typeof parsed.example !== "string" ||
      !["high", "medium", "low"].includes(parsed.confidence ?? "")
    ) {
      return null;
    }

    const meaning = tidy(parsed.meaning, 150);
    const example = tidy(parsed.example, 170);
    if (parsed.known_english_word && (!meaning || !example)) return null;

    return {
      knownEnglishWord: parsed.known_english_word,
      meaning: parsed.known_english_word ? meaning : "",
      example: parsed.known_english_word ? example : "",
      confidence: parsed.confidence as ModelWordExplanation["confidence"],
    };
  } catch {
    return null;
  }
}
