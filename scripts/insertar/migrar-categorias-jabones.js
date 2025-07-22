// scripts/insertar/migrar-categorias-jabones.js - MIGRACIÓN CATEGORÍAS JABONES
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const prisma = new PrismaClient();

// Configuración de la migración
const MIGRACION_CONFIG = {
  categoriasAEliminar: [
    'Aceites Esenciales',
    'Aceites escenciales', // Variante con error tipográfico
    'Aguas Aromáticas',
    'Aguas Aromaticas', // Sin tilde
    'Velas Aromáticas', 
    'Velas Aromaticas', // Sin tilde
    'Fragancias',
    'Jabones' // Categoría general que se dividirá
  ],
  nuevasCategorias: [
    {
      nombre: 'Jabones Sólidos',
      imagen: '/images/categorias/jabones-solidos.webp'
    },
    {
      nombre: 'Jabones Líquidos', 
      imagen: '/images/categorias/jabones-liquidos.webp'
    }
  ]
};

// Datos de productos nuevos
const PRODUCTOS_JABONES_SOLIDOS = [
  { nombre: 'JABON SOLIDO AVENA Y COCO', precio: 6900 },
  { nombre: 'JABON SOLIDO CACAO', precio: 6900 },
  { nombre: 'JABON SOLIDO CALENDULA', precio: 6900 },
  { nombre: 'JABON SOLIDO CARBON ACTIVADO', precio: 6900 },
  { nombre: 'JABON SOLIDO LAVANDA', precio: 6900 },
  { nombre: 'JABON SOLIDO MALBEC', precio: 6900 },
  { nombre: 'JABON SOLIDO MANZANILLA', precio: 6900 },
  { nombre: 'JABON SOLIDO OLIVA', precio: 6900 },
  { nombre: 'JABON SOLIDO ROSA MOSQUETA', precio: 6900 },
  { nombre: 'JABON SOLIDO CAFE', precio: 6900 },
  { nombre: 'JABON SOLIDO CENTELLA ASIATICA', precio: 6900 }
];

const PRODUCTOS_JABONES_LIQUIDOS = [
  { nombre: 'JABON LIQUIDO ALOE', precio: 15500 },
  { nombre: 'JABON LIQUIDO CANCUN', precio: 15500 },
  { nombre: 'JABON LIQUIDO CHANDAL', precio: 15500 },
  { nombre: 'JABON LIQUIDO HIBISCUS', precio: 15500 },
  { nombre: 'JABON LIQUIDO MANGO Y MARACUYA', precio: 15500 },
  { nombre: 'JABON LIQUIDO PARADISE', precio: 15500 },
  { nombre: 'JABON LIQUIDO VAINILLA COCO', precio: 15500 }
];

// Función para generar código de barras EAN-13 válido
function generarCodigoBarrasEAN13(secuencia) {
  const paisArg = '779'; // Argentina
  const empresa = '2025'; // Código empresa 2025
  const producto = secuencia.toString().padStart(5, '0');
  
  const base = paisArg + empresa + producto;
  
  // Calcular dígito verificador
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
    where: { roleId: 'role-admin' }
  });
  
  if (!adminUser) {
    throw new Error('No se encontró usuario admin');
  }
  
  return adminUser.id;
}

// Función para mostrar banner
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                🧼 MIGRACIÓN DE CATEGORÍAS JABONES 🧼         ║
║                                                              ║
║  • Elimina categorías obsoletas                             ║
║  • Crea nuevas categorías: Jabones Sólidos y Líquidos      ║
║  • Migra productos existentes y agrega nuevos              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para verificar datos existentes
async function verificarDatosExistentes() {
  console.log('🔍 Verificando datos existentes...\n');
  
  try {
    // Buscar categorías a eliminar
    const categoriasAEliminar = await prisma.categoria.findMany({
      where: {
        nombre: { in: MIGRACION_CONFIG.categoriasAEliminar }
      },
      include: {
        _count: { select: { productos: true } }
      }
    });
    
    // Buscar productos en esas categorías
    let totalProductosAfectados = 0;
    for (const categoria of categoriasAEliminar) {
      totalProductosAfectados += categoria._count.productos;
    }
    
    // Verificar si ya existen las nuevas categorías
    const categoriasExistentes = await prisma.categoria.findMany({
      where: {
        nombre: { in: ['Jabones Sólidos', 'Jabones Líquidos'] }
      }
    });
    
    console.log('📊 Estado actual:');
    console.log(`   🗑️ Categorías a eliminar: ${categoriasAEliminar.length}`);
    console.log(`   📦 Productos afectados: ${totalProductosAfectados}`);
    console.log(`   ✅ Categorías nuevas ya existentes: ${categoriasExistentes.length}`);
    
    if (categoriasAEliminar.length > 0) {
      console.log('\n📋 Categorías que se eliminarán:');
      categoriasAEliminar.forEach(cat => {
        console.log(`   • ${cat.nombre} (${cat._count.productos} productos)`);
      });
    }
    
    if (categoriasExistentes.length > 0) {
      console.log('\n⚠️ Categorías que ya existen:');
      categoriasExistentes.forEach(cat => {
        console.log(`   • ${cat.nombre}`);
      });
    }
    
    return {
      categoriasAEliminar,
      totalProductosAfectados,
      categoriasExistentes
    };
    
  } catch (error) {
    console.error('❌ Error verificando datos existentes:', error);
    throw error;
  }
}

