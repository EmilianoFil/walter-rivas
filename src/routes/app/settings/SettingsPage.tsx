import { useState } from 'react'
import { Eye, EyeOff, Plus, X, Send, Save, ExternalLink } from 'lucide-react'
import { useEmailConfig, type EmailConfig } from '@/hooks/useEmailConfig'

export function SettingsPage() {
  const { config, loading, saving, saveConfig, sendTestEmail } = useEmailConfig()

  const [form, setForm] = useState<EmailConfig>({ remitente: '', appPassword: '', destinatarios: [] })
  const [initialized, setInitialized] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

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
