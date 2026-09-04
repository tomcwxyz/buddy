# Buddy — Product and Interaction Design

## 1. Product thesis

Buddy is a persistent learning companion for children, initially focused on reading support for dyslexia and later expanding into broader learning, self-understanding and strengths.

It should feel less like a tutor and more like **someone useful sitting beside you who does not get impatient**.

Buddy should be available wherever the child needs it: on a tablet, phone, browser, small tactile device, Bluetooth headphones or a future dedicated object. The intelligence, learning memory and governance belong to Buddy itself rather than to any one device.

The long-term progression is:

> Help me read this.
>
> Help me understand this.
>
> Help me work out how I learn this.
>
> Help me understand how my brain works, what I am good at, and what helps me.

---

## 2. Product principles

### 2.1 Capability, not deficit

Buddy should not repeatedly remind a child that they are dyslexic or frame interactions around failure.

The language should normalise difficulty:

- “That is a tricky one.”
- “Want a clue?”
- “Shall I say it?”
- “Want to work it out together?”

Avoid language such as:

- “You got that wrong.”
- “You failed this word.”
- “Your reading accuracy is 73%.”

### 2.2 Preserve what the child is trying to do

If the child is reading a story, reading and enjoying the story is the goal.

Buddy should not turn every unfamiliar word into a lesson. Sometimes the best interaction is simply:

> “That word is ‘colonel’. Want me to read the sentence with you?”

### 2.3 Scaffold rather than answer

Buddy should give the minimum useful amount of help and let the child request more.

For reading, the ladder might be:

1. give time to try;
2. offer a small clue;
3. identify a useful chunk or sound pattern;
4. say the word;
5. explain it in context;
6. read the sentence together;
7. move on.

For broader schoolwork:

1. clarify the question;
2. break it into manageable parts;
3. let the child talk through their thinking;
4. help organise their ideas;
5. support expression of their own answer.

### 2.4 Child control

The child should be able to say or do things such as:

- “Just tell me.”
- “Give me a clue.”
- “Say it slowly.”
- “What does that mean?”
- “Read this bit.”
- “I get it now.”
- “Do not save that.”
- “Stop helping.”
- “That was not useful.”

Buddy should adapt to the child, not force the child into a rigid interaction.

### 2.5 Multi-modal by default

Reading and typing should never be the only routes through the product.

Buddy should be designed around combinations of:

- voice;
- listening;
- camera/vision;
- pointing;
- touch;
- images;
- diagrams;
- drawing;
- physical buttons;
- a dial or wheel;
- typing;
- reading.

### 2.6 Visible memory

Buddy must be able to explain what it remembers in language the child can understand.

A child should be able to correct or delete inferred information.

### 2.7 Privacy by architecture

The product should assume that learning data about a child is sensitive.

No advertising. No engagement optimisation. No selling data. No hidden parent surveillance. No model training on child conversations by default.

### 2.8 Strengths are discovered, not assigned

Buddy should never assume a child has a fixed collection of “dyslexic strengths”.

Instead, it should create opportunities for the child to discover what they enjoy, what comes naturally, what takes effort and what strategies help.

---

# 3. Core experiences

Buddy has four connected experiences:

## Read

**Help me with what I am doing now.**

The child may be reading a book, worksheet, webpage, game instruction, sign, menu or other real-world material.

Possible interactions:

- point the camera at a page;
- tap a word in a captured image;
- point physically at a word;
- say “help me with this one”;
- ask Buddy to read a sentence;
- ask what a word means in context;
- ask a comprehension question;
- ask Buddy to make a dense section easier to look at.

The goal is to remove friction without breaking the flow of reading.

### Read With Me

A particularly important mode.

The child starts a reading session and puts the device beside them. Buddy is mostly quiet and becomes available when needed.

Possible triggers:

- explicit voice request;
- button press;
- word tapped or pointed to;
- deliberate “look at this” camera action.

