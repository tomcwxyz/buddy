type RollercoasterProgressProps = {
  total: number;
  built: number;
  label?: string;
  compact?: boolean;
};

export function RollercoasterProgress({
  total,
  built,
  label,
  compact = false,
}: RollercoasterProgressProps) {
  const visiblePieces = Math.max(1, Math.min(total, 12));
  const visibleBuilt = total <= 12
    ? Math.min(built, visiblePieces)
    : Math.round((Math.min(built, total) / total) * visiblePieces);

  return (
    <section
      className={`rollercoaster-progress${compact ? " compact" : ""}`}
      aria-label={`${built} of ${total} rollercoaster pieces built`}
    >
      <div className="rollercoaster-copy">
        <span>{label ?? "Your word ride"}</span>
        <strong>{built >= total && total > 0 ? "The track is built." : "The track is taking shape."}</strong>
        <p>Each word you explore adds a piece. Nothing gets taken away.</p>
      </div>

      <div className="rollercoaster-track" aria-hidden="true">
        {Array.from({ length: visiblePieces }, (_, index) => (
          <span
            key={index}
            className={`rollercoaster-piece shape-${index % 5}${index < visibleBuilt ? " built" : ""}`}
          >
            <i />
          </span>
        ))}
      </div>

      <span className="rollercoaster-count">{Math.min(built, total)} explored · {total} words</span>
    </section>
  );
}
