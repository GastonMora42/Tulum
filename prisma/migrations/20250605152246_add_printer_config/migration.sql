-- CreateTable
CREATE TABLE "configuracion_impresora" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "esPorDefecto" BOOLEAN NOT NULL DEFAULT false,
    "configuracion" JSONB NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_impresora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_impresora_sucursalId_nombre_key" ON "configuracion_impresora"("sucursalId", "nombre");

-- AddForeignKey
ALTER TABLE "configuracion_impresora" ADD CONSTRAINT "configuracion_impresora_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
