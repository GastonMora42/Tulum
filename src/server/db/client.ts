// src/server/db/client.ts
import { PrismaClient } from '@prisma/client';

// Opciones de conexión mejoradas
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Agregar opciones de reconexión
    errorFormat: 'pretty',
  });
};

// Verificar si estamos en un entorno donde setMaxListeners está disponible
if (typeof process !== 'undefined' && 
    process.env && 
    typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(20);
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined;
};

// Usar una sola instancia en desarrollo para evitar demasiadas conexiones
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Manejar la desconexión automática al detener la aplicación
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

// Agregar una función de reconexión para manejar errores de conexión
export async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('Prisma reconnected successfully');
    return true;
  } catch (error) {
    console.error('Failed to reconnect Prisma:', error);
    return false;
  }
}

export default prisma;