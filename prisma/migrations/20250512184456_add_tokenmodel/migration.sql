-- CreateTable
CREATE TABLE "TokenAFIP" (
    "id" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sign" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAFIP_pkey" PRIMARY KEY ("id")
);
