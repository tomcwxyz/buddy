# Buddy lexical corpus architecture

Buddy should understand common reading vocabulary without requiring a live call to several third-party services, but it should also retain broad long-tail coverage. The lexical layer therefore uses a **local-first, fallback-later** architecture.

## Resolution path

For a selected printed word:

1. normalise the printed token;
2. analyse likely grammatical form and lemma;
3. look for reviewed Buddy lexical evidence in the versioned local `en-GB` corpus;
4. look for deliberately child-friendly Buddy literacy meanings where they exist;
5. query the packaged Princeton WordNet 3.1 database for broad local semantic evidence and frequency-ordered senses;
6. resolve British-English pronunciation from the reviewed core first, then the full Britfone runtime when the pronunciation is unambiguous;
7. resolve a local lemma entry when the printed form points to one;
8. rank candidate senses using part of speech, sentence context, source quality and sense order;
9. call Wiktionary, DictionaryAPI.dev and Datamuse only when local meaning or pronunciation evidence is incomplete;
10. use the optional model only as a deliberately requested simplification/disambiguation layer.

This keeps **meaning** and **pronunciation** separable. `sold` can get its meaning from the local `sell` entry while its pronunciation and spelling guidance remain attached to the printed form `sold`.

## Meaning tiers

Buddy's meaning evidence is intentionally layered rather than treating one general dictionary as canonical.

1. **Reviewed Buddy corpus** — deliberately checked child-friendly senses, morphology links and tricky context cases such as `bank`, `record` and `sold → sell`.
2. **Buddy-curated literacy support** — small child-facing meanings already written for words where reading support needs especially simple language, such as `because`, `through`, `enough` and `friend`.
3. **Princeton WordNet 3.1** — broad local semantic coverage for nouns, verbs, adjectives and adverbs. WordNet sense order provides a useful weak commonness prior because its index orders senses using corpus-frequency evidence where available.
4. **Network lexical providers** — Wiktionary, DictionaryAPI.dev and Datamuse remain long-tail and incomplete-evidence fallbacks.
5. **Optional model refinement** — a narrow, privacy-gated simplification/disambiguation layer, never pronunciation authority.

WordNet is broad semantic evidence, **not automatically child-friendly prose**. A reviewed or deliberately curated Buddy meaning always outranks raw WordNet. The word lab exists partly to expose cases where a technically correct local gloss still needs a better child-facing rewrite.

Function words are also an important limitation: WordNet is strongest for content words rather than every conjunction, determiner or preposition. Buddy's curated/common-word layer therefore remains necessary alongside WordNet.

## Runtime corpus

The reviewed lexical seed is `data/lexicon/core.en-GB.v1.json`.

It is intentionally small and reviewed rather than pretending to be the finished dictionary. It contains the regression vocabulary that has already exposed important failure modes, including:

- ambiguous senses: `bank`, `bark`, `bat`, `record`;
- irregular forms: `sold`, `went`, `made`;
- regular inflections that still need lemma resolution: `running`, `stories`;
- irregular spelling/pronunciation: `through`, `enough`, `choir`, `yacht`, `colonel`;
- longer and specialist reading vocabulary used by the word lab.

Each reviewed entry can contain:

- one or more child-friendly senses;
- an optional headword/lemma link;
- one or more pronunciations;
- part-of-speech-specific pronunciation where required.

The broad semantic runtime is the packaged **Princeton WordNet 3.1** data exposed by `wordnet-db`. Buddy keeps this server-side, opens index/data files lazily and reads only the data lines needed for the selected word rather than loading or shipping the complete database into the browser.

## British-English pronunciation

The British pronunciation layer is pinned to **Britfone 3.0.1**. Britfone is MIT licensed and contains 16,000+ British English entries with IPA and stress data.

Buddy treats Britfone as pronunciation evidence, not as the entire lexical dictionary. Definitions and child-facing explanations remain separate.

The runtime has two pronunciation tiers:

