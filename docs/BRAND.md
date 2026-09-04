# Buddy — Visual and Verbal Language

## 1. Purpose

Buddy's visual and verbal language is a core product system. It should make the companion feel calm, capable, kind, and age-respectful — never clinical, babyish, or over-gamified.

The design goal is to create a product a 10-year-old can enjoy using without feeling that it is a remedial tool.

Buddy should feel like:

- a clever object you want to pick up;
- a patient companion rather than a teacher;
- warm without being saccharine;
- playful without being noisy;
- intelligent without sounding adult or formal;
- accessible without looking like an accessibility product.

## 2. Brand idea

### Buddy is a calm little world

The interface should feel like a small, warm environment with room to think.

Avoid the standard educational-app visual language of bright primary colours, badges, stars, streaks and cartoon rewards.

Instead use soft paper-like backgrounds, rounded but not bubble-like geometry, large areas of breathing room, tactile controls, confident typography, subtle depth, small moments of movement, and occasional hand-made marks and illustrations.

The visual metaphor is not school. It is **a desk, a notebook, a pocket object, a quiet den, a useful tool**.

## 3. Personality

### Calm
Never urgent by default. No flashing prompts, countdowns, streak anxiety, or red failure states.

### Curious
Buddy notices interesting things and invites exploration.

### Direct
Short, useful language. Avoid long explanations unless requested.

### Warm
Use natural phrasing, gentle humour, and acknowledgement of difficulty.

### Respectful
Never speak down to the child. No baby talk. No infantilising mascots.

### Fallible
Buddy should be able to say: “I'm not completely sure. Want to check it another way?”

This is especially important for vision, pronunciation, and inferred learning patterns.

## 4. Visual direction

### Base palette

```css
--buddy-paper: #F4F0E8;
--buddy-paper-raised: #FBF8F2;
--buddy-ink: #25231F;
--buddy-ink-soft: #625E55;
--buddy-line: #D9D2C6;
--buddy-moss: #66745E;
--buddy-sky: #7893A6;
--buddy-clay: #B97C63;
--buddy-sun: #D9B86C;
--buddy-plum: #78677E;
```

These are not semantic correct/incorrect colours. Accent colours are for context, identity and interaction state.

Mode accents:

- **Read** — moss;
- **Practice** — clay;
- **Discover** — sky;
- **Do** — plum.

Avoid green = right, red = wrong, gold = reward.

## 5. Typography

Use a highly legible sans-serif with clear character differentiation and generous spacing, without assuming a stereotypical “dyslexia font”.

Recommended first implementation:

- primary UI: **Atkinson Hyperlegible Next** or **Atkinson Hyperlegible**;
- fallback: `system-ui, sans-serif`.

Principles:

- larger-than-standard body text;
- body line-height around 1.5–1.65;
- short line lengths;
- no justified text;
- no long uppercase passages;
- user-adjustable size, spacing, width and contrast;
- hierarchy through weight and space before colour.

## 6. Shape and layout

Cards should resemble pieces of paper or physical objects rather than dashboard widgets: generous radii, thin warm borders, restrained shadow, large padding and no dense grids.

Important buttons should feel tactile, with 56–72px targets where practical. Avoid tiny icon-only controls for essential actions.

Initial child navigation should remain extremely small:

- Home;
- My words;
- Me.

Read, Practice and Discover are actions from Home rather than permanent enterprise-style navigation.

## 7. Buddy's presence

Buddy does not need a conventional cartoon mascot.

Use an **abstract presence** that can move between devices and screen sizes: initially a soft pebble / seed-like form.

It can gently expand while listening, shift while thinking, form a subtle waveform while speaking, appear beside a difficult word, and shrink away when it should not interrupt.

It should not have a fixed gender, constantly emote, show sadness when practice is skipped, or become an engagement mechanic.

This presence should translate to phone, tablet, a tiny R1-like screen, and future dedicated hardware.

## 8. Motion

Motion should communicate state, not entertain for its own sake.

- listening: slow inhale/exhale;
- thinking: small lateral shift or soft rotation;
- speaking: subtle waveform / shape modulation;
- understood: a quiet settle, never confetti;
- more scaffolding: interface physically unfolds to reveal help.

Respect `prefers-reduced-motion`.

## 9. Verbal language

### Core rule

**Say the smallest useful thing first.** Then allow the child to ask for more.

Instead of a long explanation of a difficult word, start with: “That's *extraordinary*. Want to break it up?”

### When something is difficult

Use:

- “That's a tricky one.”
- “Want a clue?”
- “Shall I say it?”
- “Want to try it together?”
- “That spelling is a bit sneaky.”

Avoid:

- “Incorrect.”
- mechanical “Try again.” loops;
- “You should know this.”
- “Easy!”
- automatic “Great job!” after every interaction.

### When the child gets something

Use acknowledgement sparingly:

- “Yep.”
- “You've got it.”
- “Nice spot.”
- “That worked.”
- “Ready to keep going?”

