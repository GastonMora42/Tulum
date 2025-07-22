// scripts/insertar/carga-humidificadores-nuevos-2025.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos de humidificadores actualizados
const humidificadoresData = [
  // HUMIS CON FILTRO
  { categoria: 'HUMIS CON FILTRO', nombre: 'FLORERO CHICO CON FILTRO CLARO - WM035MC', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'FLORERO CHICO CON FILTRO OSCURO - WM035MO', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'FLORERO CON FILTRO MADERA CLARA - V05MC', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'MINI FLORERO CON FILTRO CLARO- V01MC', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'MINI FLORERO CON FILTRO OSCURO - V01MO', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'REDONDO CON FILTRO MADERA CLARA - V06MC', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'REDONDO CON FILTRO MADERA OSCURA - V06MO', precio: 42500, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'VOLCAN CON FILTRO CLARO - WM074MC', precio: 49900, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'VOLCAN CON FILTRO OSCURO - WM074MO', precio: 49900, shopping: 6 },
  { categoria: 'HUMIS CON FILTRO', nombre: 'VOLCAN CRAQUELADO CON FILTRO OSCURO - WM348B', precio: 49900, shopping: 6 },
  
  // HUMIS GRANDES
  { categoria: 'HUMIS GRANDES', nombre: 'BASE MADERA CLARA PUNTA BLANCA - WM020MC', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'BASE MADERA OSCURA PUNTA BLANCA - WM020MO', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'BOSQUE - WM168', precio: 105000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'EFECTO LLAMA ALTO BLANCO - WM165W', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'EFECTO LLAMA ALTO OSCURO - WM165B', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'FLORERO GRANDE CLARO - WM029MC', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'FLORERO GRANDE OSCURO - WM029MO', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'FOGATA - WMPW01', precio: 109000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'GRAN FOGATA BLANCO - WM199W', precio: 119000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'GRAN FOGATA NEGRO- WM199B', precio: 119000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'LLAMA LARGA BLANCO - WM191W', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'LLAMA LARGA OSCURO - WM191B', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'PUNTA MEDIA MADERA CLARA - WM021MC', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'PUNTA MEDIA MADERA OSCURO- WM021MO', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'PUNTA MEDIA REJAS MADERA CLARA - WM016BMC', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'PUNTA MEDIA REJAS MADERA OSCUR0 - WM016BMO', precio: 98500, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'VOLCAN REDONDO BLANCO - WM157W', precio: 105000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'VOLCAN REDONDO NEGRO - WM157B', precio: 105000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'VOLCAN Y LLAMA BLANCO - WM163WHITE', precio: 105000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'VOLCAN Y LLAMA DOBLE LUZ - WM161', precio: 119000, shopping: 3 },
  { categoria: 'HUMIS GRANDES', nombre: 'VOLCAN Y LLAMA NEGRO - WM163BLACK', precio: 119000, shopping: 3 },
  
  // HUMIS MEDIANOS
  { categoria: 'HUMIS MEDIANOS', nombre: 'ABERTURA - K01', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'AJO - K06', precio: 55900, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'BASE MADERA 300 -K05', precio: 74500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'EFECTO LLAMA BLANCO - WM185W', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'EFECTO LLAMA OSCURO - WM185B', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'FLORERO SIN FILTRO - K04', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'FUEGO PEQUEÑO BLANCO - WM169W', precio: 69500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'FUEGO PEQUEÑO NEGRO - WM169B', precio: 69500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'HUMI + LAMPARA DE SAL BLANCO - WM159W', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'HUMI + LAMPARA DE SAL NEGRO- WM159B', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'LAVA NEGRO - WMV33B', precio: 107900, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'LLAMA CON CONTROL BLANCO - WM190W', precio: 89500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'LLAMA CON CONTROL OSCURO - WM190B', precio: 89500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON LLAMA  BLANCO - WM173W', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON LLAMA MADERA - WM173M', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON LLAMA OSCURO - WM173 B', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON PIEDRAS DE SAL BLANCO - WM175W', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON PIEDRAS DE SAL MADERA - WM175M', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO CON PIEDRAS DE SAL OSCURO- WM175B', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO PIEDRAS ARRIBA BLANCO - WM173SW', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'MINI FUEGO PIEDRAS ARRIBA MADERA CLARA - WM173SMC', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'PIEDRAS DE SAL ARRIBA - WM0630C', precio: 99500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'REDONDO CRAQUELADO BLANCO - WM196W', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'REDONDO CRAQUELADO NEGRO - WM196B', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'REDONDO SIN FILTRO - K02', precio: 79500, shopping: 4 },
  { categoria: 'HUMIS MEDIANOS', nombre: 'TRANSPARENTE ARRIBA - K03', precio: 79500, shopping: 4 },
  
  // HUMIS EDICION LIMITADA
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'BARCO - WMV75', precio: 139000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'MEDUSA - WMV80', precio: 139000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'TRENCITO NEGRO - WM178B', precio: 139000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'RELOJ ALARMA  - WM174', precio: 105000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'RELOJ CON PIEDRAS DE SAL - WM282', precio: 145000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'VULCANO CON SONIDO BLANCO - WM158W', precio: 149000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'VULCANO CON SONIDO MADERA CLARA - WM158MC', precio: 149000, shopping: 2 },
  { categoria: 'HUMIS EDICION LIMITADA', nombre: 'CON BLUETOOTH - WM285', precio: 145000, shopping: 2 }
];

