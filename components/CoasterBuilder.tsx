"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Play,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CoasterBuildTools } from "@/components/CoasterBuildTools";
import { CoasterCartGlyph, CoasterCartIcon } from "@/components/CoasterCart";
import { CoasterModeSwitch } from "@/components/CoasterModeSwitch";
import { CoasterPieceIcon } from "@/components/CoasterPieceIcon";
import { CoasterSceneryGlyph } from "@/components/CoasterScenery";
import { CoasterTrackPalette } from "@/components/CoasterTrackPalette";
import { getWordSupport } from "@/lib/literacy/engine";
import { readLearningEvents } from "@/lib/learning/local-store";
import {
  COASTER_LAUNCH_SPEED,
  COASTER_PIECES,
  CONNECTED_TRACK_GROUND_Y,
  CONNECTED_TRACK_HEIGHT,
  CONNECTED_TRACK_PIECE_WIDTH,
  CONNECTED_TRACK_START_Y,
  CONNECTED_TRACK_STATION_X,
  canEnterPiece,
  analyseRide,
  coasterPieceKindForWord,
  coasterPieceOptionsForWord,
  connectedTrackEndpoint,
  connectedTrackGeometryForKinds,
  isAirbornePiece,
  rotateLocalPoint,
  speedAfterPiece,
  speedLabel,
  stuntFlipsForSpeed,
  stuntRotationDegrees,
  type CoasterLaunchPower,
  type CoasterPieceKind,
} from "@/lib/practice/coaster";
import {
  COASTER_CARTS,
  type CoasterCartStyle,
} from "@/lib/practice/coaster-cart";
import {
  COASTER_SCENERY,
  sceneryCapacityForExploredWords,
  type CoasterSceneryKind,
} from "@/lib/practice/coaster-scenery";
import {
  addCoasterScenery,
  earnCoasterPiece,
  moveCoasterPiece,
  moveCoasterScenery,
  placeCoasterPiece,
  readCoasterState,
  recordCoasterRide,
  renameCoaster,
  setCoasterCartStyle,
  setCoasterLaunchPower,
  removeCoasterScenery,
  setCoasterPieceKind,
  unplaceCoasterPiece,
  type CoasterState,
} from "@/lib/practice/coaster-store";
import { PLAY_WORLD_ID } from "@/lib/practice/play-world";
import { explorationSignalsForWord, exploredWordsForPlay } from "@/lib/practice/progress";

type CartPose = {
  x: number;
  y: number;
  angle: number;
  visible: boolean;
};

type DragOffset = {
  x: number;
  y: number;
  active: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
};

const PIECE_WIDTH = CONNECTED_TRACK_PIECE_WIDTH;
const WORLD_HEIGHT = CONNECTED_TRACK_HEIGHT;

