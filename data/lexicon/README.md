# Buddy lexical corpus

This directory contains Buddy's **versioned local lexical evidence**. It exists so the reading loop can resolve common and deliberately tested words without depending on a network request, while still retaining broader online fallbacks for long-tail vocabulary.

## Current corpus

`core.en-GB.v1.json` is the first small production slice. It contains:

- Buddy-authored, child-friendly senses and examples for the lexical regression set;
- explicit lemma links for important inflected forms such as `sold → sell`, `went → go`, `made → make`, `running → run`, and `stories → story`;
- British-English IPA evidence for covered words;
- multiple pronunciations where grammar changes pronunciation, for example noun/verb `record`.

The pronunciation values in this file are drawn from **Britfone 3.0.1**, a British English pronunciation dictionary released under the MIT licence. See `THIRD_PARTY_NOTICES.md`.

The corpus is deliberately data, not application logic. A future larger corpus can replace or extend these entries without changing the reading UI.

## Runtime order

For each selected word Buddy now uses:

1. the local `en-GB` corpus;
2. a local lemma link when the printed form is inflected;
3. remote DictionaryAPI.dev / Wiktionary / Datamuse only when the local entry is incomplete or absent;
4. the optional constrained model simplifier only when explicitly requested and enabled.

A local entry with both a meaning route and British pronunciation therefore needs **no network lexical request**.

## Growing the pronunciation layer

`scripts/lexicon/import-britfone.mjs` converts the pinned Britfone 3.0.1 CSV into a compact JSON pronunciation index.

```bash
npm run lexicon:britfone
```

By default the script downloads the pinned upstream file. For reproducible/offline corpus work, download or vendor the source separately and pass it explicitly:

```bash
node scripts/lexicon/import-britfone.mjs --input ./britfone.main.3.0.1.csv
```

The generated file is written under `data/lexicon/generated/`. It is **not yet loaded by the application automatically**. The next corpus slice should promote a reviewed generated index into runtime data, ideally sharded by initial letters so the web/server bundle does not pay for a large monolithic dictionary.

## Versioning rules

- Never silently replace pronunciation or lexical evidence in an existing corpus version.
- Changes to reviewed senses or pronunciation evidence create a new corpus version.
- Keep source name, upstream version and licence with imported data.
- Regression cases should be added when a real reading interaction exposes a poor meaning, lemma or pronunciation.
- Local data may override broad providers when it has been deliberately reviewed.
- Unknown OCR strings must remain unknown; expanding the corpus must not weaken the exact-match guardrail.
