import React from 'react'
import { Users } from 'lucide-react'

const INTEGRANTES = [
  { legajo: '61540', nombre: 'Garcia Mc Guiness Gonzalo' },
  { legajo: '61732', nombre: 'Paz Mikael' },
  { legajo: '61673', nombre: 'Delgado Emanuel' }
] as const

interface GrupoIntegrantesCardProps {
  className?: string
}

/** Tarjeta con los datos e integrantes del Grupo N° 8. */
export function GrupoIntegrantesCard({ className = '' }: GrupoIntegrantesCardProps) {
  return (
    <aside
      aria-label="Integrantes del Grupo N° 8"
      className={`w-full sm:w-auto sm:min-w-[310px] sm:max-w-sm bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all ${className}`}
    >
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/70 text-[#d97736] flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-900 tracking-tight">
            Grupo N° 8:
          </p>
          <p className="text-[11px] font-semibold text-slate-500">
            Integrantes:
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 text-xs text-slate-700">
        {INTEGRANTES.map(({ legajo, nombre }) => (
          <li
            key={legajo}
            className="flex items-start gap-2 bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97736] shrink-0 mt-1.5" />
            <span className="font-medium leading-snug break-words">
              <span className="font-mono font-bold text-[#c86928]">{legajo}</span> - {nombre}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
