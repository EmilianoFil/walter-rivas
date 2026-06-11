interface Props {
  open: boolean
  title: string
  subtitle?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title,
  subtitle,
  confirmLabel = 'Confirmar',
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 space-y-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="text-base font-semibold text-slate-900 text-center">{title}</p>
        {subtitle && (
          <p className="text-sm text-slate-500 text-center -mt-1">{subtitle}</p>
        )}
        <button
          onClick={onConfirm}
          className={
            destructive
              ? 'w-full py-3.5 rounded-2xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition'
              : 'w-full py-3.5 rounded-2xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition'
          }
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 text-sm font-medium text-slate-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
