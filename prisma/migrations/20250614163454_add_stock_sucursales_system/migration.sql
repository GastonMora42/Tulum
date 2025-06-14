-- CreateTable
CREATE TABLE "stock_config_sucursal" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "stockMaximo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "puntoReposicion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_config_sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carga_masiva_stock" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "sucursalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'procesando',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "itemsProcesados" INTEGER NOT NULL DEFAULT 0,
    "itemsErrores" INTEGER NOT NULL DEFAULT 0,
    "archivoNombre" TEXT,
    "observaciones" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "carga_masiva_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carga_masiva_stock_item" (
    "id" TEXT NOT NULL,
    "cargaId" TEXT NOT NULL,
    "productoId" TEXT,
    "codigoBarras" TEXT,
    "nombreProducto" TEXT,
    "cantidadCargar" DOUBLE PRECISION NOT NULL,
    "cantidadAnterior" DOUBLE PRECISION,
    "cantidadFinal" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "error" TEXT,
    "procesadoEn" TIMESTAMP(3),

    CONSTRAINT "carga_masiva_stock_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_config_sucursal_productoId_sucursalId_key" ON "stock_config_sucursal"("productoId", "sucursalId");

-- AddForeignKey
ALTER TABLE "stock_config_sucursal" ADD CONSTRAINT "stock_config_sucursal_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_config_sucursal" ADD CONSTRAINT "stock_config_sucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_config_sucursal" ADD CONSTRAINT "stock_config_sucursal_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carga_masiva_stock" ADD CONSTRAINT "carga_masiva_stock_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carga_masiva_stock" ADD CONSTRAINT "carga_masiva_stock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carga_masiva_stock_item" ADD CONSTRAINT "carga_masiva_stock_item_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "carga_masiva_stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carga_masiva_stock_item" ADD CONSTRAINT "carga_masiva_stock_item_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