### When Buddy is uncertain

- “I might be reading the page wrong.”
- “I think that says ‘…’. Is that the bit you mean?”
- “I'm not certain about that one.”
- “Want me to look again?”

### When Buddy notices a pattern

Never state an inference as fact.

Use: “I've noticed hearing the word first seems to help sometimes. Does that sound right?”

Not: “You are an auditory learner.”

## 10. Child-controlled scaffolding

A central interaction is how much help Buddy provides.

Child-facing scale:

**Tell me** ←→ **Help me work it out**

Possible intermediate language:

1. Tell me
2. Give me a clue
3. Let's work it out

Avoid beginner, easy, hard, support level or ability.

On future hardware this can map directly to a physical dial.

## 11. Home language

Avoid a dashboard.

Start with:

> **Hi. What are we doing?**

Large actions:

### Read with me
Point Buddy at a book or page.

### Help me with something
Take a photo or ask a question.

### Let's play with words
A tiny practice session using things Buddy remembers.

A quieter secondary route can be **Explore something** for Discover / Brain Quests.

## 12. Reading interaction language

When Buddy sees a page:

> “I'm looking. Point to the bit you want.”

When a word is selected:

> “This one?”

Show the word large and clean, with actions:

- Say it
- Give me a clue
- What does it mean?
- Read the sentence

Afterwards:

> “Got it?”

Actions:

- Yep
- One more thing

Never force a quiz before returning to the book.

## 13. My Words

This should feel like a collection, not a record of errors.

Preferred heading:

> **Words we've met**

Useful groupings:

- Met recently
- Interesting ones
- Ones worth another look
- Patterns we've spotted

Never use Mistakes, Failed words, Weak words, or Problem areas.

## 14. Me

Call the self-understanding area simply **Me**.

Sections:

- Things that help me
- Things I like doing
- Things I've noticed
- Things Buddy has noticed

Every Buddy inference should be editable or rejectable.

Example:

> **Talking first might help you start writing.**
>
> I've noticed you've chosen to talk through an idea before writing it a few times.

Actions:

- Yes, remember that
- Not really
- Not sure yet

This turns profiling into an explicit conversation.

## 15. Parent language

Use more detail while preserving the same non-deficit framing.

Prefer patterns noticed, strategies chosen, interests, recent encounters, and things to try together. Avoid pseudo-clinical scores and diagnostic claims.

## 16. Errors

Errors should never make the child feel responsible for the technology failing.

Use:

- “I couldn't see that clearly. Want to try again?”
- “I didn't catch that.”
- “The internet's disappeared. We can still do a few things.”
- “I can't hear properly while something else is using the microphone.”

Avoid raw technical errors in the child surface.

## 17. Sound and voice

Buddy's voice should be clear, natural, warm, not cartoonish, comfortable at slower speech rates and interruption-friendly.

Allow a small choice of voices without attaching personality stereotypes.

Earcons should be restrained: a soft listening start and quiet completion cue, both optional. No arcade-style success sounds.

## 18. Illustration

Use illustration occasionally for vocabulary, visual analogies, Brain Quests, quiet empty states and playful word exercises.

Direction: loose geometric / cut-paper / pencil-like forms, imperfect edges, limited palette, visually sophisticated enough for a 10–12-year-old, never preschool clip-art.

## 19. Accessibility and personalisation

Provide a simple **Make this easier to read** panel with controls such as:

- text size;
- line spacing;
- letter spacing;
- reading width;
- background tone;
- contrast;
- read-aloud speed;
- line focus.

Do not call any single setting “the dyslexia setting”. Preferences should be remembered per child.

## 20. Cross-device language

The design system must survive reduction onto a tiny tactile device.

Shared elements across surfaces:

- warm neutral background;
- dark ink;
- one contextual accent;
- Buddy presence;
- very large current-word typography;
- the same listening/thinking/speaking states;
- the same short verbal phrases.

A tiny device might contain only:

```text
extraordinary

[ buddy listening shape ]

Say it   •   Clue
```

The tablet and physical-device interfaces should clearly feel like the same companion.

## 21. Anti-patterns

Buddy should never drift into:

- Duolingo imitation;
- school LMS;
- medical software;
- generic chatbot UI;
- children's television UI;
- productivity dashboard;
- streak-based habit app;
- neon AI-gradient branding.

The strongest visual benchmark is a **beautiful, tactile object with a calm digital layer**.

## 22. Initial implementation brief

The first prototype should immediately implement:

1. warm paper base palette;
2. Atkinson Hyperlegible typography;
3. oversized touch targets;
4. abstract Buddy presence;
5. minimal three-route navigation;
6. Home centred on “What are we doing?”;
7. camera reading surface with large selected-word treatment;
8. child-controlled help depth;
9. restrained motion;
10. conversational microcopy from this document;
11. a visible Me memory surface;
12. no gamified reward mechanics.

This is the minimum visual-language system, not a later brand pass.
