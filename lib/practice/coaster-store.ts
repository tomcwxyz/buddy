import type { CoasterLaunchPower, CoasterPieceKind } from "@/lib/practice/coaster";
import { normaliseCartStyle, type CoasterCartStyle } from "@/lib/practice/coaster-cart";
import {
  clampSceneryPosition,
  type CoasterSceneryKind,
} from "@/lib/practice/coaster-scenery";
import { PLAY_WORLD_ID } from "@/lib/practice/play-world";

export type CoasterPiece = {
  id: string;
  word: string;
  kind: CoasterPieceKind;
  earnedAt: string;
};

export type CoasterSceneryPlacement = {
  id: string;
  kind: CoasterSceneryKind;
  x: number;
  y: number;
  placedAt: string;
};

export type CoasterState = {
  version: 1;
  /**
   * Legacy storage field name. This now identifies the Play world as well as
   * older set-specific coaster records.
   */
  practiceSetId: string;
  rideName: string;
  pieces: CoasterPiece[];
  placedIds: string[];
  rides: number;
  launchPower: CoasterLaunchPower;
  cartStyle: CoasterCartStyle;
  scenery: CoasterSceneryPlacement[];
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
    cartStyle: "classic",
    scenery: [],
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
    cartStyle: normaliseCartStyle(value.cartStyle),
    scenery: Array.isArray(value.scenery)
      ? value.scenery
          .filter((item): item is CoasterSceneryPlacement => Boolean(item?.id && item?.kind))
          .map((item) => ({
            ...item,
            ...clampSceneryPosition(Number(item.x) || 0.5, Number(item.y) || 0.72),
          }))
      : [],
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

function migrateLegacyCoastersIntoPlayWorld(states: Record<string, CoasterState>) {
  const legacy = Object.entries(states)
    .filter(([id]) => id !== PLAY_WORLD_ID)
    .map(([id, state]) => normaliseState(id, state));

  if (legacy.length === 0) return newState(PLAY_WORLD_ID);

  const anchor = legacy.reduce((best, state) => (
    state.pieces.length > best.pieces.length ? state : best
  ));

  const pieces: CoasterPiece[] = [];
  const pieceByWord = new Map<string, CoasterPiece>();
  const legacyPieceIdToWorldId = new Map<string, string>();

  for (const state of legacy) {
    for (const piece of state.pieces) {
      const key = piece.word.trim().toLocaleLowerCase("en-GB");
      let worldPiece = pieceByWord.get(key);
      if (!worldPiece) {
        worldPiece = { ...piece };
        pieceByWord.set(key, worldPiece);
        pieces.push(worldPiece);
      }
      legacyPieceIdToWorldId.set(piece.id, worldPiece.id);
    }
  }

  const placedIds: string[] = [];
  const placed = new Set<string>();
  for (const state of legacy) {
    for (const legacyId of state.placedIds) {
      const worldId = legacyPieceIdToWorldId.get(legacyId);
      if (!worldId || placed.has(worldId)) continue;
      placed.add(worldId);
      placedIds.push(worldId);
    }
  }

  const scenery: CoasterSceneryPlacement[] = [];
  const sceneryIds = new Set<string>();
  for (const state of legacy) {
    for (const item of state.scenery) {
      if (sceneryIds.has(item.id)) continue;
      sceneryIds.add(item.id);
      scenery.push(item);
    }
  }

  const world: CoasterState = {
    ...newState(PLAY_WORLD_ID),
    rideName: anchor.rideName,
    pieces,
    placedIds,
    rides: legacy.reduce((total, state) => total + state.rides, 0),
    launchPower: anchor.launchPower,
    cartStyle: anchor.cartStyle,
    scenery,
  };

  states[PLAY_WORLD_ID] = world;
  writeAll(states);
  return world;
}

export function readCoasterState(practiceSetId: string) {
  const states = readAll();

  if (practiceSetId === PLAY_WORLD_ID) {
    const existing = states[PLAY_WORLD_ID];
    return existing
      ? normaliseState(PLAY_WORLD_ID, existing)
      : migrateLegacyCoastersIntoPlayWorld(states);
  }

  return normaliseState(practiceSetId, states[practiceSetId]);
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
  const existing = state.pieces.find(
    (piece) => piece.word.toLocaleLowerCase("en-GB") === input.word.toLocaleLowerCase("en-GB"),
  );
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

export function setCoasterCartStyle(
  practiceSetId: string,
  cartStyle: CoasterCartStyle,
) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({ ...state, cartStyle });
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

export function addCoasterScenery(input: {
  practiceSetId: string;
  kind: CoasterSceneryKind;
  x: number;
  y: number;
  capacity: number;
}) {
  const state = readCoasterState(input.practiceSetId);
  if (state.scenery.length >= input.capacity) return state;

  const position = clampSceneryPosition(input.x, input.y);
  const placement: CoasterSceneryPlacement = {
    id: globalThis.crypto?.randomUUID?.() ?? `scenery-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: input.kind,
    ...position,
    placedAt: new Date().toISOString(),
  };

  return writeCoasterState({
    ...state,
    scenery: [...state.scenery, placement],
  });
}

export function moveCoasterScenery(
  practiceSetId: string,
  sceneryId: string,
  x: number,
  y: number,
) {
  const state = readCoasterState(practiceSetId);
  const position = clampSceneryPosition(x, y);

  return writeCoasterState({
    ...state,
    scenery: state.scenery.map((item) => item.id === sceneryId
      ? { ...item, ...position }
      : item),
  });
}

export function removeCoasterScenery(practiceSetId: string, sceneryId: string) {
  const state = readCoasterState(practiceSetId);
  return writeCoasterState({
    ...state,
    scenery: state.scenery.filter((item) => item.id !== sceneryId),
  });
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
