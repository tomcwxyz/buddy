# Buddy roadmap

Buddy's roadmap is deliberately organised around useful child-facing capability rather than feature volume. The core question is whether Buddy can help at the moment a child gets stuck, learn what support is useful, and gradually make that learning visible without turning the experience into school software or a scorecard.

## Where we are now

### Reading loop — working alpha

- Camera capture and browser-local OCR.
- Tappable recognised words plus a tighter focused OCR pass for an unboxed or uncertain word.
- Confidence-aware OCR: weak page guesses are not presented as trusted words.
- Adaptive sparse-text recovery: Buddy takes a second whole-page look when the first pass finds few trusted words or a meaningful weak-confidence tail, then merges genuinely new/high-confidence boxes.
- Conservative whole-page deskew: Buddy only rotates a photographed page when horizontal text evidence is strong enough, then maps recognised boxes back onto the untouched photograph for tapping.
- Three child-controlled help depths: **Tell me**, **Give me a clue**, and **Let's work it out**.
- Local-first lexical resolution with reviewed Buddy meanings, Princeton WordNet semantics and British-English pronunciation from Britfone.
- Context-sensitive senses, morphology and lemma resolution for common word forms.
- Reviewed heteronym handling for common multi-pronunciation words including `record`, `lead`, `wind` and `tear`.
- A separate reviewed sound-teaching boundary: technical spelling/pronunciation alignment is classified as **safe to explain**, **do not infer** or **irregular** before any child-facing phonics clue is shown.
- No trusted pronunciation means no speculative spelling-only sound clue.
- Unknown-word/OCR guardrails so noise does not silently become vocabulary.
- Local Learning Map events, **Words we've met**, Practice and tentative observations in **Me**.
- School spelling lists can be photographed, read with Buddy's local OCR, checked/edited by a person, and saved as a local practice set without retaining the source image.
- Practice remains deliberately short: a larger spelling set is surfaced a few words at a time rather than becoming a test.
- Practice sets now feed an interactive coaster world: each unique explored word leaves a real piece in the child's construction yard, with several compatible track shapes to choose from. Tracks now include straights, lift hills, drops, steep drops, hills, dips, bunny hops, swoops, camelbacks, loops, double loops, corkscrews, tunnels, launch track and brakes. Lift and drop pieces genuinely change the track's elevation rather than snapping every piece back to a baseline. The cart has game-like momentum: climbs cost speed, descents add it, launch track boosts it, brakes slow it and inversions need enough speed to complete. The world represents exploration, making and experimentation — not correctness, points or mastery.
- A broad school-age lexical benchmark spanning everyday polysemes, curriculum vocabulary, function words, morphology and difficult pronunciation.
- Reviewed curriculum semantic coverage for common maths, science and classroom words.
- Internal `/lab/words` surfaces for lexical and sound-boundary evaluation.
- Internal `/lab/ocr` surface for real photographed pages, precision/recall comparison, recovery inspection and local JSON fixture export.
- OCR candidate fixtures now record page type, safe-to-recover misses, must-not-trust false positives, interaction recoverability and review notes while keeping source page images local.

### Quality infrastructure — active

- Real reading failures are promoted into permanent lexical regressions.
- `npm run test:words` checks a compact sentinel set directly through `/api/word`, including context, morphology, child-friendly meaning, British pronunciation and the OCR-noise guardrail.
- `npm run test:ocr` checks confidence boundaries, focused-retry policy, adaptive sparse recovery, spatial merge behaviour, recovered-line context, page-deskew direction, overlay geometry and the reviewed real-page fixture contract.
- `npm run test:sounds` checks reviewed, withheld and irregular spelling/pronunciation cases so an alignable word cannot silently become an unreviewed teaching rule.
- Fast OCR, geometry, fixture-contract and sound-boundary checks run as part of the production build.
- Production/API checks are run after lexical or sound changes rather than relying on the lab UI alone.

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

Run the local OCR policy/recovery/geometry/fixture suite:

```bash
npm run test:ocr
```

Run the reviewed sound-boundary suite:

```bash
npm run test:sounds
```

## Next

### 1. Build the first reviewed real-page fixture set

The capture and review contract is now in place; the remaining work is to feed it the pages Buddy actually needs to read. Do not tune from intuition.

Start with a small, varied set of roughly eight real captures: prose, worksheets, large-print early readers and mixed illustration/text. Keep the photographs in the private/local test pack and check only reviewed fixture evidence into `data/ocr-fixtures`.

For each fixture review:

- expected visible text;
- words that should be found;
- words that may safely remain unboxed but recover on tap;
- false positives that must not become trusted boxes;
- layout type: prose, worksheet, large-print early reader, mixed illustration/text;
- first-pass and recovery-pass counts;
- whether deskew was applied and whether it improved the result;
- whether the child-facing interaction remained recoverable even when OCR was imperfect;
- a page-specific minimum precision/recall acceptance boundary.

