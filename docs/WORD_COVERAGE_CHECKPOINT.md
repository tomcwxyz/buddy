# Broad lexical coverage — first audit checkpoint

The first representative run of the broader school-age coverage matrix exposed three useful classes of failure before the benchmark itself was merged:

1. **Correct but adult wording** — for example the mathematical `mean` sense and `receipt` were semantically correct but phrased for adults rather than a child asking for the smallest useful explanation.
2. **Wrong common sense** — `kind` in “It was kind of Sam…” resolved to the noun meaning “type”, and mathematical `factor` resolved to a general causal factor.
3. **Systematic local gaps** — `although` needed remote dictionary evidence despite having local British pronunciation, while irregular `children → child` still fell through to network lexical providers.

The first response to that evidence is intentionally small and reusable:

- reviewed child-readable senses for `right`, `mean`, `kind` and mathematical/general `factor`;
- reviewed local meanings for high-value connectors `although`, `however`, `therefore`, `unless`, `between`, `during`, `without` and `towards`;
- deterministic common irregular noun-plural morphology (`children`, `feet`, `geese`, `men`, `mice`, `people`, `teeth`, `women`) so the existing local lemma validator can do the semantic work before network fallback.

This checkpoint is not a claim that the 55-case coverage matrix is now complete. The benchmark is meant to remain broader than the reviewed corpus and keep surfacing the next reusable gaps. Future promotions should continue to favour grammatical rules, ranking improvements and small reviewed evidence sets over sentence-specific patches.
