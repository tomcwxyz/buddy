# Broad word coverage benchmark

Buddy's lexical regressions protect known failures, but they do not tell us how the system behaves across ordinary school-age reading. The `/lab/words` coverage benchmark adds a deliberately broader matrix for discovering the next weak areas.

## What it covers

The benchmark currently spans five evidence groups:

- **everyday polysemes** — common words such as `right`, `mean`, `kind`, `point`, `change` and `present`, where sentence context must select the useful sense;
- **school vocabulary** — common maths, science and classroom terms such as `factor`, `fraction`, `equation`, `perimeter`, `habitat`, `evaporation`, `gravity` and `climate`;
- **function words** — connectors such as `although`, `however`, `therefore`, `unless`, `during`, `without` and `towards`, which are a known gap in content-word dictionaries such as WordNet;
- **morphology** — common plurals and verb forms such as `boxes`, `studies`, `carried`, `stopped`, `making`, `writing`, `tries` and irregular `children`;
- **pronunciation** — words where spelling is misleading and British pronunciation evidence should be available, including `queue`, `island`, `business`, `Wednesday`, `muscle`, `debt`, `receipt` and `rhythm`.

The source cases live in `lib/literacy/coverage-cases.ts`. They are intentionally separate from the smaller regression suite: a coverage failure is a discovery signal, not proof that the resolver should gain a one-off special case.

## Reviewed curriculum semantic tier

The first broad runs showed a repeated pattern: WordNet often recognises a school word and supplies a technically valid definition, but its primary sense or wording is not the meaning a pupil is most likely to need in classroom reading. Examples included `term`, `class`, `field`, `product`, `force`, `mass`, `matter` and `decimal`.

`lib/literacy/curriculum-corpus.ts` is a small reviewed semantic tier for this class of failure. It currently covers the school-vocabulary benchmark across maths, science and general classroom language. The tier follows two rules:

- definitions should be short enough to help a child continue reading without replacing the surrounding teaching;
- ambiguous words keep ordinary competing meanings alongside the curriculum sense, so sentence context still decides. For example, `product` retains both the multiplication result and an item that is made or sold, while `matter` retains both physical material and the verb meaning “to be important”.

These entries are merged into the local lexical corpus before WordNet. Britfone remains the pronunciation source unless a reviewed pronunciation is required, and the existing OCR recognition rule is unchanged: pronunciation evidence by itself never proves that an OCR token is a real word.

## How to read the results

The benchmark tracks:

- semantic/assertion pass rate;
- recognised-word coverage;
- how many cases are fully local with no network lexical fallback;
- British pronunciation availability;
- how often reviewed Buddy meaning evidence is used;
- morphology/lemma resolution.

Each category can be run independently. `Run all` uses a small concurrency limit so the benchmark stays useful without turning the lab into a burst of external fallback requests.

## Promotion rule

When a case fails, prefer the smallest reusable fix in this order:

1. improve grammar or morphology evidence if the failure applies to a class of words;
2. improve general candidate ranking if the correct sense already exists;
3. add a reviewed child-friendly sense when a broad dictionary is technically correct but unsuitable for ordinary child reading;
4. add reviewed pronunciation only when a broad pronunciation source is genuinely ambiguous or wrong for the required British-English use;
5. keep network providers for long-tail evidence rather than using them to hide systematic local gaps.

Any failure promoted into production behaviour should also become a permanent regression case. Unknown OCR-like tokens remain outside this process: broader coverage must never weaken the exact lexical evidence required for recognition.
