# Buddy reading benchmark

This benchmark is the measurable layer around Buddy's real-page reading work. It is deliberately separate from a generic OCR score: the thing we care about is whether Buddy can recognise enough trustworthy text, notice when a word is missing, recover it safely, and avoid inventing prose.

Run:

```bash
npm run benchmark:reading
```

To make a local/CI run fail until at least one real photographed-page fixture has been added:

```bash
npm run benchmark:reading -- --require-real
```

## What it measures

Each `*.reading-fixture.json` snapshot records the OCR words and geometry from one run plus the reviewed truth for that page. The runner reports:

- OCR trusted-word precision and recall;
- missing-word gap precision and recall;
- accepted recovery accuracy;
- rejected and unresolved recovery counts;
- coverage split between real-page and synthetic fixtures.

The default checked-in synthetic fixtures are regression checks for two failure modes Buddy has already encountered: an internal missing token and a word dropped at a prose line ending. They are not substitutes for real-page evidence.

## Add a real page

1. Use `/lab/ocr` with a difficult photograph.
2. Keep the photograph private/local; do not commit copyrighted page imagery.
3. Record the expected visible text and export/copy the trusted OCR words with their geometry.
4. Add a new fixture with `"origin": "real-page"`.
5. Review every expected gap and any language-assisted recovery.
6. Set acceptance floors based on the child-facing usefulness of that page, not on a global perfection target.
7. Run `npm run benchmark:reading`.

A useful starter pack is 3–5 pages including:

- dim or uneven lighting;
- a curved book page/gutter;
- a dropped line-end word;
- mixed illustration and text;
- one relatively clean control page.

## Fixture format

```json
{
  "version": 1,
  "id": "curved-book-01",
  "label": "Curved book page in dim light",
  "origin": "real-page",
  "layoutType": "prose",
  "pageWidth": 1170,
  "expectedText": "Visible text on the photographed page...",
  "words": [],
  "expectedGaps": [
    {
      "leftWordId": "word-12",
      "rightWordId": "word-13",
      "expectedWord": "missing",
      "disposition": "recover"
    }
  ],
  "recoveryReviews": [
    {
      "leftWordId": "word-12",
      "rightWordId": "word-13",
      "expectedWord": "missing",
      "candidate": "missing",
      "outcome": "accepted",
      "source": "visual-consensus"
    }
  ],
  "acceptance": {
    "minimumOcrPrecision": 0.98,
    "minimumOcrRecall": 0.8,
    "minimumGapPrecision": 0.9,
    "minimumGapRecall": 0.8,
    "minimumRecoveryAccuracy": 0.95
  }
}
```

Use `disposition: "ignore"` for a reviewed visual space that must not become a missing-word recovery target. Recovery outcomes are `accepted`, `rejected` or `unresolved`.

## Principle

Do not optimise the benchmark by making Buddy fill every gap. A missed word that triggers another look is safer than a fluent but invented sentence. The benchmark should reward evidence-backed recovery and preserve uncertainty.
