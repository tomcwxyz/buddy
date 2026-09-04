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

The first useful reading loop now exists:

1. open the device camera;
2. capture a page;
3. run OCR locally in the browser;
4. tap a recognised word directly on the captured page;
5. choose **Tell me**, **Give me a clue**, or **Let's work it out**;
6. hear the word with browser speech;
7. ask simple voice requests using press-to-talk;
8. record the encounter in a local Learning Map;
9. see encountered words in **Words we've met**;
10. allow Buddy to surface tentative, rejectable observations in **Me** after repeated evidence.

Unknown OCR words are not given invented phonics or definitions. The deterministic literacy layer only gives structured guidance where that guidance is explicitly curated; otherwise Buddy can still say the word and stay honest about what it does not yet know.

## Current alpha surfaces

- `/` — action-first home.
- `/read` — live camera capture, local OCR, selectable words, spoken help and child-controlled scaffolding.
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

Shared product primitives live in:

- `lib/buddy-design.ts`
- `lib/buddy-language.ts`
- `lib/literacy/engine.ts`
- `lib/learning/*`
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

## Immediate roadmap

1. Put the current Read loop onto a real phone and tablet and co-design from actual use.
2. Improve capture quality, crop/deskew and OCR confidence handling.
3. Add a validated lexical/pronunciation data adapter behind the literacy boundary.
4. Add a provider-neutral companion agent layer without giving it unrestricted access to the child's Learning Map.
5. Upgrade voice where browser speech recognition is unreliable.
6. Expand `Me` from reading-support observations into explicit strategies and later strengths discovery.
7. Define child/parent identity and consent boundaries before cloud synchronisation.
8. Implement the first R1/Android tactile adapter using the shared device contract.

## Product constraint

Buddy should help a child increasingly be able to say:

> I know how I learn. I know what helps. I know what to do when something is difficult.