Success is not 100% OCR. Success is high trusted-word precision plus a natural recovery route for misses.

### 2. Test practice from real life

The first school-spelling import and playful progress loop now exists. The next job is to test whether it is genuinely useful rather than turning it into a feature-heavy spelling app.

Priorities:

- try real photographed spelling sheets with different layouts, handwriting around the list and ordinary phone-camera conditions;
- check whether the confirmation/edit step catches OCR mistakes quickly enough;
- keep practice sessions to a few words even when the source list is longer;
- vary the practice interaction using sound, chunks, meaning, examples and reconstruction rather than repeated copying;
- test the build-and-ride coaster with the child: direct visual piece choice, construction, rearranging, the Build → Ride transition, launch speed, cart dragging, stalls and rerunning the ride should feel like play rather than a disguised progress screen;
- tune the simple speed/momentum model from play rather than chasing physical realism; the interesting question is whether track order creates understandable experimentation;
- test whether cumulative terrain (lift → drop → inversion) creates a stronger sense of designing a ride than isolated decorative shapes;
- keep Build and Ride as deliberately different moods: Build exposes the piece yard, track palette and park-building tools; Ride removes workshop controls and makes the coaster, park and cart the focus;
- grow the wider world from exploration too: each explored-word piece makes room for one persistent scenery object, with direct touch placement rather than points or a decoration currency;
- test whether trees, ponds, rocks, flags, lamps and small park buildings make the coaster feel like a place worth returning to rather than just a completed track;
- make Ride mode feel alive without turning it noisy: scenery can sway/glow while the cart moves, tunnels can darken the stage, launches can flash and station visitors can react;
- keep cart customisation as immediate preference rather than progression: Classic, Rocket and Buggy are all available from the start;
- keep ride feedback descriptive rather than scored: Buddy can call a coaster floaty, twisty, drop-heavy, boosted or tunnel-y and report its drops, airtime and inversions without ranking the child or the ride;
- let words with more structure to notice create more adventurous track shapes such as camelbacks and loops, without treating those shapes as prizes for correctness;
- treat every track piece as evidence that a word was explored, not that it was correct;
- continue world-building beyond track pieces now that the construction loop is compelling: the first park layer has persistent scenery placement, while stations, paths, additional ride objects and eventually other kinds of worlds can grow from the same exploration → making → play model;
- allow school lists, child-chosen words and Buddy-suggested revisiting to coexist without implying that any list is a deficit record.

Success is a child wanting to explore words because doing so gives them interesting material to make and play with, without needing points, streaks or reward inflation.

### 3. Expand reviewed sound guidance from evidence, not plausibility

The first reviewed explanation whitelist is now in place and deliberately narrower than Buddy's internal grapheme–phoneme aligner. Continue the work without pretending Buddy has invented a universal phonics progression.

Priorities:

- compare the whitelist with current SSP programme progressions and preserve compatibility rather than imposing an order;
- add high-value alternative graphemes only when a reviewed source and real Buddy reading case justify them;
- keep common-exception and genuinely irregular words explicit;
- add morpheme-aware guidance where morphology is more useful than phoneme-by-phoneme explanation;
- continue reviewing wording for clarity and age-respectfulness.

See `docs/SOUND_GUIDANCE.md` for the evidence boundary and source notes.

### 4. Improve remaining capture geometry only from fixture evidence

Small-angle deskew is now in the recognition path. Do not pile on more OCR passes. Use the page fixtures to decide which image-quality improvements earn their complexity next:

- document/page boundary detection and conservative crop;
- perspective correction;
- page curvature tolerance where practical;
- glare/blur/capture-quality hints;
- better handling of punctuation and split/joined words.

Adaptive AUTO → SPARSE_TEXT → focused word retry is the intended recognition ladder. Additional recognition passes should only be added with fixture evidence.

### 5. Turn real lexical failures into the continuing evaluation loop

The broad benchmark remains useful, but actual reading remains the source of truth. Every poor explanation, bad sense choice, missed morphology pattern or unsafe pronunciation should become a small reproducible regression before it is fixed.

Continue expanding reviewed heteronyms only when real/common reading cases justify them rather than attempting to enumerate every possible English heteronym.

### 6. Companion agent boundary

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
- Points, streaks, scores, badges, reward economies or progress that depends on getting an answer "right". Playful visual making is fine when it reflects exploration rather than performance.
- A general unrestricted chatbot with access to the child's history.
- Model-generated canonical phonics or pronunciation guidance.
- Treating a technically possible grapheme–phoneme alignment as permission to teach it.
- Endless OCR fallback passes without evidence that they improve the child-facing interaction.
- Aggressive auto-crop or perspective warping without page-fixture evidence that it helps more than it harms.

Those may create apparent product breadth while making it harder to learn whether the core interaction actually helps a child read, understand and discover how they learn.