// Función para generar backup
async function generarBackup() {
  console.log('\n💾 Generando backup antes de la migración...');
  
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    // Obtener datos a respaldar
    const categoriasBackup = await prisma.categoria.findMany({
      where: {
        nombre: { in: MIGRACION_CONFIG.categoriasAEliminar }
      },
      include: {
        productos: true
      }
    });
    
    const backup = {
      timestamp: new Date().toISOString(),
      descripcion: 'Backup antes de migración de categorías de jabones',
      categorias: categoriasBackup,
      estadisticas: {
        categorias: categoriasBackup.length,
        productos: categoriasBackup.reduce((total, cat) => total + cat.productos.length, 0)
      }
    };
    
    const nombreBackup = `backup-migracion-jabones-${fecha}-${hora}.json`;
    await fs.writeFile(nombreBackup, JSON.stringify(backup, null, 2));
    
    console.log(`   ✅ Backup generado: ${nombreBackup}`);
    console.log(`   📊 ${backup.estadisticas.categorias} categorías, ${backup.estadisticas.productos} productos respaldados`);
    
    return nombreBackup;
  } catch (error) {
    console.error('❌ Error generando backup:', error);
    return null;
  }
}

// Función para eliminar datos antiguos
async function eliminarDatosAntiguos() {
  console.log('\n🗑️ Eliminando categorías y productos antiguos...');
  
  try {
    let productosEliminados = 0;
    let categoriasEliminadas = 0;
    
    // Eliminar en transacción para mantener consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Buscar categorías a eliminar
      const categorias = await tx.categoria.findMany({
        where: {
          nombre: { in: MIGRACION_CONFIG.categoriasAEliminar }
        },
        select: { id: true, nombre: true }
      });
      
      if (categorias.length === 0) {
        console.log('   ℹ️ No se encontraron categorías para eliminar');
        return;
      }
      
      const categoriaIds = categorias.map(c => c.id);
      
      // 2. Eliminar productos de esas categorías
      const productosResult = await tx.producto.deleteMany({
        where: {
          categoriaId: { in: categoriaIds }
        }
      });
      productosEliminados = productosResult.count;
      
      // 3. Eliminar las categorías
      const categoriasResult = await tx.categoria.deleteMany({
        where: {
          id: { in: categoriaIds }
        }
      });
      categoriasEliminadas = categoriasResult.count;
      
      console.log(`   ✅ ${productosEliminados} productos eliminados`);
      console.log(`   ✅ ${categoriasEliminadas} categorías eliminadas`);
    });
    
    return { productosEliminados, categoriasEliminadas };
  } catch (error) {
    console.error('❌ Error eliminando datos antiguos:', error);
    throw error;
  }
}

// Función para crear nuevas categorías
async function crearNuevasCategorias() {
  console.log('\n📂 Creando nuevas categorías...');
  
  try {
    const categoriasCreadas = [];
    
    for (const categoriaData of MIGRACION_CONFIG.nuevasCategorias) {
      // Verificar si ya existe
      const existente = await prisma.categoria.findFirst({
        where: { nombre: categoriaData.nombre }
      });
      
      if (existente) {
        console.log(`   ⏭️ ${categoriaData.nombre} ya existe, omitiendo...`);
        categoriasCreadas.push(existente);
        continue;
      }
      
      // Crear nueva categoría
      const nuevaCategoria = await prisma.categoria.create({
        data: categoriaData
      });
      
      console.log(`   ✅ ${nuevaCategoria.nombre} creada (ID: ${nuevaCategoria.id})`);
      categoriasCreadas.push(nuevaCategoria);
    }
    
    return categoriasCreadas;
  } catch (error) {
    console.error('❌ Error creando categorías:', error);
    throw error;
  }
}

