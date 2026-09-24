# Buddy — Implementation notes

## Current alpha

Buddy treats visual language, verbal language, learning memory and multi-surface behaviour as core architecture rather than later product polish.

### Runtime primitives

- `lib/buddy-design.ts` — cross-surface colour, motion, touch and radius tokens.
- `lib/buddy-language.ts` — child-facing vocabulary and language constraints.
- `components/BuddyPresence.tsx` — abstract idle/listening/thinking/speaking presence.
- `components/BottomNav.tsx` — deliberately small child navigation.
- `components/ReadingCompanion.tsx` — end-to-end reading interaction.
- `lib/literacy/morphology.ts` — resolves common inflected printed forms into likely lemmas and grammatical forms.
- `lib/literacy/britfone.ts` — lazy server-side index over the full Britfone 3.0.1 British pronunciation dictionary.
- `lib/literacy/wordnet.ts` — local Princeton WordNet 3.1 semantic resolver using exact index lookup and byte-offset data reads.
- `lib/literacy/local-corpus.ts` — reviewed `en-GB` lexical evidence plus British pronunciation resolution.
- `lib/literacy/lexical-providers.ts` — local-first resolver with remote long-tail fallbacks.
- `lib/literacy/lexicon.ts` — candidate normalisation, contextual sense ranking and source attribution.
- `lib/literacy/sound-map.ts` — child-friendly spelling/sound observations.
- `lib/literacy/grapheme-phoneme.ts` — aligns spelling to already-resolved pronunciation data before Buddy offers sound-pattern guidance.
- `lib/ai/word-explainer.ts` — optional, tightly scoped model fallback for lexical explanations.
- `lib/literacy/eval-cases.ts` + `/lab/words` — internal lexical, corpus and sound evaluation harness.

### Reading pipeline

The alpha now supports:

1. environment-facing camera capture;
2. a frozen page image;
3. local browser OCR using Tesseract.js;
4. word bounding boxes rendered as tappable regions over the captured page;
5. a targeted second OCR pass when a user taps a word the full-page pass missed;
6. morphology/lemma analysis for the printed word;
7. reviewed Buddy meaning and morphology evidence;
8. deliberately child-simple Buddy-curated literacy meanings;
9. broad local Princeton WordNet semantics and sense-order priors;
10. local British pronunciation from reviewed data and the full Britfone runtime;
11. remote Wiktionary, DictionaryAPI.dev and Datamuse only when local evidence is incomplete;
12. context-sensitive sense selection using nearby OCR text, part of speech, lemma evidence, source quality and weak sense-order priors;
13. pronunciation-aware grapheme/phoneme alignment before sound clues are shown;
14. browser text-to-speech for the word, reading line and example sentences;
15. press-and-hold browser speech recognition for simple voice requests;
16. an uncertainty/correction state for text that does not look like a recognised English word;
17. local learning events recorded only after a selected OCR word is lexically recognised;
18. `Words we've met` and a three-word Practice loop derived from those events;
19. photographed school spelling lists converted into reviewed local practice sets;
20. practice-set exploration produces real coaster pieces, with more structurally interesting words able to create hills, dips, camelbacks and loops;
21. `/practice/coaster` provides a persistent construction yard where pieces can be placed and rearranged and the cart can be dragged to the station to ride the built track.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

## Literacy and lexical boundary

Buddy uses a layered resolver rather than asking a general model to invent literacy guidance.

1. **Reviewed Buddy evidence** wins for important child-facing definitions, morphology links, contextual senses and pronunciation choices.
2. **Buddy-curated literacy support** supplies deliberately simple meanings and reading clues for selected words such as `because`, `through`, `enough`, `friend` and `people`.
3. **Princeton WordNet 3.1** supplies broad local semantic coverage for content words. Its index sense order is kept as a weak commonness prior, not as absolute truth.
4. **Britfone 3.0.1** supplies broad British-English IPA/stress evidence for 16,000+ headwords without putting the whole pronunciation dictionary into the browser bundle.
5. **Morphology/lemma resolution** lets the printed form and lexical headword stay separate. `sold` can obtain meaning from `sell` while sound guidance remains attached to the printed word.
6. **Wiktionary / DictionaryAPI.dev / Datamuse** fill true long-tail and incomplete-evidence gaps.
7. **Grapheme/phoneme alignment** explains pronunciation data already obtained from lexical evidence; it does not predict canonical pronunciation from spelling alone.
8. **Optional model fallback** is reserved for missing or overly complex meanings/examples and is not canonical phonics/pronunciation authority.

