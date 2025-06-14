-- DropForeignKey
ALTER TABLE "carga_masiva_stock_item" DROP CONSTRAINT "carga_masiva_stock_item_cargaId_fkey";

-- DropForeignKey
ALTER TABLE "stock_config_sucursal" DROP CONSTRAINT "stock_config_sucursal_productoId_fkey";

-- DropForeignKey
ALTER TABLE "stock_config_sucursal" DROP CONSTRAINT "stock_config_sucursal_sucursalId_fkey";

-- CreateTable
CREATE TABLE "alerta_stock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "tipoAlerta" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "stockActual" DOUBLE PRECISION NOT NULL,
    "stockReferencia" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "vistaPor" TEXT,
    "fechaVista" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerta_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerta_stock_sucursalId_activa_idx" ON "alerta_stock"("sucursalId", "activa");

-- CreateIndex
CREATE INDEX "alerta_stock_productoId_idx" ON "alerta_stock"("productoId");

-- CreateIndex
CREATE INDEX "alerta_stock_tipoAlerta_idx" ON "alerta_stock"("tipoAlerta");

-- CreateIndex
CREATE INDEX "carga_masiva_stock_sucursalId_idx" ON "carga_masiva_stock"("sucursalId");

-- CreateIndex
CREATE INDEX "carga_masiva_stock_usuarioId_idx" ON "carga_masiva_stock"("usuarioId");

-- CreateIndex
CREATE INDEX "carga_masiva_stock_fechaInicio_idx" ON "carga_masiva_stock"("fechaInicio");

-- CreateIndex
CREATE INDEX "carga_masiva_stock_item_cargaId_idx" ON "carga_masiva_stock_item"("cargaId");

-- CreateIndex
CREATE INDEX "carga_masiva_stock_item_productoId_idx" ON "carga_masiva_stock_item"("productoId");

-- CreateIndex
CREATE INDEX "stock_config_sucursal_sucursalId_idx" ON "stock_config_sucursal"("sucursalId");

-- CreateIndex
CREATE INDEX "stock_config_sucursal_productoId_idx" ON "stock_config_sucursal"("productoId");

-- AddForeignKey
ALTER TABLE "stock_config_sucursal" ADD CONSTRAINT "stock_config_sucursal_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_config_sucursal" ADD CONSTRAINT "stock_config_sucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carga_masiva_stock_item" ADD CONSTRAINT "carga_masiva_stock_item_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "carga_masiva_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_stock" ADD CONSTRAINT "alerta_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_stock" ADD CONSTRAINT "alerta_stock_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
