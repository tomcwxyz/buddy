# Curriculum semantics checkpoint — 5 September 2026

This checkpoint records the first semantic improvements driven by the broad school-age word coverage benchmark.

## Why this tier exists

WordNet gives Buddy broad local recognition and definitions, but school reading repeatedly exposes two different problems: the common dictionary sense can be the wrong one for the sentence, and a technically correct definition can still be unnecessarily adult or abstract. These are not failures of recognition, so adding more remote dictionaries does not solve the underlying problem.

The reviewed curriculum tier therefore sits inside Buddy's local corpus and supplies short, school-age meanings while retaining ordinary competing senses for ambiguous words.

## Initial coverage

The first tier covers 18 maths, science and classroom words: `term`, `class`, `table`, `field`, `force`, `mass`, `matter`, `square`, `product`, `fraction`, `decimal`, `equation`, `perimeter`, `habitat`, `evaporation`, `gravity`, `climate` and `continent`.

`factor` already has reviewed local coverage from the earlier broad-coverage pass, so it is not duplicated here.

## Guardrails

- The tier uses the existing contextual lexical ranker rather than sentence-specific switches.
- Ambiguous entries include useful competing senses so a curriculum meaning is not forced into every sentence.
- Britfone remains the default British pronunciation evidence.
- A pronunciation hit alone still cannot make an OCR token a recognised word.
- WordNet remains available underneath the reviewed tier for broader senses and long-tail coverage.

## Next audit

Run the school-vocabulary group in `/lab/words`, then sample ordinary non-school uses of the ambiguous entries. Promote any new failure only when it represents a reusable semantic, ranking, morphology or pronunciation pattern.
