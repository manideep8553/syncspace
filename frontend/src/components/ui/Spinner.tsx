export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading-screen flex items-center" role="status">
      <span className="spinner" />
      {label && <span className="muted" style={{ marginLeft: 12 }}>{label}</span>}
    </div>
  );
}