WordNet is deliberately treated as broad **semantic evidence**, not automatically child-friendly copy. A technically correct WordNet gloss can still be too adult, abstract or contextually wrong for Buddy. Real failures should therefore become regression cases and, where appropriate, reviewed Buddy meanings.

Function words are a known gap in WordNet-style semantic databases. Buddy's curated/common-word layer remains important for conjunctions, determiners, prepositions and other reading vocabulary that children meet constantly.

The UI should prefer simple phrases such as “How it sounds”, “Here it means…” and “Another example…” rather than exposing linguistic notation by default. IPA is retained internally as pronunciation metadata and evidence for sound alignment.

## Local semantic runtime

The reviewed lexical seed is `data/lexicon/core.en-GB.v1.json`. It remains deliberately small and reviewable.

The broader semantic layer uses the packaged `wordnet-db` WordNet 3.1 files server-side. `lib/literacy/wordnet.ts`:

- keeps the database out of the browser/client bundle;
- loads each POS index lazily and caches it;
- binary-searches exact headwords in `index.noun`, `index.verb`, `index.adj` and `index.adv`;
- reads only required synset lines from the corresponding data file by byte offset;
- caches a bounded number of data lines;
- returns up to five candidate senses per part of speech;
- preserves WordNet's sense ordering as weak local frequency/commonness evidence;
- fails open to the reviewed/remote resolver if the runtime asset is unavailable.

A local semantic hit counts as lexical evidence. A Britfone pronunciation hit by itself does not.

## British-English pronunciation layer

Buddy is UK-first rather than silently treating an American pronunciation dictionary as canonical.

The pronunciation evidence is pinned to **Britfone 3.0.1**. The runtime architecture is:

1. reviewed local British-English pronunciation for important/context-sensitive words;
2. the full packaged Britfone dictionary, parsed lazily on the server and cached for the function instance;
3. remote dictionary pronunciation only when local British pronunciation cannot be resolved safely;
4. browser `en-GB` speech for audible output;
5. grapheme/phoneme alignment for child-facing spelling guidance;
6. cautious fallback for words whose spelling cannot be safely explained.

Some Britfone headwords have multiple pronunciations but no part-of-speech label tying each numbered variant to a sense. Buddy does not blindly choose variant 1. Reviewed entries such as noun/verb `record` resolve the variant explicitly; unreviewed multi-variant words remain unresolved until there is safe evidence.

## Local versus network resolution

A selected word can avoid network lexical calls when Buddy has:

- a local meaning route from reviewed Buddy evidence, Buddy-curated support, WordNet, or a reviewed lemma/headword link; and
- resolved local British pronunciation for the printed surface form.

If meaning is local but pronunciation remains ambiguous, Buddy may still use remote pronunciation evidence. If pronunciation is local but semantic evidence is absent, Buddy still requires a definition-bearing lexical source before recognising the token.

The API exposes:

- reviewed surface/lemma meaning hits;
- Buddy-curated meaning hits;
- WordNet availability/version, exact hits and sense counts;
- Britfone runtime size, headword hits and variant counts;
- resolved British pronunciation status;
- whether live lexical fallback was required.

`/lab/words` turns these into coverage counters and per-case diagnostics.

## Unknown words and OCR guardrail

Broad word coverage must not turn OCR noise into invented vocabulary.

Recognition may come from reviewed Buddy lexical evidence, Buddy-curated meanings, exact WordNet semantic entries or exact definition-bearing fallback providers. Pronunciation evidence alone is insufficient.

If no lexical source recognises the selected spelling:

