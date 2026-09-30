export type ReadingEvidenceSource =
  | "visual"
  | "visual-consensus"
  | "language-assisted"
  | "known-text"
  | "reader-corrected";

export type ReadingEvidence = {
  source: ReadingEvidenceSource;
  candidate: string;
  confidence: number;
  evidenceId?: string;
  method?: string;
  independent?: boolean;
  sourceId?: string;
};

export type ResolvedReadingEvidence = {
  text: string;
  confidence: number;
  resolvedBy: ReadingEvidenceSource;
  evidence: ReadingEvidence[];
  alternatives: Array<{
    text: string;
    confidence: number;
    sources: ReadingEvidenceSource[];
  }>;
};

const SOURCE_WEIGHT: Record<ReadingEvidenceSource, number> = {
  visual: 0.72,
  "visual-consensus": 0.9,
  "language-assisted": 0.58,
  "known-text": 0.97,
  "reader-corrected": 1,
};

const SOURCE_PRECEDENCE: Record<ReadingEvidenceSource, number> = {
  visual: 1,
  "language-assisted": 2,
  "visual-consensus": 3,
  "known-text": 4,
  "reader-corrected": 5,
};

export function normaliseEvidenceText(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function strongestSource(evidence: ReadingEvidence[]) {
  return [...evidence]
    .sort((a, b) => SOURCE_PRECEDENCE[b.source] - SOURCE_PRECEDENCE[a.source])[0]?.source
    ?? "visual";
}

function candidateScore(evidence: ReadingEvidence[]) {
  let remainingUncertainty = 1;
  const independentKeys = new Set<string>();
  const sources = new Set<ReadingEvidenceSource>();

  for (const item of evidence) {
    const confidence = clamp01(item.confidence);
    const support = confidence * SOURCE_WEIGHT[item.source];
    const independenceKey = item.evidenceId
      ?? item.sourceId
      ?? `${item.source}:${item.method ?? "default"}`;

    if (!independentKeys.has(independenceKey) || item.independent) {
      remainingUncertainty *= 1 - support;
      independentKeys.add(independenceKey);
    } else {
      // Correlated evidence can strengthen a reading a little, but should not
      // count like a fully independent observation.
      remainingUncertainty *= 1 - support * 0.18;
    }
    sources.add(item.source);
  }

  const diversityBonus = Math.min(0.08, Math.max(0, sources.size - 1) * 0.025);
  return clamp01(1 - remainingUncertainty + diversityBonus);
}

function languageCandidateIsGrounded(group: ReadingEvidence[]) {
  if (!group.some((item) => item.source === "language-assisted")) return true;
  return group.some((item) =>
    item.source === "visual"
    || item.source === "visual-consensus"
    || item.source === "known-text"
    || item.source === "reader-corrected",
  );
}

/**
 * Resolve a constrained candidate set while preserving why the winner won.
 *
 * Language-assisted evidence cannot introduce a candidate on its own: it can
 * only strengthen a spelling that already has visual, known-text or human
 * support.
 */
export function resolveReadingEvidence(input: ReadingEvidence[]): ResolvedReadingEvidence | null {
  const groups = new Map<string, ReadingEvidence[]>();

  for (const item of input) {
    const normalised = normaliseEvidenceText(item.candidate);
    if (!normalised) continue;
    groups.set(normalised, [...(groups.get(normalised) ?? []), { ...item, confidence: clamp01(item.confidence) }]);
  }

  const candidates = [...groups.entries()]
    .map(([text, evidence]) => ({
      text,
      evidence,
      confidence: languageCandidateIsGrounded(evidence) ? candidateScore(evidence) : 0,
      resolvedBy: strongestSource(evidence),
    }))
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) =>
      b.confidence - a.confidence
      || SOURCE_PRECEDENCE[b.resolvedBy] - SOURCE_PRECEDENCE[a.resolvedBy],
    );

  const winner = candidates[0];
  if (!winner) return null;

  return {
    text: winner.text,
    confidence: winner.confidence,
    resolvedBy: winner.resolvedBy,
    evidence: winner.evidence,
    alternatives: candidates.slice(1, 4).map((candidate) => ({
      text: candidate.text,
      confidence: candidate.confidence,
      sources: [...new Set(candidate.evidence.map((item) => item.source))],
    })),
  };
}

export function visualEvidence(candidate: string, confidencePercent: number, method = "ocr-primary"): ReadingEvidence {
  return {
    source: "visual",
    candidate,
    confidence: clamp01(confidencePercent / 100),
    method,
    evidenceId: method,
  };
}

export function consensusEvidence(candidate: string, confidencePercent: number, method: string): ReadingEvidence {
  return {
    source: "visual-consensus",
    candidate,
    confidence: clamp01(confidencePercent / 100),
    method,
    evidenceId: method,
    independent: true,
  };
}
