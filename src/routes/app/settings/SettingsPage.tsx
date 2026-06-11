import { useState, useEffect } from 'react'
import { Eye, EyeOff, Plus, X, Send, Save, ExternalLink, Bell, BellOff, Tag, Trash2 } from 'lucide-react'
import { useEmailConfig, type EmailConfig } from '@/hooks/useEmailConfig'
import { useCategorias } from '@/hooks/useCategorias'
import { useAuth } from '@/context/AuthContext'
import { UsuariosSection } from './UsuariosSection'
import type { Categoria, VerticalCategoria } from '@/types'
import {
  pushPermissionState,
  requestPushPermission,
  isPushRegistered,
  setupForegroundNotifications,
  unregisterPush,
} from '@/lib/firebase/messaging'

const VERTICALES: { value: VerticalCategoria; label: string }[] = [
  { value: 'quinta', label: 'Casa Quinta' },
  { value: 'deptos', label: 'Departamentos' },
  { value: 'flota', label: 'Flota' },
  { value: 'obras', label: 'Obras' },
  { value: 'empresa', label: 'Empresa' },
]

const TIPOS: { value: Categoria['tipo']; label: string }[] = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'ambos', label: 'Ambos' },
]

const TIPO_COLORS: Record<Categoria['tipo'], string> = {
  ingreso: 'bg-emerald-100 text-emerald-700',
  egreso: 'bg-red-100 text-red-700',
  ambos: 'bg-slate-100 text-slate-600',
}

