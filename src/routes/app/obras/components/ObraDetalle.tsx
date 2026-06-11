import type { Obra, CobroObra, GastoObra } from '@/types'
import { ProyectoDetalle } from '@/components/ProyectoDetalle'

interface Props {
  obra: Obra
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddCobro: (cobro: Omit<CobroObra, 'id'>) => Promise<void>
  onUpdateCobro: (id: string, data: Partial<Omit<CobroObra, 'id'>>) => Promise<void>
  onDeleteCobro: (cobroId: string) => Promise<void>
  onAddGasto: (gasto: Omit<GastoObra, 'id' | 'adjuntos'>) => Promise<void>
  onUpdateGasto: (id: string, data: Partial<Omit<GastoObra, 'id' | 'adjuntos'>>) => Promise<void>
  onDeleteGasto: (gastoId: string) => Promise<void>
}

const ESTADO_CONFIG = {
  activa: { label: 'Activa', cls: 'bg-emerald-100 text-emerald-700' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-600' },
}

export function ObraDetalle({ obra, onClose, onEdit, onDelete, onAddCobro, onUpdateCobro, onDeleteCobro, onAddGasto, onUpdateGasto, onDeleteGasto }: Props) {
  return (
    <ProyectoDetalle
      proyecto={{
        nombre: obra.nombre,
        descripcion: obra.descripcion,
        cliente: obra.cliente,
        presupuesto: obra.presupuesto,
        estado: obra.estado,
        ingresos: obra.cobros.map((c) => ({
          id: c.id,
          monto: c.monto,
          fecha: c.fecha,
          descripcion: c.notas,
          categoria: c.categoria,
        })),
        gastos: obra.gastos.map((g) => ({
          id: g.id,
          monto: g.monto,
          fecha: g.fecha,
          descripcion: g.descripcion,
          categoria: g.categoria,
        })),
      }}
      vertical="obras"
      labels={{
        ingresos: 'Cobros',
        gastos: 'Gastos',
        nuevoIngreso: 'Nuevo cobro',
        nuevoGasto: 'Nuevo gasto',
      }}
      estadoConfig={ESTADO_CONFIG}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddIngreso={(data) => onAddCobro({ monto: data.monto, fecha: data.fecha, notas: data.descripcion, categoria: data.categoria })}
      onUpdateIngreso={(id, data) => onUpdateCobro(id, { monto: data.monto, fecha: data.fecha, notas: data.descripcion, categoria: data.categoria })}
      onDeleteIngreso={onDeleteCobro}
      onAddGasto={(data) => onAddGasto({ descripcion: data.descripcion, monto: data.monto, fecha: data.fecha, categoria: data.categoria })}
      onUpdateGasto={(id, data) => onUpdateGasto(id, { descripcion: data.descripcion, monto: data.monto, fecha: data.fecha, categoria: data.categoria })}
      onDeleteGasto={onDeleteGasto}
    />
  )
}
