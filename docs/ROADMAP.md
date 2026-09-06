# Buddy roadmap

Buddy's roadmap is deliberately organised around useful child-facing capability rather than feature volume. The core question is whether Buddy can help at the moment a child gets stuck, learn what support is useful, and gradually make that learning visible without turning the experience into school software or a scorecard.

## Where we are now

### Reading loop — working alpha

- Camera capture and browser-local OCR.
- Tappable recognised words plus a tighter focused OCR pass for an unboxed or uncertain word.
- Confidence-aware OCR: weak page guesses are not presented as trusted words.
- Adaptive sparse-text recovery: Buddy takes a second whole-page look when the first pass finds few trusted words or a meaningful weak-confidence tail, then merges genuinely new/high-confidence boxes.
- Three child-controlled help depths: **Tell me**, **Give me a clue**, and **Let's work it out**.
- Local-first lexical resolution with reviewed Buddy meanings, Princeton WordNet semantics and British-English pronunciation from Britfone.
- Context-sensitive senses, morphology and lemma resolution for common word forms.
- Reviewed heteronym handling for common multi-pronunciation words including `record`, `lead`, `wind` and `tear`.
- Unknown-word/OCR guardrails so noise does not silently become vocabulary.
- Local Learning Map events, **Words we've met**, Practice and tentative observations in **Me**.
- A broad school-age lexical benchmark spanning everyday polysemes, curriculum vocabulary, function words, morphology and difficult pronunciation.
- Reviewed curriculum semantic coverage for common maths, science and classroom words.
- Internal `/lab/words` surfaces for evaluation and regression work.

### Quality infrastructure — active

- Real reading failures are promoted into permanent lexical regressions.
- `npm run test:words` checks a compact sentinel set directly through `/api/word`, including context, morphology, child-friendly meaning, British pronunciation and the OCR-noise guardrail.
- `npm run test:ocr` checks confidence boundaries, focused-retry policy, adaptive sparse recovery, spatial merge behaviour and recovered-line context.
- Fast OCR policy checks run as part of the production build.
- Production/API checks are run after lexical changes rather than relying on the lab UI alone.

Run lexical regressions locally against a development server:

```bash
npm run test:words
```

Run them against a deployed Buddy instance:

```bash
npm run test:words -- --base-url=https://your-buddy-deployment.example
```

Run one sentinel while diagnosing a failure:

```bash
npm run test:words -- --base-url=https://your-buddy-deployment.example --only=sold-verb
```

Run the local OCR policy/recovery suite:

```bash
npm run test:ocr
```

## Next

### 1. Make real photographed pages the main OCR evaluation loop

The OCR policy now has explicit, testable thresholds and recovery behaviour. The next step is to stop tuning it from intuition and build a small reviewed page-image fixture set from the sorts of pages Buddy actually needs to read.

Capture for each fixture:

- words that should be found;
- words that may safely remain unboxed but recover on tap;
- false positives that must not become trusted boxes;
- layout type: prose, worksheet, large-print early reader, mixed illustration/text;
- first-pass and recovery-pass counts;
- whether the child-facing interaction remained recoverable even when OCR was imperfect.

Success is not 100% OCR. Success is high trusted-word precision plus a natural recovery route for misses.

### 2. Validate grapheme/phoneme guidance

The current sound layer explains already-resolved pronunciation evidence. It should now be tested against a validated structured-literacy mapping so that child-facing sound clues are predictable, reviewable and not merely plausible.

Priorities:

- common grapheme patterns;
- irregular spellings;
- morpheme boundaries where they are more useful than phoneme-by-phoneme explanation;
- wording that stays simple and age-respectful;
- a reviewed fixture set that distinguishes **safe to explain**, **irregular**, and **do not infer**.

Buddy should continue refusing to invent canonical pronunciation or force a neat letter/sound story where the evidence does not support one.

### 3. Improve capture geometry rather than piling on OCR passes

Once the fixture set tells us where recognition still fails, improve the image before adding more recognition complexity:

- document/page crop;
- deskew and perspective correction;
- page curvature tolerance where practical;
- glare/blur/capture-quality hints;
- better handling of punctuation and split/joined words.

Adaptive AUTO → SPARSE_TEXT → focused word retry is now the intended recognition ladder. Additional passes should only be added with fixture evidence.

### 4. Turn real lexical failures into the continuing evaluation loop

The broad benchmark remains useful, but actual reading remains the source of truth. Every poor explanation, bad sense choice, missed morphology pattern or unsafe pronunciation should become a small reproducible regression before it is fixed.

Continue expanding reviewed heteronyms only when real/common reading cases justify them rather than attempting to enumerate every possible English heteronym.

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
- Endless OCR fallback passes without evidence that they improve the child-facing interaction.

Those may create apparent product breadth while making it harder to learn whether the core interaction actually helps a child read, understand and discover how they learn.
