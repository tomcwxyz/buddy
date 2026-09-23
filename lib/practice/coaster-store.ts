import type { CoasterLaunchPower, CoasterPieceKind } from "@/lib/practice/coaster";

export type CoasterPiece = {
  id: string;
  word: string;
  kind: CoasterPieceKind;
  earnedAt: string;
};

export type CoasterState = {
  version: 1;
  practiceSetId: string;
  rideName: string;
  pieces: CoasterPiece[];
  placedIds: string[];
  rides: number;
  launchPower: CoasterLaunchPower;
};

const STORAGE_KEY = "buddy.coasters.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function newState(practiceSetId: string): CoasterState {
  return {
    version: 1,
    practiceSetId,
    rideName: "The Word Whizz",
    pieces: [],
    placedIds: [],
    rides: 0,
    launchPower: 2,
  };
}

function normaliseState(practiceSetId: string, value?: Partial<CoasterState> | null): CoasterState {
  const base = newState(practiceSetId);
  if (!value) return base;

  return {
    ...base,
    ...value,
    practiceSetId,
    pieces: Array.isArray(value.pieces) ? value.pieces : [],
    placedIds: Array.isArray(value.placedIds) ? value.placedIds : [],
    launchPower: value.launchPower === 1 || value.launchPower === 3 ? value.launchPower : 2,
  };
}

function readAll(): Record<string, CoasterState> {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, CoasterState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(states: Record<string, CoasterState>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

export function readCoasterState(practiceSetId: string) {
  return normaliseState(practiceSetId, readAll()[practiceSetId]);
}

export function writeCoasterState(state: CoasterState) {
  const states = readAll();
  states[state.practiceSetId] = state;
  writeAll(states);
  return state;
}

export function earnCoasterPiece(input: {
  practiceSetId: string;
  word: string;
  kind: CoasterPieceKind;
}) {
  const state = readCoasterState(input.practiceSetId);
  const existing = state.pieces.find((piece) => piece.word === input.word);
  if (existing) return { state, piece: existing, isNew: false };

  const piece: CoasterPiece = {
    id: globalThis.crypto?.randomUUID?.() ?? `piece-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    word: input.word,
    kind: input.kind,
    earnedAt: new Date().toISOString(),
  };

  const next = {
    ...state,
    pieces: [...state.pieces, piece],
  };
  writeCoasterState(next);
  return { state: next, piece, isNew: true };
}

export function setCoasterPieceKind(
  practiceSetId: string,
  pieceId: string,
  kind: CoasterPieceKind,
) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({
    ...state,
    pieces: state.pieces.map((piece) => piece.id === pieceId ? { ...piece, kind } : piece),
  });
}

export function setCoasterLaunchPower(
  practiceSetId: string,
  launchPower: CoasterLaunchPower,
) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({ ...state, launchPower });
}

export function placeCoasterPiece(practiceSetId: string, pieceId: string) {
  const state = readCoasterState(practiceSetId);
  if (!state.pieces.some((piece) => piece.id === pieceId)) return state;
  if (state.placedIds.includes(pieceId)) return state;

  return writeCoasterState({
    ...state,
    placedIds: [...state.placedIds, pieceId],
  });
}

export function unplaceCoasterPiece(practiceSetId: string, pieceId: string) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({
    ...state,
    placedIds: state.placedIds.filter((id) => id !== pieceId),
  });
}

export function moveCoasterPiece(
  practiceSetId: string,
  pieceId: string,
  direction: -1 | 1,
) {
  const state = readCoasterState(practiceSetId);
  const currentIndex = state.placedIds.indexOf(pieceId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.placedIds.length) return state;

  const placedIds = [...state.placedIds];
  [placedIds[currentIndex], placedIds[nextIndex]] = [placedIds[nextIndex], placedIds[currentIndex]];

  return writeCoasterState({ ...state, placedIds });
}

export function renameCoaster(practiceSetId: string, rideName: string) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({
    ...state,
    rideName: rideName.trim().slice(0, 40) || "The Word Whizz",
  });
}

export function recordCoasterRide(practiceSetId: string) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({ ...state, rides: state.rides + 1 });
}
