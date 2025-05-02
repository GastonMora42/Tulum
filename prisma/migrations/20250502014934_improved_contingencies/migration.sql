-- AlterTable
ALTER TABLE "Contingencia" ADD COLUMN     "tipo" TEXT,
ADD COLUMN     "urgente" BOOLEAN NOT NULL DEFAULT false;
