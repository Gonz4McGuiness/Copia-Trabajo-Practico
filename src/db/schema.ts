import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol').notNull().$type<'admin' | 'vendedor'>(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: text('creado_en').notNull()
})

export const categorias = sqliteTable('categorias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true)
})

export const productos = sqliteTable('productos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo').notNull().unique(),
  descripcion: text('descripcion').notNull(),
  categoriaId: integer('categoria_id')
    .notNull()
    .references(() => categorias.id),
  precioVentaCentavos: integer('precio_venta_centavos').notNull(),
  existencia: integer('existencia').notNull().default(0),
  stockMinimo: integer('stock_minimo').notNull().default(0),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  marca: text('marca'),
  creadoEn: text('creado_en').notNull()
})

export const movimientosStock = sqliteTable('movimientos_stock', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(),
  productoId: integer('producto_id')
    .notNull()
    .references(() => productos.id),
  tipo: text('tipo').notNull().$type<'INGRESO' | 'EGRESO'>(),
  cantidad: integer('cantidad').notNull(),
  existenciaResultante: integer('existencia_resultante').notNull(),
  motivo: text('motivo').notNull(),
  origen: text('origen').notNull().$type<'INICIAL' | 'MANUAL' | 'VENTA' | 'ANULACION'>(),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  facturaId: integer('factura_id').references(() => facturas.id)
})

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipoDocumento: text('tipo_documento').notNull().default('DNI').$type<'DNI' | 'CUIT'>(),
  documento: text('documento').notNull().unique(),
  nombre: text('nombre').notNull(),
  domicilio: text('domicilio'),
  telefono: text('telefono'),
  email: text('email'),
  habilitadoCuentaCorriente: integer('habilitado_cuenta_corriente', { mode: 'boolean' })
    .notNull()
    .default(true),
  limiteCreditoCentavos: integer('limite_credito_centavos'), // null = sin límite
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: text('creado_en').notNull()
})

export const facturas = sqliteTable('facturas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: integer('numero').notNull().unique(),
  fecha: text('fecha').notNull(),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  clienteId: integer('cliente_id').references(() => clientes.id),
  clienteNombre: text('cliente_nombre').notNull(),
  clienteDocumento: text('cliente_documento'),
  formaPago: text('forma_pago').notNull().$type<'contado' | 'tarjeta' | 'cuenta_corriente'>(),
  totalCentavos: integer('total_centavos').notNull(),
  // Pagos contado
  pagoMontoCentavos: integer('pago_monto_centavos'),
  vueltoCentavos: integer('vuelto_centavos'),
  // Pagos tarjeta
  tarjetaTipo: text('tarjeta_tipo').$type<'debito' | 'credito'>(),
  tarjetaMarca: text('tarjeta_marca').$type<'visa' | 'mastercard' | 'amex' | 'otra'>(),
  tarjetaUltimos4: text('tarjeta_ultimos_4'),
  // Estado y anulación
  estado: text('estado').notNull().default('EMITIDA').$type<'EMITIDA' | 'ANULADA'>(),
  motivoAnulacion: text('motivo_anulacion'),
  anuladaEn: text('anulada_en'),
  anuladaPorUsuarioId: integer('anulada_por_usuario_id').references(() => usuarios.id)
})

export const detallesFactura = sqliteTable('detalles_factura', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facturaId: integer('factura_id')
    .notNull()
    .references(() => facturas.id, { onDelete: 'cascade' }),
  productoId: integer('producto_id')
    .notNull()
    .references(() => productos.id),
  descripcion: text('descripcion').notNull(),
  cantidad: integer('cantidad').notNull(),
  precioUnitarioCentavos: integer('precio_unitario_centavos').notNull(),
  subtotalCentavos: integer('subtotal_centavos').notNull()
})

export const pagos = sqliteTable('pagos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numeroRecibo: integer('numero_recibo').notNull().unique(),
  fecha: text('fecha').notNull(),
  clienteId: integer('cliente_id')
    .notNull()
    .references(() => clientes.id),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  importeCentavos: integer('importe_centavos').notNull(),
  medio: text('medio').notNull().$type<'efectivo' | 'transferencia' | 'tarjeta'>(),
  observacion: text('observacion')
})

export const marcasDeploy = sqliteTable('marcas_deploy', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clave: text('clave').notNull().unique(),
  fecha: text('fecha').notNull()
})

// Relaciones para consultas relacionales con Drizzle
export const usuariosRelations = relations(usuarios, ({ many }) => ({
  facturas: many(facturas),
  movimientosStock: many(movimientosStock),
  pagos: many(pagos)
}))

export const categoriasRelations = relations(categorias, ({ many }) => ({
  productos: many(productos)
}))

export const productosRelations = relations(productos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [productos.categoriaId],
    references: [categorias.id]
  }),
  movimientosStock: many(movimientosStock),
  detallesFactura: many(detallesFactura)
}))

export const movimientosStockRelations = relations(movimientosStock, ({ one }) => ({
  producto: one(productos, {
    fields: [movimientosStock.productoId],
    references: [productos.id]
  }),
  usuario: one(usuarios, {
    fields: [movimientosStock.usuarioId],
    references: [usuarios.id]
  }),
  factura: one(facturas, {
    fields: [movimientosStock.facturaId],
    references: [facturas.id]
  })
}))

export const clientesRelations = relations(clientes, ({ many }) => ({
  facturas: many(facturas),
  pagos: many(pagos)
}))

export const facturasRelations = relations(facturas, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [facturas.usuarioId],
    references: [usuarios.id]
  }),
  cliente: one(clientes, {
    fields: [facturas.clienteId],
    references: [clientes.id]
  }),
  detalles: many(detallesFactura),
  movimientosStock: many(movimientosStock)
}))

export const detallesFacturaRelations = relations(detallesFactura, ({ one }) => ({
  factura: one(facturas, {
    fields: [detallesFactura.facturaId],
    references: [facturas.id]
  }),
  producto: one(productos, {
    fields: [detallesFactura.productoId],
    references: [productos.id]
  })
}))

export const pagosRelations = relations(pagos, ({ one }) => ({
  cliente: one(clientes, {
    fields: [pagos.clienteId],
    references: [clientes.id]
  }),
  usuario: one(usuarios, {
    fields: [pagos.usuarioId],
    references: [usuarios.id]
  })
}))

export type Usuario = typeof usuarios.$inferSelect
export type NuevoUsuario = typeof usuarios.$inferInsert

export type Categoria = typeof categorias.$inferSelect
export type NuevaCategoria = typeof categorias.$inferInsert

export type Producto = typeof productos.$inferSelect
export type NuevoProducto = typeof productos.$inferInsert

export type MovimientoStock = typeof movimientosStock.$inferSelect
export type NuevoMovimientoStock = typeof movimientosStock.$inferInsert

export type Cliente = typeof clientes.$inferSelect
export type NuevoCliente = typeof clientes.$inferInsert

export type Factura = typeof facturas.$inferSelect
export type NuevaFactura = typeof facturas.$inferInsert

export type DetalleFactura = typeof detallesFactura.$inferSelect
export type NuevoDetalleFactura = typeof detallesFactura.$inferInsert

export type Pago = typeof pagos.$inferSelect
export type NuevoPago = typeof pagos.$inferInsert
