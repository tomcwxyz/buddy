# Reading evidence and book memory

Buddy should not treat OCR output as authoritative text. The reading system should resolve text from a set of inspectable evidence sources and keep the provenance of that resolution.

## Principle

A model may help Buddy choose between plausible readings. It must not quietly turn weak visual evidence into invented prose.

The reading pipeline should preserve the distinction between:

- what Buddy can see;
- what independent visual passes agree on;
- what language makes plausible;
- what a known source says;
- what a reader has explicitly corrected.

That distinction remains available to quality gates, the internal OCR lab and future user-facing explanations.

## Evidence sources

### visual

One OCR observation from the page. This is the baseline evidence and remains uncertain when confidence or geometry is weak.

### visual-consensus

Two or more sufficiently independent visual/OCR passes agree on the same normalised token in the same region. Agreement should raise confidence; it should not be synthesised when the passes merely share the same preprocessing and error.

### language-assisted

A deterministic language prior, compact correction model, SLM or LLM ranks a constrained candidate set derived from visual evidence.

The model is not given permission to freely transcribe the passage. A language-assisted token must retain the candidate set it was selected from and should remain weaker than a strong known-text or reader-corrected match when the visual evidence is poor.

### known-text

A photographed passage aligns strongly with canonical text Buddy is legitimately allowed to use: for example public-domain, openly licensed, school-provided, publisher-licensed or user-provided material.

Known-text recovery is sequence alignment, not text generation. Buddy should store source/licence metadata with centrally bundled canonical material.

### reader-corrected

A person explicitly corrects the reading. This is strong evidence for the current reading context and can feed local book memory when the device-memory preference is enabled.

## Resolver shape

The first resolver is deterministic. Each candidate carries:

- text;
- source;
- confidence;
- optional visual box/region;
- pass or source identifier;
- optional canonical-source identifier;
- optional correction identifier.

The resolver combines independent support and records why the winning candidate won. A later small language model can contribute a bounded candidate-ranking signal without changing this contract.

## Book memory

Book memory is not a stored photograph of a book.

The first local representation contains only small derived records such as:

- a local book/session identifier and optional user label;
- compact passage fingerprints;
- repeatedly observed vocabulary;
- reader-confirmed corrections;
- counts/recency needed to avoid treating one accidental correction as universal truth.

This allows Buddy to learn that an unusual name such as a character or place occurs repeatedly in this book.

Book matching should be conservative. A fingerprint match identifies a likely local reading context; it does not prove a canonical edition.

## Known-text matching

Canonical matching should work as a retrieval and alignment problem:

1. normalise visually reliable tokens;
2. create a sparse fingerprint from distinctive token sequences;
3. retrieve candidate passages;
4. sequence-align OCR tokens to candidate text;
5. require a strong match across multiple anchors;
6. use the aligned canonical token only when the match clears an explicit evidence threshold;
7. retain the visual geometry from neighbouring OCR words so Buddy's reading cursor still follows the photographed page.

The full canonical corpus must not be built from unlicensed modern books.

## Privacy levels

The product should eventually expose three explicit choices rather than one vague AI-training toggle.

### Private / session only

Page images and reading evidence are ephemeral. Nothing from the reading is retained as book memory after the session beyond the existing deliberately stored learning events.

### Help my Buddy learn on this device

Derived book-memory records and confirmed corrections can remain locally on the device. Page photographs are not retained by this setting.

### Help improve Buddy

A separate explicit contribution choice. This does not automatically mean uploading whole pages or reading history.

The preferred contribution unit is a minimised training example such as:

- a tightly cropped or transformed difficult region where permitted;
- OCR candidate strings/confidences;
- the explicit correction;
- coarse capture conditions;
- no account/profile history unless separately required and consented to.

Contribution, child/guardian consent, retention and deletion need a dedicated design before any upload path ships.

## Model boundary

Start with deterministic evidence combination and local memory.

When a model is introduced:

- use the smallest model that improves measured fixture performance;
- prefer local/on-device execution where practical;
- give it constrained alternatives rather than an open transcription prompt;
- do not send page images by default;
- log the model's contribution as language-assisted evidence;
- ensure disabling the model leaves the deterministic reading path intact.

## Evaluation

Real photographed pages remain the source of truth. Fixtures should eventually record not only expected text, precision and recall, but also expected evidence provenance.

Useful measures include:

- trusted word precision;
- recall before and after evidence resolution;
- false known-text matches;
- false book-memory corrections;
- percentage of language-assisted words later contradicted by a person;
- reduction in blocked sentences;
- time/interaction needed to recover from a bad reading.

A better Buddy is not the one that fills every gap. It is the one that knows when it has enough evidence to help and when it needs another look.