1. **Reviewed core pronunciation** — deliberately checked entries in Buddy's corpus, including part-of-speech-specific choices such as noun/verb `record`.
2. **Full Britfone runtime** — the complete packaged Britfone 3.0.1 dictionary, parsed lazily on the server and cached in memory for the life of the function instance.

For unreviewed words, Buddy only treats the broad Britfone pronunciation as canonical when the headword has one unambiguous pronunciation. If Britfone contains multiple variants and Buddy has no reviewed/context-labelled mapping between them, it does not guess which IPA belongs to the current sense.

`scripts/lexicon/import-britfone.mjs` remains available for reproducible corpus work and future on-device/static-pack generation.

## Offline semantics

`lookupLexicalWord` reports reviewed-corpus, Buddy-curated, WordNet and Britfone coverage in its metadata.

A word can be **fully local** when the resolver has:

- a local meaning route from the reviewed corpus, Buddy-curated support, WordNet, or a local lemma/headword link; and
- a resolved local British pronunciation for the printed surface form.

When those conditions are met, no network lexical request is made. If pronunciation is unresolved, a remote lexical request may still occur even when the meaning is already local. Likewise, pronunciation evidence alone must never turn an OCR token into a recognised lexical word.

The internal `/lab/words` surface shows:

- reviewed, curated and WordNet meaning coverage;
- WordNet sense counts for broad local words;
- full Britfone headword coverage;
- resolved British pronunciation coverage;
- ambiguous Britfone variants that still need sense/POS resolution;
- how many cases are fully local;
- whether a network lexical fallback was needed;
- the corpus/runtime versions used for each result.

## OCR/recognition guardrail

Broad local data must not weaken Buddy's unknown-word behaviour.

A Britfone pronunciation hit is **not sufficient lexical recognition by itself**. Recognition requires actual lexical evidence, for example:

- a reviewed Buddy lexical entry;
- a Buddy-curated meaning;
- an exact WordNet entry with semantic senses;
- an exact DictionaryAPI.dev or Wiktionary entry;
- actual definition evidence from Datamuse;
- or the explicitly enabled constrained model path where that product decision is appropriate.

This means a pronunciation dictionary can improve how known words sound without allowing OCR-like nonsense to enter the Learning Map.

## Corpus versioning and licences

The runtime corpus is evidence, not mutable application state.

Rules:

1. Existing reviewed corpus versions are immutable once shipped.
2. Reviewed meaning/pronunciation changes create a new version.
3. Imported data retains upstream source, version and licence metadata.
4. Local reviewed/curated evidence outranks generic corpus and remote-provider evidence.
5. A new regression case should accompany every important real-world lexical failure.
6. Unknown OCR text must stay unknown; corpus growth must not weaken exact-match recognition.
7. The child-facing UI should not expose corpus internals unless source attribution is actually useful.

Current third-party data notices live in `data/lexicon/THIRD_PARTY_NOTICES.md` and cover:

- Britfone 3.0.1 — MIT;
- Princeton WordNet — Princeton WordNet License.

## Scaling beyond the current runtime

The target is not a giant hand-maintained JSON file. The production path is:

1. use the reviewed Buddy layer for important child-facing and regression vocabulary;
2. use packaged open semantic/pronunciation data for broad local evidence;
3. measure which common words still require network fallback or return poor child-facing prose;
4. add a frequency/common-word layer and reviewed simplifications where the evidence shows they are needed;
5. produce versioned read-only shards or packs for browser/offline Android/R1 surfaces;
6. keep external providers as refresh and true long-tail fallback sources;
7. eventually distribute the same lexical package to Android/R1 surfaces so meaning, pronunciation and literacy behaviour are consistent across devices.

The next semantic refinement is therefore not “add more dictionaries”. It is to use the evaluation data to identify **high-frequency words whose top local sense is wrong, too adult, or morphologically incomplete**, and turn those failures into reviewed Buddy evidence.
