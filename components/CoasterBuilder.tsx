"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Play,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { CoasterPieceIcon } from "@/components/CoasterPieceIcon";
import { getWordSupport } from "@/lib/literacy/engine";
import { readLearningEvents } from "@/lib/learning/local-store";
import {
  COASTER_LAUNCH_SPEED,
  COASTER_PIECES,
  canEnterPiece,
  analyseRide,
  coasterPieceKindForWord,
  coasterPieceOptionsForWord,
  coasterViewBoxWidth,
  speedAfterPiece,
  speedLabel,
  trackGeometryForKinds,
  type CoasterLaunchPower,
  type CoasterPieceKind,
} from "@/lib/practice/coaster";
import {
  earnCoasterPiece,
  moveCoasterPiece,
  placeCoasterPiece,
  readCoasterState,
  recordCoasterRide,
  renameCoaster,
  setCoasterLaunchPower,
  setCoasterPieceKind,
  unplaceCoasterPiece,
  type CoasterState,
} from "@/lib/practice/coaster-store";
import { explorationSignalsForWord, exploredWordsForPracticeSet } from "@/lib/practice/progress";
import { readActivePracticeSet, type PracticeSet } from "@/lib/practice/sets";

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

const BASELINE_Y = 146;
const PIECE_WIDTH = 92;
const STATION_X = 28;

function defaultCartPose(): CartPose {
  return { x: STATION_X, y: BASELINE_Y, angle: 0, visible: false };
}

function TrackChoicePalette({
  word,
  currentKind,
  options,
  onChoose,
  compact = false,
}: {
  word: string;
  currentKind: CoasterPieceKind;
  options: CoasterPieceKind[];
  onChoose: (kind: CoasterPieceKind) => void;
  compact?: boolean;
}) {
  return (
    <div className={`coaster-track-palette${compact ? " compact" : ""}`} aria-label={`Choose track shape for ${word}`}>
      {options.map((kind) => (
        <button
          type="button"
          key={kind}
          className={currentKind === kind ? "active" : ""}
          onClick={() => onChoose(kind)}
          aria-pressed={currentKind === kind}
        >
          <CoasterPieceIcon kind={kind} />
          <span>{COASTER_PIECES[kind].shortLabel}</span>
        </button>
      ))}
    </div>
  );
}

