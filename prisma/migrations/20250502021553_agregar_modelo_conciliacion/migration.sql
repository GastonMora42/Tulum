-- CreateTable
CREATE TABLE "Conciliacion" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "detalles" JSONB,
    "observaciones" TEXT,

    CONSTRAINT "Conciliacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conciliacion" ADD CONSTRAINT "Conciliacion_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conciliacion" ADD CONSTRAINT "Conciliacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
