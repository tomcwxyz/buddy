# Buddy sound guidance

Buddy can know how a word is pronounced without being entitled to turn that spelling into a phonics rule.

That distinction is now explicit in the code.

## The boundary

The pronunciation layer resolves a word first, using reviewed/local lexical evidence such as Britfone. The grapheme–phoneme aligner can then ask whether the spelling can account for that already-known pronunciation.

A successful technical alignment is **not** enough for a child-facing clue. The alignment is passed through a separate reviewed correspondence set and receives one of three outcomes:

- **safe-to-explain** — every correspondence used by the alignment is in Buddy's reviewed explanation set;
- **do-not-infer** — Buddy can align the word, but one or more correspondences have not yet been reviewed for child-facing teaching;
- **irregular** — Buddy cannot account for the pronunciation with its current simple alignment rules.

When there is no trusted pronunciation, Buddy does not offer speculative spelling-only sound clues.

## What the first reviewed set is based on

The initial whitelist is seeded conservatively from the simple grapheme–phoneme correspondences and worked examples in the Department for Education's public **Letters and Sounds** Phase Two and Phase Three material.

It includes a first set of straightforward correspondences such as:

- simple consonants and short vowels used in early blending;
- `ch`, `sh`, both `th` sounds and `ng`;
- `ai`, `ee`, `igh`, `oa`;
- both common `oo` sounds;
- `ar`, `or`, `ur`, `ow`, `oi`;
- a small number of doubled spellings where the two letters represent one sound.

This is an explanation whitelist, **not a Buddy phonics curriculum or teaching sequence**.

Current DfE systematic synthetic phonics guidance requires a programme to teach GPCs in a clearly defined incremental sequence and stresses that resources should match the progression of the SSP programme being used. Buddy therefore should not present its own generic ordering as if it superseded a child's school programme.

References:

- DfE, *Validation of systematic synthetic phonics programmes: supporting documentation*: https://www.gov.uk/government/publications/phonics-teaching-materials-core-criteria-and-self-assessment/validation-of-systematic-synthetic-phonics-programmes-supporting-documentation
- DfE, *Choosing a phonics teaching programme*: https://www.gov.uk/government/publications/choosing-a-phonics-teaching-programme/list-of-phonics-teaching-programmes
- DfE, *Letters and Sounds: Principles and Practice of High Quality Phonics*: https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/190599/Letters_and_Sounds_-_DFES-00281-2007.pdf

## Deliberately not reviewed yet

English has many useful but highly variable alternative spellings. The first whitelist deliberately does **not** teach correspondences such as `ea`, `ough`, `ou`, `ay` or `oy` merely because the internal aligner can make them fit a particular pronunciation.

For example:

- `rain` can safely surface `ai` → the long ‘a’ sound;
- `look` and `boot` can safely distinguish the two reviewed `oo` sounds;
- `lead` can have its pronunciation resolved correctly while still returning **do-not-infer** for its `ea` spelling;
- `though` can be pronounced correctly while `ough` remains **do-not-infer**;
- `tear` currently remains **irregular** in the simple alignment layer rather than forcing a neat explanation.

That is intentional. New correspondences should enter the teaching whitelist through reviewed fixtures, not by broadening the map until examples happen to pass.

## Evaluation

Run:

```bash
npm run test:sounds
```

The regression set includes positive, withheld and irregular examples. Sound checks also run during the production build.

The internal `/lab/words` surface includes a **Reviewed sound boundary** panel that calls the real `/api/word` route and displays the returned review state, alignment, pronunciation and child-facing guidance.

## Next

The next sound work should:

1. compare the first whitelist with one or more current SSP progressions rather than assuming all programmes order correspondences identically;
2. review high-value alternative graphemes from real Buddy reading failures;
3. add morpheme-aware guidance where morphology is more useful than a forced phoneme-by-phoneme explanation;
4. keep common-exception and genuinely irregular words explicit rather than hiding them behind increasingly permissive rules.
