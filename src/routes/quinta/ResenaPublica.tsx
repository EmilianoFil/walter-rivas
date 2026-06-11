import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, getDoc, getDocs, addDoc, collection, query, where, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Star, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform active:scale-90"
        >
          <Star
            size={36}
            className={cn(
              'transition-colors',
              (hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function ResenaPublica() {
  const [params] = useSearchParams()
  const reservaId = params.get('r')

  const [estrellas, setEstrellas] = useState(0)
  const [comentarios, setComentarios] = useState('')
  const [loMejor, setLoMejor] = useState('')
  const [mejoras, setMejoras] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [yaExiste, setYaExiste] = useState(false)
  const [checkingExistente, setCheckingExistente] = useState(true)
  const [error, setError] = useState('')

  // Al montar: verificar si ya hay reseña para este reservaId
  useEffect(() => {
    if (!reservaId) { setCheckingExistente(false); return }
    getDocs(query(collection(db, 'resenas'), where('reservaId', '==', reservaId), limit(1)))
      .then((snap) => { if (!snap.empty) setYaExiste(true) })
      .finally(() => setCheckingExistente(false))
  }, [reservaId])

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition resize-none'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (estrellas === 0) { setError('Elegí una puntuación'); return }
    if (!comentarios.trim()) { setError('Dejanos un comentario general'); return }
    if (!loMejor.trim()) { setError('Contanos qué fue lo que más te gustó'); return }
    setLoading(true)
    setError('')
    try {
      // Traer nombre del huésped si tenemos el reservaId
      let nombre = ''
      if (reservaId) {
        const snap = await getDoc(doc(db, 'reservas', reservaId))
        nombre = snap.data()?.inquilino?.nombre ?? ''
      }

      await addDoc(collection(db, 'resenas'), {
        reservaId: reservaId ?? null,
        nombre,
        estrellas,
        comentarios: comentarios.trim(),
        loMejor: loMejor.trim(),
        mejoras: mejoras.trim() || null,
        creadoEn: Timestamp.now(),
      })
      setEnviado(true)
    } catch {
      setError('Hubo un error al guardar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!reservaId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <p className="text-slate-400 text-sm text-center">Link inválido. Por favor usá el link que recibiste por email.</p>
      </div>
    )
  }

  if (checkingExistente) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (yaExiste) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-10 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">¡Ya dejaste tu reseña!</h2>
          <p className="text-slate-500 text-sm">Tu opinión ya fue registrada. ¡Muchas gracias y esperamos verte pronto!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">

        {!enviado ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-500 px-6 py-8 text-center">
              <p className="text-3xl mb-2">🏡</p>
              <h1 className="text-xl font-bold text-white">¿Cómo estuvo tu estadía?</h1>
              <p className="text-emerald-100 text-sm mt-1">Tu opinión nos ayuda a mejorar</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

              {/* Estrellas */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3 text-center">Puntuación general</p>
                <div className="flex justify-center">
                  <StarRating value={estrellas} onChange={setEstrellas} />
                </div>
                {estrellas > 0 && (
                  <p className="text-center text-xs text-slate-400 mt-2">
                    {['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'][estrellas]}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Comentario general */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comentarios *
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Contanos cómo fue tu experiencia..."
                />
              </div>

              {/* Lo mejor */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Qué fue lo que más te gustó? *
                </label>
                <textarea
                  value={loMejor}
                  onChange={(e) => setLoMejor(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="El lugar, la pileta, la tranquilidad..."
                />
              </div>

              {/* Mejoras — privado, solo lo ve el admin */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Qué te gustaría que mejoremos?
                </label>
                <textarea
                  value={mejoras}
                  onChange={(e) => setMejoras(e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="Opcional — toda sugerencia es bienvenida"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl transition"
              >
                {loading ? 'Enviando...' : 'Enviar calificación'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">¡Gracias por tu calificación!</h2>
            <p className="text-slate-500 text-sm">Tu opinión es muy valiosa para nosotros. ¡Esperamos verte pronto!</p>
            <div className="flex justify-center gap-0.5 mt-2">
              {Array.from({ length: estrellas }).map((_, i) => (
                <Star key={i} size={24} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-6">Casa Quinta</p>
      </div>
    </div>
  )
}
