-- CreateTable
CREATE TABLE "FacturaReintento" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "motivo" TEXT,
    "resultado" TEXT NOT NULL,
    "error" TEXT,
    "logs" TEXT,
    "cae" TEXT,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),

    CONSTRAINT "FacturaReintento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FacturaReintento" ADD CONSTRAINT "FacturaReintento_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "FacturaElectronica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaReintento" ADD CONSTRAINT "FacturaReintento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