Automatic intervention should be conservative. Buddy should not continuously judge or interrupt reading.

---

## Practice

**Remember useful patterns and revisit them without turning them into a failure log.**

A reading encounter may store:

- word or phrase;
- sentence/context;
- whether help was requested;
- rough category of difficulty;
- grapheme/phoneme structure;
- morphology;
- vocabulary familiarity;
- strategy used;
- whether the child said it helped;
- future encounters with the same pattern.

The system should try to recognise useful recurring patterns rather than merely count errors.

### My Words / Word Garden

A child-friendly collection of words they are exploring.

Possible states:

- **Met**
- **Exploring**
- **Familiar**

Avoid:

- wrong;
- failed;
- passed.

Practice activities should often last two or three minutes and might include:

- matching sound and spelling;
- assembling word chunks;
- spotting shared patterns;
- morphology;
- silly sentence creation;
- drawing meaning;
- spoken storytelling;
- finding a previously explored word naturally in a new context.

The underlying literacy information should be structured and deterministic where practical. The generative model can make practice playful, but should not invent phonics rules.

---

## Discover

**Help me find out how I work.**

Buddy should help the child explore strengths, preferences and strategies without pretending to run psychometric tests.

Examples of exploratory activities:

- spatial puzzles;
- visualisation;
- storytelling;
- verbal explanation;
- systems thinking;
- building/design challenges;
- navigation;
- creative problem-solving;
- pattern spotting;
- imagination;
- memory-strategy experiments.

### Brain Quests

Small, playful prompts such as:

> “Can you find three different ways across this map?”

> “Here is a broken playground. What would you change?”

> “Teach me how something you love works.”

> “What could you build from these six objects?”

Afterwards Buddy can ask reflective questions:

- Was that fun?
- Easy, medium or hard?
- Did you picture it in your head?
- Did talking help?
- Would you do another one like that?

These answers contribute to the child's understanding of themselves, not a hidden score.

---

## Do

**Help me tackle something without doing it for me.**

For a school question, Buddy should help unpack complexity and capture the child's thinking.

Example:

> Compare the motivations of the two characters and explain how the author communicates these.

Buddy might say:

> “There is quite a lot packed into that. Shall we split it up?”

Then work through:

- who are the characters?
- what does each want?
- what makes you think that?
- where is the evidence?
- what is different between them?

The desired flow is:

**thinking → speaking → organising → writing**

not:

**question → AI answer**

---

# 4. The Learning Map

The Learning Map is the central long-term product asset.

It is not simply a list of words the child knows.

It should gradually model:

## Encounters

What the child has experienced.

## Patterns

Recurring literacy or learning patterns.

## Strategies

Approaches the child has tried and whether they appear useful.

## Preferences

How the child prefers to interact or receive help.

## Interests

Topics, activities and formats that motivate them.

## Strengths

Capabilities emerging from repeated exploration and the child's own reflection.

## Reflections

Things the child explicitly says about themselves.

An inferred memory should be shown as an inference, for example:

> “I think hearing a word once before trying it sometimes helps you. Is that right?”

Possible responses:

- Yes
- Not really
- Do not remember this

The child should be able to inspect the map through a simple **What I remember about you** interface.

---

# 5. Surface strategy

Buddy should not be designed as one UI scaled onto multiple screens.

Each surface should express the same companion differently.

## Phone

Best for:

- quick camera help;
- My Words;
- short practice;
- voice questions;
- parent setup.

Potential downside: distraction and competition with normal phone use.

## Tablet

The primary rich prototype surface.

Best for:

- Read With Me;
- page capture;
- visual highlighting;
- Brain Quests;
- diagrams and drawing;
- richer practice;
- exploring the Learning Map.

## Web / laptop

Best for:

- schoolwork scaffolding;
- browser reading;
- longer writing tasks;
- parent-facing settings and review;
- development and evaluation.

## Rabbit R1 / small tactile AI device

Best for:

