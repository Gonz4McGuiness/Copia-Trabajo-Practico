'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { GrupoIntegrantesCard } from '@/components/GrupoIntegrantesCard'
import { formatearCentavos } from '@/lib/format'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MetricasTablero {
  hoy: { cantidad: number; importe: number }
  mes: { cantidad: number; importe: number; ticketPromedio: number }
  cuentasCorrientes: { totalAdeudado: number; clientesConSaldo: number }
  bajoMinimo: { cantidad: number }
  ventasDiarias: Array<{ fecha: string; importe: number; cantidad: number }>
  porFormaDePago: Array<{ forma: string; importe: number }>
  masVendidos: Array<{
    productoId: number
    codigo: string
    descripcion: string
    unidades: number
    importe: number
  }>
}

export default function TableroPage() {
  const [metricas, setMetricas] = useState<MetricasTablero | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarTablero() {
      try {
        const res = await fetch('/api/tablero')
        if (!res.ok) {
          throw new Error('No se pudieron obtener las métricas del tablero')
        }
        const data = await res.json()
        setMetricas(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarTablero()
  }, [])

  if (cargando) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 border-3 border-[#d97736] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
            Sincronizando métricas en tiempo real...
          </p>
        </div>
      </AppLayout>
    )
  }

  if (error || !metricas) {
    return (
      <AppLayout>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 max-w-lg mx-auto my-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
          <h2 className="font-bold text-base mb-1">No se pudo cargar el tablero</h2>
          <p className="text-xs text-rose-600">{error || 'Error inesperado'}</p>
        </div>
      </AppLayout>
    )
  }

  // Gráfico de Línea: 30 Días
  const lineLabels = metricas.ventasDiarias.map((v) => {
    const partes = v.fecha.split('-')
    return `${partes[2]}/${partes[1]}`
  })
  const lineValues = metricas.ventasDiarias.map((v) => v.importe / 100)

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Facturación ($)',
        data: lineValues,
        borderColor: '#d97736',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx
          const gradient = ctx.createLinearGradient(0, 0, 0, 300)
          gradient.addColorStop(0, 'rgba(217, 119, 54, 0.18)')
          gradient.addColorStop(1, 'rgba(217, 119, 54, 0.0)')
          return gradient
        },
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#d97736',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2429',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` Venta: $ ${context.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${(value / 1000).toFixed(0)}k`,
          font: { size: 10 },
          color: '#64748b'
        },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 12, font: { size: 10 }, color: '#64748b' }
      }
    }
  }

  // Gráfico de Dona: Formas de Pago
  const etiquetasPago: Record<string, string> = {
    contado: 'Contado / Efectivo',
    tarjeta: 'Tarjetas de Débito/Crédito',
    cuenta_corriente: 'Cuenta Corriente'
  }
  const doughnutLabels = metricas.porFormaDePago.map(
    (p) => etiquetasPago[p.forma] || p.forma
  )
  const doughnutValues = metricas.porFormaDePago.map((p) => p.importe / 100)

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues,
        backgroundColor: ['#d97736', '#475569', '#3b82f6'],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 4
      }
    ]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, font: { size: 11 }, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#1f2429',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` $ ${context.parsed.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    cutout: '72%'
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Banner Hero Comercial */}
        <div className="tablero-hero-banner">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="tablero-hero-badge">
                <Sparkles className="w-3.5 h-3.5 text-[#f29a59]" />
                <span>Panel Estratégico de Ventas</span>
              </div>
              <h1 className="tablero-hero-title">
                Control Global del Mostrador
              </h1>
              <p className="tablero-hero-desc">
                Supervisión de operaciones, existencias críticas y cobranzas en cuentas corrientes.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/ventas"
                className="group btn-primary-gradient px-5 py-3 text-xs uppercase tracking-wider gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Abrir Mostrador</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Adorno estético tenue */}
          <div className="tablero-hero-glow"></div>
        </div>

        {/* Tarjetas KPI de Alto Impacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas Hoy */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ventas de Hoy
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatearCentavos(metricas.hoy.importe)}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {metricas.hoy.cantidad} tickets
                </span>
                <span className="text-slate-400">emitidos hoy</span>
              </div>
            </div>
          </div>

          {/* Facturación Mensual */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mes en Curso
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {formatearCentavos(metricas.mes.importe)}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {metricas.mes.cantidad} facturas
                </span>
                <span className="text-slate-400 truncate">
                  Prom: {formatearCentavos(metricas.mes.ticketPromedio)}
                </span>
              </div>
            </div>
          </div>

          {/* Cartera por Cobrar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Por Cobrar (Cta Cte)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-amber-700 tracking-tight">
                {formatearCentavos(metricas.cuentasCorrientes.totalAdeudado)}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {metricas.cuentasCorrientes.clientesConSaldo} clientes
                </span>
                <span className="text-slate-400">con saldo deudor</span>
              </div>
            </div>
          </div>

          {/* Alertas de Stock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Inventario Crítico
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-rose-700 tracking-tight">
                {metricas.bajoMinimo.cantidad}
              </p>
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-500">Bajo punto de reposición</span>
                <Link
                  href="/productos"
                  className="font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-0.5"
                >
                  <span>Reponer</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Analítica Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Evolución Diaria */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Facturación Diaria (30 Días)</h3>
                  <p className="text-xs text-slate-500">Seguimiento continuo de volumen de ventas</p>
                </div>
              </div>
            </div>
            <div className="h-72">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>

          {/* Desglose por Medio de Pago */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Distribución de Cobros</h3>
                  <p className="text-xs text-slate-500">Participación por medio en el mes</p>
                </div>
              </div>

              <div className="h-56 relative flex items-center justify-center my-2">
                {doughnutValues.some((v) => v > 0) ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <p className="text-xs text-slate-400">Sin transacciones registradas</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              {metricas.porFormaDePago.map((p) => (
                <div key={p.forma} className="bg-slate-50/70 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold truncate">
                    {p.forma.replace('_', ' ')}
                  </p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">
                    {formatearCentavos(p.importe)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección: Top 5 Productos con Mejor Rotación */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Artículos Más Vendidos del Mes</h3>
              <p className="text-xs text-slate-500">Ranking por volumen de unidades despachadas</p>
            </div>
            <Link
              href="/productos"
              className="text-xs font-bold text-[#d97736] hover:text-[#c86928] flex items-center gap-1 group"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {metricas.masVendidos.map((prod, index) => (
              <div
                key={prod.productoId}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : index === 1
                      ? 'bg-slate-200 text-slate-800'
                      : index === 2
                      ? 'bg-orange-100 text-orange-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{prod.descripcion}</p>
                    <p className="text-[11px] font-mono text-slate-400">Código: {prod.codigo}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-800">
                    {prod.unidades} {prod.unidades === 1 ? 'unidad' : 'unidades'}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    {formatearCentavos(prod.importe)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Créditos del Grupo en esquina inferior derecha */}
        <div className="flex justify-end">
          <GrupoIntegrantesCard />
        </div>
      </div>
    </AppLayout>
  )
}
