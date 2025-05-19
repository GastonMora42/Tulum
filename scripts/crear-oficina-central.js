const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearOficinaCentral() {
  try {
    // Crear o actualizar la ubicación de Oficina Central
    const oficinaCentral = await prisma.ubicacion.upsert({
      where: { id: 'ubicacion-admin' },
      update: {},
      create: {
        id: 'ubicacion-admin',
        nombre: 'Oficina Central',
        tipo: 'admin',
        direccion: 'Calle Corporativa 500, Tulum',
        activo: true,
      },
    });
    
    console.log('✅ Ubicación de Oficina Central creada exitosamente:', oficinaCentral);
    
    // Opcionalmente, verificar que existe en la base de datos
    const ubicacionVerificada = await prisma.ubicacion.findUnique({
      where: { id: 'ubicacion-admin' }
    });
    
    console.log('✅ Verificación de la ubicación:', ubicacionVerificada);
    
    return oficinaCentral;
  } catch (error) {
    console.error('❌ Error al crear la ubicación de Oficina Central:', error);
    throw error;
  }
}

// Ejecutar la función y manejar la conexión a la base de datos
crearOficinaCentral()
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