# buddy

**A calm learning companion.**

Buddy is a child-centred learning companion, initially focused on helping a dyslexic child with reading while gradually learning which kinds of support work for them and helping them discover how they learn.

It is designed as a **multi-surface companion**, not a mobile app: phone, tablet and web first; tactile Android/R1-like devices and future dedicated hardware later. The intelligence, learning memory, language and visual semantics belong to Buddy rather than to any one device.

## Product direction

The progression is:

> Help me read this.
>
> Help me understand this.
>
> Help me work out how I learn this.
>
> Help me understand what helps me and what I am good at.

Core product modes:

- **Read** — help at the moment it is needed without destroying the flow of reading.
- **Practice** — short, useful revisiting based on patterns rather than mistakes.
- **Discover** — explore interests, strategies and ways of thinking without turning them into tests.
- **Do** — scaffold schoolwork and other tasks without doing the thinking for the child.

## Design is infrastructure

Buddy's visual and verbal language is part of the product architecture.

It should feel like a beautiful, tactile object with a calm digital layer — not school software, a medical product, a generic chatbot, or a gamified learning app.

Key principles:

- calm, warm and age-respectful;
- capability rather than deficit;
- child-controlled help depth;
- “say the smallest useful thing first”;
- no failure language, streaks, scores or reward inflation;
- abstract Buddy presence rather than an infantilising mascot;
- child-visible and rejectable learning inferences;
- shared semantic design/language tokens across every surface.

See:

- [`docs/DESIGN.md`](docs/DESIGN.md) — full product and interaction design.
- [`docs/BRAND.md`](docs/BRAND.md) — visual and verbal language system.
- [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) — current implementation architecture and next slice.
- [`docs/LEXICAL_CORPUS.md`](docs/LEXICAL_CORPUS.md) — local-first Word Library and corpus architecture.

## Current alpha

The first useful reading-and-learning loop now exists:

1. open the device camera;
2. capture a page;
3. run OCR locally in the browser;
4. tap a recognised word directly on the captured page, or tap an unboxed word for a tighter second OCR pass;
5. choose **Tell me**, **Give me a clue**, or **Let's work it out**;
6. resolve the printed form into its likely lemma and grammatical form where useful;
7. choose the likely meaning from the surrounding line rather than treating the spelling as an isolated dictionary headword;
8. get broad pronunciation, syllable and sound-pattern support for the printed word;
9. hear the word, reading line or example with browser speech;
10. ask simple voice requests using press-to-talk;
11. record the encounter in a local Learning Map;
12. see encountered words in **Words we've met**;
13. revisit three useful words at a time in **Let's play with words**;
14. allow Buddy to surface tentative, rejectable observations in **Me** after repeated evidence.

### Word Library v2

Buddy's lexical layer is deliberately separate from the child-facing UI. A selected token moves through:

> printed form → morphology / lemma → contextual part of speech → candidate senses → simple meaning → pronunciation-aware sound guidance

This matters for forms such as `sold`: Buddy understands that the printed word can be the past tense or past participle of `sell`, uses that grammatical evidence to choose the correct sense in the sentence, but still pronounces and explains the spelling of the actual printed word `sold`.

The resolver is now **local first**:

- a versioned `en-GB` corpus provides reviewed child-friendly meanings, lemma links and British pronunciation for important/common regression vocabulary;
- the full Britfone 3.0.1 pronunciation dictionary is available server-side at runtime, lazily parsed and cached;
- reviewed Buddy pronunciations win where context or part of speech matters, such as noun/verb `record`;
- broad Britfone pronunciation is used only when the headword has one unambiguous variant;
- a local entry with both a meaning route and surface pronunciation needs no network lexical request;
- Wiktionary, DictionaryAPI.dev and Datamuse remain broad long-tail and incomplete-entry fallbacks;
- Buddy's curated literacy layer still wins for deliberately checked chunks and clues;
- an optional tightly scoped model can simplify or disambiguate lexical evidence, but it does not invent canonical pronunciation or phonics guidance.

