export default function Loading() {
  return (
    <div role="status" aria-label="Memuat halaman" className="space-y-6">
      <span className="sr-only">Memuat halaman...</span>
      <div aria-hidden="true" className="space-y-6 animate-pulse">
        <div className="h-8 w-44 rounded-lg bg-[var(--surface-elevated)]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-2xl bg-[var(--surface-elevated)]" />
          <div className="h-36 rounded-2xl bg-[var(--surface-elevated)]" />
        </div>
        <div className="h-64 rounded-2xl bg-[var(--surface-elevated)]" />
      </div>
    </div>
  );
}
