-- CreateTable
CREATE TABLE "PuntoEquilibrioConfig" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "costosFijos" DOUBLE PRECISION NOT NULL,
    "costosVariables" DOUBLE PRECISION NOT NULL,
    "metaMensual" DOUBLE PRECISION NOT NULL,
    "mes" INTEGER NOT NULL,
    "año" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "PuntoEquilibrioConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PuntoEquilibrioConfig_sucursalId_mes_año_key" ON "PuntoEquilibrioConfig"("sucursalId", "mes", "año");

-- AddForeignKey
ALTER TABLE "PuntoEquilibrioConfig" ADD CONSTRAINT "PuntoEquilibrioConfig_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuntoEquilibrioConfig" ADD CONSTRAINT "PuntoEquilibrioConfig_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
