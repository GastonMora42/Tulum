// scripts/insertar/setup-completo-productos.js - SCRIPT MAESTRO
const { PrismaClient } = require('@prisma/client');
const { insertarProductosFinales } = require('./insertar-productos-finales');
const { gestionarImagenes } = require('./gestionar-imagenes-categorias');
const prisma = new PrismaClient();

// Función para mostrar banner
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    TULUM AROMATERAPIA                        ║
║                Setup Completo de Productos                   ║
║                                                              ║
║  🏭 Productos Definitivos                                    ║
║  📂 Categorías con Imágenes                                  ║
║  🏪 Listo para Producción                                    ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para verificar estado actual del sistema
async function verificarEstadoActual() {
  console.log('🔍 Verificando estado actual del sistema...\n');
  
  try {
    // Contar datos existentes
    const productos = await prisma.producto.count();
    const categorias = await prisma.categoria.count();
    const ventas = await prisma.itemVenta.count();
    const stock = await prisma.stock.count({ where: { productoId: { not: null } } });
    const recetas = await prisma.productoReceta.count();
    
    console.log('📊 Estado actual:');
    console.log(`   📦 Productos: ${productos}`);
    console.log(`   📂 Categorías: ${categorias}`);
    console.log(`   🛒 Ventas: ${ventas}`);
    console.log(`   📦 Stock: ${stock}`);
    console.log(`   📋 Recetas: ${recetas}`);
    
    // Verificar productos por categoría
    if (productos > 0) {
      const productosPorCategoria = await prisma.categoria.findMany({
        include: {
          _count: {
            select: { productos: true }
          }
        },
        orderBy: { nombre: 'asc' }
      });
      
      console.log('\n📂 Productos por categoría actual:');
      productosPorCategoria.forEach(cat => {
        if (cat._count.productos > 0) {
          console.log(`   - ${cat.nombre}: ${cat._count.productos} productos`);
        }
      });
    }
    
    const hayDependencias = ventas > 0 || stock > 0 || recetas > 0;
    
    return {
      productos,
      categorias,
      ventas,
      stock,
      recetas,
      hayDependencias
    };
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    throw error;
  }
}

// Función para mostrar plan de acción
function mostrarPlanAccion(estado, forzarLimpieza) {
  console.log('\n📋 Plan de acción:');
  
  if (estado.hayDependencias && !forzarLimpieza) {
    console.log('   ⚠️ Se detectaron datos existentes (ventas, stock, recetas)');
    console.log('   🔄 Los productos existentes se DESACTIVARÁN');
    console.log('   ✅ Los nuevos productos se INSERTARÁN como activos');
    console.log('   💡 Para eliminar completamente usar --forzar');
  } else if (forzarLimpieza) {
    console.log('   🗑️ MODO FORZAR: Se eliminarán TODOS los datos');
    console.log('   ⚠️ Esto incluye ventas, stock y recetas');
    console.log('   🆕 Se creará todo desde cero');
  } else {
    console.log('   🆕 No hay datos existentes');
    console.log('   ✅ Se creará todo desde cero');
  }
  
  console.log('\n🔄 Pasos a ejecutar:');
  console.log('   1️⃣ Limpiar/desactivar productos existentes');
  console.log('   2️⃣ Crear categorías con imágenes');
  console.log('   3️⃣ Insertar productos definitivos');
  console.log('   4️⃣ Configurar sistema de imágenes');
  console.log('   5️⃣ Verificar resultado final');
}

// Función para confirmar ejecución
function solicitarConfirmacion(estado, forzarLimpieza) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    let mensaje = '\n¿Continuar con el setup? (s/N): ';
    
    if (estado.hayDependencias && forzarLimpieza) {
      mensaje = '\n⚠️  ATENCIÓN: Se eliminarán datos de producción. ¿Está SEGURO? (escriba "SI ESTOY SEGURO"): ';
    }
    
    rl.question(mensaje, (respuesta) => {
      rl.close();
      
      if (forzarLimpieza && estado.hayDependencias) {
        resolve(respuesta.trim() === 'SI ESTOY SEGURO');
      } else {
        resolve(respuesta.toLowerCase().trim() === 's' || respuesta.toLowerCase().trim() === 'si');
      }
    });
  });
}

// Función para ejecutar setup paso a paso
async function ejecutarSetupCompleto(forzarLimpieza = false) {
  console.log('🚀 Iniciando setup completo...\n');
  
  const resultados = {
    productos: 0,
    categorias: 0,
    errores: [],
    imagenes: null
  };
  
  try {
    // Paso 1: Insertar productos (incluye limpieza y categorías)
    console.log('1️⃣ === INSERTANDO PRODUCTOS DEFINITIVOS ===');
    const resultadoProductos = await insertarProductosFinales();
    resultados.productos = resultadoProductos.insertados;
    resultados.categorias = resultadoProductos.categorias;
    
    console.log('\n✅ Productos insertados correctamente');
    
    // Paso 2: Configurar sistema de imágenes
    console.log('\n2️⃣ === CONFIGURANDO SISTEMA DE IMÁGENES ===');
    await gestionarImagenes();
    resultados.imagenes = 'configurado';
    
    console.log('\n✅ Sistema de imágenes configurado');
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error durante el setup:', error);
    resultados.errores.push(error.message);
    throw error;
  }
}