- voice-first interaction;
- “look at this” vision help;
- reading beside a physical book;
- low-distraction companionship;
- Bluetooth-headphone use;
- testing physical interaction patterns.

The R1 is an experimental surface, not a product dependency.

## Future dedicated Buddy device

Possible ingredients:

- camera;
- 3–4 inch display;
- microphone;
- speaker;
- Bluetooth;
- Wi-Fi;
- push-to-talk button;
- dial or rotary control;
- USB-C;
- optional cellular connectivity.

The hardware should emerge from observed child behaviour rather than being designed first.

---

# 6. Tactile interaction language

A dedicated or R1-like surface should have an extremely small interaction vocabulary.

## Button

**Hold** — talk to Buddy.

**Double press** — look at this.

**Single press while Buddy is speaking** — stop / I understand.

## Dial or wheel

A strong exploratory interaction is a physical control for the amount of support:

**just tell me ←────────→ help me work it out**

This gives the child direct control over scaffolding without navigating settings.

It could also be represented visually on richer surfaces.

## Display

A small display should not reproduce the mobile UI.

It may show only:

- the current word;
- highlighted chunks;
- one illustration;
- one instruction;
- one simple choice;
- a minimal Buddy state.

Voice remains primary.

---

# 7. Brand and visual direction

Buddy should feel:

- warm;
- calm;
- curious;
- clever without looking academic;
- playful without looking babyish;
- tactile;
- trustworthy;
- low-pressure.

Avoid the visual language of:

- school assessment platforms;
- productivity dashboards;
- gamified learning apps;
- clinical accessibility software;
- generic neon AI assistants.

## Visual metaphor

Buddy should feel like a **small collection of helpful things**, not a scoreboard.

Potential recurring motifs:

- cards;
- paper scraps;
- pebbles;
- seeds;
- paths;
- little discovered objects;
- highlighted fragments;
- hand-drawn marks;
- soft containers.

The system can visually accumulate knowledge without turning it into points.

## Typography

Priorities:

- highly legible;
- generous x-height;
- comfortable line-height;
- strong distinction between similar letterforms;
- user-adjustable size and spacing;
- no assumption that a specialist “dyslexia font” is universally better.

Text settings should be personalisable and remembered per child.

## Colour

Use a warm, low-contrast base with a small number of stronger accents for focus and state.

Avoid large areas of pure white where a softer surface is more comfortable.

Do not encode success/failure primarily through red and green.

## Motion

Motion should indicate:

- listening;
- looking;
- thinking;
- transition;
- progress through an interaction.

It should never create pressure through countdowns, streak animations or urgency.

---

# 8. Initial screen design

## Home

The first tablet/phone home should be extremely simple.

```text
┌─────────────────────────────────────┐
│ buddy                               │
│                                     │
│ Hi. What are we doing?              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │          Read with me           │ │
│ │      camera + voice + help      │ │
│ └─────────────────────────────────┘ │
│                                     │
│  Practice      My words             │
│                                     │
│  Discover      What I remember      │
│                                     │
│                         ● talk      │
└─────────────────────────────────────┘
```

No dashboard statistics.

No streak.

No “minutes practised”.

## Read With Me

```text
┌─────────────────────────────────────┐
│ ‹ Read with me                      │
│                                     │
│         [ live page / image ]       │
│                                     │
│       tap or point at a word        │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ ◉ listening                         │
│                                     │
│ less help       ─────●──── more help│
└─────────────────────────────────────┘
```

When a word is selected, the rest of the interface recedes.

```text
┌─────────────────────────────────────┐
│                                     │
│          extraordinary              │
│                                     │
│       [ useful visual chunking ]    │
│                                     │
│      🔊 hear it     ? meaning       │
│                                     │
│         “Want a clue?”              │
│                                     │
│             I’m good                │
└─────────────────────────────────────┘
```

The design goal is focus: **one thing at a time**.

## My Words

A quiet collection rather than a list of failures.

