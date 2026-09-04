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

## Current alpha surfaces

- `/` — action-first home.
- `/read` — camera-first Read with me prototype, including a sample word interaction and child-controlled help depth.
- `/words` — “Words we've met”.
- `/me` — child-visible learning memory.
- `/discover` — initial Brain Quests.
- `/help` — general voice/vision help entry.

## Stack

- Next.js 15
- React 19
- TypeScript
- Framer Motion
- Phosphor Icons
- Atkinson Hyperlegible

Shared product primitives live in:

- `lib/buddy-design.ts`
- `lib/buddy-language.ts`

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Immediate roadmap

1. Validate the visual and verbal language with the child co-designer.
2. Wire real image capture to OCR and selectable word regions.
3. Add a deterministic pronunciation/literacy service boundary.
4. Add press-to-talk voice and companion response streaming.
5. Introduce the first local Learning Map schema.
6. Test the Read with me loop before expanding accounts or parent reporting.
7. Define the R1/Android device adapter using the same Buddy states and language primitives.

## Product constraint

Buddy should help a child increasingly be able to say:

> I know how I learn. I know what helps. I know what to do when something is difficult.
