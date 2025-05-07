-- CreateTable
CREATE TABLE "FacturaElectronica" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "numeroFactura" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "cae" TEXT,
    "vencimientoCae" TIMESTAMP(3),
    "estado" TEXT NOT NULL,
    "xml" TEXT,
    "respuestaAFIP" JSONB,
    "error" TEXT,
    "qrData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacturaElectronica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionAFIP" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionAFIP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacturaElectronica_ventaId_key" ON "FacturaElectronica"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionAFIP_sucursalId_key" ON "ConfiguracionAFIP"("sucursalId");

-- AddForeignKey
ALTER TABLE "FacturaElectronica" ADD CONSTRAINT "FacturaElectronica_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaElectronica" ADD CONSTRAINT "FacturaElectronica_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionAFIP" ADD CONSTRAINT "ConfiguracionAFIP_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
