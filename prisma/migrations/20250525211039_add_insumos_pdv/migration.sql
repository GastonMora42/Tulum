-- CreateTable
CREATE TABLE "InsumoPdv" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT NOT NULL,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockInsumoPdv" (
    "id" TEXT NOT NULL,
    "insumoPdvId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "ultimaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStockInsumoPdv" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "envioId" TEXT,
    "solicitudId" TEXT,

    CONSTRAINT "MovimientoStockInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudInsumoPdv" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRespuesta" TIMESTAMP(3),
    "respondioPor" TEXT,

    CONSTRAINT "SolicitudInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSolicitudInsumoPdv" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "insumoPdvId" TEXT NOT NULL,
    "cantidadSolicitada" DOUBLE PRECISION NOT NULL,
    "cantidadAprobada" DOUBLE PRECISION,
    "observaciones" TEXT,

    CONSTRAINT "ItemSolicitudInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioInsumoPdv" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "usuarioEnvio" TEXT,
    "usuarioRecepcion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "EnvioInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEnvioInsumoPdv" (
    "id" TEXT NOT NULL,
    "envioId" TEXT NOT NULL,
    "insumoPdvId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "cantidadRecibida" DOUBLE PRECISION,

    CONSTRAINT "ItemEnvioInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EgresoInsumoPdv" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "insumoPdvId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "EgresoInsumoPdv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockInsumoPdv_insumoPdvId_ubicacionId_key" ON "StockInsumoPdv"("insumoPdvId", "ubicacionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvioInsumoPdv_solicitudId_key" ON "EnvioInsumoPdv"("solicitudId");

-- AddForeignKey
ALTER TABLE "StockInsumoPdv" ADD CONSTRAINT "StockInsumoPdv_insumoPdvId_fkey" FOREIGN KEY ("insumoPdvId") REFERENCES "InsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockInsumoPdv" ADD CONSTRAINT "StockInsumoPdv_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStockInsumoPdv" ADD CONSTRAINT "MovimientoStockInsumoPdv_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "StockInsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStockInsumoPdv" ADD CONSTRAINT "MovimientoStockInsumoPdv_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInsumoPdv" ADD CONSTRAINT "SolicitudInsumoPdv_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudInsumoPdv" ADD CONSTRAINT "SolicitudInsumoPdv_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudInsumoPdv" ADD CONSTRAINT "ItemSolicitudInsumoPdv_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSolicitudInsumoPdv" ADD CONSTRAINT "ItemSolicitudInsumoPdv_insumoPdvId_fkey" FOREIGN KEY ("insumoPdvId") REFERENCES "InsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioInsumoPdv" ADD CONSTRAINT "EnvioInsumoPdv_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioInsumoPdv" ADD CONSTRAINT "EnvioInsumoPdv_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioInsumoPdv" ADD CONSTRAINT "EnvioInsumoPdv_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEnvioInsumoPdv" ADD CONSTRAINT "ItemEnvioInsumoPdv_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "EnvioInsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEnvioInsumoPdv" ADD CONSTRAINT "ItemEnvioInsumoPdv_insumoPdvId_fkey" FOREIGN KEY ("insumoPdvId") REFERENCES "InsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgresoInsumoPdv" ADD CONSTRAINT "EgresoInsumoPdv_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgresoInsumoPdv" ADD CONSTRAINT "EgresoInsumoPdv_insumoPdvId_fkey" FOREIGN KEY ("insumoPdvId") REFERENCES "InsumoPdv"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgresoInsumoPdv" ADD CONSTRAINT "EgresoInsumoPdv_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
