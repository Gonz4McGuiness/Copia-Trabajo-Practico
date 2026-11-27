import { and, eq, lte, or, sql, like } from 'drizzle-orm'
import { db, ejecutarTransaccion, DbTx } from '../db'
import { productos, movimientosStock, Producto, NuevoProducto, MovimientoStock } from '../db/schema'
import { ApiError } from './api-error'

export interface FiltrosProductos {
  buscar?: string
  categoriaId?: number
  stockBajo?: boolean
  soloActivos?: boolean
}

export async function listarProductos(filtros: FiltrosProductos = {}) {
  const condiciones = []

  if (filtros.soloActivos !== false) {
    condiciones.push(eq(productos.activo, true))
  }

  if (filtros.categoriaId) {
    condiciones.push(eq(productos.categoriaId, filtros.categoriaId))
  }

  if (filtros.stockBajo) {
    condiciones.push(lte(productos.existencia, productos.stockMinimo))
  }

  if (filtros.buscar) {
    const termino = `%${filtros.buscar.trim()}%`
    condiciones.push(
      or(
        like(productos.codigo, termino),
        like(productos.descripcion, termino)
      )
    )
  }

  const query = db.query.productos.findMany({
    where: condiciones.length > 0 ? and(...condiciones) : undefined,
    with: {
      categoria: true
    },
    orderBy: (prod, { asc }) => [asc(prod.descripcion)]
  })

  return await query
}

export async function obtenerProductoPorId(id: number) {
  const prod = await db.query.productos.findFirst({
    where: eq(productos.id, id),
    with: {
      categoria: true
    }
  })
  if (!prod) {
    throw new ApiError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado')
  }
  return prod
}

export async function obtenerProductoPorCodigo(codigo: string) {
  return await db.query.productos.findFirst({
    where: eq(productos.codigo, codigo.trim().toUpperCase()),
    with: {
      categoria: true
    }
  })
}

export async function crearProducto(datos: {
  codigo: string
  descripcion: string
  marca?: string | null
  categoriaId: number
  precioVentaCentavos: number
  existenciaInicial?: number
  stockMinimo?: number
  usuarioId: number
}): Promise<Producto> {
  const codigoLimpio = datos.codigo.trim().toUpperCase()
  const descripcionLimpia = datos.descripcion.trim()

  if (!codigoLimpio || !descripcionLimpia) {
    throw new ApiError(400, 'DATOS_INVALIDOS', 'Código y descripción son obligatorios')
  }

  if (datos.precioVentaCentavos <= 0) {
    throw new ApiError(400, 'PRECIO_INVALIDO', 'El precio debe ser mayor a cero')
  }

  const stockMin = Math.max(0, datos.stockMinimo ?? 0)
  const existenciaInicial = Math.max(0, datos.existenciaInicial ?? 0)

  // Verificar código único
  const existente = await obtenerProductoPorCodigo(codigoLimpio)
  if (existente) {
    throw new ApiError(400, 'CODIGO_DUPLICADO', `Ya existe un producto con el código ${codigoLimpio}`)
  }

  const nuevo = await ejecutarTransaccion(async (tx) => {
    const [prod] = await tx
      .insert(productos)
      .values({
        codigo: codigoLimpio,
        descripcion: descripcionLimpia,
        marca: datos.marca ? datos.marca.trim() : null,
        categoriaId: datos.categoriaId,
        precioVentaCentavos: datos.precioVentaCentavos,
        existencia: existenciaInicial,
        stockMinimo: stockMin,
        activo: true,
        creadoEn: new Date().toISOString()
      })
      .returning()

    if (existenciaInicial > 0) {
      await tx.insert(movimientosStock).values({
        fecha: new Date().toISOString(),
        productoId: prod.id,
        tipo: 'INGRESO',
        cantidad: existenciaInicial,
        existenciaResultante: existenciaInicial,
        motivo: 'Inventario inicial al crear producto',
        origen: 'INICIAL',
        usuarioId: datos.usuarioId
      })
    }

    return prod
  })

  return nuevo
}

