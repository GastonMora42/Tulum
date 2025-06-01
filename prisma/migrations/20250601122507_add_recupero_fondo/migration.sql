-- AlterTable
ALTER TABLE "CierreCaja" ADD COLUMN     "conteoEfectivo" DOUBLE PRECISION,
ADD COLUMN     "conteoOtros" DOUBLE PRECISION,
ADD COLUMN     "conteoQR" DOUBLE PRECISION,
ADD COLUMN     "conteoTarjetaCredito" DOUBLE PRECISION,
ADD COLUMN     "conteoTarjetaDebito" DOUBLE PRECISION,
ADD COLUMN     "conteoTransferencia" DOUBLE PRECISION,
ADD COLUMN     "diferenciaEfectivo" DOUBLE PRECISION,
ADD COLUMN     "efectivoEsperado" DOUBLE PRECISION,
ADD COLUMN     "efectivoReal" DOUBLE PRECISION,
ADD COLUMN     "recuperoFondo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requiereRecupero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saldoPendienteActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "saldoPendienteAnterior" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sugerenciaProximaApertura" DOUBLE PRECISION,
ADD COLUMN     "totalEgresos" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RecuperoFondo" (
    "id" TEXT NOT NULL,
    "cierreCajaId" TEXT NOT NULL,
    "cierreCajaOrigenId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "RecuperoFondo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CierreCaja_sucursalId_fechaApertura_idx" ON "CierreCaja"("sucursalId", "fechaApertura");

-- AddForeignKey
ALTER TABLE "RecuperoFondo" ADD CONSTRAINT "RecuperoFondo_cierreCajaId_fkey" FOREIGN KEY ("cierreCajaId") REFERENCES "CierreCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecuperoFondo" ADD CONSTRAINT "RecuperoFondo_cierreCajaOrigenId_fkey" FOREIGN KEY ("cierreCajaOrigenId") REFERENCES "CierreCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecuperoFondo" ADD CONSTRAINT "RecuperoFondo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