// Función para crear productos
async function crearProductos(categorias) {
  console.log('\n📦 Creando productos de jabones...');
  
  try {
    const adminUserId = await obtenerUsuarioAdmin();
    
    // Buscar categorías por nombre
    const categoriaSolidos = categorias.find(c => c.nombre === 'Jabones Sólidos');
    const categoriaLiquidos = categorias.find(c => c.nombre === 'Jabones Líquidos');
    
    if (!categoriaSolidos || !categoriaLiquidos) {
      throw new Error('No se encontraron las categorías de jabones');
    }
    
    let contadorCodigo = 1000; // Empezar desde 1000 para evitar conflictos
    let productosCreados = 0;
    
    // Crear jabones sólidos
    console.log(`   🧼 Creando jabones sólidos...`);
    for (const productoData of PRODUCTOS_JABONES_SOLIDOS) {
      const codigoBarras = generarCodigoBarrasEAN13(contadorCodigo++);
      
      const producto = await prisma.producto.create({
        data: {
          nombre: productoData.nombre,
          descripcion: `Jabón sólido natural - ${productoData.nombre.replace('JABON SOLIDO ', '')}`,
          precio: productoData.precio,
          codigoBarras: codigoBarras,
          categoriaId: categoriaSolidos.id,
          stockMinimo: 3,
          activo: true
        }
      });
      
      productosCreados++;
      console.log(`     ✅ ${producto.nombre} - $${producto.precio}`);
    }
    
    // Crear jabones líquidos
    console.log(`   🧴 Creando jabones líquidos...`);
    for (const productoData of PRODUCTOS_JABONES_LIQUIDOS) {
      const codigoBarras = generarCodigoBarrasEAN13(contadorCodigo++);
      
      const producto = await prisma.producto.create({
        data: {
          nombre: productoData.nombre,
          descripcion: `Jabón líquido aromático - ${productoData.nombre.replace('JABON LIQUIDO ', '')}`,
          precio: productoData.precio,
          codigoBarras: codigoBarras,
          categoriaId: categoriaLiquidos.id,
          stockMinimo: 3,
          activo: true
        }
      });
      
      productosCreados++;
      console.log(`     ✅ ${producto.nombre} - $${producto.precio}`);
    }
    
    console.log(`   📊 Total productos creados: ${productosCreados}`);
    return productosCreados;
  } catch (error) {
    console.error('❌ Error creando productos:', error);
    throw error;
  }
}

// Función para solicitar confirmación
function solicitarConfirmacion() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n⚠️ Esta operación ELIMINARÁ categorías y productos existentes');
    console.log('¿Está seguro de continuar? (escriba "CONFIRMAR"):');
    
    rl.question('> ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim() === 'CONFIRMAR');
    });
  });
}

// Función para mostrar resumen final
async function mostrarResumenFinal() {
  console.log('\n📊 === RESUMEN POST-MIGRACIÓN ===');
  
  try {
    // Verificar categorías finales
    const categorias = await prisma.categoria.findMany({
      where: {
        nombre: { in: ['Jabones Sólidos', 'Jabones Líquidos'] }
      },
      include: {
        _count: { select: { productos: true } }
      }
    });
    
    console.log('📂 Categorías creadas:');
    categorias.forEach(cat => {
      console.log(`   ✅ ${cat.nombre}: ${cat._count.productos} productos`);
    });
    
    // Mostrar algunos productos de ejemplo
    const productosEjemplo = await prisma.producto.findMany({
      where: {
        categoria: {
          nombre: { in: ['Jabones Sólidos', 'Jabones Líquidos'] }
        }
      },
      include: { categoria: true },
      take: 5,
      orderBy: { nombre: 'asc' }
    });
    
    if (productosEjemplo.length > 0) {
      console.log('\n📦 Ejemplos de productos creados:');
      productosEjemplo.forEach(producto => {
        console.log(`   • ${producto.nombre} (${producto.categoria.nombre}) - $${producto.precio}`);
      });
    }
    
    // Total de categorías en el sistema
    const totalCategorias = await prisma.categoria.count();
    const totalProductos = await prisma.producto.count({ where: { activo: true } });
    
    console.log(`\n🎯 Estado final del sistema:`);
    console.log(`   📂 Total categorías: ${totalCategorias}`);
    console.log(`   📦 Total productos activos: ${totalProductos}`);
    
  } catch (error) {
    console.error('❌ Error mostrando resumen final:', error);
  }
}