- the model fallback is not called automatically;
- no definition is invented;
- the text is not added to the Learning Map;
- Buddy says it may have read the word incorrectly;
- a close spelling suggestion can be offered when edit distance makes that suggestion plausible;
- the child can accept the correction or tap the printed word again.

## Optional model fallback

`lib/ai/word-explainer.ts` implements a deliberately narrow fallback using the OpenAI Responses API and structured JSON output.

The model receives only the selected word, a short minimised nearby lexical window, existing lexical meaning/POS evidence, and lemma/form evidence. It does **not** receive page images, the full OCR page, audio, account/profile data, Learning Map history or child voice transcripts.

The fallback remains disabled unless explicitly configured:

```env
BUDDY_MODEL_FALLBACK_ENABLED=true
OPENAI_API_KEY=...
```

For child-facing deployments, enabling a model is a privacy/safety deployment decision rather than just a technical switch.

## Internal word lab

`/lab/words` is deliberately not linked from child navigation. It currently covers:

- context-dependent senses (`bank`, `bark`, `bat`, noun/verb `record`);
- morphology (`sold`, `went`, `made`, `running`, `stories`);
- broad local semantics (`rainbow`, `planet`);
- child-friendly curated meaning precedence (`because`);
- broad British pronunciation and variant ambiguity;
- irregular spelling (`through`, `enough`, `choir`, `yacht`, `colonel`);
- useful patterns (`photograph`, `station`);
- long/technical and less-common words;
- an OCR-like nonsense spelling that should remain uncertain.

The word lab is an engineering/evaluation surface, not a child score.

## Practice sets from real life

Practice sets are stored locally in `buddy.practice-sets.v1`, with one optional active set. The first import route is `/practice/add-spellings`.

The flow is deliberately review-first:

1. the user photographs or chooses an image of a spelling list;
2. Buddy prepares the image and runs the existing local browser OCR;
3. likely word tokens are cleaned and deduplicated;
4. the person checks, edits, removes or adds words;
5. only the confirmed word list is stored — the source photograph is not retained;
6. Practice selects a few words at a time from the active set, prioritising words not yet explored.

`practice_explored` is separate from `practice_known`. Coaster pieces are minted from unique explored words, so moving on, listening, asking for a clue or working together can all contribute to the same world. Correctness is not an input to `coasterPieceKindForWord`.

The current coaster is deliberately a construction toy rather than a progress meter. Each practice set has local `buddy.coasters.v1` state containing the earned piece inventory, placed-piece order, ride name, ride count and station launch power. Existing v1 state is normalised so older local coasters gain the new launch setting safely.

A word now unlocks a small set of compatible track shapes rather than permanently mapping to one shape. More exploration and more structure to notice can widen those options, but correctness is never consulted. The child can cycle the shape of any earned piece.

Track SVG geometry is generated from the placed sequence; the same SVG path drives the cart animation. Terrain pieces now have cumulative elevation: lift sections finish higher and drops finish lower, within a clamped construction window so repeated terrain changes remain visible. Supports, tunnels and ride markers are positioned from the generated segment geometry rather than from a fixed baseline.

The ride uses intentionally game-like momentum: descents add speed, climbs and friction remove it, launch/brake pieces change it, and inversions have minimum entry speeds. A stalled ride is therefore a construction problem to play with — reorder the track, build height, add a launch, use a drop, or change station launch power — rather than a learning penalty.

`analyseRide` derives descriptive ride characteristics from the built sequence: inversions, airtime moments, drops, boosts, brakes and tunnels plus loose traits such as `floaty`, `twisty` or `drop-heavy`. These are descriptions of what the child made, never a score or mastery signal.

The coaster surface now has explicit Build and Ride modes. Build exposes the piece yard, construction order, a direct visual palette of all shapes unlocked by each explored word, and the park scenery palette. Ride hides the workshop, expands the coaster stage, reveals the draggable cart and gives the launch its own dock. The same local coaster state backs both modes; switching mode changes presentation and available interaction, not the underlying ride.

