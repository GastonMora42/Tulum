// scripts/insertar/reset-sistema-productos.js - RESET COMPLETO
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const prisma = new PrismaClient();

// Función para mostrar advertencia
function mostrarAdvertencia() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                        ⚠️  ADVERTENCIA  ⚠️                   ║
║                                                              ║
║  Este script ELIMINARÁ COMPLETAMENTE todos los datos de:    ║
║  • Productos                                                 ║
║  • Categorías                                                ║
║  • Stock de productos                                        ║
║  • Movimientos de stock                                      ║
║  • Recetas de productos                                      ║
║  • Ventas (si se especifica)                                ║
║                                                              ║
║  ⚠️  ESTA ACCIÓN NO SE PUEDE DESHACER  ⚠️                   ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para verificar dependencias
async function verificarDependencias() {
  console.log('🔍 Verificando dependencias del sistema...\n');
  
  try {
    const dependencias = {
      productos: await prisma.producto.count(),
      categorias: await prisma.categoria.count(),
      stockProductos: await prisma.stock.count({ where: { productoId: { not: null } } }),
      movimientosStock: await prisma.movimientoStock.count(),
      recetasProducto: await prisma.productoReceta.count(),
      itemsReceta: await prisma.recetaItem.count(),
      ventas: await prisma.itemVenta.count(),
      facturasElectronicas: await prisma.facturaElectronica.count(),
      cierresCaja: await prisma.cierreCaja.count()
    };
    
    console.log('📊 Datos que serán afectados:');
    Object.entries(dependencias).forEach(([tabla, count]) => {
      if (count > 0) {
        const emoji = count > 0 ? '📋' : '✅';
        console.log(`   ${emoji} ${tabla}: ${count} registros`);
      }
    });
    
    const totalRegistros = Object.values(dependencias).reduce((a, b) => a + b, 0);
    console.log(`\n📈 Total de registros afectados: ${totalRegistros}`);
    
    return dependencias;
    
  } catch (error) {
    console.error('❌ Error verificando dependencias:', error);
    throw error;
  }
}

// Función para eliminar en orden correcto
async function eliminarDatosOrdenado(incluirVentas = false) {
  console.log('🗑️ Eliminando datos en orden correcto...\n');
  
  const resultados = {};
  
  try {
    // 1. Eliminar ventas si se especifica
    if (incluirVentas) {
      console.log('1️⃣ Eliminando facturas electrónicas...');
      const facturasEliminadas = await prisma.facturaElectronica.deleteMany({});
      resultados.facturasElectronicas = facturasEliminadas.count;
      console.log(`   ✅ ${facturasEliminadas.count} facturas eliminadas`);
      
      console.log('2️⃣ Eliminando pagos...');
      const pagosEliminados = await prisma.pago.deleteMany({});
      resultados.pagos = pagosEliminados.count;
      console.log(`   ✅ ${pagosEliminados.count} pagos eliminados`);
      
      console.log('3️⃣ Eliminando items de ventas...');
      const itemsVentaEliminados = await prisma.itemVenta.deleteMany({});
      resultados.itemsVenta = itemsVentaEliminados.count;
      console.log(`   ✅ ${itemsVentaEliminados.count} items de venta eliminados`);
      
      console.log('4️⃣ Eliminando ventas...');
      const ventasEliminadas = await prisma.venta.deleteMany({});
      resultados.ventas = ventasEliminadas.count;
      console.log(`   ✅ ${ventasEliminadas.count} ventas eliminadas`);
    }
    
    // 2. Eliminar recetas de productos
    console.log('5️⃣ Eliminando relaciones producto-receta...');
    const productoRecetasEliminadas = await prisma.productoReceta.deleteMany({});
    resultados.productoRecetas = productoRecetasEliminadas.count;
    console.log(`   ✅ ${productoRecetasEliminadas.count} relaciones eliminadas`);
    
    // 3. Eliminar movimientos de stock
    console.log('6️⃣ Eliminando movimientos de stock...');
    const movimientosEliminados = await prisma.movimientoStock.deleteMany({});
    resultados.movimientosStock = movimientosEliminados.count;
    console.log(`   ✅ ${movimientosEliminados.count} movimientos eliminados`);
    
    // 4. Eliminar stock de productos
    console.log('7️⃣ Eliminando stock de productos...');
    const stockEliminado = await prisma.stock.deleteMany({
      where: { productoId: { not: null } }
    });
    resultados.stockProductos = stockEliminado.count;
    console.log(`   ✅ ${stockEliminado.count} registros de stock eliminados`);
    
    // 5. Eliminar productos
    console.log('8️⃣ Eliminando productos...');
    const productosEliminados = await prisma.producto.deleteMany({});
    resultados.productos = productosEliminados.count;
    console.log(`   ✅ ${productosEliminados.count} productos eliminados`);
    
    // 6. Eliminar categorías
    console.log('9️⃣ Eliminando categorías...');
    const categoriasEliminadas = await prisma.categoria.deleteMany({});
    resultados.categorias = categoriasEliminadas.count;
    console.log(`   ✅ ${categoriasEliminadas.count} categorías eliminadas`);
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error durante la eliminación:', error);
    throw error;
  }
}

