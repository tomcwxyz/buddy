"use client";

export function CoasterModeSwitch({
  mode,
  canRide,
  riding,
  onChange,
}: {
  mode: "build" | "ride";
  canRide: boolean;
  riding: boolean;
  onChange: (mode: "build" | "ride") => void;
}) {
  return (
    <div className="coaster-mode-switch" aria-label="Coaster mode">
      <button
        type="button"
        aria-label="Build mode"
        aria-pressed={mode === "build"}
        className={mode === "build" ? "active" : ""}
        onClick={() => onChange("build")}
        disabled={riding}
      >
        <span>Build</span>
        <small>Make and change the ride</small>
      </button>
      <button
        type="button"
        aria-label="Ride mode"
        aria-pressed={mode === "ride"}
        className={mode === "ride" ? "active" : ""}
        onClick={() => onChange("ride")}
        disabled={!canRide || riding}
      >
        <span>Ride</span>
        <small>Clear the tools and test it</small>
      </button>
    </div>
  );
}
