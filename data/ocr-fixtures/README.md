# Buddy real-page OCR fixtures

This folder stores the reviewed **evidence** for Buddy's real-page OCR behaviour. It deliberately does **not** store photographed page images.

The image stays on the tester's device. The checked-in fixture contains expected text, Buddy's trusted boxes, OCR recovery/deskew metadata and the review judgement needed to decide whether the child-facing interaction was still useful.

## Create a candidate

1. Open `/lab/ocr` in Buddy.
2. Choose a real photographed page that represents something a child would actually ask Buddy to read.
3. Enter the visible expected text.
4. Record the page type, words that may safely remain unboxed but must recover on tap, words that must never become trusted boxes, and whether the interaction remained recoverable.
5. Run Buddy OCR and inspect the overlay, precision/recall, missing words, unexpected words, recovery pass and deskew result.
6. Export the candidate JSON.

Candidate exports have `review.status: "candidate"` and no acceptance thresholds. Keep the source photograph in the private/local test pack with the same fixture label; do not add it to this repository.

## Promote a fixture to reviewed

Before checking a candidate into this folder:

- change `review.status` to `"reviewed"`;
- add an ISO timestamp to `review.reviewedAt`;
- decide `review.interactionRecoverable` as `"yes"` or `"no"`;
- set `acceptance.minimumPrecision` and `acceptance.minimumRecall` to the lowest acceptable values for that page;
- set `acceptance.requireRecoverableInteraction` explicitly.

Precision should normally be treated as the harder boundary: a missed word can often recover through Buddy's focused tap retry, while a false trusted box can actively mislead the child. Do not force a single global recall target across very different page layouts.

Run:

```bash
npm run test:ocr
```

The fixture contract check validates reviewed metadata, acceptance thresholds and the must-not-trust boundary. It does not re-run Tesseract because the page images are intentionally not in the repository; re-running the same private image through `/lab/ocr` remains the visual regression step when OCR behaviour changes materially.

## Starter set

Build the first small set from real use rather than synthetic benchmark pages. Aim for roughly eight reviewed captures to start:

- 2 prose/book pages;
- 2 worksheets;
- 2 large-print early-reader pages;
- 2 mixed illustration/text pages.

Include ordinary captures as well as at least a few awkward but realistic cases such as slight rotation, mild glare, curved pages or unusual spacing. The goal is not perfect OCR. The goal is high trust in tappable boxes and a natural recovery route for misses.

## Fixture format

Current format is version `2`.

Important fields:

- `expectedText` / `expectedWords` — what is visibly present;
- `review.layoutType` — `prose`, `worksheet`, `early-reader` or `mixed`;
- `review.recoverOnTapWords` — misses that are acceptable only if focused retry can recover them;
- `review.mustNotTrustWords` — false positives that must never be tappable;
- `review.interactionRecoverable` — whether the child can still get useful help;
- `acceptance` — the reviewed per-page quality floor;
- `evaluation` — precision/recall for the captured run;
- `recovery` — AUTO/SPARSE_TEXT and deskew metadata;
- `detectedWords` — trusted boxes only.