The same `buddy.coasters.v1` record now also stores a `scenery` array. Older saved coasters normalise to an empty array, so no storage migration is required. Each scenery placement stores a kind plus normalised X/Y world coordinates. Normalised coordinates mean a tree or pond stays proportionally positioned even when more track increases the SVG width. In Build mode the child chooses a scenery type and taps directly on the park to place it; tapping an existing item selects it, and tapping elsewhere moves it. Ride mode renders the scenery but makes it inert.

The scenery capacity is deliberately derived from the number of explored-word coaster pieces: one explored word makes room for one world object. There is no scenery currency, rarity tier or correctness gate. The principle remains exploration → making → play.

For longer rides, Ride mode now switches to a cart-following SVG viewBox while the cart is moving. Build always retains the full-track view.

Ride mode also has a lightweight reactive-world layer. The current track piece is surfaced by the same animation loop that already calculates speed. Entering a tunnel darkens the stage around the followed cart; launch and brake track get transient visual effects; scenery gains quiet motion only while the cart is moving; and a few non-scored station visitors react to the ride. All motion honours `prefers-reduced-motion`.

Cart style is stored alongside the coaster as `classic`, `rocket` or `buggy`. All three are available immediately. `normaliseCartStyle` makes older local state safe and deliberately treats cart choice as preference rather than an unlock system.

## Learning Map alpha

`lib/learning/local-store.ts` stores a capped local event stream in browser storage. Events describe support requested and words encountered rather than mistakes or correctness. The Learning Map remains device-local and child-visible/rejectable by design.

## Architectural rules

1. Copy used by multiple surfaces belongs in `lib/buddy-language.ts`, not device-specific components.
2. Shared visual meaning belongs in `lib/buddy-design.ts` and CSS custom properties.
3. Device implementations may change layout radically while preserving language, states and semantic design tokens.
4. Do not add success/failure colour semantics, points, streaks, levels or badges.
5. Child-facing learning inferences must be tentative and rejectable.
6. Accessibility choices are preferences, not a single “dyslexia mode”.
7. Raw page imagery should remain ephemeral unless a future use case clearly requires storage and the child/parent model supports it.
8. Pronunciation/phonics guidance must come from curated or deterministic linguistic data, not unconstrained generation.
9. Model calls should be narrow, inspectable, provider-swappable and minimised for privacy and cost.
10. If Buddy is uncertain about a lexical explanation, uncertainty must remain represented rather than silently becoming certainty.
11. Unrecognised OCR strings must not enter the Learning Map or trigger generated definitions.
12. Local/open lexical data is versioned evidence and source/licence metadata travels with it.
13. Reviewed Buddy evidence may override generic local or live-provider evidence.

## Known alpha constraints

- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Grapheme/phoneme alignment is an alpha explanatory layer, not yet a complete validated structured-literacy engine.
- WordNet's breadth is useful, but many glosses are not yet ideal child-facing explanations and function-word coverage is limited.
- Multi-pronunciation words still need reviewed/context-aware mappings.
- Long-tail meanings can still depend on network providers.
- The optional model fallback is privacy-gated and not pronunciation authority.
- The Learning Map is device-local and is not yet synchronised.
- Spelling-list OCR currently treats the photographed page as a candidate source, not a trustworthy structured list; the human confirmation step is mandatory.
- The rollercoaster is an initial playful-progress experiment and should be tested against quieter visual metaphors before it becomes a larger game layer.

## Next implementation slice

1. run and review `/lab/words`, adding permanent regression cases whenever real reading exposes a poor explanation;
2. add a high-frequency/common-word evaluation set and measure local semantic, pronunciation and network-fallback coverage;
3. promote common WordNet glosses that are wrong/too adult into reviewed child-friendly Buddy evidence;
4. add reviewed/context-aware mappings for common Britfone multi-pronunciation/heteronym words;
5. evolve grapheme/phoneme alignment against validated structured-literacy mappings;
6. improve image crop/deskew and OCR confidence behaviour;
7. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
8. define child/profile/privacy boundaries before cloud synchronisation;
9. define the R1/Android adapter contract using the same Buddy semantics.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
