const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando creación de roles y usuarios básicos...');

  // Crear roles con sus permisos correspondientes
  console.log('Creando roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      id: 'role-admin',
      name: 'admin',
      permissions: ['*'] // Admin tiene todos los permisos
    },
  });

  const fabricaRole = await prisma.role.upsert({
    where: { name: 'fabrica' },
    update: {},
    create: {
      id: 'role-fabrica',
      name: 'fabrica',
      permissions: [
        'produccion:ver', 
        'produccion:crear', 
        'produccion:editar',
        'insumo:ver', 
        'stock:ver', 
        'stock:ajustar',
        'envio:crear',
        'envio:recibir',
        'envio:enviar',
        'contingencia:crear'
      ]
    },
  });

  const vendedorRole = await prisma.role.upsert({
    where: { name: 'vendedor' },
    update: {},
    create: {
      id: 'role-vendedor',
      name: 'vendedor',
      permissions: [
        'venta:crear', 
        'venta:ver',
        'venta:facturar',
        'producto:ver', 
        'stock:ver',
        'caja:ver',
        'caja:crear',
        'contingencia:crear'
      ]
    },
  });

  // Crear usuarios básicos
  console.log('Creando usuarios...');
  
  // Usuario admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Administrador',
      roleId: adminRole.id,
    },
  });

  // Usuario fábrica
  const fabricaUser = await prisma.user.upsert({
    where: { email: 'fabrica@test.com' },
    update: {},
    create: {
      email: 'fabrica@test.com',
      name: 'Usuario Fábrica',
      roleId: fabricaRole.id,
    },
  });

  // Usuario vendedor
  const vendedorUser = await prisma.user.upsert({
    where: { email: 'vendedor@test.com' },
    update: {},
    create: {
      email: 'vendedor@test.com',
      name: 'Usuario Vendedor',
      roleId: vendedorRole.id,
    },
  });

  console.log('Datos básicos creados exitosamente:');
  console.log(`- Rol Admin: ${adminRole.id}`);
  console.log(`- Rol Fábrica: ${fabricaRole.id}`);
  console.log(`- Rol Vendedor: ${vendedorRole.id}`);
  console.log(`- Usuario Admin: ${adminUser.email}`);
  console.log(`- Usuario Fábrica: ${fabricaUser.email}`);
  console.log(`- Usuario Vendedor: ${vendedorUser.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Conexión a base de datos cerrada correctamente');
  })
  .catch(async (e) => {
    console.error('Error durante la inicialización de datos:', e);
    await prisma.$disconnect();
    process.exit(1);
  });