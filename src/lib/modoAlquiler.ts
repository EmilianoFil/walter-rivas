/**
 * Determina el modo de alquiler según el horario de checkout configurado.
 *
 * MODO NOCHES  (horaCheckout antes de las 15:00, ej: "10:00"):
 *   - El día de salida queda LIBRE para otra reserva.
 *   - Rango ocupado: [fechaDesde, fechaHasta)  — el último día es libre.
 *   - Cuenta: "N noches" = diffDias(desde, hasta).
 *
 * MODO DÍAS (horaCheckout 15:00 o después, ej: "22:00"):
 *   - El día de salida también está OCUPADO.
 *   - Rango ocupado: [fechaDesde, fechaHasta]  — inclusive en ambos extremos.
 *   - Cuenta: "N días" = diffDias(desde, hasta) + 1.
 */
export function esModoNoches(horaCheckout?: string): boolean {
  if (!horaCheckout) return true                          // sin config → noches por defecto
  const [h, m] = horaCheckout.split(':').map(Number)
  const minutos = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m)
  return minutos < 15 * 60                               // antes de 15:00 → noches
}

/** Cuenta de unidades según el modo: noches o días (inclusivo). */
export function contarUnidades(desde: Date, hasta: Date, noches: boolean): number {
  const diff = Math.round(Math.abs(hasta.getTime() - desde.getTime()) / 86400000)
  return noches ? diff : diff + 1
}

/** Texto de unidad singular/plural según el modo. */
export function labelUnidad(n: number, noches: boolean): string {
  if (noches) return n === 1 ? '1 noche' : `${n} noches`
  return n === 1 ? '1 día' : `${n} días`
}
