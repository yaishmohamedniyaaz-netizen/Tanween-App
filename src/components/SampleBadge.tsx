export function SampleBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`sample-badge ${compact ? "is-compact" : ""}`}>
      Sample
    </span>
  );
}
