import { useState } from 'react'
import { Users, Plus, X, Trash2, Edit2, Check, Eye, EyeOff, Shield } from 'lucide-react'
import { useUsuarios } from '@/hooks/useUsuarios'
import { useAuth } from '@/context/AuthContext'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import type { UsuarioApp, VerticalPermiso } from '@/types'

const VERTICALES: { value: VerticalPermiso; label: string }[] = [
  { value: 'quinta', label: 'Casa Quinta' },
  { value: 'deptos', label: 'Departamentos' },
  { value: 'obras', label: 'Obras' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'flota', label: 'Flota' },
]

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white'

export function UsuariosSection() {
  const { perfil: miPerfil } = useAuth()
  const { usuarios, loading, crearUsuario, actualizarVerticales, actualizarNombre, eliminarUsuario } = useUsuarios()

  const [showForm, setShowForm] = useState(false)
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UsuarioApp | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  // Form nuevo usuario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verticalesForm, setVerticalesForm] = useState<VerticalPermiso[]>([])
  const [rolForm, setRolForm] = useState<'usuario' | 'colaborador'>('usuario')
  const [verticalColabForm, setVerticalColabForm] = useState<VerticalPermiso | ''>('')

  // Edición inline de verticales
  const [editVerticales, setEditVerticales] = useState<VerticalPermiso[]>([])
  const [editNombre, setEditNombre] = useState('')

  const resetForm = () => {
    setNombre(''); setEmail(''); setPassword(''); setVerticalesForm([]); setRolForm('usuario'); setVerticalColabForm(''); setError(null); setShowPass(false)
  }

  const toggleVertical = (v: VerticalPermiso, arr: VerticalPermiso[], setArr: (a: VerticalPermiso[]) => void) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  const handleCrear = async () => {
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setError('Completá todos los campos. La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (rolForm === 'usuario' && verticalesForm.length === 0) {
      setError('Asigná al menos un vertical.')
      return
    }
    if (rolForm === 'colaborador' && !verticalColabForm) {
      setError('Seleccioná el vertical del colaborador.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await crearUsuario({
        email: email.trim(),
        password,
        nombre: nombre.trim(),
        rol: rolForm,
        verticales: rolForm === 'colaborador' ? [] : verticalesForm,
        verticalColaborador: rolForm === 'colaborador' ? (verticalColabForm as VerticalPermiso) : undefined,
      })
      resetForm()
      setShowForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario'
      if (msg.includes('email-already-in-use')) setError('Ese email ya está registrado.')
      else if (msg.includes('invalid-email')) setError('Email inválido.')
      else setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (u: UsuarioApp) => {
    setEditingUid(u.uid)
    setEditVerticales(u.verticales)
    setEditNombre(u.nombre)
  }

  const handleSaveEdit = async (uid: string) => {
    setSaving(true)
    try {
      await actualizarVerticales(uid, editVerticales)
      await actualizarNombre(uid, editNombre)
      setEditingUid(null)
    } finally {
      setSaving(false)
    }
  }

  const noAdmins = usuarios.filter((u) => u.rol !== 'admin')

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Usuarios</h2>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v) }}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo usuario
        </button>
      </div>

      {/* Form nuevo usuario */}
      {showForm && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo usuario</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan Pérez" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="juan@mail.com" className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Contraseña inicial</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                className={inputCls + ' pr-9'}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Tipo de acceso */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Tipo de acceso</label>
            <div className="grid grid-cols-2 gap-2">
              {([['usuario', 'Usuario completo'], ['colaborador', 'Colaborador']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRolForm(val)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    rolForm === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {rolForm === 'colaborador' && (
              <p className="text-xs text-slate-400 pt-0.5">Solo puede agregar movimientos en su vertical, y ver los propios.</p>
            )}
          </div>

          {rolForm === 'usuario' ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Verticales que puede ver</label>
              <div className="flex flex-wrap gap-2">
                {VERTICALES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => toggleVertical(v.value, verticalesForm, setVerticalesForm)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      verticalesForm.includes(v.value)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Vertical asignada</label>
              <div className="flex flex-wrap gap-2">
                {VERTICALES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVerticalColabForm(v.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      verticalColabForm === v.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={handleCrear} disabled={saving} className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => {
            const esMiPerfil = u.uid === miPerfil?.uid
            const isAdmin = u.rol === 'admin'
            const editing = editingUid === u.uid

            return (
              <div key={u.uid} className={`rounded-xl border p-3.5 space-y-2 transition-colors ${editing ? 'border-slate-300 bg-slate-50' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className={inputCls + ' text-sm mb-1'}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{u.nombre}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                        {u.rol === 'colaborador' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                            Colaborador · {VERTICALES.find((v) => v.value === u.verticalColaborador)?.label ?? u.verticalColaborador}
                          </span>
                        )}
                        {esMiPerfil && (
                          <span className="text-xs text-slate-400">(vos)</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>

                  {!isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(u.uid)}
                            disabled={saving}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                          >
                            <Check size={15} />
                          </button>
                          <button onClick={() => setEditingUid(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(u)} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(u)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Verticales */}
                {!isAdmin && (
                  <div className="flex flex-wrap gap-1.5">
                    {editing ? (
                      VERTICALES.map((v) => (
                        <button
                          key={v.value}
                          onClick={() => toggleVertical(v.value, editVerticales, setEditVerticales)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                            editVerticales.includes(v.value)
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))
                    ) : u.verticales.length > 0 ? (
                      u.verticales.map((v) => (
                        <span key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {VERTICALES.find((vv) => vv.value === v)?.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Sin acceso asignado</span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <p className="text-xs text-slate-400">Acceso completo a todos los verticales</p>
                )}
              </div>
            )
          })}

          {noAdmins.length === 0 && !showForm && (
            <p className="text-sm text-slate-400 text-center py-2">Solo vos como admin. Creá usuarios con el botón de arriba.</p>
          )}
        </div>
      )}

      <ConfirmSheet
        open={!!confirmDelete}
        title="¿Eliminar usuario?"
        subtitle={confirmDelete ? `${confirmDelete.nombre} (${confirmDelete.email}) perderá el acceso.` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => { if (confirmDelete) await eliminarUsuario(confirmDelete.uid); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  )
}