// Función para limpiar archivos de imágenes
async function limpiarArchivosImagenes() {
  console.log('\n🖼️ Limpiando archivos de imágenes...');
  
  try {
    const dirImagenes = 'public/images/categorias';
    
    try {
      const archivos = await fs.readdir(dirImagenes);
      let eliminados = 0;
      
      for (const archivo of archivos) {
        if (archivo.endsWith('.jpg') || archivo.endsWith('.png') || archivo.endsWith('.webp')) {
          await fs.unlink(`${dirImagenes}/${archivo}`);
          eliminados++;
        }
      }
      
      console.log(`   ✅ ${eliminados} archivos de imagen eliminados`);
      return eliminados;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`   ⚠️ Directorio ${dirImagenes} no existe`);
        return 0;
      }
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error limpiando imágenes:', error);
    return 0;
  }
}

// Función para resetear secuencias de IDs
async function resetearSecuencias() {
  console.log('\n🔄 Reseteando secuencias de IDs...');
  
  try {
    // Nota: Esto es específico para PostgreSQL
    // Para otros DBs se necesitaría adaptar
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('Producto', 'id'), 1, false);`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('Categoria', 'id'), 1, false);`;
    
    console.log('   ✅ Secuencias reseteadas');
    
  } catch (error) {
    // No es crítico si falla
    console.log('   ⚠️ No se pudieron resetear las secuencias (no crítico)');
  }
}

// Función para solicitar confirmación múltiple
function solicitarConfirmacionMultiple() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n⚠️ Para proceder, debe escribir exactamente: "ELIMINAR TODO"');
    
    rl.question('Escriba la confirmación: ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim() === 'ELIMINAR TODO');
    });
  });
}

// Función para confirmar eliminación de ventas
function confirmarEliminacionVentas() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n💰 ¿También desea eliminar VENTAS y FACTURACIÓN?');
    console.log('⚠️ Esto eliminará TODO el historial comercial');
    
    rl.question('¿Eliminar ventas? (escriba "SI" para confirmar): ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim().toUpperCase() === 'SI');
    });
  });
}

// Función para generar backup antes del reset
async function generarBackup() {
  console.log('\n💾 Generando backup antes del reset...');
  
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    // Exportar productos
    const productos = await prisma.producto.findMany({
      include: { categoria: true }
    });
    
    const nombreBackup = `backup-productos-${fecha}-${hora}.json`;
    
    const backup = {
      timestamp: new Date().toISOString(),
      productos: productos,
      stats: {
        totalProductos: productos.length,
        productosActivos: productos.filter(p => p.activo).length
      }
    };
    
    await fs.writeFile(nombreBackup, JSON.stringify(backup, null, 2));
    
    console.log(`   ✅ Backup generado: ${nombreBackup}`);
    return nombreBackup;
    
  } catch (error) {
    console.error('❌ Error generando backup:', error);
    return null;
  }
}

// Función principal de reset
async function resetSistema(forzar = false, incluirVentas = false) {
  try {
    mostrarAdvertencia();
    
    // 1. Verificar dependencias
    const dependencias = await verificarDependencias();
    
    const totalRegistros = Object.values(dependencias).reduce((a, b) => a + b, 0);
    
    if (totalRegistros === 0) {
      console.log('\n✅ El sistema ya está limpio. No hay datos para eliminar.');
      return { success: true, mensaje: 'Sistema ya limpio' };
    }
    
    // 2. Solicitar confirmaciones
    if (!forzar) {
      const confirmarReset = await solicitarConfirmacionMultiple();
      if (!confirmarReset) {
        console.log('\n🚫 Reset cancelado por el usuario');
        return { success: false, mensaje: 'Cancelado por usuario' };
      }
      
      // Solo preguntar por ventas si hay ventas
      if (dependencias.ventas > 0) {
        incluirVentas = await confirmarEliminacionVentas();
      }
    }
    
    // 3. Generar backup
    const archivoBackup = await generarBackup();
    
    // 4. Eliminar datos
    console.log('\n🚀 Iniciando eliminación de datos...');
    const resultados = await eliminarDatosOrdenado(incluirVentas);
    
    // 5. Limpiar archivos de imágenes
    const imagenesEliminadas = await limpiarArchivosImagenes();
    
    // 6. Resetear secuencias
    await resetearSecuencias();
    
    // 7. Mostrar resumen
    console.log('\n🎉 === RESET COMPLETADO ===');
    console.log(`✅ Productos eliminados: ${resultados.productos || 0}`);
    console.log(`✅ Categorías eliminadas: ${resultados.categorias || 0}`);
    console.log(`✅ Stock eliminado: ${resultados.stockProductos || 0}`);
    console.log(`✅ Movimientos eliminados: ${resultados.movimientosStock || 0}`);
    
    if (incluirVentas) {
      console.log(`✅ Ventas eliminadas: ${resultados.ventas || 0}`);
      console.log(`✅ Items de venta eliminados: ${resultados.itemsVenta || 0}`);
    }
    
    console.log(`✅ Imágenes eliminadas: ${imagenesEliminadas}`);
    
    if (archivoBackup) {
      console.log(`💾 Backup guardado en: ${archivoBackup}`);
    }
    
    console.log('\n🎯 === PRÓXIMOS PASOS ===');
    console.log('1️⃣ Ejecutar setup completo:');
    console.log('   node scripts/insertar/setup-completo-productos.js');
    console.log('2️⃣ Verificar resultado:');
    console.log('   node scripts/insertar/auditoria-productos.js --rapido');
    
    return { 
      success: true, 
      resultados, 
      backup: archivoBackup,
      imagenesEliminadas 
    };
    
  } catch (error) {
    console.error('\n💥 Error durante el reset:', error);
    throw error;
  }
}

