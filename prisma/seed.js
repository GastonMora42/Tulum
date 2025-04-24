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
  const fabricaCentral = await prisma.ubicacion.upsert({
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

  // Crear tiendas (reemplazando las anteriores)
  const tiendaNeuquen = await prisma.ubicacion.upsert({
    where: { id: 'ubicacion-neuquen' },
    update: {},
    create: {
      id: 'ubicacion-neuquen',
      nombre: 'Tienda Neuquén',
      tipo: 'sucursal',
      direccion: 'Av. Argentina 200, Neuquén',
      activo: true,
    },
  });

  const tiendaBariloche = await prisma.ubicacion.upsert({
    where: { id: 'ubicacion-bariloche' },
    update: {},
    create: {
      id: 'ubicacion-bariloche',
      nombre: 'Tienda Bariloche',
      tipo: 'sucursal',
      direccion: 'Mitre 150, Bariloche',
      activo: true,
    },
  });

  const tiendaMendoza = await prisma.ubicacion.upsert({
    where: { id: 'ubicacion-mendoza' },
    update: {},
    create: {
      id: 'ubicacion-mendoza',
      nombre: 'Tienda Mendoza',
      tipo: 'sucursal',
      direccion: 'Av. San Martín 500, Mendoza',
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

  // Crear stock inicial en todas las ubicaciones
  const sucursales = [tiendaNeuquen, tiendaBariloche, tiendaMendoza];
  
  // Stock de insumos en fábrica y admin
  await Promise.all([
    // Stock de insumos en fábrica
    ...insumos.map(insumo => 
      prisma.stock.create({
        data: {
          insumoId: insumo.id,
          ubicacionId: fabricaCentral.id,
          cantidad: 20,
        },
      })
    ),
    
    // Stock de insumos en oficina central
    ...insumos.map(insumo => 
      prisma.stock.create({
        data: {
          insumoId: insumo.id,
          ubicacionId: oficinaCentral.id,
          cantidad: 50, // Mayor cantidad en admin para envíos
        },
      })
    ),
    
    // Stock de productos en fábrica
    ...productos.map(producto => 
      prisma.stock.create({
        data: {
          productoId: producto.id,
          ubicacionId: fabricaCentral.id,
          cantidad: 30,
        },
      })
    ),
    
    // Stock de productos en sucursales
    ...sucursales.flatMap(sucursal => 
      productos.map(producto => 
        prisma.stock.create({
          data: {
            productoId: producto.id,
            ubicacionId: sucursal.id,
            cantidad: 15,
          },
        })
      )
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