// scripts/insertar/auditoria-productos.js - AUDITORÍA COMPLETA
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const prisma = new PrismaClient();

// Función para auditar productos
async function auditarProductos() {
  console.log('🔍 === AUDITORÍA DE PRODUCTOS ===\n');
  
  const issues = [];
  const warnings = [];
  const stats = {};
  
  try {
    // 1. Verificar productos básicos
    console.log('📦 Verificando productos...');
    
    const productos = await prisma.producto.findMany({
      include: { categoria: true }
    });
    
    stats.totalProductos = productos.length;
    stats.productosActivos = productos.filter(p => p.activo).length;
    stats.productosInactivos = productos.filter(p => !p.activo).length;
    
    console.log(`   Total: ${stats.totalProductos} productos`);
    console.log(`   Activos: ${stats.productosActivos}`);
    console.log(`   Inactivos: ${stats.productosInactivos}`);
    
    // 2. Verificar productos sin categoría
    const sinCategoria = productos.filter(p => !p.categoria);
    if (sinCategoria.length > 0) {
      issues.push(`${sinCategoria.length} productos sin categoría`);
      console.log(`   ❌ ${sinCategoria.length} productos sin categoría`);
    }
    
    // 3. Verificar productos sin precio o precio 0
    const sinPrecio = productos.filter(p => !p.precio || p.precio <= 0);
    if (sinPrecio.length > 0) {
      issues.push(`${sinPrecio.length} productos sin precio válido`);
      console.log(`   ❌ ${sinPrecio.length} productos sin precio válido`);
    }
    
    // 4. Verificar códigos de barras duplicados
    const codigosBarras = productos
      .filter(p => p.codigoBarras)
      .map(p => p.codigoBarras);
    
    const duplicados = codigosBarras.filter((codigo, index) => 
      codigosBarras.indexOf(codigo) !== index
    );
    
    if (duplicados.length > 0) {
      issues.push(`${duplicados.length} códigos de barras duplicados`);
      console.log(`   ❌ ${duplicados.length} códigos de barras duplicados`);
    }
    
    // 5. Verificar nombres duplicados
    const nombres = productos.map(p => p.nombre.toLowerCase().trim());
    const nombresDuplicados = nombres.filter((nombre, index) => 
      nombres.indexOf(nombre) !== index
    );
    
    if (nombresDuplicados.length > 0) {
      warnings.push(`${nombresDuplicados.length} nombres de productos similares`);
      console.log(`   ⚠️ ${nombresDuplicados.length} nombres de productos similares`);
    }
    
    return { productos, issues, warnings, stats };
    
  } catch (error) {
    console.error('❌ Error auditando productos:', error);
    throw error;
  }
}

// Función para auditar categorías
async function auditarCategorias() {
  console.log('\n📂 Verificando categorías...');
  
  const issues = [];
  const warnings = [];
  const stats = {};
  
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        productos: { where: { activo: true } },
        _count: { select: { productos: { where: { activo: true } } } }
      }
    });
    
    stats.totalCategorias = categorias.length;
    stats.categoriasConProductos = categorias.filter(c => c._count.productos > 0).length;
    stats.categoriasVacias = categorias.filter(c => c._count.productos === 0).length;
    
    console.log(`   Total: ${stats.totalCategorias} categorías`);
    console.log(`   Con productos: ${stats.categoriasConProductos}`);
    console.log(`   Vacías: ${stats.categoriasVacias}`);
    
    // Verificar categorías sin imagen
    const sinImagen = categorias.filter(c => !c.imagen);
    if (sinImagen.length > 0) {
      warnings.push(`${sinImagen.length} categorías sin imagen`);
      console.log(`   ⚠️ ${sinImagen.length} categorías sin imagen`);
    }
    
    // Verificar categorías vacías
    if (stats.categoriasVacias > 0) {
      warnings.push(`${stats.categoriasVacias} categorías sin productos`);
    }
    
    return { categorias, issues, warnings, stats };
    
  } catch (error) {
    console.error('❌ Error auditando categorías:', error);
    throw error;
  }
}

