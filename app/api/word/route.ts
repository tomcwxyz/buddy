import { NextResponse } from "next/server";
import { normaliseWord } from "@/lib/literacy/engine";

type DictionaryDefinition = {
  definition?: string;
  example?: string;
};

type DictionaryMeaning = {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
};

type DictionaryEntry = {
  word?: string;
  meanings?: DictionaryMeaning[];
};

function chooseDefinition(entries: DictionaryEntry[]) {
  const candidates = entries.flatMap((entry) =>
    (entry.meanings ?? []).flatMap((meaning) =>
      (meaning.definitions ?? [])
        .filter((item) => typeof item.definition === "string")
        .map((item) => ({
          definition: item.definition!.trim(),
          example: item.example?.trim() ?? null,
          partOfSpeech: meaning.partOfSpeech ?? null,
        })),
    ),
  );

  const useful = candidates
    .filter((item) => item.definition.length >= 8 && item.definition.length <= 220)
    .sort((a, b) => a.definition.length - b.definition.length);

  return useful[0] ?? candidates[0] ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = normaliseWord(searchParams.get("word") ?? "");

  if (!word || word.length > 48 || !/^[a-z][a-z'-]*$/.test(word)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 },
        signal: AbortSignal.timeout(3500),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ word, meaning: null, example: null, source: "not-found" });
    }

    const entries = (await response.json()) as DictionaryEntry[];
    const chosen = chooseDefinition(Array.isArray(entries) ? entries : []);

    return NextResponse.json({
      word,
      meaning: chosen?.definition ?? null,
      example: chosen?.example ?? null,
      partOfSpeech: chosen?.partOfSpeech ?? null,
      source: chosen ? "dictionaryapi.dev" : "not-found",
    });
  } catch {
    return NextResponse.json({ word, meaning: null, example: null, source: "unavailable" });
  }
}
