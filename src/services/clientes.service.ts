import { and, eq, like, or } from 'drizzle-orm'
import { db, DbTx } from '../db'
import { clientes, facturas, pagos, Cliente, NuevoCliente } from '../db/schema'
import { ApiError } from './api-error'

export interface ClienteConSaldo extends Cliente {
  saldoCentavos: number
  creditoDisponibleCentavos: number | null
}

export async function calcularSaldoCliente(clienteId: number, tx?: DbTx): Promise<number> {
  const conn = tx ?? db
  // Suma de facturas en cuenta corriente emitidas (cargos)
  const facturasCC = await conn
    .select({ total: facturas.totalCentavos })
    .from(facturas)
    .where(
      and(
        eq(facturas.clienteId, clienteId),
        eq(facturas.formaPago, 'cuenta_corriente'),
        eq(facturas.estado, 'EMITIDA')
      )
    )

  const totalCargos = facturasCC.reduce((acc, f) => acc + f.total, 0)

  // Suma de pagos realizados (abonos)
  const pagosCliente = await conn
    .select({ importe: pagos.importeCentavos })
    .from(pagos)
    .where(eq(pagos.clienteId, clienteId))

  const totalAbonos = pagosCliente.reduce((acc, p) => acc + p.importe, 0)

  return totalCargos - totalAbonos
}

export async function listarClientes(filtros: {
  buscar?: string
  soloActivos?: boolean
} = {}): Promise<ClienteConSaldo[]> {
  const condiciones = []

  if (filtros.soloActivos !== false) {
    condiciones.push(eq(clientes.activo, true))
  }

  if (filtros.buscar) {
    const termino = `%${filtros.buscar.trim()}%`
    condiciones.push(
      or(
        like(clientes.documento, termino),
        like(clientes.nombre, termino),
        like(clientes.email, termino)
      )
    )
  }

  const lista = await db
    .select()
    .from(clientes)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(clientes.nombre)

  const resultado: ClienteConSaldo[] = []
  for (const c of lista) {
    const saldo = await calcularSaldoCliente(c.id)
    const disponible =
      c.limiteCreditoCentavos !== null ? Math.max(0, c.limiteCreditoCentavos - saldo) : null

    resultado.push({
      ...c,
      saldoCentavos: saldo,
      creditoDisponibleCentavos: disponible
    })
  }

  return resultado
}

export async function obtenerClientePorId(id: number): Promise<ClienteConSaldo> {
  const [c] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
  if (!c) {
    throw new ApiError(404, 'CLIENTE_NO_ENCONTRADO', 'Cliente no encontrado')
  }

  const saldo = await calcularSaldoCliente(c.id)
  const disponible =
    c.limiteCreditoCentavos !== null ? Math.max(0, c.limiteCreditoCentavos - saldo) : null

  return {
    ...c,
    saldoCentavos: saldo,
    creditoDisponibleCentavos: disponible
  }
}

export async function crearCliente(datos: {
  tipoDocumento?: 'DNI' | 'CUIT'
  documento: string
  nombre: string
  domicilio?: string
  telefono?: string
  email?: string
  habilitadoCuentaCorriente?: boolean
  limiteCreditoCentavos?: number | null
}): Promise<Cliente> {
  const documentoLimpio = datos.documento.trim()
  const nombreLimpio = datos.nombre.trim()

  if (!documentoLimpio || !nombreLimpio) {
    throw new ApiError(400, 'DATOS_INVALIDOS', 'Documento y nombre son requeridos')
  }

  const existentes = await db
    .select()
    .from(clientes)
    .where(eq(clientes.documento, documentoLimpio))
    .limit(1)

  if (existentes.length > 0) {
    throw new ApiError(400, 'DOCUMENTO_DUPLICADO', 'Ya existe un cliente con ese número de documento')
  }

  const [nuevo] = await db
    .insert(clientes)
    .values({
      tipoDocumento: datos.tipoDocumento || 'DNI',
      documento: documentoLimpio,
      nombre: nombreLimpio,
      domicilio: datos.domicilio?.trim() || null,
      telefono: datos.telefono?.trim() || null,
      email: datos.email?.trim() || null,
      habilitadoCuentaCorriente: datos.habilitadoCuentaCorriente ?? true,
      limiteCreditoCentavos:
        datos.limiteCreditoCentavos !== undefined ? datos.limiteCreditoCentavos : null,
      activo: true,
      creadoEn: new Date().toISOString()
    })
    .returning()

  return nuevo
}