// Función para mostrar resumen final
async function mostrarResumenFinal(resultados) {
  console.log('\n🎉 === SETUP COMPLETADO EXITOSAMENTE ===\n');
  
  // Estadísticas finales
  const estadisticasFinales = await verificarEstadoActual();
  
  console.log('📊 Resultado final:');
  console.log(`   ✅ Productos insertados: ${resultados.productos}`);
  console.log(`   ✅ Categorías creadas: ${resultados.categorias}`);
  console.log(`   ✅ Total productos activos: ${estadisticasFinales.productos}`);
  console.log(`   ✅ Sistema de imágenes: ${resultados.imagenes}`);
  
  // Mostrar muestra de productos por categoría
  console.log('\n📂 Productos por categoría (muestra):');
  const categorias = await prisma.categoria.findMany({
    include: {
      productos: {
        where: { activo: true },
        take: 3,
        select: { nombre: true }
      },
      _count: {
        select: { productos: { where: { activo: true } } }
      }
    },
    orderBy: { nombre: 'asc' }
  });
  
  categorias.forEach(categoria => {
    if (categoria._count.productos > 0) {
      console.log(`   📦 ${categoria.nombre} (${categoria._count.productos} productos):`);
      categoria.productos.forEach(producto => {
        console.log(`      - ${producto.nombre}`);
      });
      if (categoria._count.productos > 3) {
        console.log(`      ... y ${categoria._count.productos - 3} más`);
      }
    }
  });
  
  // Instrucciones de próximos pasos
  console.log('\n🎯 Próximos pasos recomendados:');
  console.log('   1️⃣ Subir imágenes reales a public/images/categorias/');
  console.log('   2️⃣ Ajustar precios en el panel de administración');
  console.log('   3️⃣ Configurar stock inicial por sucursal');
  console.log('   4️⃣ Crear recetas de producción');
  console.log('   5️⃣ Configurar códigos de barras personalizados');
  
  console.log('\n📁 Archivos generados:');
  console.log('   - public/images/README.md (instrucciones de imágenes)');
  console.log('   - scripts/descargar-imagenes-placeholder.sh (imágenes temporales)');
  
  console.log('\n💡 Comandos útiles:');
  console.log('   - Verificar imágenes: node scripts/insertar/gestionar-imagenes-categorias.js --verificar');
  console.log('   - Cargar stock inicial: node scripts/insertar/cargar-stock-inicial.js');
  console.log('   - Ver productos: Ir a /admin/productos en la aplicación');
}

// Función principal
async function setupCompleto() {
  try {
    mostrarBanner();
    
    // Verificar argumentos
    const args = process.argv.slice(2);
    const forzarLimpieza = args.includes('--forzar');
    const saltarConfirmacion = args.includes('--si') || args.includes('-y');
    
    if (forzarLimpieza) {
      console.log('⚠️ MODO FORZAR ACTIVADO - Se eliminarán todos los datos\n');
    }
    
    // 1. Verificar estado actual
    const estado = await verificarEstadoActual();
    
    // 2. Mostrar plan de acción
    mostrarPlanAccion(estado, forzarLimpieza);
    
    // 3. Solicitar confirmación (si no se salta)
    if (!saltarConfirmacion) {
      const confirmar = await solicitarConfirmacion(estado, forzarLimpieza);
      if (!confirmar) {
        console.log('\n🚫 Setup cancelado por el usuario');
        process.exit(0);
      }
    }
    
    // 4. Ejecutar setup
    const resultados = await ejecutarSetupCompleto(forzarLimpieza);
    
    // 5. Mostrar resumen final
    await mostrarResumenFinal(resultados);
    
    console.log('\n🎉 Setup completo finalizado exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error durante el setup completo:', error);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   - Verificar conexión a base de datos');
    console.log('   - Ejecutar: npm run build && npm run db:push');
    console.log('   - Revisar permisos de archivos');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Función de ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/setup-completo-productos.js [opciones]

🔧 Opciones:
   --forzar     Eliminar todos los datos existentes (peligroso)
   --si, -y     Saltear confirmaciones (modo automático)
   --ayuda      Mostrar esta ayuda

📖 Ejemplos:
   # Setup básico (recomendado)
   node scripts/insertar/setup-completo-productos.js
   
   # Setup automático sin confirmaciones
   node scripts/insertar/setup-completo-productos.js --si
   
   # Eliminar todo y empezar desde cero (PELIGROSO)
   node scripts/insertar/setup-completo-productos.js --forzar

📋 Descripción:
   Este script configura completamente el sistema de productos:
   - Crea todas las categorías con imágenes
   - Inserta todos los productos definitivos
   - Configura el sistema de imágenes
   - Prepara el sistema para producción

⚠️  Importante:
   - En modo normal, preserva ventas y stock existente
   - Con --forzar, elimina TODO (solo usar en desarrollo)
   - Siempre hacer backup antes de usar --forzar
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  setupCompleto();
}

module.exports = { 
  setupCompleto,
  verificarEstadoActual,
  ejecutarSetupCompleto
};