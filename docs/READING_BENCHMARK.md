# Buddy reading benchmark

The reading benchmark turns difficult real photographed pages into a small, repeatable evidence set for Buddy's core reading loop.

It is intentionally not a leaderboard for OCR. The benchmark asks a more useful question:

> Can Buddy help a child continue reading a difficult real page without confidently inventing text?

## What it measures

For each reviewed real-page fixture, the benchmark can track:

- trusted OCR precision and recall;
- missing-word gap precision, recall and F1;
- whether language-assisted candidates were accepted or rejected by the reader;
- whether any automatically accepted word was later contradicted;
- blocked/check sentence counts before and after recovery;
- the number of interactions needed to get back to useful reading;
- whether the overall child-facing interaction remained recoverable.

The score weights **trusted precision** and **automatic-recovery safety** more heavily than recall. A missed word is inconvenient; a confidently wrong word can actively mislead the reader.

## Benchmark score

When all component data is available, the score is a weighted 0–100 summary:

- trusted precision: 35%;
- trusted recall: 15%;
- missing-gap F1: 20%;
- automatic recovery safety: 15%;
- reduction in blocked sentences: 5%;
- recoverable child interaction: 10%.

The score is a trend indicator, not a product acceptance gate. Per-page reviewed thresholds remain authoritative.

Any automatically accepted recovered word that is later marked as contradicted is treated as a **safety regression** and fails the benchmark command regardless of the numeric score.

## Real-page workflow

1. Photograph a page that represents real use.
2. Run it through `/lab/ocr`.
3. Enter the text actually visible on the page and export the candidate fixture.
4. Exercise the same page through `/read`, including gap recovery.
5. Review what Buddy detected, what it missed, what it suggested, what the reader confirmed/rejected and how many recovery interactions were needed.
6. Promote the fixture to `review.status: "reviewed"`.
7. Add the `benchmark` block below.
8. Keep the source photograph in the private/local test pack with the same fixture label. Do not commit copyrighted page photographs.
9. Run `npm run test:benchmark`.

## Fixture benchmark block

Add this to a reviewed `.ocr-fixture.json` file:

```json
{
  "benchmark": {
    "version": 1,
    "gaps": {
      "expectedMissingWords": ["example"],
      "correctlyDetectedWords": ["example"],
      "missedGapWords": [],
      "falseGapCount": 0
    },
    "recovery": {
      "visuallyRecoveredWords": [],
      "languageSuggestedWords": ["example"],
      "readerConfirmedWords": ["example"],
      "readerRejectedWords": [],
      "unresolvedWords": [],
      "automaticallyAcceptedWords": [],
      "contradictedAutomaticWords": []
    },
    "sentences": {
      "blockedBefore": 1,
      "blockedAfter": 0,
      "checkBefore": 1,
      "checkAfter": 0,
      "interactionSteps": 1
    }
  }
}
```

### Field meanings

`expectedMissingWords` contains words visibly present on the page that the main OCR pass omitted and that create a recoverable gap. `correctlyDetectedWords` is the subset for which Buddy identified the missing region. `missedGapWords` is the subset Buddy failed to identify. `falseGapCount` counts gap markers where no word is actually missing.

`visuallyRecoveredWords` records focused OCR successes. `languageSuggestedWords` records bounded model/SLM candidates actually shown. Reader confirmation/rejection records the human judgement. `automaticallyAcceptedWords` should remain conservative; if any such word is later found wrong, add it to `contradictedAutomaticWords`.

Sentence counts are taken before and after the recovery interaction. `interactionSteps` counts deliberate reader actions needed to return the passage to useful reading (for example tapping a gap, confirming a word, or retaking a page).

## Starter corpus

Start with 6–8 real captures, not synthetic OCR samples:

- two ordinary prose/book pages;
- one dim page;
- one curved/gutter-heavy page;
- one early-reader/large-print page;
- one mixed text/illustration page;
- one worksheet or list;
- one deliberately awkward but still realistic capture.

The first baseline may be poor. That is useful: freeze it, then improve one failure class at a time.

## Comparing models

The same fixture set should be used when comparing remote language recovery with a local masked-language model or SLM. Do not compare models on different pages.

Useful comparison fields are candidate accuracy, rejected suggestions, contradicted automatic recoveries, latency and whether the model materially reduces reader interactions.

The target is not "fill every blank". It is **recover when there is enough evidence, otherwise remain uncertain**.
