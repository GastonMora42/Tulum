-- AlterTable
ALTER TABLE "Contingencia" ADD COLUMN     "conciliacionId" TEXT,
ADD COLUMN     "ubicacionId" TEXT;

-- AddForeignKey
ALTER TABLE "Contingencia" ADD CONSTRAINT "Contingencia_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contingencia" ADD CONSTRAINT "Contingencia_conciliacionId_fkey" FOREIGN KEY ("conciliacionId") REFERENCES "Conciliacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
