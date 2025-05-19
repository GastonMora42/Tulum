const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearUbicacionFabrica() {
  try {
    // Crear o actualizar la ubicación de fábrica
    const fabricaCentral = await prisma.ubicacion.upsert({
      where: { id: 'ubicacion-fabrica' },
      update: {},
      create: {
        id: 'ubicacion-fabrica',
        nombre: 'Fábrica Central',
        tipo: 'fabrica',
        direccion: 'Av. Principal 123',
        activo: true,
      },
    });
    
    console.log('✅ Ubicación de fábrica creada exitosamente:', fabricaCentral);
    return fabricaCentral;
  } catch (error) {
    console.error('❌ Error al crear la ubicación de fábrica:', error);
    throw error;
  }
}

// Ejecutar la función y manejar la conexión a la base de datos
crearUbicacionFabrica()
  .then(async () => {
    console.log('🔄 Desconectando de la base de datos...');
    await prisma.$disconnect();
    console.log('👋 Proceso completado.');
  })
  .catch(async (error) => {
    console.error('❌ Error en el proceso:', error);
    await prisma.$disconnect();
    process.exit(1);
  });