// Función para verificar imágenes
async function auditarImagenes() {
  console.log('\n🖼️ Verificando imágenes...');
  
  const issues = [];
  const warnings = [];
  const stats = { existentes: 0, faltantes: 0, categorias: 0 };
  
  try {
    // Verificar directorio de imágenes
    const dirImagenes = 'public/images/categorias';
    
    try {
      await fs.access(dirImagenes);
      console.log(`   ✅ Directorio ${dirImagenes} existe`);
    } catch {
      issues.push(`Directorio ${dirImagenes} no existe`);
      console.log(`   ❌ Directorio ${dirImagenes} no existe`);
      return { issues, warnings, stats };
    }
    
    // Obtener categorías con imágenes
    const categorias = await prisma.categoria.findMany({
      where: { imagen: { not: null } }
    });
    
    stats.categorias = categorias.length;
    
    for (const categoria of categorias) {
      if (categoria.imagen) {
        // Construir ruta completa
        const rutaImagen = path.join('public', categoria.imagen);
        
        try {
          await fs.access(rutaImagen);
          stats.existentes++;
          console.log(`   ✅ ${categoria.nombre}: ${categoria.imagen}`);
        } catch {
          stats.faltantes++;
          issues.push(`Imagen faltante: ${categoria.imagen} para ${categoria.nombre}`);
          console.log(`   ❌ ${categoria.nombre}: Imagen faltante ${categoria.imagen}`);
        }
      }
    }
    
    return { issues, warnings, stats };
    
  } catch (error) {
    console.error('❌ Error auditando imágenes:', error);
    throw error;
  }
}

// Función para verificar stock
async function auditarStock() {
  console.log('\n📦 Verificando stock...');
  
  const issues = [];
  const warnings = [];
  const stats = {};
  
  try {
    // Stock de productos
    const stockProductos = await prisma.stock.findMany({
      where: { productoId: { not: null } },
      include: { 
        producto: true,
        ubicacion: true 
      }
    });
    
    stats.registrosStock = stockProductos.length;
    stats.productosConStock = new Set(stockProductos.map(s => s.productoId)).size;
    
    // Productos sin stock
    const productosActivos = await prisma.producto.count({ where: { activo: true } });
    const productosSinStock = productosActivos - stats.productosConStock;
    
    stats.productosSinStock = productosSinStock;
    
    console.log(`   Registros de stock: ${stats.registrosStock}`);
    console.log(`   Productos con stock: ${stats.productosConStock}`);
    console.log(`   Productos sin stock: ${stats.productosSinStock}`);
    
    if (stats.productosSinStock > 0) {
      warnings.push(`${stats.productosSinStock} productos activos sin stock`);
    }
    
    // Verificar stock negativo
    const stockNegativo = stockProductos.filter(s => s.cantidad < 0);
    if (stockNegativo.length > 0) {
      issues.push(`${stockNegativo.length} registros con stock negativo`);
      console.log(`   ❌ ${stockNegativo.length} registros con stock negativo`);
    }
    
    // Verificar productos bajo stock mínimo
    const bajoStockMinimo = stockProductos.filter(s => 
      s.producto && s.cantidad < s.producto.stockMinimo
    );
    
    if (bajoStockMinimo.length > 0) {
      warnings.push(`${bajoStockMinimo.length} productos bajo stock mínimo`);
      console.log(`   ⚠️ ${bajoStockMinimo.length} productos bajo stock mínimo`);
    }
    
    return { issues, warnings, stats };
    
  } catch (error) {
    console.error('❌ Error auditando stock:', error);
    throw error;
  }
}

// Función para verificar integridad de datos
async function auditarIntegridad() {
  console.log('\n🔗 Verificando integridad de datos...');
  
  const issues = [];
  const warnings = [];
  
  try {
    // Verificar productos huérfanos (sin categoría válida)
    const productosHuerfanos = await prisma.producto.findMany({
      where: {
        categoria: null
      }
    });
    
    if (productosHuerfanos.length > 0) {
      issues.push(`${productosHuerfanos.length} productos huérfanos (sin categoría)`);
    }
    
    // Verificar stock huérfano (sin producto válido)
    const stockHuerfano = await prisma.stock.findMany({
      where: {
        productoId: { not: null },
        producto: null
      }
    });
    
    if (stockHuerfano.length > 0) {
      issues.push(`${stockHuerfano.length} registros de stock huérfanos`);
    }
    
    // Verificar recetas huérfanas
    const recetasHuerfanas = await prisma.productoReceta.findMany({
      where: {
        OR: [
          { producto: null },
          { receta: null }
        ]
      }
    });
    
    if (recetasHuerfanas.length > 0) {
      issues.push(`${recetasHuerfanas.length} relaciones producto-receta huérfanas`);
    }
    
    console.log(`   ✅ Verificación de integridad completada`);
    
    return { issues, warnings };
    
  } catch (error) {
    console.error('❌ Error verificando integridad:', error);
    throw error;
  }
}

