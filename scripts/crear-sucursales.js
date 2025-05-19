const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearSucursales() {
  console.log('Iniciando creación de sucursales...');

  try {
    // 1. Sucursal Bariloche
    const sucursalBariloche = await prisma.ubicacion.upsert({
      where: { id: 'sucursal-bariloche' },
      update: {},
      create: {
        id: 'sucursal-bariloche',
        nombre: 'Sucursal Bariloche',
        tipo: 'sucursal',
        direccion: 'Mitre 150, San Carlos de Bariloche, Río Negro',
        telefono: '+54 294 444-1234',
        activo: true
      }
    });

    // 2. Sucursal Neuquén
    const sucursalNeuquen = await prisma.ubicacion.upsert({
      where: { id: 'sucursal-neuquen' },
      update: {},
      create: {
        id: 'sucursal-neuquen',
        nombre: 'Sucursal Neuquén',
        tipo: 'sucursal',
        direccion: 'Av. Argentina 200, Neuquén Capital',
        telefono: '+54 299 442-5678',
        activo: true
      }
    });

    // 3. Sucursal Mendoza 1
    const sucursalMendoza1 = await prisma.ubicacion.upsert({
      where: { id: 'sucursal-mendoza-1' },
      update: {},
      create: {
        id: 'sucursal-mendoza-1',
        nombre: 'Sucursal Mendoza Centro',
        tipo: 'sucursal',
        direccion: 'Av. San Martín 500, Ciudad de Mendoza',
        telefono: '+54 261 423-9012',
        activo: true
      }
    });

    // 4. Sucursal Mendoza 2
    const sucursalMendoza2 = await prisma.ubicacion.upsert({
      where: { id: 'sucursal-mendoza-2' },
      update: {},
      create: {
        id: 'sucursal-mendoza-2',
        nombre: 'Sucursal Mendoza Godoy Cruz',
        tipo: 'sucursal',
        direccion: 'Hipólito Yrigoyen 350, Godoy Cruz, Mendoza',
        telefono: '+54 261 424-3456',
        activo: true
      }
    });

    // 5. Crear usuarios vendedores para cada sucursal
    await crearUsuariosVendedores([
      { sucursalId: sucursalBariloche.id, nombre: 'Bariloche' },
      { sucursalId: sucursalNeuquen.id, nombre: 'Neuquén' },
      { sucursalId: sucursalMendoza1.id, nombre: 'Mendoza 1' },
      { sucursalId: sucursalMendoza2.id, nombre: 'Mendoza 2' }
    ]);

    // 6. Configurar punto de venta AFIP para cada sucursal
    await configurarPuntosVenta([
      { sucursalId: sucursalBariloche.id, puntoVenta: 1 },
      { sucursalId: sucursalNeuquen.id, puntoVenta: 2 },
      { sucursalId: sucursalMendoza1.id, puntoVenta: 3 },
      { sucursalId: sucursalMendoza2.id, puntoVenta: 4 }
    ]);

    console.log('Sucursales creadas exitosamente:');
    console.log('- Sucursal Bariloche (ID: sucursal-bariloche)');
    console.log('- Sucursal Neuquén (ID: sucursal-neuquen)');
    console.log('- Sucursal Mendoza Centro (ID: sucursal-mendoza-1)');
    console.log('- Sucursal Mendoza Godoy Cruz (ID: sucursal-mendoza-2)');
  } catch (error) {
    console.error('Error al crear sucursales:', error);
  }
}

// Función para crear usuarios vendedores
async function crearUsuariosVendedores(sucursales) {
  // Primero obtener el rol de vendedor
  const vendedorRole = await prisma.role.findUnique({
    where: { id: 'role-vendedor' }
  });

  if (!vendedorRole) {
    console.error('Error: El rol de vendedor no existe. Ejecuta primero el script de roles.');
    return;
  }

  for (const sucursal of sucursales) {
    await prisma.user.upsert({
      where: { email: `vendedor.${sucursal.nombre.toLowerCase()}@test.com` },
      update: {
        sucursalId: sucursal.sucursalId
      },
      create: {
        email: `vendedor.${sucursal.nombre.toLowerCase()}@test.com`,
        name: `Vendedor ${sucursal.nombre}`,
        roleId: vendedorRole.id,
        sucursalId: sucursal.sucursalId
      }
    });

    console.log(`- Usuario vendedor creado para ${sucursal.nombre}`);
  }
}

// Función para configurar puntos de venta AFIP
async function configurarPuntosVenta(configuraciones) {
  const CUIT_EMPRESA = '30718236564';

  for (const config of configuraciones) {
    await prisma.configuracionAFIP.upsert({
      where: { sucursalId: config.sucursalId },
      update: {
        puntoVenta: config.puntoVenta,
        activo: true
      },
      create: {
        sucursalId: config.sucursalId,
        cuit: CUIT_EMPRESA,
        puntoVenta: config.puntoVenta,
        activo: true
      }
    });

    console.log(`- Configuración AFIP creada para sucursal (Punto de venta: ${config.puntoVenta})`);
  }
}

crearSucursales()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Conexión a base de datos cerrada correctamente');
  })
  .catch(async (e) => {
    console.error('Error durante la creación de sucursales:', e);
    await prisma.$disconnect();
    process.exit(1);
  });