```text
My words

Things we have met recently

  extraordinary       exploring
  character            familiar
  environment          met

Patterns we have noticed

  -tion     4 words
  re-       3 words
```

The exact metaphor — garden, collection, constellation, etc. — should be co-designed with children rather than fixed too early.

## What I remember

```text
What I remember about you

Things that seem to help

  Hearing a new word once
  Talking before writing
  Seeing one example first

Things you have told me

  “I like making up stories.”

Things I am wondering

  You might find long instructions easier
  one step at a time.

  Yes    Not really    Forget this
```

---

# 9. Companion states

Buddy should have a recognisable presence without requiring a cartoon mascot.

Useful states include:

- **quiet** — available but not demanding attention;
- **listening**;
- **looking**;
- **thinking**;
- **showing**;
- **celebrating discovery**;
- **done**.

A subtle abstract visual identity can communicate these states across tablet and small-device displays.

If a character or mascot emerges, it should be co-designed with children rather than imposed.

---

# 10. Tone of voice

Buddy should be concise by default.

Good:

> “Want a clue?”

> “Yep, that one is odd.”

> “You can have another go, or I can say it.”

> “I think you have got the idea. Carry on?”

> “That explanation worked differently. Want me to remember that?”

Avoid:

> “Fantastic job! You are a superstar reader!”

> “Unfortunately, that answer is incorrect.”

> “Let us complete another exercise to improve your dyslexic skills.”

Buddy should not sound therapeutic, patronising or excessively enthusiastic.

---

# 11. Technical architecture

The architecture should keep surfaces independent from the core learning system.

```text
                     BUDDY
                       │
            ┌──────────┴──────────┐
            │                     │
      Interaction layer      Learning layer
            │                     │
   ┌────────┼────────┐      ┌─────┼──────────┐
   │        │        │      │     │          │
 Voice    Vision   Touch   Words Patterns Strategies
   │        │        │      │     │          │
   └────────┴────────┘      └─────┴──────────┘
            │                     │
            └──────────┬──────────┘
                       │
               Companion service
                       │
        ┌──────────────┼───────────────┐
        │              │               │
      tablet          web          device gateway
                                       │
                           ┌───────────┼───────────┐
                           │           │           │
                          R1        Android      future
```

## Core services

### Companion service

Responsible for:

- conversation;
- tone;
- turn-taking;
- choosing the next scaffold;
- immediate session context;
- routing to specialist services.

### Vision service

Responsible for:

- page capture;
- OCR;
- selected-text detection;
- pointer/tap location;
- context extraction.

Raw camera imagery should normally be ephemeral.

### Speech service

Responsible for:

- speech recognition;
- speech synthesis;
- interruption;
- turn detection.

Do not treat speech-recognition confidence as a reading score.

### Literacy engine

Structured source of truth for:

- pronunciation;
- phoneme/grapheme relationships;
- syllabification;
- morphology;
- spelling patterns;
- vocabulary metadata;
- structured learning progression.

Generative models may explain or contextualise this information but should not invent the canonical analysis.

### Learning Map service

Stores encounters, patterns, preferences, interests, strategies, reflections and child-approved inferences.

### Practice engine

Selects useful items from the Learning Map and turns them into brief activities.

### Device gateway

Normalises device input/output so new surfaces do not require changes to the learning model.

Example event:

```json
{
  "device": "r1",
  "session": "…",
  "modality": ["vision", "voice"],
  "intent": "help_with_word",
  "input": {
    "selectedText": "extraordinary"
  }
}
```

Example response:

```json
{
  "speech": "Want a clue?",
  "display": {
    "kind": "word",
    "text": "extraordinary"
  },
  "learningEvent": null,
  "deviceAction": "listen"
}
```

---

# 12. Agent connectivity

Buddy may eventually expose tightly governed capabilities to approved external agents.

Potential interfaces:

```text
get_learning_preferences()
get_helpful_strategies()
get_current_reading_context()
request_scaffold()
record_learning_encounter()
explain_for_child()
```