// Función para generar reporte completo
async function generarReporteCompleto() {
  console.log('📊 === REPORTE COMPLETO DE AUDITORÍA ===\n');
  
  try {
    const resultados = {
      productos: await auditarProductos(),
      categorias: await auditarCategorias(),
      imagenes: await auditarImagenes(),
      stock: await auditarStock(),
      integridad: await auditarIntegridad()
    };
    
    // Consolidar issues y warnings
    const todosIssues = [
      ...resultados.productos.issues,
      ...resultados.categorias.issues,
      ...resultados.imagenes.issues,
      ...resultados.stock.issues,
      ...resultados.integridad.issues
    ];
    
    const todosWarnings = [
      ...resultados.productos.warnings,
      ...resultados.categorias.warnings,
      ...resultados.imagenes.warnings,
      ...resultados.stock.warnings,
      ...resultados.integridad.warnings
    ];
    
    // Mostrar resumen final
    console.log('\n🎯 === RESUMEN FINAL ===');
    console.log(`❌ Issues críticos: ${todosIssues.length}`);
    console.log(`⚠️ Warnings: ${todosWarnings.length}`);
    
    if (todosIssues.length > 0) {
      console.log('\n🚨 ISSUES CRÍTICOS:');
      todosIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (todosWarnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      todosWarnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    // Estadísticas generales
    console.log('\n📈 === ESTADÍSTICAS GENERALES ===');
    console.log(`📦 Productos: ${resultados.productos.stats.productosActivos} activos / ${resultados.productos.stats.totalProductos} total`);
    console.log(`📂 Categorías: ${resultados.categorias.stats.categoriasConProductos} con productos / ${resultados.categorias.stats.totalCategorias} total`);
    console.log(`🖼️ Imágenes: ${resultados.imagenes.stats.existentes} existentes / ${resultados.imagenes.stats.categorias} requeridas`);
    console.log(`📦 Stock: ${resultados.stock.stats.productosConStock} productos con stock`);
    
    // Estado general del sistema
    const estadoGeneral = todosIssues.length === 0 ? 
      (todosWarnings.length === 0 ? '🟢 EXCELENTE' : '🟡 BUENO') : 
      '🔴 REQUIERE ATENCIÓN';
    
    console.log(`\n🎯 Estado general del sistema: ${estadoGeneral}`);
    
    // Recomendaciones
    console.log('\n💡 === RECOMENDACIONES ===');
    
    if (todosIssues.length > 0) {
      console.log('   🔴 Resolver issues críticos primero');
    }
    
    if (resultados.imagenes.stats.faltantes > 0) {
      console.log('   🖼️ Subir imágenes faltantes de categorías');
    }
    
    if (resultados.stock.stats.productosSinStock > 0) {
      console.log('   📦 Configurar stock inicial para productos sin stock');
    }
    
    if (resultados.categorias.stats.categoriasVacias > 0) {
      console.log('   📂 Revisar categorías vacías (posible limpieza)');
    }
    
    console.log('   ✅ Ejecutar auditoría regularmente');
    
    return {
      estado: estadoGeneral,
      issues: todosIssues,
      warnings: todosWarnings,
      estadisticas: {
        productos: resultados.productos.stats,
        categorias: resultados.categorias.stats,
        imagenes: resultados.imagenes.stats,
        stock: resultados.stock.stats
      }
    };
    
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    throw error;
  }
}

// Función para exportar reporte a archivo
async function exportarReporte() {
  console.log('\n💾 Exportando reporte...');
  
  try {
    const reporte = await generarReporteCompleto();
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    const nombreArchivo = `auditoria-productos-${fecha}-${hora}.json`;
    
    await fs.writeFile(
      nombreArchivo, 
      JSON.stringify(reporte, null, 2)
    );
    
    console.log(`   ✅ Reporte exportado: ${nombreArchivo}`);
    
    // También generar versión legible
    const nombreTxt = `auditoria-productos-${fecha}-${hora}.txt`;
    
    const reporteTexto = `
AUDITORÍA DE PRODUCTOS - ${new Date().toLocaleString()}
======================================================

ESTADO GENERAL: ${reporte.estado}

ESTADÍSTICAS:
- Productos: ${reporte.estadisticas.productos.productosActivos} activos / ${reporte.estadisticas.productos.totalProductos} total
- Categorías: ${reporte.estadisticas.categorias.categoriasConProductos} con productos / ${reporte.estadisticas.categorias.totalCategorias} total
- Imágenes: ${reporte.estadisticas.imagenes.existentes} existentes / ${reporte.estadisticas.imagenes.categorias} requeridas
- Stock: ${reporte.estadisticas.stock.productosConStock} productos con stock

ISSUES CRÍTICOS (${reporte.issues.length}):
${reporte.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

WARNINGS (${reporte.warnings.length}):
${reporte.warnings.map((warning, i) => `${i + 1}. ${warning}`).join('\n')}
`;
    
    await fs.writeFile(nombreTxt, reporteTexto);
    console.log(`   ✅ Reporte legible: ${nombreTxt}`);
    
  } catch (error) {
    console.error('❌ Error exportando reporte:', error);
  }
}

// Función para verificación rápida
async function verificacionRapida() {
  console.log('⚡ === VERIFICACIÓN RÁPIDA ===\n');
  
  try {
    const checks = [];
    
    // Check 1: Productos activos
    const productosActivos = await prisma.producto.count({ where: { activo: true } });
    checks.push({
      nombre: 'Productos activos',
      valor: productosActivos,
      estado: productosActivos > 0 ? '✅' : '❌',
      minimo: 1
    });
    
    // Check 2: Categorías con productos
    const categoriasConProductos = await prisma.categoria.count({
      where: { productos: { some: { activo: true } } }
    });
    checks.push({
      nombre: 'Categorías con productos',
      valor: categoriasConProductos,
      estado: categoriasConProductos > 0 ? '✅' : '❌',
      minimo: 1
    });
    
    // Check 3: Productos con precio
    const productosConPrecio = await prisma.producto.count({
      where: { activo: true, precio: { gt: 0 } }
    });
    checks.push({
      nombre: 'Productos con precio',
      valor: productosConPrecio,
      estado: productosConPrecio === productosActivos ? '✅' : '⚠️',
      minimo: productosActivos
    });
    
    // Check 4: Códigos de barras únicos
    const totalCodigos = await prisma.producto.count({
      where: { codigoBarras: { not: null } }
    });
    const codigosUnicos = await prisma.producto.groupBy({
      by: ['codigoBarras'],
      where: { codigoBarras: { not: null } }
    });
    
    checks.push({
      nombre: 'Códigos de barras únicos',
      valor: codigosUnicos.length,
      estado: codigosUnicos.length === totalCodigos ? '✅' : '❌',
      minimo: totalCodigos
    });
    
    // Mostrar resultados
    checks.forEach(check => {
      console.log(`   ${check.estado} ${check.nombre}: ${check.valor}`);
    });
    
    const todosBien = checks.every(check => check.estado === '✅');
    
    console.log(`\n🎯 Estado general: ${todosBien ? '🟢 TODO BIEN' : '🟡 REVISAR DETALLES'}`);
    
    if (!todosBien) {
      console.log('\n💡 Para más detalles ejecutar: node scripts/insertar/auditoria-productos.js --completo');
    }
    
  } catch (error) {
    console.error('❌ Error en verificación rápida:', error);
    throw error;
  }
}

// Función principal
async function auditoria(comando = null) {
  try {
    switch (comando) {
      case '--rapido':
        await verificacionRapida();
        break;
        
      case '--exportar':
        await exportarReporte();
        break;
        
      case '--completo':
      default:
        await generarReporteCompleto();
    }
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/auditoria-productos.js [comando]

🔧 Comandos:
   --rapido     Verificación rápida (por defecto)
   --completo   Auditoría completa detallada
   --exportar   Generar y exportar reporte completo
   --ayuda      Mostrar esta ayuda

📖 Ejemplos:
   # Verificación rápida
   node scripts/insertar/auditoria-productos.js --rapido
   
   # Auditoría completa
   node scripts/insertar/auditoria-productos.js --completo
   
   # Exportar reporte a archivos
   node scripts/insertar/auditoria-productos.js --exportar

🔍 Qué verifica:
   ✅ Productos activos y configurados
   ✅ Categorías con productos
   ✅ Imágenes de categorías existentes
   ✅ Stock de productos
   ✅ Integridad de datos
   ✅ Códigos de barras únicos
   ✅ Precios válidos
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  if (comando === '--ayuda' || comando === '--help') {
    mostrarAyuda();
    process.exit(0);
  }
  
  auditoria(comando)
    .then(() => {
      console.log('\n✅ Auditoría completada');
      process.exit(0);
    })
    .catch(() => {
      console.log('\n❌ Auditoría falló');
      process.exit(1);
    });
}

module.exports = { 
  auditoria,
  generarReporteCompleto,
  verificacionRapida,
  auditarProductos,
  auditarCategorias
};