// Mapeo de nombres de categorías
const categoriasMapping = {
  'HUMIS CON FILTRO': 'Humidificadores con Filtro',
  'HUMIS GRANDES': 'Humidificadores Grandes',
  'HUMIS MEDIANOS': 'Humidificadores Medianos',
  'HUMIS EDICION LIMITADA': 'Humidificadores Edición Limitada'
};

// Función para generar código de barras EAN-13 único para humidificadores
function generarCodigoBarrasHumis(secuencia) {
  const paisArg = '779';
  const empresa = '4000'; // Código específico para humidificadores nuevos
  const producto = secuencia.toString().padStart(5, '0');
  
  const base = paisArg + empresa + producto;
  
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]);
    suma += (i % 2 === 0) ? digito : digito * 3;
  }
  
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return base + digitoVerificador;
}

// Función para obtener usuario admin
async function obtenerUsuarioAdmin() {
  const adminUser = await prisma.user.findFirst({
    where: { 
      OR: [
        { roleId: 'role-admin' },
        { role: { name: 'admin' } }
      ]
    }
  });
  
  if (!adminUser) {
    throw new Error('No se encontró usuario admin');
  }
  
  return adminUser.id;
}

// Función para buscar sucursal Shopping Patagonia
async function buscarSucursalShoppingPatagonia() {
  console.log('🏢 Buscando sucursal Shopping Patagonia...');
  
  const nombresAPróbar = [
    'Shopping patagonia - bariloche',
    'SHOPPING PATAGONIA - BARILOCHE',
    'Shopping Patagonia',
    'SHOPPING PATAGONIA',
    'shopping patagonia',
    'Sucursal Bariloche'
  ];

  for (const nombre of nombresAPróbar) {
    const sucursal = await prisma.ubicacion.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        },
        tipo: 'sucursal'
      }
    });

    if (sucursal) {
      console.log(`   ✅ Sucursal encontrada: ${sucursal.nombre} (ID: ${sucursal.id})`);
      return sucursal;
    }
  }

  throw new Error('Sucursal Shopping Patagonia no encontrada');
}

