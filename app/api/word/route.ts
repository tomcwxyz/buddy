import { NextResponse } from "next/server";
import { explainWordWithModel, modelWordFallbackEnabled } from "@/lib/ai/word-explainer";
import { normaliseWord } from "@/lib/literacy/engine";
import {
  chooseLexicalSense,
  extractInflectionLink,
  lexicalAttribution,
  morphologyLabel,
  normalisePartOfSpeech,
  simplifyDefinition,
} from "@/lib/literacy/lexicon";
import { lookupLexicalWord } from "@/lib/literacy/lexical-providers";
import { analyseMorphology, withDetectedLemma, type MorphologyAnalysis } from "@/lib/literacy/morphology";
import { analyseWordSounds } from "@/lib/literacy/sound-map";

function sentenceFromContext(context: string, word: string) {
  const clean = context.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 260) return null;
  const tokens = clean.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  return tokens.some((token) => normaliseWord(token) === word) ? clean : null;
}

function detectedInflectionLemma(
  candidates: Awaited<ReturnType<typeof lookupLexicalWord>>["candidates"],
  morphology: MorphologyAnalysis,
) {
  const links = candidates
    .map((candidate) => ({ candidate, link: extractInflectionLink(candidate.definition) }))
    .filter((item): item is { candidate: typeof candidates[number]; link: NonNullable<ReturnType<typeof extractInflectionLink>> } => Boolean(item.link));

  if (links.length === 0) return null;
  return links.find((item) => !morphology.partOfSpeech || item.link.partOfSpeech === morphology.partOfSpeech)?.link
    ?? links[0].link;
}

function safeMorphologyPartOfSpeech(value: string | null) {
  const normalised = normalisePartOfSpeech(value);
  if (normalised === "verb" || normalised === "noun" || normalised === "adjective") return normalised;
  return null;
}

function shouldRefineMeaning(input: {
  requestExplain: boolean;
  meaning: string | null;
  candidateCount: number;
  context: string;
  example: string | null;
  source: string | null;
}) {
  if (!input.requestExplain || !modelWordFallbackEnabled()) return false;
  if (!input.meaning) return true;
  if (input.meaning.length > 90) return true;
  if (input.candidateCount > 1 && Boolean(input.context)) return true;
  if (!input.example && Boolean(input.context)) return true;
  if (input.source === "wiktionary") return true;
  return false;
}

