# Buddy roadmap

Buddy's roadmap is deliberately organised around useful child-facing capability rather than feature volume. The core question is whether Buddy can help at the moment a child gets stuck, learn what support is useful, and gradually make that learning visible without turning the experience into school software or a scorecard.

## Where we are now

### Reading loop — working alpha

- Camera capture and browser-local OCR.
- Tappable recognised words plus a tighter second OCR pass for missed words.
- Three child-controlled help depths: **Tell me**, **Give me a clue**, and **Let's work it out**.
- Local-first lexical resolution with reviewed Buddy meanings, Princeton WordNet semantics and British-English pronunciation from Britfone.
- Context-sensitive senses, morphology and lemma resolution for common word forms.
- Unknown-word/OCR guardrails so noise does not silently become vocabulary.
- Local Learning Map events, **Words we've met**, Practice and tentative observations in **Me**.
- A broad school-age lexical benchmark spanning everyday polysemes, curriculum vocabulary, function words, morphology and difficult pronunciation.
- Reviewed curriculum semantic coverage for common maths, science and classroom words.
- Internal `/lab/words` surfaces for evaluation and regression work.

### Quality infrastructure — active

- Real reading failures are promoted into permanent lexical regressions.
- A production word-regression command now checks a compact sentinel set directly through `/api/word` so the deployed reading path can be tested without relying on the lab UI alone.
- The regression set protects context, morphology, child-friendly meaning, British pronunciation and the OCR-noise guardrail.

Run it locally against a development server:

```bash
npm run test:words
```

Run it against a deployed Buddy instance:

```bash
npm run test:words -- --base-url=https://your-buddy-deployment.example
```

Run one sentinel while diagnosing a failure:

```bash
npm run test:words -- --base-url=https://your-buddy-deployment.example --only=sold-verb
```

## Next

### 1. Turn real reading failures into the main evaluation loop

The broad benchmark is useful, but actual pages remain the most important source of truth. Every poor explanation, bad sense choice, missed morphology pattern, unsafe pronunciation or OCR false positive should become a small reproducible case before it is fixed.

The production sentinel pack should stay compact and high-signal. Wider exploratory coverage remains in `/lab/words`.

### 2. Review common heteronyms and multi-pronunciation words

Britfone correctly exposes multiple pronunciation variants for many words but does not always provide enough sense or part-of-speech evidence to choose safely. Add reviewed/context-aware mappings for common reading words such as noun/verb or sense-dependent pronunciation cases rather than choosing variant 1 blindly.

Success means Buddy can preserve uncertainty when context is insufficient and can select a reviewed British pronunciation when context is genuinely strong enough.

### 3. Validate grapheme/phoneme guidance

The current sound layer explains already-resolved pronunciation evidence. It should now be tested against a validated structured-literacy mapping so that child-facing sound clues are predictable, reviewable and not merely plausible.

Priorities:

- common grapheme patterns;
- irregular spellings;
- morpheme boundaries where they are more useful than phoneme-by-phoneme explanation;
- wording that stays simple and age-respectful.

### 4. Improve camera capture and OCR confidence behaviour

Move from simple contrast enhancement towards a proper capture-quality pass:

- document/page crop;
- deskew and perspective correction;
- page curvature tolerance where practical;
- confidence-aware word boxes;
- better handling of punctuation and split/joined words;
- a fast targeted retry when a tapped word is weak or absent.

The goal is not perfect OCR. The goal is for a child to be able to recover naturally when OCR is uncertain.

### 5. Companion agent boundary

Add a provider-neutral companion-agent interface only after the reading loop is well characterised. The agent should receive the smallest useful context and should have explicit child-safe capabilities rather than unrestricted access to the Learning Map.

It should be able to help with language and task scaffolding, but it must not become the authority for canonical pronunciation or quietly infer a child profile from unrestricted history.

## Later

### Learning and identity

- Expand **Me** from reading-support observations into explicit strategies and, later, strengths discovery.
- Define child/profile identity, parent or guardian consent, retention and privacy boundaries before cloud synchronisation.
- Keep learning inferences visible, tentative and rejectable.

### Surfaces

- Implement the first Android/R1 tactile adapter using the shared Buddy device contract.
- Preserve the same semantic actions and learning model while allowing radically different physical interactions.
- Continue treating phone, tablet, web and future dedicated hardware as surfaces of Buddy rather than separate products.

## Things we are deliberately not doing yet

- Parent dashboard.
- Full account system or cloud synchronisation.
- Gamification, streaks, scores, badges or rewards.
- A general unrestricted chatbot with access to the child's history.
- Model-generated canonical phonics or pronunciation guidance.

Those may create apparent product breadth while making it harder to learn whether the core interaction actually helps a child read, understand and discover how they learn.
