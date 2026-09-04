# Buddy — Implementation notes

## Current alpha

The first implementation intentionally treats visual language, verbal language and multi-surface behaviour as core architecture rather than later brand work.

### Runtime primitives

- `lib/buddy-design.ts` contains cross-surface colour, motion, touch and radius tokens.
- `lib/buddy-language.ts` contains child-facing vocabulary and language constraints.
- `components/BuddyPresence.tsx` provides the abstract listening/thinking/speaking presence.
- `components/BottomNav.tsx` provides the deliberately small child navigation.
- `components/ReadingCompanion.tsx` is the first tactile reading interaction.

### Surfaces

- `/` — calm action-first home.
- `/read` — camera-first Read with me prototype.
- `/words` — Words we've met.
- `/me` — child-visible learning memory.
- `/discover` — early Brain Quest surface.
- `/help` — general voice/vision help entry.

## Architectural rules

1. Copy used by multiple surfaces belongs in `lib/buddy-language.ts`, not inline in device-specific components.
2. Shared visual meaning belongs in `lib/buddy-design.ts` and CSS custom properties.
3. Device-specific implementations can change layout radically while preserving the same language, states and semantic design tokens.
4. The Buddy presence has four initial semantic states: idle, listening, thinking and speaking.
5. Do not add success/failure colour semantics.
6. Do not add points, streaks, levels, badges or automatic praise mechanics.
7. Child-facing learning inferences must be tentative and rejectable.
8. Accessibility choices are preferences, not a single “dyslexia mode”.

## Next implementation slice

The next functional work should be:

1. real image capture and OCR service boundary;
2. selectable OCR word regions;
3. pronunciation/literacy service interface;
4. press-to-talk audio capture;
5. companion response streaming;
6. initial local Learning Map schema;
7. parent/child identity boundary;
8. R1/device adapter contract using the same semantic interaction states.

Do not build the parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