Avoid any broad interface equivalent to:

```text
dump_everything_we_know_about_child()
```

The design principle is **capability-based memory access**.

An external agent should receive only the minimum learning context required for the current task.

---

# 13. Privacy and parent experience

## Child-visible memory

A major interface is:

**What I remember about you**

The child can:

- inspect memories;
- correct them;
- reject inferences;
- delete information;
- understand which information may be shared elsewhere.

## Parent view

A parent view may show useful themes without becoming surveillance.

Possible examples:

- recurring literacy patterns;
- strategies the child often chooses;
- interests currently motivating practice;
- suggested offline activities;
- broad changes over time.

Avoid by default:

- complete transcripts;
- private conversation logs;
- percentage accuracy;
- productivity scores;
- daily monitoring dashboards.

The child should understand what a parent can see.

---

# 14. Co-design

Buddy should be co-designed with children from the first prototype.

Questions to test include:

- Does Buddy talk too much?
- Does it interrupt too often?
- Is taking a photograph annoying?
- Is pointing easier than tapping?
- Would headphones help?
- What should the physical button do?
- Is a dial useful?
- What feels babyish?
- What feels too much like school?
- Does the child want a character or not?
- What should Buddy remember?
- What should Buddy never remember?

The child should have genuine authority to reject design decisions.

---

# 15. Roadmap

## Phase 0 — co-design exploration

Prototype with one child and learn which interactions are genuinely useful.

Test:

- camera selection;
- difficult-word assistance;
- pronunciation;
- explanation;
- read-aloud;
- spoken follow-up;
- “Read With Me”;
- child-controlled support level.

## Phase 1 — phone/tablet V0

Build the first useful reading companion:

- PWA/web surface;
- camera;
- OCR;
- word selection;
- pronunciation;
- structured word analysis;
- contextual meaning;
- voice conversation;
- My Words;
- minimal Learning Map.

## Phase 2 — Read With Me

Add:

- reading-session context;
- faster targeting;
- voice interruption;
- Bluetooth audio;
- explicit help interaction;
- user-controlled scaffolding.

## Phase 3 — Learning Map

Add:

- encounters;
- patterns;
- strategies;
- interests;
- preferences;
- visible memory;
- child corrections;
- confidence in inferred information;
- simple parent view.

## Phase 4 — Practice

Add:

- spaced revisiting;
- structured pattern practice;
- morphology;
- vocabulary;
- playful generative content;
- two-minute activities;
- My Words maturation.

## Phase 5 — tactile-device experiment

Use Rabbit R1 or similar hardware to test:

- push-to-talk;
- “look at this” vision;
- Bluetooth headphones;
- spoken scaffolding;
- minimal display states;
- device gateway architecture.

## Phase 6 — Android Buddy device

Prototype dedicated commodity hardware with:

- camera;
- microphone;
- speaker;
- Bluetooth;
- small display;
- push-to-talk;
- physical support-level dial.

## Phase 7 — Discover

Add Brain Quests, strengths exploration and a child-facing “How I learn” profile.

## Phase 8 — Do

Add broader learning scaffolding for questions, planning, verbal reasoning and writing support.

## Phase 9 — companion protocol

Expose carefully scoped capabilities to approved browsers, agents and other learning tools.

## Phase 10 — dedicated hardware decision

Only after observing real use, decide whether Buddy deserves its own hardware product and what form that hardware should take.

---

# 16. V0 success criteria

Do not judge the first prototype primarily by reading scores.

The questions that matter first are:

1. Does the child choose to use Buddy when they get stuck?
2. Does Buddy help without breaking the flow of reading?
3. Can the child control how much help they receive?
4. Are Buddy's explanations understandable and useful?
5. Does the child want to use it again?
6. Does the Learning Map capture useful information without feeling like surveillance?
7. Can the same companion interaction work sensibly on both a rich screen and a small tactile device?

If those are true, the product has something worth developing.
