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

## Current alpha

The first useful reading-and-learning loop now exists:

1. open the device camera;
2. capture a page;
3. run OCR locally in the browser;
4. tap a recognised word directly on the captured page, or tap an unboxed word for a tighter second OCR pass;
5. choose **Tell me**, **Give me a clue**, or **Let's work it out**;
6. get broad pronunciation, syllable and sound-pattern support;
7. get a context-sensitive meaning and example when lexical data is available;
8. hear the word, reading line or example with browser speech;
9. ask simple voice requests using press-to-talk;
10. record the encounter in a local Learning Map;
11. see encountered words in **Words we've met**;
12. revisit three useful words at a time in **Let's play with words**;
13. allow Buddy to surface tentative, rejectable observations in **Me** after repeated evidence.

Buddy now uses layered word support rather than a tiny hard-coded vocabulary: curated literacy guidance first, broad lexical/pronunciation data second, cautious deterministic spelling/sound observations, and an optional tightly scoped model fallback for missing or overly complex meanings/examples.

The model fallback is disabled by default and never supplies canonical phonics/pronunciation guidance. See `.env.example` and `docs/IMPLEMENTATION.md`.

## Current alpha surfaces

- `/` — action-first home.
- `/read` — live camera capture, local OCR, selectable words, spoken help and child-controlled scaffolding.
- `/practice` — three encountered words, one at a time, with whichever support the child chooses.
- `/words` — “Words we've met”, derived from local learning events.
- `/me` — tentative child-visible observations derived from repeated interactions.
- `/discover` — initial Brain Quests.
- `/help` — general voice/vision help entry.

## Stack

- Next.js 15
- React 19
- TypeScript
- Framer Motion
- Phosphor Icons
- Atkinson Hyperlegible
- Tesseract.js 7 for local browser OCR
- Datamuse + DictionaryAPI.dev for broad lexical/pronunciation lookup
- optional OpenAI Responses API structured fallback for narrowly scoped word explanations

Shared product primitives live in:

- `lib/buddy-design.ts`
- `lib/buddy-language.ts`
- `lib/literacy/*`
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

## Immediate roadmap

1. Build and run a lexical evaluation set covering common, irregular, ambiguous, complex and rare words.
2. Improve sound analysis towards a validated grapheme/phoneme representation.
3. Improve capture quality, crop/deskew and OCR confidence handling.
4. Add a provider-neutral companion agent layer without giving it unrestricted access to the child's Learning Map.
5. Upgrade voice where browser speech recognition is unreliable.
6. Expand `Me` from reading-support observations into explicit strategies and later strengths discovery.
7. Define child/parent identity, consent and privacy boundaries before cloud synchronisation or broader model use.
8. Implement the first R1/Android tactile adapter using the shared device contract.

## Product constraint

Buddy should help a child increasingly be able to say:

> I know how I learn. I know what helps. I know what to do when something is difficult.
