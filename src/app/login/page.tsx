'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { GrupoIntegrantesCard } from '@/components/GrupoIntegrantesCard'
import { Store } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()
  const { refrescar } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas')
        setCargando(false)
        return
      }

      await refrescar()
      router.push('/ventas')
      router.refresh()
    } catch {
      setError('Error al conectar con el servidor')
      setCargando(false)
    }
  }

  const loginRapido = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
  }

  return (
    <div className="login-page-container">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="login-card">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="login-logo-box">
              <Store className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="login-title">
                Mostrador
              </h1>
              <span className="badge badge-accent">
                PRO
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1">
              Gestión Comercial & Facturación
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">
                Correo o usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@comercio.com"
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="btn btn-primary-gradient btn-full btn-lg mt-2"
            >
              {cargando ? 'Ingresando...' : 'Iniciar sesión →'}
            </button>
          </form>

          {/* Acceso rápido para la defensa / pruebas */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium mb-3">
              Accesos de prueba rápidos:
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => loginRapido('admin@comercio.com', 'admin123')}
                className="login-quick-btn login-quick-btn-admin"
              >
                👑 Administradora
              </button>
              <button
                type="button"
                onClick={() => loginRapido('vendedor@comercio.com', 'vendedor123')}
                className="login-quick-btn login-quick-btn-seller"
              >
                💼 Vendedora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Créditos del Grupo en esquina inferior derecha */}
      <div className="w-full flex justify-end xl:fixed xl:bottom-6 xl:right-6 xl:w-auto xl:z-10">
        <GrupoIntegrantesCard className="shadow-xl border-white/15" />
      </div>
    </div>
  )
}