export function CoasterBuilder() {
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [coaster, setCoaster] = useState<CoasterState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"build" | "ride">("build");
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [riding, setRiding] = useState(false);
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
  const trackRef = useRef<SVGPathElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const set = readActivePracticeSet();
    setPracticeSet(set);

    if (!set) {
      setLoaded(true);
      return;
    }

    const explored = exploredWordsForPracticeSet(readLearningEvents(), set.id);
    let state = readCoasterState(set.id);

    explored.forEach((word) => {
      const support = getWordSupport(word);
      const earned = earnCoasterPiece({
        practiceSetId: set.id,
        word,
        kind: coasterPieceKindForWord({
          word,
          chunks: support.chunks.length,
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

  const viewWidth = coasterViewBoxWidth(placedPieces.length);
  const trackGeometry = trackGeometryForKinds(placedPieces.map((piece) => piece.kind));
  const trackPath = trackGeometry.path;
  const rideCharacter = analyseRide(placedPieces.map((piece) => piece.kind));
  const editingPiece = coaster?.pieces.find((piece) => piece.id === editingPieceId) ?? null;

  function addPiece(pieceId: string) {
    if (!practiceSet) return;
    setCoaster(placeCoasterPiece(practiceSet.id, pieceId));
    setRideMessage("Nice. The track just changed.");
  }

  function removePiece(pieceId: string) {
    if (!practiceSet) return;
    setCoaster(unplaceCoasterPiece(practiceSet.id, pieceId));
    setRideMessage("Piece back in the yard.");
  }

  function movePiece(pieceId: string, direction: -1 | 1) {
    if (!practiceSet) return;
    setCoaster(moveCoasterPiece(practiceSet.id, pieceId, direction));
  }

  function saveName(value: string) {
    if (!practiceSet) return;
    setCoaster(renameCoaster(practiceSet.id, value));
  }

  function pieceOptions(word: string) {
    const support = getWordSupport(word);
    return coasterPieceOptionsForWord({
      word,
      chunks: support.chunks.length,
      signals: practiceSet
        ? explorationSignalsForWord(readLearningEvents(), practiceSet.id, word)
        : undefined,
    });
  }

  function choosePieceKind(pieceId: string, word: string, kind: CoasterPieceKind) {
    if (!practiceSet) return;
    setCoaster(setCoasterPieceKind(practiceSet.id, pieceId, kind));
    setRideMessage(`${word} is now ${COASTER_PIECES[kind].shortLabel.toLowerCase()} track.`);
  }

  function openPiecePalette(pieceId: string) {
    setEditingPieceId((current) => current === pieceId ? null : pieceId);
  }

  function switchMode(nextMode: "build" | "ride") {
    if (riding) return;
    setMode(nextMode);
    setEditingPieceId(null);
    setCartPose(defaultCartPose());
    setRideMessage(nextMode === "ride"
      ? "Ready when you are."
      : "Change the track, then test it again.");
  }

  function chooseLaunchPower(power: CoasterLaunchPower) {
    if (!practiceSet || riding) return;
    setCoaster(setCoasterLaunchPower(practiceSet.id, power));
    setRideSpeed(COASTER_LAUNCH_SPEED[power]);
    setRideMessage(power === 1 ? "Gentle launch." : power === 2 ? "Quick launch." : "Wild launch.");
  }

  function runRide() {
    const path = trackRef.current;
    if (!path || !practiceSet || !coaster || placedPieces.length === 0 || riding) return;

    const totalLength = path.getTotalLength();
    let distance = 0;
    let lastNow = performance.now();
    let speed = COASTER_LAUNCH_SPEED[coaster.launchPower];
    let peak = speed;
    let lastPieceIndex = -1;

    setRiding(true);
    setRideSpeed(speed);
    setPeakSpeed(speed);
    setRideMessage("Here we go.");
    setCartPose({ ...defaultCartPose(), visible: true });
    setCoaster(recordCoasterRide(practiceSet.id));

    const stopRide = (message: string) => {
      setRiding(false);
      setRideMessage(message);
      setRideSpeed(speed);
      setPeakSpeed(peak);
      frameRef.current = null;
    };

    const tick = (now: number) => {
      const dt = Math.max(1, Math.min(40, now - lastNow));
      lastNow = now;

      const point = path.getPointAtLength(Math.min(totalLength, distance));
      const ahead = path.getPointAtLength(Math.min(totalLength, distance + 4));
      const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI;

      // In SVG coordinates positive Y is downhill, so descent adds momentum and
      // climbing takes it away. This is deliberately game-like rather than a
      // real rollercoaster physics model.
      const slope = ahead.y - point.y;
      speed += slope * 0.042 * (dt / 16);
      speed -= 0.025 * (dt / 16);
      speed = Math.max(3, Math.min(62, speed));

      const pieceIndex = Math.max(
        -1,
        Math.min(placedPieces.length - 1, Math.floor((point.x - 76) / PIECE_WIDTH)),
      );

      if (pieceIndex >= 0 && pieceIndex !== lastPieceIndex) {
        const piece = placedPieces[pieceIndex];
        if (!canEnterPiece(speed, piece.kind)) {
          const needed = COASTER_PIECES[piece.kind].minimumSpeed;
          setCartPose({ x: point.x, y: point.y, angle, visible: true });
          stopRide(
            `Not enough speed for the ${COASTER_PIECES[piece.kind].shortLabel.toLowerCase()} — you had ${Math.round(speed)} mph and need about ${needed}. Try a launch or a dip before it.`,
          );
          return;
        }

        speed = speedAfterPiece(speed, piece.kind);
        peak = Math.max(peak, speed);
        lastPieceIndex = pieceIndex;
      }

      peak = Math.max(peak, speed);
      setRideSpeed(speed);
      setPeakSpeed(peak);
      setCartPose({
        x: point.x,
        y: point.y,
        angle,
        visible: true,
      });

      if (distance < totalLength) {
        // The multiplier turns our simple mph-like game value into SVG travel.
        distance += speed * (dt / 1000) * 4.25;
        frameRef.current = requestAnimationFrame(tick);
      } else {
        stopRide(`Made it. Peak speed ${Math.round(peak)} mph — ${speedLabel(peak)}.`);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  function onPieceDragStart(event: DragEvent, pieceId: string) {
    event.dataTransfer.setData("text/buddy-coaster-piece", pieceId);
    event.dataTransfer.effectAllowed = "move";
  }

  function onTrackDrop(event: DragEvent) {
    event.preventDefault();
    if (mode !== "build") return;
    const pieceId = event.dataTransfer.getData("text/buddy-coaster-piece");
    if (pieceId) addPiece(pieceId);
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
      const y = ((event.clientY - rect.top) / rect.height) * 260;
      const hitStation = x >= 0 && x <= 140 && y >= 0 && y <= 260;
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

  if (!practiceSet || !coaster) {
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
          <p className="eyebrow">Built from {practiceSet.label}</p>
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

      <div className="coaster-mode-switch" role="tablist" aria-label="Coaster mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "build"}
          className={mode === "build" ? "active" : ""}
          onClick={() => switchMode("build")}
          disabled={riding}
        >
          <span>Build</span>
          <small>Choose pieces and shape the track</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ride"}
          className={mode === "ride" ? "active" : ""}
          onClick={() => switchMode("ride")}
          disabled={placedPieces.length === 0 || riding}
        >
          <span>Ride</span>
          <small>Clear the workshop and test it</small>
        </button>
      </div>

      <div className={`coaster-layout ${mode === "ride" ? "ride-mode" : "build-mode"}`}>
        <section className="coaster-world-card">
          <div className="coaster-world-toolbar">
            <div className="coaster-status-copy">
              <span>{mode === "build" ? "Construction site" : "Test station"}</span>
              <strong>{placedPieces.length === 0 ? "Start your track." : rideMessage}</strong>
            </div>

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

          {placedPieces.length > 0 && (
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
              </div>
            </div>
          )}

          <div
            className={`coaster-board ${mode === "ride" ? "ride-stage" : "build-stage"}${cartDrag.active ? " cart-dragging" : ""}`}
            ref={boardRef}
            onDragOver={(event) => mode === "build" && event.preventDefault()}
            onDrop={onTrackDrop}
          >
            <svg
              className="coaster-world"
              viewBox={`0 0 ${viewWidth} 260`}
              role="img"
              aria-label={`${coaster.rideName}, made from ${placedPieces.length} track pieces`}
            >
              <defs>
                <linearGradient id="buddy-sky-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dce9ef" />
                  <stop offset="100%" stopColor="#f7efe0" />
                </linearGradient>
              </defs>

              <rect width={viewWidth} height="260" rx="22" fill="url(#buddy-sky-gradient)" />
              <circle cx="118" cy="54" r="24" fill="#f7e5a5" opacity="0.9" />
              <path d={`M 0 220 Q 130 184 270 219 T 540 213 T ${viewWidth} 218 L ${viewWidth} 260 L 0 260 Z`} fill="#a9b39a" opacity="0.6" />
              <path d={`M 0 232 Q 150 204 340 234 T ${viewWidth} 230 L ${viewWidth} 260 L 0 260 Z`} fill="#788873" opacity="0.52" />

              <g className="coaster-cloud" opacity="0.72">
                <ellipse cx="270" cy="55" rx="38" ry="13" fill="#fff" />
                <ellipse cx="248" cy="52" rx="18" ry="16" fill="#fff" />
                <ellipse cx="289" cy="48" rx="22" ry="18" fill="#fff" />
              </g>

              <g className="coaster-station">
                <rect x="18" y="132" width="67" height="70" rx="7" fill="#b97c63" />
                <rect x="12" y="124" width="79" height="14" rx="4" fill="#78677e" />
                <rect x="33" y="163" width="18" height="39" rx="3" fill="#f4f0e8" opacity="0.82" />
                <text x="51" y="118" textAnchor="middle" className="coaster-svg-label">START</text>
              </g>

              {placedPieces.map((piece, index) => {
                const segment = trackGeometry.segments[index];
                const supportX = segment?.endX ?? (76 + ((index + 1) * PIECE_WIDTH));
                const supportY = segment?.endY ?? BASELINE_Y;
                const startX = segment?.startX ?? (supportX - PIECE_WIDTH);
                const startY = segment?.startY ?? BASELINE_Y;

                return (
                  <g key={piece.id}>
                    <line
                      x1={supportX}
                      y1={supportY + 3}
                      x2={supportX}
                      y2="224"
                      stroke="#625e55"
                      strokeWidth="3"
                      opacity="0.26"
                    />
                    <circle cx={supportX} cy="224" r="4" fill="#625e55" opacity="0.32" />

                    {piece.kind === "lift" && (
                      <g opacity="0.72">
                        <text x={startX + PIECE_WIDTH / 2} y={Math.min(startY, supportY) - 12} textAnchor="middle" className="coaster-svg-help">LIFT</text>
                        <path
                          d={`M ${startX + 12} ${startY - 6} L ${supportX - 12} ${supportY - 6}`}
                          stroke="#78677e"
                          strokeWidth="2"
                          strokeDasharray="5 6"
                        />
                      </g>
                    )}

                    {piece.kind === "tunnel" && (
                      <g className="coaster-tunnel" opacity="0.88">
                        <path
                          d={`M ${startX + 8} ${startY + 24} Q ${startX + PIECE_WIDTH / 2} ${startY - 42} ${supportX - 8} ${supportY + 24}`}
                          fill="#625e55"
                          opacity="0.2"
                        />
                        <path
                          d={`M ${startX + 13} ${startY + 20} Q ${startX + PIECE_WIDTH / 2} ${startY - 32} ${supportX - 13} ${supportY + 20}`}
                          fill="none"
                          stroke="#625e55"
                          strokeWidth="5"
                          opacity="0.46"
                        />
                      </g>
                    )}

                    {piece.kind === "launch" && (
                      <g className="coaster-boost-marker">
                        <path d={`M ${startX + 22} ${startY - 13} l 12 13 l -12 13`} fill="none" stroke="#b97c63" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={`M ${startX + 38} ${startY - 13} l 12 13 l -12 13`} fill="none" stroke="#b97c63" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <text x={startX + 40} y={startY - 20} textAnchor="middle" className="coaster-svg-help">BOOST</text>
                      </g>
                    )}

                    {piece.kind === "brake" && (
                      <g className="coaster-brake-marker">
                        <line x1={startX + 22} y1={startY - 10} x2={startX + 22} y2={startY + 10} stroke="#78677e" strokeWidth="4" />
                        <line x1={startX + 36} y1={startY - 10} x2={startX + 36} y2={startY + 10} stroke="#78677e" strokeWidth="4" />
                        <line x1={startX + 50} y1={startY - 10} x2={startX + 50} y2={startY + 10} stroke="#78677e" strokeWidth="4" />
                        <text x={startX + 36} y={startY - 20} textAnchor="middle" className="coaster-svg-help">BRAKE</text>
                      </g>
                    )}
                  </g>
                );
              })}

              <path
                ref={trackRef}
                d={trackPath}
                fill="none"
                stroke="#3f4440"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={trackPath}
                fill="none"
                stroke="#d9b86c"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 8"
              />

              {placedPieces.length === 0 && (
                <g opacity="0.62">
                  <path d="M 76 146 L 168 146" stroke="#625e55" strokeWidth="8" strokeLinecap="round" strokeDasharray="10 11" />
                  <text x="124" y="176" textAnchor="middle" className="coaster-svg-help">drop a piece here</text>
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
                  <rect x="-13" y="-9" width="27" height="15" rx="5" fill="#b97c63" stroke="#3f4440" strokeWidth="2.5" />
                  <path d="M -9 -9 L -5 -17 L 7 -17 L 11 -9" fill="#f4f0e8" stroke="#3f4440" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="-7" cy="8" r="4.5" fill="#3f4440" />
                  <circle cx="8" cy="8" r="4.5" fill="#3f4440" />
                </g>
              )}
            </svg>

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
              ? "Build height with lift track, spend it on drops, and use boosts when an inversion needs more momentum."
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
              <TrackChoicePalette
                word={editingPiece.word}
                currentKind={editingPiece.kind}
                options={pieceOptions(editingPiece.word)}
                onChoose={(kind) => choosePieceKind(editingPiece.id, editingPiece.word, kind)}
              />
              <p>{COASTER_PIECES[editingPiece.kind].description}</p>
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

        {mode === "build" && <aside className="coaster-yard">
          <div className="coaster-yard-heading">
            <div>
              <span>Piece yard</span>
              <strong>{inventory.length > 0 ? "What should we build next?" : "Everything is on the track."}</strong>
            </div>
            <span>{inventory.length} waiting</span>
          </div>

          {inventory.length > 0 ? (
            <div className="coaster-piece-grid">
              {inventory.map((piece) => {
                const options = pieceOptions(piece.word);
                return (
                  <div
                    className={`coaster-piece-card adventure-${COASTER_PIECES[piece.kind].adventure}`}
                    key={piece.id}
                    draggable
                    onDragStart={(event) => onPieceDragStart(event, piece.id)}
                  >
                    <button type="button" className="coaster-piece-add" onClick={() => addPiece(piece.id)}>
                      <CoasterPieceIcon kind={piece.kind} />
                      <span>{COASTER_PIECES[piece.kind].shortLabel}</span>
                      <strong>{piece.word}</strong>
                      <small>{COASTER_PIECES[piece.kind].description}</small>
                      <i><Plus size={15} /> Add to track</i>
                    </button>
                    <div className="coaster-yard-palette">
                      <span>Choose its shape</span>
                      <TrackChoicePalette
                        word={piece.word}
                        currentKind={piece.kind}
                        options={options}
                        compact
                        onChoose={(kind) => choosePieceKind(piece.id, piece.word, kind)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="coaster-yard-empty">
              <CoasterPieceIcon kind="loop" />
              <p>Explore more words to find more pieces for this ride.</p>
              <Link href="/practice">Back to the words <ArrowRight size={18} /></Link>
            </div>
          )}

          <div className="coaster-game-rule">
            <strong>How this world grows</strong>
            <p>Trying, listening, asking for help and digging into words all count. Each explored word gives you track choices. Then the game is yours: arrange pieces, manage speed, move launches and brakes, and see whether the cart makes the ride.</p>
          </div>
        </aside>}
      </div>
    </section>
  );
}
