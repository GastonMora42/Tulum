-- DropForeignKey
ALTER TABLE "ItemEnvio" DROP CONSTRAINT "ItemEnvio_productoId_fkey";

-- AlterTable
ALTER TABLE "ItemEnvio" ADD COLUMN     "insumoId" TEXT,
ALTER COLUMN "productoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ItemEnvio" ADD CONSTRAINT "ItemEnvio_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEnvio" ADD CONSTRAINT "ItemEnvio_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