export async function actualizarCliente(
  id: number,
  datos: {
    tipoDocumento?: 'DNI' | 'CUIT'
    documento?: string
    nombre?: string
    domicilio?: string | null
    telefono?: string | null
    email?: string | null
    habilitadoCuentaCorriente?: boolean
    limiteCreditoCentavos?: number | null
    activo?: boolean
  }
): Promise<Cliente> {
  const [existente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
  if (!existente) {
    throw new ApiError(404, 'CLIENTE_NO_ENCONTRADO', 'Cliente no encontrado')
  }

  const actualizacion: Partial<NuevoCliente> = {}

  if (datos.documento !== undefined) {
    const docLimpio = datos.documento.trim()
    if (!docLimpio) {
      throw new ApiError(400, 'DATOS_INVALIDOS', 'El documento no puede estar vacío')
    }
    const duplicado = await db
      .select()
      .from(clientes)
      .where(eq(clientes.documento, docLimpio))
      .limit(1)

    if (duplicado.length > 0 && duplicado[0].id !== id) {
      throw new ApiError(400, 'DOCUMENTO_DUPLICADO', 'El documento ya pertenece a otro cliente')
    }
    actualizacion.documento = docLimpio
  }

  if (datos.nombre !== undefined) {
    const nombreLimpio = datos.nombre.trim()
    if (!nombreLimpio) {
      throw new ApiError(400, 'DATOS_INVALIDOS', 'El nombre no puede estar vacío')
    }
    actualizacion.nombre = nombreLimpio
  }

  if (datos.tipoDocumento !== undefined) actualizacion.tipoDocumento = datos.tipoDocumento
  if (datos.domicilio !== undefined) actualizacion.domicilio = datos.domicilio?.trim() || null
  if (datos.telefono !== undefined) actualizacion.telefono = datos.telefono?.trim() || null
  if (datos.email !== undefined) actualizacion.email = datos.email?.trim() || null
  if (datos.habilitadoCuentaCorriente !== undefined)
    actualizacion.habilitadoCuentaCorriente = datos.habilitadoCuentaCorriente
  if (datos.limiteCreditoCentavos !== undefined)
    actualizacion.limiteCreditoCentavos = datos.limiteCreditoCentavos
  if (datos.activo !== undefined) actualizacion.activo = datos.activo

  const [actualizado] = await db
    .update(clientes)
    .set(actualizacion)
    .where(eq(clientes.id, id))
    .returning()

  return actualizado
}

export interface MovimientoCuentaCorriente {
  tipo: 'FACTURA' | 'PAGO'
  id: number
  comprobante: string
  fecha: string
  debeCentavos: number
  haberCentavos: number
  saldoAcumuladoCentavos: number
  detalle?: string
}

export async function obtenerCuentaCorriente(clienteId: number) {
  const cliente = await obtenerClientePorId(clienteId)

  // Facturas emitidas en cuenta corriente
  const facturasCC = await db
    .select()
    .from(facturas)
    .where(
      and(
        eq(facturas.clienteId, clienteId),
        eq(facturas.formaPago, 'cuenta_corriente'),
        eq(facturas.estado, 'EMITIDA')
      )
    )

  // Pagos realizados
  const pagosCliente = await db.select().from(pagos).where(eq(pagos.clienteId, clienteId))

  const todosMovimientos: Array<{
    tipo: 'FACTURA' | 'PAGO'
    id: number
    comprobante: string
    fecha: string
    debeCentavos: number
    haberCentavos: number
    detalle?: string
  }> = []

  for (const f of facturasCC) {
    todosMovimientos.push({
      tipo: 'FACTURA',
      id: f.id,
      comprobante: `Factura #${String(f.numero).padStart(8, '0')}`,
      fecha: f.fecha,
      debeCentavos: f.totalCentavos,
      haberCentavos: 0,
      detalle: 'Venta a cuenta corriente'
    })
  }

  for (const p of pagosCliente) {
    todosMovimientos.push({
      tipo: 'PAGO',
      id: p.id,
      comprobante: `Recibo #${String(p.numeroRecibo).padStart(8, '0')}`,
      fecha: p.fecha,
      debeCentavos: 0,
      haberCentavos: p.importeCentavos,
      detalle: `Pago (${p.medio})${p.observacion ? ': ' + p.observacion : ''}`
    })
  }

  // Ordenar cronológicamente (más antiguo a más reciente para saldo progresivo)
  todosMovimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

  let saldo = 0
  const movimientosConSaldo: MovimientoCuentaCorriente[] = todosMovimientos.map((m) => {
    saldo += m.debeCentavos - m.haberCentavos
    return {
      ...m,
      saldoAcumuladoCentavos: saldo
    }
  })

  // Invertir para mostrar primero los más recientes en la vista
  movimientosConSaldo.reverse()

  return {
    cliente,
    saldoActualCentavos: cliente.saldoCentavos,
    creditoDisponibleCentavos: cliente.creditoDisponibleCentavos,
    movimientos: movimientosConSaldo
  }
}