export async function actualizarProducto(
  id: number,
  datos: {
    codigo?: string
    descripcion?: string
    categoriaId?: number
    precioVentaCentavos?: number
    stockMinimo?: number
    activo?: boolean
  }
): Promise<Producto> {
  const prod = await obtenerProductoPorId(id)

  const actualizacion: Partial<NuevoProducto> = {}

  if (datos.codigo !== undefined) {
    const codigoLimpio = datos.codigo.trim().toUpperCase()
    if (!codigoLimpio) {
      throw new ApiError(400, 'DATOS_INVALIDOS', 'El código no puede estar vacío')
    }
    const existente = await obtenerProductoPorCodigo(codigoLimpio)
    if (existente && existente.id !== id) {
      throw new ApiError(400, 'CODIGO_DUPLICADO', `El código ${codigoLimpio} ya está en uso`)
    }
    actualizacion.codigo = codigoLimpio
  }

  if (datos.descripcion !== undefined) {
    const descLimpia = datos.descripcion.trim()
    if (!descLimpia) {
      throw new ApiError(400, 'DATOS_INVALIDOS', 'La descripción no puede estar vacía')
    }
    actualizacion.descripcion = descLimpia
  }

  if (datos.categoriaId !== undefined) {
    actualizacion.categoriaId = datos.categoriaId
  }

  if (datos.precioVentaCentavos !== undefined) {
    if (datos.precioVentaCentavos <= 0) {
      throw new ApiError(400, 'PRECIO_INVALIDO', 'El precio debe ser mayor a cero')
    }
    actualizacion.precioVentaCentavos = datos.precioVentaCentavos
  }

  if (datos.stockMinimo !== undefined) {
    actualizacion.stockMinimo = Math.max(0, datos.stockMinimo)
  }

  if (datos.activo !== undefined) {
    actualizacion.activo = datos.activo
  }

  const [actualizado] = await db
    .update(productos)
    .set(actualizacion)
    .where(eq(productos.id, id))
    .returning()

  return actualizado
}

export async function desactivarProducto(id: number): Promise<Producto> {
  return await actualizarProducto(id, { activo: false })
}

/**
 * Invariante central de stock (RF-P5, RF-V6):
 * Única vía atómica para modificar existencia de un producto.
 */
export async function moverStock(
  productoId: number,
  cantidad: number,
  tipo: 'INGRESO' | 'EGRESO',
  motivo: string,
  origen: 'INICIAL' | 'MANUAL' | 'VENTA' | 'ANULACION',
  usuarioId: number,
  facturaId?: number,
  tx?: DbTx
): Promise<MovimientoStock> {
  if (cantidad <= 0) {
    throw new ApiError(400, 'CANTIDAD_INVALIDA', 'La cantidad del movimiento debe ser mayor a cero')
  }

  const delta = tipo === 'INGRESO' ? cantidad : -cantidad
  const ejecutar = async (clienteTx: DbTx) => {
    // Obtenemos producto para control de concurrencia y validación de existencia
    const [prod] = await clienteTx
      .select()
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1)

    if (!prod) {
      throw new ApiError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado')
    }

    const nuevaExistencia = prod.existencia + delta

    if (nuevaExistencia < 0) {
      throw new ApiError(
        400,
        'STOCK_INSUFICIENTE',
        `Stock insuficiente para "${prod.descripcion}". Disponible: ${prod.existencia}, requerido: ${cantidad}`,
        {
          productoId,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          existenciaActual: prod.existencia,
          cantidadRequerida: cantidad
        }
      )
    }

    // Actualizamos existencia
    await clienteTx
      .update(productos)
      .set({ existencia: nuevaExistencia })
      .where(eq(productos.id, productoId))

    // Registramos movimiento inmutable
    const [mov] = await clienteTx
      .insert(movimientosStock)
      .values({
        fecha: new Date().toISOString(),
        productoId,
        tipo,
        cantidad,
        existenciaResultante: nuevaExistencia,
        motivo,
        origen,
        usuarioId,
        facturaId: facturaId ?? null
      })
      .returning()

    return mov
  }

  if (tx) {
    return await ejecutar(tx)
  }

  return await ejecutarTransaccion(async (innerTx) => {
    return await ejecutar(innerTx)
  })
}
