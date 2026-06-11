import { cn } from '@/lib/cn'

// ── Bloque base ───────────────────────────────────────────────────────────────
export function Sk({ className }: { className?: string }) {
  return <div className={cn('bg-slate-100 rounded-xl animate-pulse', className)} />
}

// ── Card genérica con título + subtítulo ──────────────────────────────────────
export function SkCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 p-4 space-y-2.5', className)}>
      <Sk className="h-4 w-2/5" />
      <Sk className="h-3 w-3/5" />
    </div>
  )
}

// ── Fila de lista (ícono + texto + chevron) ───────────────────────────────────
export function SkRow({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3', className)}>
      <Sk className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Sk className="h-3.5 w-2/5" />
        <Sk className="h-2.5 w-3/5" />
      </div>
      <Sk className="w-4 h-4 rounded-full flex-shrink-0" />
    </div>
  )
}

// ── Grid de 3 KPI cards ───────────────────────────────────────────────────────
export function SkKpis() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3.5 space-y-2">
          <Sk className="h-2.5 w-3/5" />
          <Sk className="h-5 w-4/5" />
        </div>
      ))}
    </div>
  )
}

// ── Header (ícono + título + botón) ──────────────────────────────────────────
export function SkHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sk className="w-9 h-9 rounded-xl" />
        <Sk className="h-5 w-28" />
      </div>
      <Sk className="h-8 w-28 rounded-xl" />
    </div>
  )
}

// ── Skeleton página con lista (header + kpis + N filas) ───────────────────────
export function SkPage({ rows = 3, kpis = true }: { rows?: number; kpis?: boolean }) {
  return (
    <div className="space-y-5">
      <SkHeader />
      {kpis && <SkKpis />}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => <SkRow key={i} />)}
      </div>
    </div>
  )
}