The checked-in corpus is intentionally a reviewed lexical seed rather than pretending to be the finished dictionary. Broad British pronunciation now comes from the packaged Britfone runtime without forcing that dictionary into the browser/client bundle.

Wiktionary-derived text is attributed as **Wiktionary / CC BY-SA** in resolver metadata. Britfone-derived pronunciation data retains its MIT attribution in `data/lexicon/THIRD_PARTY_NOTICES.md`.

The model fallback is disabled by default and never supplies canonical phonics/pronunciation guidance. See `.env.example` and `docs/IMPLEMENTATION.md`.

## Current alpha surfaces

- `/` — action-first home.
- `/read` — live camera capture, local OCR, selectable words, spoken help and child-controlled scaffolding.
- `/practice` — three encountered words, one at a time, with whichever support the child chooses.
- `/words` — “Words we've met”, derived from local learning events.
- `/me` — tentative child-visible observations derived from repeated interactions.
- `/discover` — initial Brain Quests.
- `/help` — general voice/vision help entry.
- `/lab/words` — internal lexical, morphology, corpus coverage, sense and pronunciation regression surface.

## Stack

- Next.js 15
- React 19
- TypeScript
- Framer Motion
- Phosphor Icons
- Atkinson Hyperlegible
- Tesseract.js 7 for local browser OCR
- versioned local `en-GB` lexical/pronunciation corpus
- full Britfone 3.0.1 server-side runtime for British-English IPA evidence
- Wiktionary + DictionaryAPI.dev + Datamuse as layered lexical fallbacks
- optional OpenAI Responses API structured fallback for narrowly scoped word explanations

Shared product primitives live in:

- `lib/buddy-design.ts`
- `lib/buddy-language.ts`
- `lib/literacy/morphology.ts`
- `lib/literacy/britfone.ts`
- `lib/literacy/local-corpus.ts`
- `lib/literacy/lexicon.ts`
- `lib/literacy/lexical-providers.ts`
- `lib/literacy/sound-map.ts`
- `lib/literacy/grapheme-phoneme.ts`
- `lib/learning/*`
- `lib/ai/word-explainer.ts`
- `lib/device/contract.ts`

## Multi-surface contract

`lib/device/contract.ts` defines device-neutral Buddy input/output semantics. A phone, tablet, Rabbit R1-style surface or future tactile Android device should translate its physical inputs into the same Buddy events rather than owning a separate learning model or personality.

Initial common states are:

- idle;
- listening;
- thinking;
- speaking.

Initial physical semantics include:

- select/point to a word;
- talk;
- look;
- stop;
- got it;
- change help depth.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Camera access requires a secure context outside localhost, so real phone/tablet testing should use an HTTPS deployment.

Optional model fallback configuration is documented in `.env.example`.

To build the pinned Britfone pronunciation index for corpus work or future offline packs:

```bash
npm run lexicon:britfone
```

## Immediate roadmap

1. Grow the lexical evaluation set from real reading failures and make them permanent regressions.
2. Ingest a broader versioned lexical/frequency corpus so common meanings and sense priors are local rather than dependent on live providers.
3. Add a reviewed resolver for common multi-pronunciation/heteronym words so broad Britfone variants can be selected safely from context.
4. Improve sound analysis towards a validated grapheme/phoneme representation.
5. Improve capture quality, crop/deskew and OCR confidence handling.
6. Add a provider-neutral companion agent layer without giving it unrestricted access to the child's Learning Map.
7. Upgrade voice where browser speech recognition is unreliable.
8. Expand `Me` from reading-support observations into explicit strategies and later strengths discovery.
9. Define child/parent identity, consent and privacy boundaries before cloud synchronisation or broader model use.
10. Implement the first R1/Android tactile adapter using the shared device contract.

## Product constraint

Buddy should help a child increasingly be able to say:

> I know how I learn. I know what helps. I know what to do when something is difficult.
