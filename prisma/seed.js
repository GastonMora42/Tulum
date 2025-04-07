const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Crear roles
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
        'insumo:ver', 
        'stock:ver', 
        'stock:ajustar',
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
        'producto:ver', 
        'stock:ver',
        'contingencia:crear'
      ]
    },
  });

  // Crear usuario admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Admin',
      roleId: adminRole.id,
    },
  });

  // Crear ubicaciones
  const fabrica = await prisma.ubicacion.upsert({
    where: { id: 'ubicacion-fabrica' },
    update: {},
    create: {
      id: 'ubicacion-fabrica',
      nombre: 'Fábrica Central',
      tipo: 'fabrica',
      direccion: 'Av. Principal 123, Tulum',
      activo: true,
    },
  });

  const sucursal1 = await prisma.ubicacion.upsert({
    where: { id: 'ubicacion-sucursal1' },
    update: {},
    create: {
      id: 'ubicacion-sucursal1',
      nombre: 'Tienda Tulum Centro',
      tipo: 'sucursal',
      direccion: 'Calle Centauro Sur, Tulum Centro',
      activo: true,
    },
  });

  // Crear categorías
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { nombre: 'Difusores' },
      update: {},
      create: {
        nombre: 'Difusores',
      },
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Velas Aromáticas' },
      update: {},
      create: {
        nombre: 'Velas Aromáticas',
      },
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Aceites Esenciales' },
      update: {},
      create: {
        nombre: 'Aceites Esenciales',
      },
    }),
  ]);

  // Crear algunos productos
  const productos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Difusor Bambú',
        descripcion: 'Difusor aromático de bambú',
        precio: 450,
        categoriaId: categorias[0].id,
        stockMinimo: 5,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Vela Lavanda',
        descripcion: 'Vela aromática de lavanda',
        precio: 350,
        categoriaId: categorias[1].id,
        stockMinimo: 10,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Aceite Esencial Limón',
        descripcion: 'Aceite esencial 100% puro de limón',
        precio: 280,
        categoriaId: categorias[2].id,
        stockMinimo: 8,
      },
    }),
  ]);

  // Crear algunos insumos
  const insumos = await Promise.all([
    prisma.insumo.create({
      data: {
        nombre: 'Aceite base',
        descripcion: 'Aceite base para difusores',
        unidadMedida: 'litro',
        stockMinimo: 5,
      },
    }),
    prisma.insumo.create({
      data: {
        nombre: 'Esencia de lavanda',
        descripcion: 'Esencia concentrada de lavanda',
        unidadMedida: 'mililitro',
        stockMinimo: 200,
      },
    }),
    prisma.insumo.create({
      data: {
        nombre: 'Cera de soja',
        descripcion: 'Cera de soja para velas',
        unidadMedida: 'kilogramo',
        stockMinimo: 3,
      },
    }),
  ]);

  // Crear stock inicial en fábrica
  await Promise.all([
    // Stock de insumos
    ...insumos.map(insumo => 
      prisma.stock.create({
        data: {
          insumoId: insumo.id,
          ubicacionId: fabrica.id,
          cantidad: 20,
        },
      })
    ),
    
    // Stock de productos en fábrica
    ...productos.map(producto => 
      prisma.stock.create({
        data: {
          productoId: producto.id,
          ubicacionId: fabrica.id,
          cantidad: 30,
        },
      })
    ),
    
    // Stock de productos en sucursal
    ...productos.map(producto => 
      prisma.stock.create({
        data: {
          productoId: producto.id,
          ubicacionId: sucursal1.id,
          cantidad: 15,
        },
      })
    )
  ]);

  console.log('Base de datos inicializada con datos de prueba');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });