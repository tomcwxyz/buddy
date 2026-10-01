import { NextResponse } from "next/server";
import {
  gapModelEnabled,
  suggestGapCandidates,
  type GapCandidateRequest,
} from "@/lib/ai/gap-candidates";

function validTokenArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= 12
    && value.every((item) => typeof item === "string" && item.length <= 40);
}

export async function POST(request: Request) {
  let body: Partial<GapCandidateRequest>;

  try {
    body = await request.json() as Partial<GapCandidateRequest>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    !validTokenArray(body.before)
    || !validTokenArray(body.after)
    || typeof body.estimatedCharacters !== "number"
    || !Number.isFinite(body.estimatedCharacters)
    || body.estimatedCharacters < 1
    || body.estimatedCharacters > 14
  ) {
    return NextResponse.json({ error: "invalid_gap_context" }, { status: 400 });
  }

  if (!gapModelEnabled()) {
    return NextResponse.json({
      enabled: false,
      candidates: [],
    });
  }

  try {
    const candidates = await suggestGapCandidates({
      before: body.before,
      after: body.after,
      estimatedCharacters: body.estimatedCharacters,
    });

    return NextResponse.json({
      enabled: true,
      candidates,
    });
  } catch {
    return NextResponse.json({
      enabled: true,
      candidates: [],
    });
  }
}