function CategoriasSection() {
  const { categorias, loading, addCategoria, deleteCategoria } = useCategorias()
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<Categoria['tipo']>('egreso')
  const [verticalesSeleccionadas, setVerticalesSeleccionadas] = useState<VerticalCategoria[]>([])
  const [saving, setSaving] = useState(false)

  const toggleVertical = (v: VerticalCategoria) => {
    setVerticalesSeleccionadas((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  const handleAdd = async () => {
    if (!nombre.trim() || verticalesSeleccionadas.length === 0) return
    setSaving(true)
    try {
      await addCategoria({ nombre: nombre.trim(), tipo, verticales: verticalesSeleccionadas })
      setNombre('')
      setTipo('egreso')
      setVerticalesSeleccionadas([])
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Categorías</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva
        </button>
      </div>

      {showForm && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Mantenimiento, Alquiler..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Tipo</label>
            <div className="flex gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    tipo === t.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Verticales</label>
            <div className="flex flex-wrap gap-2">
              {VERTICALES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => toggleVertical(v.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    verticalesSeleccionadas.includes(v.value)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {verticalesSeleccionadas.length === 0 && (
              <p className="text-xs text-slate-400">Seleccioná al menos un vertical</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || !nombre.trim() || verticalesSeleccionadas.length === 0}
              className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-slate-400">No hay categorías aún.</p>
      ) : (
        <div className="space-y-2">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{cat.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[cat.tipo]}`}>
                    {TIPOS.find((t) => t.value === cat.tipo)?.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cat.verticales.map((v) => (
                    <span key={v} className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {VERTICALES.find((vv) => vv.value === v)?.label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => deleteCategoria(cat.id)}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const { config, loading, saving, saveConfig, sendTestEmail } = useEmailConfig()

  const [form, setForm] = useState<EmailConfig>({ remitente: '', appPassword: '', destinatarios: [] })
  const [initialized, setInitialized] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Push notifications state
  const [pushState, setPushState] = useState<'loading' | 'unsupported' | 'no-vapid' | 'denied' | 'registered' | 'unregistered' | 'error'>('loading')
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushWorking, setPushWorking] = useState(false)

  useEffect(() => {
    async function checkPush() {
      const perm = pushPermissionState()
      if (perm === 'unsupported') { setPushState('unsupported'); return }
      if (perm === 'denied') { setPushState('denied'); return }
      const registered = await isPushRegistered()
      setPushState(registered ? 'registered' : 'unregistered')
    }
    checkPush()
  }, [])

  if (!loading && !initialized) {
    setForm(config)
    setInitialized(true)
  }

  const addDestinatario = () => {
    const email = emailInput.trim().toLowerCase()
    if (!email || form.destinatarios.includes(email)) return
    setForm((f) => ({ ...f, destinatarios: [...f.destinatarios, email] }))
    setEmailInput('')
  }

  const removeDestinatario = (email: string) => {
    setForm((f) => ({ ...f, destinatarios: f.destinatarios.filter((e) => e !== email) }))
  }

  const handleSave = async () => {
    await saveConfig(form)
  }

  const handleEnablePush = async () => {
    setPushWorking(true)
    setPushError(null)
    try {
      const result = await requestPushPermission()
      if (result === 'granted') {
        await setupForegroundNotifications()
        setPushState('registered')
      } else if (result === 'denied') {
        setPushState('denied')
      } else if (result === 'unsupported') {
        setPushState('unsupported')
      } else if (result === 'error') {
        setPushState('error')
      } else {
        setPushState('no-vapid')
      }
    } catch (err) {
      setPushState('error')
      setPushError(err instanceof Error ? err.message : String(err))
    } finally {
      setPushWorking(false)
    }
  }

  const handleDisablePush = async () => {
    setPushWorking(true)
    try {
      await unregisterPush()
      setPushState('unregistered')
    } finally {
      setPushWorking(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await handleSave()
      await sendTestEmail()
      setTestResult({ ok: true, msg: 'Email enviado correctamente. Revisá tu casilla.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setTestResult({ ok: false, msg })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="text-slate-400 text-sm py-8 text-center">Cargando...</div>
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Alertas y notificaciones por email</p>
      </div>

      {/* Gmail remitente */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Cuenta Gmail que envía los correos</h2>

        <div className="space-y-1">
          <label className="text-sm text-slate-600">Dirección Gmail</label>
          <input
            type="email"
            value={form.remitente}
            onChange={(e) => setForm((f) => ({ ...f, remitente: e.target.value }))}
            placeholder="tucuenta@gmail.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-600">Contraseña de aplicación</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={form.appPassword}
              onChange={(e) => setForm((f) => ({ ...f, appPassword: e.target.value }))}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            No es tu contraseña de Gmail. Generala en{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:underline inline-flex items-center gap-0.5"
            >
              myaccount.google.com/apppasswords
              <ExternalLink size={11} />
            </a>
            {' '}(requiere verificación en 2 pasos activada).
          </p>
        </div>
      </section>

      {/* Destinatarios */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Destinatarios de alertas</h2>

        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestinatario())}
            placeholder="email@ejemplo.com"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={addDestinatario}
            className="bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {form.destinatarios.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.destinatarios.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm rounded-full px-3 py-1"
              >
                {email}
                <button
                  onClick={() => removeDestinatario(email)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Categorías */}
      <CategoriasSection />

      {/* Usuarios — solo admin */}
      {isAdmin && <UsuariosSection />}

      {/* Push notifications */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell size={17} className="text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Notificaciones push</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Recibí alertas en este dispositivo cuando llegue una nueva solicitud de reserva o reseña.
            </p>
          </div>
        </div>

        {pushState === 'loading' && (
          <p className="text-sm text-slate-400">Verificando...</p>
        )}

        {pushState === 'unsupported' && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-500">
            <BellOff size={15} />
            Tu navegador no soporta notificaciones push.
          </div>
        )}

        {pushState === 'no-vapid' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            Falta configurar el VAPID key en el servidor.
          </div>
        )}

        {pushState === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            Bloqueaste las notificaciones en el navegador. Para habilitarlas, cambiá el permiso en la configuración del sitio y recargá la página.
          </div>
        )}

        {pushState === 'registered' && (
          <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Bell size={15} className="flex-shrink-0" />
              <span>Notificaciones activas en este dispositivo</span>
            </div>
            <button
              onClick={handleDisablePush}
              disabled={pushWorking}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {pushWorking ? '...' : 'Desactivar'}
            </button>
          </div>
        )}

        {(pushState === 'unregistered' || pushState === 'error') && (
          <div className="space-y-2">
            {pushState === 'error' && (
              <p className="text-xs text-red-500 break-all">
                {pushError ?? 'Error desconocido al registrar.'}
              </p>
            )}
            <button
              onClick={handleEnablePush}
              disabled={pushWorking}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Bell size={15} />
              {pushWorking ? 'Activando...' : 'Activar notificaciones en este dispositivo'}
            </button>
          </div>
        )}
      </section>

      {/* Test result */}
      {testResult && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            testResult.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {testResult.msg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || saving}
          className="flex items-center gap-2 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Send size={16} />
          {testing ? 'Enviando...' : 'Enviar email de prueba'}
        </button>
      </div>
    </div>
  )
}
