-- AlterTable
ALTER TABLE "CierreCaja" ADD COLUMN     "alertaMontoInsuficiente" TEXT,
ADD COLUMN     "esCierreConDiferencias" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montoFijoReferencia" DOUBLE PRECISION NOT NULL DEFAULT 10000,
ADD COLUMN     "razonCierreForzado" TEXT,
ADD COLUMN     "requiereRecuperoProximo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "configuracion_cierre" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "montoFijo" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_cierre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_cierre_sucursalId_key" ON "configuracion_cierre"("sucursalId");

-- AddForeignKey
ALTER TABLE "configuracion_cierre" ADD CONSTRAINT "configuracion_cierre_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_cierre" ADD CONSTRAINT "configuracion_cierre_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