// Función para reset selectivo
async function resetSelectivo() {
  console.log('🎯 === RESET SELECTIVO ===\n');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('Seleccione qué eliminar:');
  console.log('1. Solo productos (mantener categorías)');
  console.log('2. Solo stock de productos');
  console.log('3. Solo recetas de productos');
  console.log('4. Todo excepto ventas (recomendado)');
  console.log('5. Cancelar');
  
  return new Promise((resolve) => {
    rl.question('\nSeleccione una opción (1-5): ', async (respuesta) => {
      rl.close();
      
      try {
        switch (respuesta.trim()) {
          case '1':
            console.log('\n🗑️ Eliminando solo productos...');
            await prisma.productoReceta.deleteMany({});
            await prisma.movimientoStock.deleteMany({});
            await prisma.stock.deleteMany({ where: { productoId: { not: null } } });
            const productos = await prisma.producto.deleteMany({});
            console.log(`✅ ${productos.count} productos eliminados`);
            break;
            
          case '2':
            console.log('\n🗑️ Eliminando solo stock...');
            await prisma.movimientoStock.deleteMany({});
            const stock = await prisma.stock.deleteMany({ where: { productoId: { not: null } } });
            console.log(`✅ ${stock.count} registros de stock eliminados`);
            break;
            
          case '3':
            console.log('\n🗑️ Eliminando solo recetas...');
            const recetas = await prisma.productoReceta.deleteMany({});
            console.log(`✅ ${recetas.count} recetas eliminadas`);
            break;
            
          case '4':
            await resetSistema(false, false);
            break;
            
          case '5':
            console.log('\n🚫 Operación cancelada');
            break;
            
          default:
            console.log('\n❌ Opción inválida');
        }
        
        resolve();
      } catch (error) {
        console.error('❌ Error en reset selectivo:', error);
        resolve();
      }
    });
  });
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--help') || args.includes('--ayuda')) {
      mostrarAyuda();
      return;
    }
    
    if (args.includes('--selectivo')) {
      await resetSelectivo();
      return;
    }
    
    const forzar = args.includes('--forzar');
    const incluirVentas = args.includes('--incluir-ventas');
    
    await resetSistema(forzar, incluirVentas);
    
  } catch (error) {
    console.error('\n💥 Error durante el reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Función de ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/reset-sistema-productos.js [opciones]

🔧 Opciones:
   --forzar           Omitir confirmaciones (PELIGROSO)
   --incluir-ventas   También eliminar ventas y facturación
   --selectivo        Modo de eliminación selectiva
   --ayuda            Mostrar esta ayuda

📖 Ejemplos:
   # Reset interactivo (recomendado)
   node scripts/insertar/reset-sistema-productos.js
   
   # Reset automático sin ventas
   node scripts/insertar/reset-sistema-productos.js --forzar
   
   # Reset completo incluyendo ventas
   node scripts/insertar/reset-sistema-productos.js --forzar --incluir-ventas
   
   # Reset selectivo
   node scripts/insertar/reset-sistema-productos.js --selectivo

⚠️ IMPORTANTE:
   - Siempre genera backup antes de eliminar
   - En modo normal, preserva ventas y facturación
   - Con --incluir-ventas, elimina TODO el historial comercial
   - Usar SOLO en desarrollo o con backup completo

🔄 Después del reset, ejecutar:
   node scripts/insertar/setup-completo-productos.js
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { 
  resetSistema,
  resetSelectivo,
  verificarDependencias
};