// Función principal
async function cargarHumidificadoresNuevos() {
  console.log('🌊 === CARGA DE HUMIDIFICADORES ACTUALIZADOS 2025 ===\n');
  
  try {
    const adminUserId = await obtenerUsuarioAdmin();
    console.log(`✅ Usuario admin encontrado: ${adminUserId}`);
    
    const sucursalShopping = await buscarSucursalShoppingPatagonia();
    
    // 1. LIMPIEZA COMPLETA DE HUMIDIFICADORES EXISTENTES
    console.log('\n🧹 === FASE 1: LIMPIEZA DE HUMIDIFICADORES EXISTENTES ===');
    
    // Eliminar configuraciones de stock de humidificadores
    console.log('🗂️ Eliminando configuraciones de stock de humidificadores...');
    const configsEliminadas = await prisma.stockConfigSucursal.deleteMany({
      where: {
        producto: {
          nombre: { startsWith: 'HUMIDIFICADOR' }
        }
      }
    });
    console.log(`   ✅ ${configsEliminadas.count} configuraciones eliminadas`);
    
    // Eliminar alertas de stock de humidificadores
    console.log('🚨 Eliminando alertas de stock de humidificadores...');
    const alertasEliminadas = await prisma.alertaStock.deleteMany({
      where: {
        producto: {
          nombre: { startsWith: 'HUMIDIFICADOR' }
        }
      }
    });
    console.log(`   ✅ ${alertasEliminadas.count} alertas eliminadas`);
    
    // Eliminar movimientos de stock de humidificadores
    console.log('📦 Eliminando movimientos de stock de humidificadores...');
    const stockIds = await prisma.stock.findMany({
      where: {
        producto: {
          nombre: { startsWith: 'HUMIDIFICADOR' }
        }
      },
      select: { id: true }
    });
    
    if (stockIds.length > 0) {
      const movimientosEliminados = await prisma.movimientoStock.deleteMany({
        where: {
          stockId: { in: stockIds.map(s => s.id) }
        }
      });
      console.log(`   ✅ ${movimientosEliminados.count} movimientos eliminados`);
    }
    
    // Eliminar stock de humidificadores
    console.log('📊 Eliminando stock de humidificadores...');
    const stockEliminado = await prisma.stock.deleteMany({
      where: {
        producto: {
          nombre: { startsWith: 'HUMIDIFICADOR' }
        }
      }
    });
    console.log(`   ✅ ${stockEliminado.count} registros de stock eliminados`);
    
    // Eliminar productos humidificadores
    console.log('🌊 Eliminando productos humidificadores...');
    const productosEliminados = await prisma.producto.deleteMany({
      where: {
        nombre: { startsWith: 'HUMIDIFICADOR' }
      }
    });
    console.log(`   ✅ ${productosEliminados.count} humidificadores eliminados`);
    
    // Eliminar categorías de humidificadores
    console.log('📂 Eliminando categorías de humidificadores...');
    const categoriasParaEliminar = [
      'Humidificadores con Filtro',
      'Humidificadores Grandes', 
      'Humidificadores Medianos',
      'Humidificadores Edición Limitada'
    ];
    
    const categoriasEliminadas = await prisma.categoria.deleteMany({
      where: {
        nombre: { in: categoriasParaEliminar }
      }
    });
    console.log(`   ✅ ${categoriasEliminadas.count} categorías eliminadas`);
    
    // 2. CREACIÓN DE NUEVAS CATEGORÍAS
    console.log('\n📂 === FASE 2: CREACIÓN DE CATEGORÍAS ===');
    
    const categoriaMap = new Map();
    const categoriasUnicas = [...new Set(Object.values(categoriasMapping))];
    
    for (const nombreCategoria of categoriasUnicas) {
      try {
        const categoria = await prisma.categoria.create({
          data: { 
            nombre: nombreCategoria,
            imagen: `/images/categorias/humidificadores.webp`
          }
        });
        
        categoriaMap.set(nombreCategoria, categoria.id);
        console.log(`   ✅ Categoría creada: ${nombreCategoria}`);
      } catch (error) {
        console.error(`   ❌ Error con categoría ${nombreCategoria}:`, error.message);
      }
    }
    
    // 3. CREACIÓN DE PRODUCTOS
    console.log('\n🌊 === FASE 3: CREACIÓN DE HUMIDIFICADORES ===');
    
    let creados = 0;
    let errores = 0;
    const productosCreados = [];
    
    for (let i = 0; i < humidificadoresData.length; i++) {
      const item = humidificadoresData[i];
      
      try {
        // Obtener categoría
        const categoriaNombre = categoriasMapping[item.categoria];
        const categoriaId = categoriaMap.get(categoriaNombre);
        
        if (!categoriaId) {
          throw new Error(`Categoría "${categoriaNombre}" no encontrada`);
        }
        
        // Generar código de barras único
        const codigoBarras = generarCodigoBarrasHumis(i + 1);
        
        // Crear humidificador
        const humidificador = await prisma.producto.create({
          data: {
            nombre: `HUMIDIFICADOR ${item.nombre}`,
            descripcion: `${item.categoria} - Modelo: ${item.nombre}`,
            precio: item.precio,
            codigoBarras: codigoBarras,
            categoriaId: categoriaId,
            stockMinimo: 1,
            activo: true
          }
        });
        
        productosCreados.push({
          ...humidificador,
          stockShopping: item.shopping
        });
        
        creados++;
        
        if (creados % 15 === 0) {
          console.log(`   🌊 ${creados} humidificadores creados...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error con "${item.nombre}": ${error.message}`);
        errores++;
      }
    }
    
    console.log(`   ✅ ${creados} humidificadores creados, ${errores} errores`);
    
    // 4. CONFIGURACIÓN DE STOCK PARA SHOPPING PATAGONIA
    console.log('\n⚙️ === FASE 4: CONFIGURACIÓN DE STOCK ===');
    
    let configsCreadas = 0;
    
    for (const humidificador of productosCreados) {
      try {
        await prisma.stockConfigSucursal.create({
          data: {
            productoId: humidificador.id,
            sucursalId: sucursalShopping.id,
            stockMaximo: humidificador.stockShopping,
            stockMinimo: 1,
            puntoReposicion: Math.ceil(humidificador.stockShopping * 0.3),
            creadoPor: adminUserId,
            activo: true
          }
        });
        
        configsCreadas++;
        
      } catch (error) {
        console.error(`   ❌ Error config ${humidificador.nombre}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${configsCreadas} configuraciones de stock creadas`);
    
    // 5. RESUMEN FINAL
    console.log('\n📊 === RESUMEN FINAL ===');
    console.log(`✅ Humidificadores creados: ${creados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`⚙️ Configuraciones de stock: ${configsCreadas}`);
    console.log(`📂 Categorías: ${categoriasUnicas.length}`);
    
    // Resumen por categoría
    console.log('\n📊 Resumen por categoría:');
    const resumenCategorias = {};
    
    for (const item of humidificadoresData) {
      const cat = categoriasMapping[item.categoria];
      if (!resumenCategorias[cat]) {
        resumenCategorias[cat] = 0;
      }
      resumenCategorias[cat]++;
    }
    
    for (const [categoria, cantidad] of Object.entries(resumenCategorias)) {
      console.log(`   🏷️ ${categoria}: ${cantidad} productos`);
    }
    
    // 6. VERIFICACIÓN DE MUESTRA
    console.log('\n🔍 Muestra de humidificadores creados:');
    const muestra = await prisma.producto.findMany({
      take: 5,
      where: {
        nombre: { startsWith: 'HUMIDIFICADOR' }
      },
      include: { 
        categoria: true,
        stockConfigs: true
      },
      orderBy: { nombre: 'asc' }
    });
    
    muestra.forEach(producto => {
      console.log(`   🌊 ${producto.nombre}`);
      console.log(`      Categoría: ${producto.categoria.nombre}`);
      console.log(`      Precio: $${producto.precio.toLocaleString()}`);
      console.log(`      Código: ${producto.codigoBarras}`);
      console.log(`      Configs: ${producto.stockConfigs.length} sucursales`);
    });
    
    console.log('\n🎉 === HUMIDIFICADORES ACTUALIZADOS EXITOSAMENTE ===');
    
    return {
      humidificadoresCreados: creados,
      errores,
      configuracionesStock: configsCreadas,
      categorias: categoriasUnicas.length
    };
    
  } catch (error) {
    console.error('\n💥 === ERROR EN LA CARGA ===');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Script de Carga de Humidificadores Actualizados 2025

🎯 Propósito:
   Reemplazar completamente todos los humidificadores existentes
   con la nueva línea de productos actualizada.

🔧 Uso:
   node scripts/insertar/carga-humidificadores-nuevos-2025.js

⚠️ ADVERTENCIA:
   Este script ELIMINA TODOS los humidificadores existentes
   y sus categorías antes de cargar los nuevos.

📋 Qué hace:
   ✅ Elimina humidificadores existentes y sus dependencias
   ✅ Elimina categorías de humidificadores antiguas
   ✅ Crea 4 nuevas categorías de humidificadores
   ✅ Carga ${humidificadoresData.length} nuevos productos
   ✅ Configura stock para Shopping Patagonia
   ✅ Genera códigos de barras únicos
   ✅ Verifica integridad de datos

💡 Categorías incluidas:
   🔹 Humidificadores con Filtro (${humidificadoresData.filter(h => h.categoria === 'HUMIS CON FILTRO').length} productos)
   🔹 Humidificadores Grandes (${humidificadoresData.filter(h => h.categoria === 'HUMIS GRANDES').length} productos)
   🔹 Humidificadores Medianos (${humidificadoresData.filter(h => h.categoria === 'HUMIS MEDIANOS').length} productos)
   🔹 Humidificadores Edición Limitada (${humidificadoresData.filter(h => h.categoria === 'HUMIS EDICION LIMITADA').length} productos)

🔒 Requisitos:
   - Usuario admin configurado
   - Sucursal Shopping Patagonia existente
   - Base de datos accesible
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  console.log('🚀 Iniciando carga de humidificadores actualizados...\n');
  
  cargarHumidificadoresNuevos()
    .then((resultado) => {
      console.log(`\n🏁 Carga completada: ${resultado.humidificadoresCreados} humidificadores cargados`);
      console.log(`📊 Categorías: ${resultado.categorias}, Configs: ${resultado.configuracionesStock}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { cargarHumidificadoresNuevos };