export function CoasterBuilder() {
  const [coaster, setCoaster] = useState<CoasterState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"build" | "ride">("build");
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [selectedKitKind, setSelectedKitKind] = useState<CoasterPieceKind | null>(null);
  const [selectedSceneryKind, setSelectedSceneryKind] = useState<CoasterSceneryKind | null>(null);
  const [selectedSceneryId, setSelectedSceneryId] = useState<string | null>(null);
  const [riding, setRiding] = useState(false);
  const [activePieceKind, setActivePieceKind] = useState<CoasterPieceKind | null>(null);
  const [activeStuntFlips, setActiveStuntFlips] = useState(0);
  const [rideFlips, setRideFlips] = useState(0);
  const [rideSpeed, setRideSpeed] = useState(0);
  const [peakSpeed, setPeakSpeed] = useState(0);
  const [rideMessage, setRideMessage] = useState("Build a bit of track, then send the cart.");
  const [cartPose, setCartPose] = useState<CartPose>(defaultCartPose);
  const [cartDrag, setCartDrag] = useState<DragOffset>({
    x: 0,
    y: 0,
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const stationRef = useRef<SVGPathElement>(null);
  const segmentRefs = useRef<Array<SVGPathElement | null>>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const events = readLearningEvents();
    const explored = exploredWordsForPlay(events);
    let state = readCoasterState(PLAY_WORLD_ID);

    explored.forEach((word) => {
      const support = getWordSupport(word);
      const earned = earnCoasterPiece({
        practiceSetId: PLAY_WORLD_ID,
        word,
        kind: coasterPieceKindForWord({
          word,
          chunks: support.chunks.length,
          signals: explorationSignalsForWord(events, word),
        }),
      });
      state = earned.state;
    });

    setCoaster(state);
    setLoaded(true);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const placedPieces = useMemo(() => {
    if (!coaster) return [];
    return coaster.placedIds
      .map((id) => coaster.pieces.find((piece) => piece.id === id))
      .filter((piece): piece is NonNullable<typeof piece> => Boolean(piece));
  }, [coaster]);

  const inventory = useMemo(() => {
    if (!coaster) return [];
    const placed = new Set(coaster.placedIds);
    return coaster.pieces.filter((piece) => !placed.has(piece.id));
  }, [coaster]);

  const trackGeometry = connectedTrackGeometryForKinds(placedPieces.map((piece) => piece.kind));
  const viewWidth = trackGeometry.width;
  const trackEndpoint = connectedTrackEndpoint(placedPieces.map((piece) => piece.kind));
  const rideCharacter = analyseRide(placedPieces.map((piece) => piece.kind));
  const editingPiece = coaster?.pieces.find((piece) => piece.id === editingPieceId) ?? null;
  const sceneryCapacity = sceneryCapacityForExploredWords(coaster?.pieces.length ?? 0);
  const selectedScenery = coaster?.scenery.find((item) => item.id === selectedSceneryId) ?? null;
  const scenerySpaceLeft = Math.max(0, sceneryCapacity - (coaster?.scenery.length ?? 0));
  const rideCameraWidth = Math.min(560, viewWidth);
  const rideCameraX = Math.max(
    0,
    Math.min(viewWidth - rideCameraWidth, cartPose.x - rideCameraWidth * 0.34),
  );
  const worldViewBox = mode === "ride" && riding && viewWidth > rideCameraWidth
    ? `${rideCameraX} 0 ${rideCameraWidth} ${WORLD_HEIGHT}`
    : `0 0 ${viewWidth} ${WORLD_HEIGHT}`;

  function removePiece(pieceId: string) {
    setCoaster(unplaceCoasterPiece(PLAY_WORLD_ID, pieceId));
    setRideMessage("Piece back in the yard.");
  }

  function movePiece(pieceId: string, direction: -1 | 1) {
    setCoaster(moveCoasterPiece(PLAY_WORLD_ID, pieceId, direction));
  }

  function saveName(value: string) {
    setCoaster(renameCoaster(PLAY_WORLD_ID, value));
  }

  function pieceOptions(word: string) {
    const support = getWordSupport(word);
    return coasterPieceOptionsForWord({
      word,
      chunks: support.chunks.length,
      signals: explorationSignalsForWord(readLearningEvents(), word),
    });
  }

  function choosePieceKind(pieceId: string, word: string, kind: CoasterPieceKind) {
    setCoaster(setCoasterPieceKind(PLAY_WORLD_ID, pieceId, kind));
    setRideMessage(`${word} is now ${COASTER_PIECES[kind].shortLabel.toLowerCase()} track.`);
  }

  function buildFromTrackKit(pieceId: string, word: string, kind: CoasterPieceKind) {
    setCoasterPieceKind(PLAY_WORLD_ID, pieceId, kind);
    setCoaster(placeCoasterPiece(PLAY_WORLD_ID, pieceId));
    setSelectedKitKind(null);
    setRideMessage(`${word} became ${COASTER_PIECES[kind].shortLabel.toLowerCase()} and snapped onto the end.`);
  }

  function openPiecePalette(pieceId: string) {
    setEditingPieceId((current) => current === pieceId ? null : pieceId);
  }

  function switchMode(nextMode: "build" | "ride") {
    if (riding) return;
    setMode(nextMode);
    setEditingPieceId(null);
    setSelectedKitKind(null);
    setSelectedSceneryKind(null);
    setSelectedSceneryId(null);
    setActivePieceKind(null);
    setActiveStuntFlips(0);
    setCartPose(defaultCartPose());
    setRideMessage(nextMode === "ride"
      ? "Ready when you are."
      : "Change the track, then test it again.");
  }

  function chooseLaunchPower(power: CoasterLaunchPower) {
    if (riding) return;
    setCoaster(setCoasterLaunchPower(PLAY_WORLD_ID, power));
    setRideSpeed(COASTER_LAUNCH_SPEED[power]);
    setRideMessage(power === 1 ? "Gentle launch." : power === 2 ? "Quick launch." : "Wild launch.");
  }

  function chooseCartStyle(cartStyle: CoasterCartStyle) {
    if (riding) return;
    setCoaster(setCoasterCartStyle(PLAY_WORLD_ID, cartStyle));
    setRideMessage(`${COASTER_CARTS[cartStyle].label} cart ready.`);
  }

  function runRide() {
    const stationPath = stationRef.current;
    const paths = trackGeometry.segments.map((_, index) => segmentRefs.current[index]);
    if (!stationPath || paths.some((path) => !path) || !coaster || placedPieces.length === 0 || riding) return;

    const stationLength = stationPath.getTotalLength();
    const segmentLengths = paths.map((path) => path?.getTotalLength() ?? PIECE_WIDTH);
    const totalLength = stationLength + segmentLengths.reduce((sum, length) => sum + length, 0);

    function routePointAtDistance(routeDistance: number) {
      const clampedDistance = Math.max(0, Math.min(totalLength, routeDistance));

      if (clampedDistance <= stationLength) {
        const point = stationPath!.getPointAtLength(clampedDistance);
        return {
          point: { x: point.x, y: point.y },
          pieceIndex: -1,
          progress: stationLength > 0 ? clampedDistance / stationLength : 0,
        };
      }

      let remaining = clampedDistance - stationLength;
      for (let index = 0; index < segmentLengths.length; index += 1) {
        const segmentLength = segmentLengths[index];
        if (remaining <= segmentLength || index === segmentLengths.length - 1) {
          const path = paths[index]!;
          const localDistance = Math.max(0, Math.min(segmentLength, remaining));
          const localPoint = path.getPointAtLength(localDistance);
          const segment = trackGeometry.segments[index];
          return {
            point: rotateLocalPoint(
              { x: localPoint.x, y: localPoint.y },
              { x: segment.startX, y: segment.startY },
              segment.heading,
            ),
            pieceIndex: index,
            progress: segmentLength > 0 ? localDistance / segmentLength : 0,
          };
        }
        remaining -= segmentLength;
      }

      const last = trackGeometry.segments.at(-1);
      return {
        point: last ? { x: last.endX, y: last.endY } : trackGeometry.stationEnd,
        pieceIndex: placedPieces.length - 1,
        progress: 1,
      };
    }

    let distance = 0;
    let lastNow = performance.now();
    let speed = COASTER_LAUNCH_SPEED[coaster.launchPower];
    let peak = speed;
    let lastPieceIndex = -1;
    let stuntFlipsInPiece = 0;
    let totalFlips = 0;

    setRiding(true);
    setActivePieceKind(null);
    setActiveStuntFlips(0);
    setRideFlips(0);
    setRideSpeed(speed);
    setPeakSpeed(speed);
    setRideMessage("Here we go.");
    setCartPose({ ...defaultCartPose(), visible: true });
    setCoaster(recordCoasterRide(PLAY_WORLD_ID));

    const stopRide = (message: string) => {
      setRiding(false);
      setActivePieceKind(null);
      setActiveStuntFlips(0);
      setRideMessage(message);
      setRideSpeed(speed);
      setPeakSpeed(peak);
      frameRef.current = null;
    };

    const tick = (now: number) => {
      const dt = Math.max(1, Math.min(40, now - lastNow));
      lastNow = now;

      const route = routePointAtDistance(distance);
      const aheadRoute = routePointAtDistance(distance + 4);
      const point = route.point;
      const ahead = aheadRoute.point;
      const baseAngle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI;

      const slope = ahead.y - point.y;
      speed += slope * 0.042 * (dt / 16);
      speed -= 0.025 * (dt / 16);
      speed = Math.max(3, Math.min(62, speed));

      const pieceIndex = route.pieceIndex;

      if (pieceIndex >= 0 && pieceIndex !== lastPieceIndex) {
        const piece = placedPieces[pieceIndex];
        const previousPiece = lastPieceIndex >= 0 ? placedPieces[lastPieceIndex] : null;

        if (previousPiece && isAirbornePiece(previousPiece.kind)) {
          setRideMessage(stuntFlipsInPiece > 0 ? "Landed it!" : "Back on the rails.");
        }

        setActivePieceKind(piece.kind);
        stuntFlipsInPiece = stuntFlipsForSpeed(piece.kind, speed);
        setActiveStuntFlips(stuntFlipsInPiece);

        if (piece.kind === "launch") setRideMessage("Boost!");
        else if (piece.kind === "brake") setRideMessage("Brakes!");
        else if (piece.kind === "tunnel") setRideMessage("Into the tunnel…");
        else if (piece.kind === "bank-left") setRideMessage("Banking left!");
        else if (piece.kind === "bank-right") setRideMessage("Banking right!");
        else if (piece.kind === "sweep-left") setRideMessage("Big sweep left!");
        else if (piece.kind === "sweep-right") setRideMessage("Big sweep right!");
        else if (piece.kind === "half-pipe") setRideMessage("Into the half-pipe!");
        else if (piece.kind === "wall-ride") setRideMessage("Ride the wall!");
        else if (piece.kind === "jump" || piece.kind === "mega-jump") {
          setRideMessage(
            stuntFlipsInPiece >= 3 ? "Triple flip!"
              : stuntFlipsInPiece === 2 ? "Double flip!"
                : stuntFlipsInPiece === 1 ? "Flip!"
                  : "Airborne!",
          );
        } else if (piece.kind === "steep-drop" || piece.kind === "drop") {
          setRideMessage("Here comes the drop.");
        }

        if (!canEnterPiece(speed, piece.kind)) {
          const needed = COASTER_PIECES[piece.kind].minimumSpeed;
          setCartPose({ x: point.x, y: point.y, angle: baseAngle, visible: true });
          stopRide(
            isAirbornePiece(piece.kind)
              ? `Not enough run-up to clear the ${COASTER_PIECES[piece.kind].shortLabel.toLowerCase()} — ${Math.round(speed)} mph this time, about ${needed} needed. Move a launch or a drop before it and try again.`
              : `Not enough speed for the ${COASTER_PIECES[piece.kind].shortLabel.toLowerCase()} — you had ${Math.round(speed)} mph and need about ${needed}. Try a launch or a dip before it.`,
          );
          return;
        }

        if (isAirbornePiece(piece.kind) && stuntFlipsInPiece > 0) {
          totalFlips += stuntFlipsInPiece;
          setRideFlips(totalFlips);
        }

        speed = speedAfterPiece(speed, piece.kind);
        peak = Math.max(peak, speed);
        lastPieceIndex = pieceIndex;
      }

      const activeKind = pieceIndex >= 0 ? placedPieces[pieceIndex]?.kind : null;
      const stuntRotation = activeKind
        ? stuntRotationDegrees(activeKind, route.progress, stuntFlipsInPiece)
        : 0;

      peak = Math.max(peak, speed);
      setRideSpeed(speed);
      setPeakSpeed(peak);
      setCartPose({
        x: point.x,
        y: point.y,
        angle: baseAngle + stuntRotation,
        visible: true,
      });

      if (distance < totalLength) {
        distance += speed * (dt / 1000) * 4.25;
        frameRef.current = requestAnimationFrame(tick);
      } else {
        stopRide(
          totalFlips > 0
            ? `Made it — ${totalFlips} ${totalFlips === 1 ? "flip" : "flips"} and a peak of ${Math.round(peak)} mph.`
            : `Made it. Peak speed ${Math.round(peak)} mph — ${speedLabel(peak)}.`,
        );
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  function chooseScenery(kind: CoasterSceneryKind) {
    setSelectedSceneryId(null);
    setSelectedSceneryKind((current) => current === kind ? null : kind);
    setRideMessage(currentSceneryMessage(kind));
  }

  function currentSceneryMessage(kind: CoasterSceneryKind) {
    return `Tap the park to place ${COASTER_SCENERY[kind].label.toLowerCase()}.`;
  }

  function onParkPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (mode !== "build" || riding || (!selectedSceneryKind && !selectedSceneryId)) return;

    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;

    const worldPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = worldPoint.x / viewWidth;
    const y = worldPoint.y / WORLD_HEIGHT;

    if (selectedSceneryId) {
      setCoaster(moveCoasterScenery(PLAY_WORLD_ID, selectedSceneryId, x, y));
      setRideMessage("Moved it. Tap somewhere else to move it again, or choose another park piece.");
      return;
    }

    if (!selectedSceneryKind || scenerySpaceLeft <= 0) return;
    setCoaster(addCoasterScenery({
      practiceSetId: PLAY_WORLD_ID,
      kind: selectedSceneryKind,
      x,
      y,
      capacity: sceneryCapacity,
    }));
    setRideMessage(`${COASTER_SCENERY[selectedSceneryKind].label} added to the park.`);
    if (scenerySpaceLeft <= 1) setSelectedSceneryKind(null);
  }

  function togglePlacedScenery(sceneryId: string) {
    if (mode !== "build" || riding) return;
    setSelectedSceneryKind(null);
    setSelectedSceneryId((current) => current === sceneryId ? null : sceneryId);
    setRideMessage("Selected. Tap somewhere in the park to move it.");
  }

  function selectPlacedScenery(event: PointerEvent<SVGGElement>, sceneryId: string) {
    event.stopPropagation();
    togglePlacedScenery(sceneryId);
  }

  function selectPlacedSceneryWithKeyboard(event: KeyboardEvent<SVGGElement>, sceneryId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    togglePlacedScenery(sceneryId);
  }

  function removeSelectedScenery() {
    if (!selectedSceneryId) return;
    setCoaster(removeCoasterScenery(PLAY_WORLD_ID, selectedSceneryId));
    setSelectedSceneryId(null);
    setRideMessage("Scenery put away.");
  }

  function startCartDrag(event: PointerEvent<HTMLButtonElement>) {
    if (placedPieces.length === 0 || riding) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCartDrag({
      x: 0,
      y: 0,
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function moveCartDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!cartDrag.active || cartDrag.pointerId !== event.pointerId) return;
    setCartDrag((current) => ({
      ...current,
      x: event.clientX - current.startX,
      y: event.clientY - current.startY,
    }));
  }

  function endCartDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!cartDrag.active || cartDrag.pointerId !== event.pointerId) return;

    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((event.clientX - rect.left) / rect.width) * viewWidth;
      const y = ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
      const hitStation = x >= 0 && x <= 150 && y >= CONNECTED_TRACK_START_Y - 100 && y <= CONNECTED_TRACK_START_Y + 100;
      if (hitStation) runRide();
      else setRideMessage("Drop the cart on the station to send it.");
    }

    setCartDrag({
      x: 0,
      y: 0,
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
    });
  }

  if (!loaded) {
    return <section className="coaster-loading">Opening the ride…</section>;
  }

  if (!coaster) {
    return (
      <section className="coaster-empty">
        <p className="eyebrow">Your word world</p>
        <h1>No coaster yet.</h1>
        <p>Bring in a spelling list and explore a few words. Each word will give you something real to build with.</p>
        <Link className="practice-primary" href="/practice/add-spellings">
          Add some spellings <ArrowRight size={20} />
        </Link>
      </section>
    );
  }

  return (
    <section className="coaster-builder">
      <header className="coaster-header">
        <div>
          <Link href="/practice" className="coaster-back"><ArrowLeft size={18} /> Practice</Link>
          <p className="eyebrow">Built from words you've explored</p>
          {mode === "build" ? (
            <input
              className="coaster-name"
              defaultValue={coaster.rideName}
              onBlur={(event) => saveName(event.target.value)}
              aria-label="Name your rollercoaster"
            />
          ) : (
            <h1 className="coaster-ride-name">{coaster.rideName}</h1>
          )}
          <p className="coaster-intro">
            {mode === "build"
              ? "Every word you explore gives you a piece. Choose its shape, build the ride, then test what you made."
              : "Workshop closed. Just the ride now."}
          </p>
        </div>
        <div className="coaster-stats" aria-label="Coaster information">
          <span><strong>{coaster.pieces.length}</strong> pieces found</span>
          <span><strong>{coaster.rides}</strong> rides</span>
          {placedPieces.length > 0 && (
            <span><strong>{placedPieces.length}</strong> on this ride</span>
          )}
        </div>
      </header>

      <CoasterModeSwitch
        mode={mode}
        canRide={placedPieces.length > 0}
        riding={riding}
        onChange={switchMode}
      />

      <div className={`coaster-layout ${mode === "ride" ? "ride-mode" : "build-mode"}`}>
        <section className="coaster-world-card">
          <div className="coaster-world-toolbar">
            <div className="coaster-status-copy">
              <span>{mode === "build" ? "Construction site" : "Test station"}</span>
              <strong>{placedPieces.length === 0 ? "Start your track." : rideMessage}</strong>
            </div>

            {mode === "ride" && (
              <div className="coaster-speed-readout" aria-live="polite">
                <span>Speed</span>
                <strong>{Math.round(riding ? rideSpeed : COASTER_LAUNCH_SPEED[coaster.launchPower])} mph</strong>
                <small>
                  {riding
                    ? `${speedLabel(rideSpeed)} · peak ${Math.round(peakSpeed)}`
                    : "at the station"}
                </small>
                <span className="coaster-speed-meter" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, ((riding ? rideSpeed : COASTER_LAUNCH_SPEED[coaster.launchPower]) / 62) * 100)}%` }} />
                </span>
              </div>
            )}

            {mode === "build" ? (
              <button
                type="button"
                className="coaster-ride-button"
                onClick={() => switchMode("ride")}
                disabled={placedPieces.length === 0 || riding}
              >
                <Play size={20} weight="fill" />
                Ride it
              </button>
            ) : (
              <button
                type="button"
                className="coaster-ride-button coaster-send-button"
                onClick={runRide}
                disabled={placedPieces.length === 0 || riding}
              >
                <Play size={20} weight="fill" />
                {riding ? "Riding…" : "Send it"}
              </button>
            )}
          </div>

          {mode === "ride" && (
            <div className="coaster-launch-strip">
            <div>
              <span>Station launch</span>
              <strong>How fast should the cart leave?</strong>
            </div>
            <div className="coaster-launch-options" role="group" aria-label="Choose station launch speed">
              {([
                [1, "Gentle"],
                [2, "Quick"],
                [3, "Wild"],
              ] as const).map(([power, label]) => (
                <button
                  type="button"
                  key={power}
                  className={coaster.launchPower === power ? "active" : ""}
                  onClick={() => chooseLaunchPower(power)}
                  disabled={riding}
                >
                  <span>{label}</span>
                  <strong>{COASTER_LAUNCH_SPEED[power]} mph</strong>
                </button>
              ))}
            </div>
            </div>
          )}

          {mode === "ride" && placedPieces.length > 0 && (
            <div className="coaster-character" aria-label="Ride character">
              <div>
                <span>Ride character</span>
                <strong>{rideCharacter.traits.join(" · ")}</strong>
              </div>
              <div className="coaster-character-facts">
                {rideCharacter.inversions > 0 && <span>{rideCharacter.inversions} inversion{rideCharacter.inversions === 1 ? "" : "s"}</span>}
                {rideCharacter.airtimeMoments > 0 && <span>{rideCharacter.airtimeMoments} airtime moment{rideCharacter.airtimeMoments === 1 ? "" : "s"}</span>}
                {rideCharacter.drops > 0 && <span>{rideCharacter.drops} drop{rideCharacter.drops === 1 ? "" : "s"}</span>}
                {rideCharacter.tunnels > 0 && <span>{rideCharacter.tunnels} tunnel{rideCharacter.tunnels === 1 ? "" : "s"}</span>}
                {rideCharacter.boosts > 0 && <span>{rideCharacter.boosts} boost{rideCharacter.boosts === 1 ? "" : "s"}</span>}
                {rideCharacter.stunts > 0 && <span>{rideCharacter.stunts} stunt jump{rideCharacter.stunts === 1 ? "" : "s"}</span>}
              </div>
            </div>
          )}

          <div
            className={`coaster-board ${mode === "ride" ? "ride-stage" : "build-stage"}${cartDrag.active ? " cart-dragging" : ""}`}
            ref={boardRef}
          >
            <svg
              className={`coaster-world${mode === "build" && (selectedSceneryKind || selectedSceneryId) ? " scenery-placement-active" : ""}${mode === "ride" && riding ? " camera-following" : ""}`}
              viewBox={worldViewBox}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              onPointerDown={onParkPointerDown}
              aria-label={`${coaster.rideName}, made from ${placedPieces.length} track pieces`}
            >
              <defs>
                <linearGradient id="buddy-sky-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dce9ef" />
                  <stop offset="100%" stopColor="#f7efe0" />
                </linearGradient>
              </defs>

              <rect width={viewWidth} height={WORLD_HEIGHT} rx="22" fill="url(#buddy-sky-gradient)" />
              <circle cx="118" cy="68" r="24" fill="#f7e5a5" opacity="0.9" />
              <path
                d={`M 0 ${CONNECTED_TRACK_GROUND_Y - 22} Q 150 ${CONNECTED_TRACK_GROUND_Y - 60} 330 ${CONNECTED_TRACK_GROUND_Y - 18} T ${viewWidth} ${CONNECTED_TRACK_GROUND_Y - 24} L ${viewWidth} ${WORLD_HEIGHT} L 0 ${WORLD_HEIGHT} Z`}
                fill="#a9b39a"
                opacity="0.6"
              />
              <path
                d={`M 0 ${CONNECTED_TRACK_GROUND_Y + 4} Q 180 ${CONNECTED_TRACK_GROUND_Y - 28} 390 ${CONNECTED_TRACK_GROUND_Y + 6} T ${viewWidth} ${CONNECTED_TRACK_GROUND_Y} L ${viewWidth} ${WORLD_HEIGHT} L 0 ${WORLD_HEIGHT} Z`}
                fill="#788873"
                opacity="0.52"
              />

              <g className="coaster-cloud" opacity="0.72">
                <ellipse cx="270" cy="70" rx="38" ry="13" fill="#fff" />
                <ellipse cx="248" cy="67" rx="18" ry="16" fill="#fff" />
                <ellipse cx="289" cy="63" rx="22" ry="18" fill="#fff" />
              </g>

              {coaster.scenery.map((item) => {
                const x = item.x * viewWidth;
                const y = item.y * WORLD_HEIGHT;
                const selected = mode === "build" && selectedSceneryId === item.id;
                const scale = 0.78 + item.y * 0.28;

                return (
                  <g
                    key={item.id}
                    className={`coaster-scenery-item${selected ? " selected" : ""}`}
                    transform={`translate(${x} ${y}) scale(${scale})`}
                    onPointerDown={(event) => selectPlacedScenery(event, item.id)}
                    onKeyDown={(event) => selectPlacedSceneryWithKeyboard(event, item.id)}
                    role={mode === "build" ? "button" : undefined}
                    tabIndex={mode === "build" ? 0 : undefined}
                    aria-label={mode === "build" ? `Select ${COASTER_SCENERY[item.kind].label} to move it` : undefined}
                  >
                    {selected && <circle cx="0" cy="4" r="38" fill="none" stroke="#b97c63" strokeWidth="3" strokeDasharray="6 5" />}
                    <g className={`coaster-scenery-reactor scenery-${item.kind}${mode === "ride" && riding ? " alive" : ""}`}>
                      <CoasterSceneryGlyph kind={item.kind} />
                    </g>
                  </g>
                );
              })}

              {mode === "ride" && (
                <g
                  className={`coaster-visitors${riding ? " alive" : ""}`}
                  transform={`translate(0 ${CONNECTED_TRACK_START_Y - 146})`}
                  aria-hidden="true"
                >
                  <g className="coaster-visitor visitor-one" transform="translate(102 198)">
                    <circle cx="0" cy="-12" r="5" fill="#78677e" />
                    <path d="M 0 -6 L 0 10 M 0 0 L -8 5 M 0 0 L 7 -5 M 0 10 L -6 20 M 0 10 L 6 20" stroke="#625e55" strokeWidth="3" strokeLinecap="round" />
                  </g>
                  <g className="coaster-visitor visitor-two" transform="translate(126 202)">
                    <circle cx="0" cy="-12" r="5" fill="#b97c63" />
                    <path d="M 0 -6 L 0 10 M 0 0 L -7 -6 M 0 0 L 8 5 M 0 10 L -5 20 M 0 10 L 6 20" stroke="#625e55" strokeWidth="3" strokeLinecap="round" />
                  </g>
                  <g className="coaster-visitor visitor-three" transform="translate(151 199)">
                    <circle cx="0" cy="-12" r="5" fill="#71836a" />
                    <path d="M 0 -6 L 0 10 M 0 0 L -7 4 M 0 0 L 7 3 M 0 10 L -5 20 M 0 10 L 6 20" stroke="#625e55" strokeWidth="3" strokeLinecap="round" />
                  </g>
                </g>
              )}

              <g className="coaster-station" transform={`translate(0 ${CONNECTED_TRACK_START_Y - 146})`}>
                <rect x="18" y="132" width="67" height="70" rx="7" fill="#b97c63" />
                <rect x="12" y="124" width="79" height="14" rx="4" fill="#78677e" />
                <rect x="33" y="163" width="18" height="39" rx="3" fill="#f4f0e8" opacity="0.82" />
                <text x="51" y="118" textAnchor="middle" className="coaster-svg-label">START</text>
              </g>

              <path
                d={`M ${trackGeometry.stationStart.x} ${trackGeometry.stationStart.y} L ${trackGeometry.stationEnd.x} ${trackGeometry.stationEnd.y}`}
                fill="none"
                stroke="#3f4440"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d={`M ${trackGeometry.stationStart.x} ${trackGeometry.stationStart.y} L ${trackGeometry.stationEnd.x} ${trackGeometry.stationEnd.y}`}
                fill="none"
                stroke="#d9b86c"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="8 8"
              />
              <path
                ref={stationRef}
                d={`M ${trackGeometry.stationStart.x} ${trackGeometry.stationStart.y} L ${trackGeometry.stationEnd.x} ${trackGeometry.stationEnd.y}`}
                fill="none"
                stroke="transparent"
                strokeWidth="2"
                pointerEvents="none"
              />

              {placedPieces.map((piece, index) => {
                const segment = trackGeometry.segments[index];
                if (!segment) return null;

                return (
                  <g key={piece.id}>
                    <line
                      x1={segment.endX}
                      y1={segment.endY + 3}
                      x2={segment.endX}
                      y2={CONNECTED_TRACK_GROUND_Y}
                      stroke="#625e55"
                      strokeWidth="3"
                      opacity="0.2"
                    />
                    <circle cx={segment.endX} cy={CONNECTED_TRACK_GROUND_Y} r="4" fill="#625e55" opacity="0.28" />

                    <g transform={`translate(${segment.startX} ${segment.startY}) rotate(${segment.heading})`}>
                      {piece.kind === "lift" && (
                        <g opacity="0.72">
                          <text x={segment.width / 2} y={Math.min(0, segment.localEndY) - 14} textAnchor="middle" className="coaster-svg-help">LIFT</text>
                          <path
                            d={`M 12 -6 L ${segment.width - 12} ${segment.localEndY - 6}`}
                            stroke="#78677e"
                            strokeWidth="2"
                            strokeDasharray="5 6"
                          />
                        </g>
                      )}

                      {piece.kind === "tunnel" && (
                        <g className="coaster-tunnel" opacity="0.88">
                          <path
                            d={`M 8 24 Q ${segment.width / 2} -42 ${segment.width - 8} ${segment.localEndY + 24}`}
                            fill="#625e55"
                            opacity="0.2"
                          />
                          <path
                            d={`M 13 20 Q ${segment.width / 2} -32 ${segment.width - 13} ${segment.localEndY + 20}`}
                            fill="none"
                            stroke="#625e55"
                            strokeWidth="5"
                            opacity="0.46"
                          />
                        </g>
                      )}

                      {piece.kind === "launch" && (
                        <g className="coaster-boost-marker">
                          <path d="M 22 -13 l 12 13 l -12 13" fill="none" stroke="#b97c63" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 38 -13 l 12 13 l -12 13" fill="none" stroke="#b97c63" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                          <text x="40" y="-20" textAnchor="middle" className="coaster-svg-help">BOOST</text>
                        </g>
                      )}

                      {piece.kind === "brake" && (
                        <g className="coaster-brake-marker">
                          <line x1="22" y1="-10" x2="22" y2="10" stroke="#78677e" strokeWidth="4" />
                          <line x1="36" y1="-10" x2="36" y2="10" stroke="#78677e" strokeWidth="4" />
                          <line x1="50" y1="-10" x2="50" y2="10" stroke="#78677e" strokeWidth="4" />
                          <text x="36" y="-20" textAnchor="middle" className="coaster-svg-help">BRAKE</text>
                        </g>
                      )}

                      {(piece.kind === "bank-left" || piece.kind === "bank-right") && (
                        <g className="coaster-bank-marker">
                          <text x={segment.width / 2} y="-42" textAnchor="middle" className="coaster-svg-help">
                            {piece.kind === "bank-left" ? "BANK LEFT" : "BANK RIGHT"}
                          </text>
                          <path
                            d={piece.kind === "bank-left"
                              ? `M ${segment.width / 2 + 14} -30 L ${segment.width / 2} -42 L ${segment.width / 2 - 14} -30`
                              : `M ${segment.width / 2 - 14} 30 L ${segment.width / 2} 42 L ${segment.width / 2 + 14} 30`}
                            fill="none"
                            stroke="#b97c63"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}

                      {isAirbornePiece(piece.kind) && (
                        <g className="coaster-stunt-marker">
                          <path
                            d={`M 34 -37 Q ${segment.width / 2} -55 ${segment.width - 32} ${segment.localEndY - 37}`}
                            fill="none"
                            stroke="#b97c63"
                            strokeWidth="2"
                            strokeDasharray="5 7"
                            opacity="0.62"
                          />
                          <text
                            x={segment.width / 2}
                            y={piece.kind === "mega-jump" ? -82 : -56}
                            textAnchor="middle"
                            className="coaster-svg-help"
                          >
                            {piece.kind === "mega-jump" ? "MEGA AIR" : "AIR"}
                          </text>
                        </g>
                      )}

                      {segment.visibleLocalPaths.map((visiblePath, pathIndex) => (
                        <g key={`${piece.id}-rail-${pathIndex}`}>
                          <path
                            d={visiblePath}
                            fill="none"
                            stroke="#3f4440"
                            strokeWidth="9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={visiblePath}
                            fill="none"
                            stroke="#d9b86c"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="8 8"
                          />
                        </g>
                      ))}

                      <path
                        ref={(node) => { segmentRefs.current[index] = node; }}
                        d={segment.localPath}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="2"
                        pointerEvents="none"
                      />
                    </g>
                  </g>
                );
              })}

              {mode === "build" && placedPieces.length > 0 && (
                <g
                  className="coaster-build-endpoint"
                  transform={`translate(${trackEndpoint.x} ${trackEndpoint.y}) rotate(${trackEndpoint.heading})`}
                  aria-hidden="true"
                >
                  <circle r="13" fill="#f7efe0" stroke="#b97c63" strokeWidth="3" />
                  <circle r="4" fill="#b97c63" />
                  <path d="M 18 0 L 42 0 M 34 -8 L 42 0 L 34 8" fill="none" stroke="#b97c63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="30" y="-17" textAnchor="middle" className="coaster-svg-help">BUILD HERE</text>
                </g>
              )}

              {placedPieces.length === 0 && (
                <g opacity="0.62">
                  <path d={`M ${trackGeometry.stationEnd.x} ${trackGeometry.stationEnd.y} L ${trackGeometry.stationEnd.x + PIECE_WIDTH} ${trackGeometry.stationEnd.y}`} stroke="#625e55" strokeWidth="8" strokeLinecap="round" strokeDasharray="10 11" />
                  <text x={trackGeometry.stationEnd.x + PIECE_WIDTH / 2} y={trackGeometry.stationEnd.y + 30} textAnchor="middle" className="coaster-svg-help">drop a piece here</text>
                </g>
              )}

              {cartPose.visible && (
                <g transform={`translate(${cartPose.x} ${cartPose.y - 11}) rotate(${cartPose.angle})`}>
                  {riding && rideSpeed > 38 && (
                    <g className="coaster-speed-lines" opacity={Math.min(0.8, (rideSpeed - 34) / 30)}>
                      <line x1="-48" y1="-6" x2="-24" y2="-6" stroke="#f4f0e8" strokeWidth="3" strokeLinecap="round" />
                      <line x1="-43" y1="1" x2="-21" y2="1" stroke="#f4f0e8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="-38" y1="7" x2="-19" y2="7" stroke="#f4f0e8" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  )}
                  <CoasterCartGlyph style={coaster.cartStyle} />
                </g>
              )}
            </svg>

            {mode === "ride" && riding && activePieceKind === "tunnel" && (
              <div className="coaster-tunnel-darkness" aria-hidden="true">
                <span />
              </div>
            )}
            {mode === "ride" && riding && activePieceKind === "launch" && (
              <div className="coaster-launch-burst" aria-hidden="true"><span /><span /><span /></div>
            )}
            {mode === "ride" && riding && activePieceKind === "brake" && (
              <div className="coaster-brake-pulse" aria-hidden="true" />
            )}
            {mode === "ride" && riding && activePieceKind && isAirbornePiece(activePieceKind) && (
              <div className="coaster-stunt-airtime" aria-hidden="true">
                <strong>{activeStuntFlips > 0 ? `${activeStuntFlips}× FLIP` : "AIR!"}</strong>
                <span>{Math.round(rideSpeed)} mph</span>
              </div>
            )}
            {mode === "ride" && riding && (activePieceKind === "wall-ride" || activePieceKind === "half-pipe") && (
              <div className="coaster-wild-trick" aria-hidden="true">
                <strong>{activePieceKind === "wall-ride" ? "WALL RIDE!" : "HALF-PIPE!"}</strong>
                <span>{Math.round(rideSpeed)} mph</span>
              </div>
            )}

            <div className="coaster-station-target" aria-hidden="true">Drop cart here</div>

            {mode === "ride" && (
              <button
                type="button"
                className="coaster-cart-handle"
                style={{ transform: `translate(${cartDrag.x}px, ${cartDrag.y}px)` }}
                onPointerDown={startCartDrag}
                onPointerMove={moveCartDrag}
                onPointerUp={endCartDrag}
                onPointerCancel={endCartDrag}
                disabled={placedPieces.length === 0 || riding}
                aria-label="Drag the cart to the station to ride"
              >
                <span className="coaster-mini-cart"><i /><i /></span>
                <span>Drag cart</span>
              </button>
            )}
          </div>

          <p className="coaster-board-hint">
            {mode === "build"
              ? selectedSceneryKind
                ? `Tap the park to place ${COASTER_SCENERY[selectedSceneryKind].label.toLowerCase()}.`
                : selectedSceneryId
                  ? "Tap somewhere in the park to move the selected scenery."
                  : "Use Add track below: choose a shape, then a word-piece. It snaps onto BUILD HERE."
              : "Drag the cart onto the station or press Send it. Then watch where the ride flies — or stalls."}
          </p>

          {mode === "build" && placedPieces.length > 0 && (
            <div className="coaster-track-order" aria-label="Track pieces in order">
              {placedPieces.map((piece, index) => (
                <div className="coaster-placed-chip" key={piece.id}>
                  <CoasterPieceIcon kind={piece.kind} />
                  <div>
                    <strong>{COASTER_PIECES[piece.kind].shortLabel}</strong>
                    <span>{piece.word}</span>
                  </div>
                  <div className="coaster-chip-actions">
                    <button
                      type="button"
                      onClick={() => movePiece(piece.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${piece.word} earlier`}
                    >
                      <CaretLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePiece(piece.id, 1)}
                      disabled={index === placedPieces.length - 1}
                      aria-label={`Move ${piece.word} later`}
                    >
                      <CaretRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openPiecePalette(piece.id)}
                      aria-label={`Choose the track shape for ${piece.word}`}
                      title="Choose track shape"
                      className={editingPieceId === piece.id ? "active" : ""}
                    >
                      Shape
                    </button>
                    <button type="button" onClick={() => removePiece(piece.id)} aria-label={`Put ${piece.word} back in the yard`}>
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === "build" && editingPiece && (
            <div className="coaster-piece-editor">
              <div className="coaster-piece-editor-heading">
                <div>
                  <span>Shape this word</span>
                  <strong>{editingPiece.word}</strong>
                </div>
                <button type="button" onClick={() => setEditingPieceId(null)}>Done</button>
              </div>
              <CoasterTrackPalette
                word={editingPiece.word}
                currentKind={editingPiece.kind}
                options={pieceOptions(editingPiece.word)}
                onChoose={(kind) => choosePieceKind(editingPiece.id, editingPiece.word, kind)}
              />
              <p>{COASTER_PIECES[editingPiece.kind].description}</p>
            </div>
          )}

          {mode === "ride" && !riding && placedPieces.length > 0 && (
            <div className="coaster-cart-picker">
              <div>
                <span>Your cart</span>
                <strong>Pick what you want to ride.</strong>
              </div>
              <div className="coaster-cart-options" role="group" aria-label="Choose coaster cart">
                {(Object.keys(COASTER_CARTS) as CoasterCartStyle[]).map((style) => (
                  <button
                    type="button"
                    key={style}
                    className={coaster.cartStyle === style ? "active" : ""}
                    onClick={() => chooseCartStyle(style)}
                    aria-pressed={coaster.cartStyle === style}
                  >
                    <CoasterCartIcon style={style} />
                    <span>{COASTER_CARTS[style].label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "ride" && !riding && placedPieces.length > 0 && (
            <div className="coaster-ride-dock">
              <div>
                <span>Ready at the station</span>
                <strong>{COASTER_LAUNCH_SPEED[coaster.launchPower]} mph launch · {rideCharacter.traits.join(" · ")}</strong>
              </div>
              <button type="button" onClick={runRide}>
                <Play size={22} weight="fill" /> Send the cart
              </button>
            </div>
          )}
        </section>

        {mode === "build" && (
          <CoasterBuildTools
            coaster={coaster}
            inventory={inventory}
            selectedKitKind={selectedKitKind}
            selectedSceneryKind={selectedSceneryKind}
            selectedScenery={selectedScenery}
            scenerySpaceLeft={scenerySpaceLeft}
            onSelectKitKind={setSelectedKitKind}
            onBuildPiece={buildFromTrackKit}
            onChangePlacedPiece={choosePieceKind}
            onChooseScenery={chooseScenery}
            onRemoveSelectedScenery={removeSelectedScenery}
          />
        )}
      </div>
    </section>
  );
}
