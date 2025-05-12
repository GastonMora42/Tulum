-- CreateTable
CREATE TABLE "CajaEgreso" (
    "id" TEXT NOT NULL,
    "cierreCajaId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalles" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "CajaEgreso_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CajaEgreso" ADD CONSTRAINT "CajaEgreso_cierreCajaId_fkey" FOREIGN KEY ("cierreCajaId") REFERENCES "CierreCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaEgreso" ADD CONSTRAINT "CajaEgreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