// Función principal
async function migrarCategoriasJabones(forzar = false) {
  try {
    mostrarBanner();
    
    // 1. Verificar datos existentes
    const verificacion = await verificarDatosExistentes();
    
    if (verificacion.totalProductosAfectados === 0 && verificacion.categoriasAEliminar.length === 0) {
      console.log('\n✅ No hay categorías obsoletas para eliminar');
    }
    
    // 2. Solicitar confirmación si hay datos que eliminar
    if (!forzar && (verificacion.totalProductosAfectados > 0 || verificacion.categoriasAEliminar.length > 0)) {
      const confirmar = await solicitarConfirmacion();
      if (!confirmar) {
        console.log('\n🚫 Migración cancelada por el usuario');
        return { success: false, mensaje: 'Cancelado por usuario' };
      }
    }
    
    // 3. Generar backup
    const archivoBackup = await generarBackup();
    
    // 4. Eliminar datos antiguos
    const eliminacion = await eliminarDatosAntiguos();
    
    // 5. Crear nuevas categorías
    const categorias = await crearNuevasCategorias();
    
    // 6. Crear productos
    const productosCreados = await crearProductos(categorias);
    
    // 7. Mostrar resumen final
    await mostrarResumenFinal();
    
    console.log('\n🎉 === MIGRACIÓN COMPLETADA EXITOSAMENTE ===');
    console.log(`🗑️ Eliminados: ${eliminacion.categoriasEliminadas} categorías, ${eliminacion.productosEliminados} productos`);
    console.log(`✨ Creados: ${categorias.length} categorías, ${productosCreados} productos`);
    
    if (archivoBackup) {
      console.log(`💾 Backup disponible en: ${archivoBackup}`);
    }
    
    return {
      success: true,
      eliminados: eliminacion,
      creados: { categorias: categorias.length, productos: productosCreados },
      backup: archivoBackup
    };
    
  } catch (error) {
    console.error('\n💥 Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función de ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/migrar-categorias-jabones.js [opciones]

🔧 Opciones:
   --forzar         Ejecutar sin solicitar confirmación
   --verificar      Solo verificar qué se eliminaría (sin cambios)
   --ayuda          Mostrar esta ayuda

📖 Ejemplos:
   # Migración interactiva (recomendado)
   node scripts/insertar/migrar-categorias-jabones.js
   
   # Migración automática
   node scripts/insertar/migrar-categorias-jabones.js --forzar
   
   # Solo verificar
   node scripts/insertar/migrar-categorias-jabones.js --verificar

🔄 Qué hace este script:
   1. Elimina categorías obsoletas: Aceites Esenciales, Aguas Aromáticas, etc.
   2. Crea nuevas categorías: Jabones Sólidos y Jabones Líquidos
   3. Agrega ${PRODUCTOS_JABONES_SOLIDOS.length} jabones sólidos y ${PRODUCTOS_JABONES_LIQUIDOS.length} jabones líquidos
   4. Genera backup automático antes de cambios
   5. Asigna códigos de barras únicos EAN-13

🛡️ Seguridad:
   - Genera backup antes de eliminar
   - Operaciones en transacciones
   - Confirmación requerida para cambios destructivos
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  if (args.includes('--verificar')) {
    console.log('🔍 === MODO VERIFICACIÓN ===\n');
    verificarDatosExistentes()
      .then(() => {
        console.log('\n✅ Verificación completada. Use sin --verificar para ejecutar la migración.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error en verificación:', error);
        process.exit(1);
      });
  } else {
    const forzar = args.includes('--forzar');
    
    migrarCategoriasJabones(forzar)
      .then((resultado) => {
        if (resultado.success) {
          console.log('\n🏁 Migración finalizada correctamente');
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Error en migración:', error);
        process.exit(1);
      });
  }
}

module.exports = { 
  migrarCategoriasJabones,
  verificarDatosExistentes
};