function corpusMetadata(
  surface: Awaited<ReturnType<typeof lookupLexicalWord>>,
  lemmaLookup: Awaited<ReturnType<typeof lookupLexicalWord>> | null,
) {
  return {
    version: surface.corpus.version,
    locale: surface.corpus.locale,
    surfaceEntryHit: surface.corpus.entryHit,
    surfaceLexicalHit: surface.corpus.lexicalHit,
    surfacePronunciationHit: surface.corpus.pronunciationHit,
    surfaceBritfoneHit: surface.corpus.britfoneEntryHit,
    surfaceBritfoneVariants: surface.corpus.britfoneVariantCount,
    britfoneRuntimeEntryCount: surface.corpus.britfoneRuntimeEntryCount,
    lemmaEntryHit: lemmaLookup?.corpus.entryHit ?? null,
    lemmaLexicalHit: lemmaLookup?.corpus.lexicalHit ?? null,
    lemmaBritfoneHit: lemmaLookup?.corpus.britfoneEntryHit ?? null,
    remoteFallback: surface.corpus.remoteFallback || Boolean(lemmaLookup?.corpus.remoteFallback),
    pronunciationSource: surface.corpus.pronunciationSource,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = normaliseWord(searchParams.get("word") ?? "");
  const context = (searchParams.get("context") ?? "").slice(0, 300);
  const requestExplain = searchParams.get("explain") === "1";

  if (!word || word.length > 48 || !/^[a-z][a-z'-]*$/.test(word)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  try {
    let morphology = analyseMorphology(word, context);
    const surface = await lookupLexicalWord(word, context, "surface", morphology.partOfSpeech);

    const wiktionaryInflection = detectedInflectionLemma(surface.candidates, morphology);
    if (wiktionaryInflection) {
      morphology = withDetectedLemma(
        morphology,
        wiktionaryInflection.lemma,
        wiktionaryInflection.partOfSpeech,
        wiktionaryInflection.form,
      );
    } else if (
      surface.headword
      && normaliseWord(surface.headword) !== word
      && (
        surface.corpus.entryHit
        || morphology.lemma === word
        || morphology.confidence !== "high"
      )
    ) {
      // A reviewed local headword is stronger evidence than a heuristic suffix
      // guess. This matters for forms such as running, where a naive -ing strip
      // can briefly propose “runn” before the corpus resolves the real lemma.
      morphology = withDetectedLemma(
        morphology,
        surface.headword,
        safeMorphologyPartOfSpeech(surface.preferredPartOfSpeech),
        morphology.form,
      );
    }

    const shouldLookupLemma = morphology.lemma !== word && (
      morphology.confidence === "high"
      || Boolean(wiktionaryInflection)
      || Boolean(surface.headword)
    );
    const lemmaLookup = shouldLookupLemma
      ? await lookupLexicalWord(morphology.lemma, context, "lemma", morphology.partOfSpeech)
      : null;

    const candidates = [
      ...surface.candidates,
      ...(lemmaLookup?.recognised ? lemmaLookup.candidates : []),
    ];

    const hasLexicalEvidence = surface.recognised || Boolean(lemmaLookup?.recognised);
    const chosen = chooseLexicalSense(candidates, context, morphology);
    const deterministicMeaning = chosen ? simplifyDefinition(chosen.definition) : null;
    const contextualExample = sentenceFromContext(context, word);
    const dictionaryExample = chosen?.example ?? candidates.find((item) => item.example)?.example ?? null;
    const soundGuide = analyseWordSounds(
      word,
      surface.pronunciation.syllables,
      surface.pronunciation.ipa,
    );
    const attribution = lexicalAttribution(chosen);
    const corpus = corpusMetadata(surface, lemmaLookup);

    if (!hasLexicalEvidence) {
      let modelExplanation = null;
      if (requestExplain && modelWordFallbackEnabled()) {
        try {
          modelExplanation = await explainWordWithModel({ word, context });
        } catch {
          modelExplanation = null;
        }
      }

      const modelRecognised = Boolean(
        modelExplanation?.knownEnglishWord && modelExplanation.confidence !== "low",
      );
      const trustedMorphology = modelRecognised
        ? {
            lemma: morphology.lemma,
            form: morphology.form,
            label: morphologyLabel(morphology),
            confidence: morphology.confidence,
          }
        : {
            lemma: word,
            form: null,
            label: null,
            confidence: "low" as const,
          };

      return NextResponse.json({
        word,
        meaning: modelRecognised ? modelExplanation!.meaning : null,
        example: contextualExample,
        alternateExample: modelRecognised ? modelExplanation!.example : null,
        contextualExample,
        partOfSpeech: modelRecognised ? morphology.partOfSpeech : null,
        morphology: trustedMorphology,
        pronunciation: { ipa: null, syllables: soundGuide.syllables, audio: null },
        soundGuide,
        headword: modelRecognised && morphology.lemma !== word ? morphology.lemma : null,
        possibleSpelling: modelRecognised ? null : surface.possibleSpelling,
        recognisedWord: modelRecognised,
        meaningCanBeRefined: modelWordFallbackEnabled() && !requestExplain,
        attribution: null,
        corpus,
        explanation: {
          source: modelRecognised ? "model" : "none",
          modelUsed: Boolean(modelExplanation),
          confidence: modelExplanation?.confidence ?? "low",
        },
        source: modelRecognised ? "model-rare-word" : "unknown-word",
        providers: surface.providers,
      });
    }

    const refineMeaning = shouldRefineMeaning({
      requestExplain,
      meaning: deterministicMeaning,
      candidateCount: candidates.length,
      context,
      example: dictionaryExample,
      source: chosen?.source ?? null,
    });

    let modelExplanation = null;
    if (refineMeaning) {
      try {
        modelExplanation = await explainWordWithModel({
          word,
          context,
          existingMeaning: deterministicMeaning,
          partOfSpeech: chosen?.partOfSpeech ?? morphology.partOfSpeech ?? surface.preferredPartOfSpeech,
          lemma: morphology.lemma,
          grammaticalForm: morphology.form,
        });
      } catch {
        modelExplanation = null;
      }
    }

    const useModelMeaning = Boolean(modelExplanation?.knownEnglishWord);
    const meaning = useModelMeaning ? modelExplanation!.meaning : deterministicMeaning;
    const generatedExample = useModelMeaning ? modelExplanation!.example : null;
    const example = contextualExample ?? dictionaryExample ?? generatedExample ?? null;
    const alternateExample = contextualExample
      ? generatedExample ?? dictionaryExample ?? null
      : generatedExample ?? (dictionaryExample && dictionaryExample !== example ? dictionaryExample : null);

    const meaningCanBeRefined = modelWordFallbackEnabled() && (
      !deterministicMeaning
      || deterministicMeaning.length > 90
      || (candidates.length > 1 && Boolean(context))
      || (!dictionaryExample && Boolean(context))
      || chosen?.source === "wiktionary"
    );

    return NextResponse.json({
      word,
      meaning,
      example,
      alternateExample,
      contextualExample,
      partOfSpeech: chosen?.partOfSpeech ?? morphology.partOfSpeech ?? surface.preferredPartOfSpeech,
      morphology: {
        lemma: morphology.lemma,
        form: morphology.form,
        label: morphologyLabel(morphology),
        confidence: morphology.confidence,
      },
      pronunciation: {
        ipa: soundGuide.ipa,
        syllables: soundGuide.syllables,
        audio: surface.pronunciation.audio,
      },
      soundGuide,
      headword: morphology.lemma !== word ? morphology.lemma : surface.headword,
      possibleSpelling: null,
      recognisedWord: true,
      meaningCanBeRefined: meaningCanBeRefined && !requestExplain,
      attribution,
      corpus,
      explanation: {
        source: useModelMeaning ? "model" : chosen?.source ?? "none",
        modelUsed: Boolean(modelExplanation),
        confidence: modelExplanation?.confidence ?? (chosen ? "high" : "medium"),
      },
      source: useModelMeaning
        ? "model-context"
        : chosen?.source ?? (surface.recognised ? "lexical-evidence" : "lemma-evidence"),
      providers: [...new Set([...surface.providers, ...(lemmaLookup?.providers ?? [])])],
    });
  } catch {
    const fallbackMorphology = analyseMorphology(word, context);
    return NextResponse.json({
      word,
      meaning: null,
      example: sentenceFromContext(context, word),
      alternateExample: null,
      contextualExample: sentenceFromContext(context, word),
      partOfSpeech: fallbackMorphology.partOfSpeech,
      morphology: {
        lemma: fallbackMorphology.lemma,
        form: fallbackMorphology.form,
        label: morphologyLabel(fallbackMorphology),
        confidence: fallbackMorphology.confidence,
      },
      pronunciation: { ipa: null, syllables: null, audio: null },
      soundGuide: analyseWordSounds(word),
      headword: fallbackMorphology.lemma !== word ? fallbackMorphology.lemma : null,
      possibleSpelling: null,
      recognisedWord: false,
      meaningCanBeRefined: modelWordFallbackEnabled() && !requestExplain,
      attribution: null,
      corpus: null,
      explanation: {
        source: "none",
        modelUsed: false,
        confidence: "low",
      },
      source: "lookup-unavailable",
      providers: [],
    });
  }
}
