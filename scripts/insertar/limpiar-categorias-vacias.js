// scripts/insertar/limpiar-categorias-vacias.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para mostrar banner
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                🗑️  LIMPIEZA DE CATEGORÍAS VACÍAS  🗑️         ║
║                                                              ║
║  Elimina categorías que no tienen productos asociados       ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para identificar categorías vacías
async function identificarCategoriasVacias() {
  console.log('🔍 Identificando categorías vacías...\n');
  
  try {
    // Obtener todas las categorías con conteo de productos
    const categorias = await prisma.categoria.findMany({
      include: {
        _count: {
          select: { 
            productos: true // Contar todos los productos (activos e inactivos)
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    // Separar categorías vacías y con productos
    const categoriasVacias = categorias.filter(cat => cat._count.productos === 0);
    const categoriasConProductos = categorias.filter(cat => cat._count.productos > 0);
    
    console.log('📊 Análisis de categorías:');
    console.log(`   📂 Total categorías: ${categorias.length}`);
    console.log(`   ✅ Con productos: ${categoriasConProductos.length}`);
    console.log(`   🗑️ Vacías: ${categoriasVacias.length}`);
    
    // Mostrar categorías con productos
    if (categoriasConProductos.length > 0) {
      console.log('\n✅ Categorías con productos (se conservarán):');
      categoriasConProductos.forEach(cat => {
        console.log(`   📦 ${cat.nombre}: ${cat._count.productos} producto(s)`);
      });
    }
    
    // Mostrar categorías vacías
    if (categoriasVacias.length > 0) {
      console.log('\n🗑️ Categorías vacías (candidatas a eliminación):');
      categoriasVacias.forEach(cat => {
        const fechaCreacion = cat.createdAt ? cat.createdAt.toLocaleDateString() : 'Desconocida';
        console.log(`   🗂️ ${cat.nombre} (creada: ${fechaCreacion})`);
      });
    } else {
      console.log('\n✅ No hay categorías vacías. Todas las categorías tienen productos asociados.');
    }
    
    return {
      total: categorias.length,
      conProductos: categoriasConProductos.length,
      vacias: categoriasVacias.length,
      categoriasVacias: categoriasVacias,
      categoriasConProductos: categoriasConProductos
    };
    
  } catch (error) {
    console.error('❌ Error al identificar categorías:', error);
    throw error;
  }
}

// Función para verificar dependencias adicionales
async function verificarDependenciasAdicionales(categoriaIds) {
  console.log('\n🔍 Verificando dependencias adicionales...');
  
  try {
    const dependencias = {
      ventas: 0,
      stock: 0,
      recetas: 0
    };
    
    // Verificar si hay items de venta que referencien productos de estas categorías
    if (categoriaIds.length > 0) {
      // Buscar productos de estas categorías que puedan estar en ventas
      const productosEliminados = await prisma.producto.findMany({
        where: { 
          categoriaId: { in: categoriaIds },
          activo: false // Productos desactivados pero que pueden estar en ventas
        },
        select: { id: true }
      });
      
      if (productosEliminados.length > 0) {
        const productosIds = productosEliminados.map(p => p.id);
        
        // Verificar ventas
        dependencias.ventas = await prisma.itemVenta.count({
          where: { productoId: { in: productosIds } }
        });
        
        // Verificar stock
        dependencias.stock = await prisma.stock.count({
          where: { productoId: { in: productosIds } }
        });
        
        // Verificar recetas
        dependencias.recetas = await prisma.productoReceta.count({
          where: { productoId: { in: productosIds } }
        });
      }
    }
    
    console.log(`   💰 Ventas históricas: ${dependencias.ventas}`);
    console.log(`   📦 Registros de stock: ${dependencias.stock}`);
    console.log(`   🧪 Recetas: ${dependencias.recetas}`);
    
    return dependencias;
    
  } catch (error) {
    console.error('❌ Error verificando dependencias:', error);
    return { ventas: 0, stock: 0, recetas: 0 };
  }
}

// Función para solicitar confirmación
function solicitarConfirmacion(categoriasVacias) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`\n⚠️ Se eliminarán ${categoriasVacias.length} categorías vacías:`);
    categoriasVacias.forEach(cat => {
      console.log(`   🗑️ ${cat.nombre}`);
    });
    
    console.log('\n¿Está seguro de que desea eliminar estas categorías?');
    console.log('Esta acción NO se puede deshacer.');
    
    rl.question('Escriba "CONFIRMAR" para continuar: ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim() === 'CONFIRMAR');
    });
  });
}

// Función para eliminar categorías vacías
async function eliminarCategoriasVacias(categoriasVacias, forzar = false) {
  console.log('\n🗑️ Eliminando categorías vacías...\n');
  
  let eliminadas = 0;
  let errores = 0;
  const erroresDetalle = [];
  
  for (const categoria of categoriasVacias) {
    try {
      // Verificación doble: asegurar que realmente no tiene productos
      const countProductos = await prisma.producto.count({
        where: { categoriaId: categoria.id }
      });
      
      if (countProductos > 0) {
        console.log(`   ⚠️ Omitiendo ${categoria.nombre}: encontrados ${countProductos} productos`);
        continue;
      }
      
      // Eliminar la categoría
      await prisma.categoria.delete({
        where: { id: categoria.id }
      });
      
      console.log(`   ✅ Eliminada: ${categoria.nombre}`);
      eliminadas++;
      
    } catch (error) {
      console.error(`   ❌ Error eliminando ${categoria.nombre}: ${error.message}`);
      errores++;
      erroresDetalle.push(`${categoria.nombre}: ${error.message}`);
    }
  }
  
  return { eliminadas, errores, erroresDetalle };
}

// Función para generar backup antes de eliminar
async function generarBackupCategorias(categoriasVacias) {
  console.log('\n💾 Generando backup de categorías a eliminar...');
  
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const nombreBackup = `backup-categorias-eliminadas-${fecha}-${hora}.json`;
    
    const backup = {
      timestamp: new Date().toISOString(),
      descripcion: 'Backup de categorías vacías antes de eliminación',
      categorias: categoriasVacias.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        imagen: cat.imagen,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      }))
    };
    
    const fs = require('fs').promises;
    await fs.writeFile(nombreBackup, JSON.stringify(backup, null, 2));
    
    console.log(`   ✅ Backup generado: ${nombreBackup}`);
    return nombreBackup;
    
  } catch (error) {
    console.error('❌ Error generando backup:', error);
    return null;
  }
}

// Función principal
async function limpiarCategoriasVacias(opciones = {}) {
  const { verificarSolo = false, forzar = false, conBackup = true } = opciones;
  
  try {
    mostrarBanner();
    
    // 1. Identificar categorías vacías
    const analisis = await identificarCategoriasVacias();
    
    if (analisis.vacias === 0) {
      console.log('\n🎉 No hay categorías vacías para eliminar.');
      return { success: true, message: 'No hay categorías vacías' };
    }
    
    // 2. Verificar dependencias adicionales
    const categoriaIds = analisis.categoriasVacias.map(cat => cat.id);
    const dependencias = await verificarDependenciasAdicionales(categoriaIds);
    
    // 3. Si solo es verificación, terminar aquí
    if (verificarSolo) {
      console.log('\n✅ Verificación completada. Use --eliminar para proceder con la eliminación.');
      return { 
        success: true, 
        verificacion: analisis,
        dependencias 
      };
    }
    
    // 4. Advertencia si hay dependencias
    if (dependencias.ventas > 0 || dependencias.stock > 0 || dependencias.recetas > 0) {
      console.log('\n⚠️ ADVERTENCIA: Se detectaron dependencias históricas.');
      console.log('   Las categorías tienen productos desactivados con historial.');
      console.log('   Esto no impedirá la eliminación, pero considere hacer backup.');
    }
    
    // 5. Solicitar confirmación
    if (!forzar) {
      const confirmar = await solicitarConfirmacion(analisis.categoriasVacias);
      if (!confirmar) {
        console.log('\n🚫 Operación cancelada por el usuario.');
        return { success: false, message: 'Cancelado por usuario' };
      }
    }
    
    // 6. Generar backup si se solicita
    let archivoBackup = null;
    if (conBackup) {
      archivoBackup = await generarBackupCategorias(analisis.categoriasVacias);
    }
    
    // 7. Eliminar categorías
    const resultado = await eliminarCategoriasVacias(analisis.categoriasVacias, forzar);
    
    // 8. Mostrar resumen final
    console.log('\n📊 === RESUMEN DE LIMPIEZA ===');
    console.log(`🗑️ Categorías eliminadas: ${resultado.eliminadas}`);
    console.log(`❌ Errores: ${resultado.errores}`);
    console.log(`📂 Categorías restantes: ${analisis.conProductos}`);
    
    if (resultado.errores > 0) {
      console.log('\n❌ Errores detallados:');
      resultado.erroresDetalle.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    if (archivoBackup) {
      console.log(`💾 Backup guardado en: ${archivoBackup}`);
    }
    
    // 9. Verificación final
    const categoriasFinales = await prisma.categoria.count();
    console.log(`\n📈 Total categorías finales: ${categoriasFinales}`);
    
    return {
      success: true,
      eliminadas: resultado.eliminadas,
      errores: resultado.errores,
      backup: archivoBackup,
      categoriasFinales
    };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función de ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/limpiar-categorias-vacias.js [opciones]

🔧 Opciones:
   --verificar      Solo verificar qué categorías están vacías (sin eliminar)
   --eliminar       Eliminar categorías vacías (con confirmación)
   --forzar         Eliminar sin solicitar confirmación
   --sin-backup     No generar archivo de backup
   --ayuda          Mostrar esta ayuda

📖 Ejemplos:
   # Solo verificar qué categorías están vacías
   node scripts/insertar/limpiar-categorias-vacias.js --verificar
   
   # Eliminar con confirmación (recomendado)
   node scripts/insertar/limpiar-categorias-vacias.js --eliminar
   
   # Eliminar automáticamente sin preguntar
   node scripts/insertar/limpiar-categorias-vacias.js --forzar
   
   # Eliminar sin generar backup
   node scripts/insertar/limpiar-categorias-vacias.js --eliminar --sin-backup

🛡️ Seguridad:
   - Siempre verifica dos veces que las categorías estén vacías
   - Genera backup automático (a menos que uses --sin-backup)
   - No afecta categorías con productos asociados
   - Muestra dependencias históricas como advertencia

💡 Recomendación:
   Ejecutar primero con --verificar para ver qué se eliminaría
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  const opciones = {
    verificarSolo: args.includes('--verificar'),
    forzar: args.includes('--forzar'),
    conBackup: !args.includes('--sin-backup')
  };
  
  // Si no hay opciones específicas pero hay --eliminar, proceder
  if (args.includes('--eliminar')) {
    opciones.verificarSolo = false;
  }
  
  // Por defecto, solo verificar si no se especifica --eliminar o --forzar
  if (!args.includes('--eliminar') && !args.includes('--forzar')) {
    opciones.verificarSolo = true;
  }
  
  limpiarCategoriasVacias(opciones)
    .then((resultado) => {
      if (resultado.success) {
        if (opciones.verificarSolo) {
          console.log('\n✅ Verificación completada');
        } else {
          console.log('\n🎉 Limpieza completada exitosamente');
          console.log(`🗑️ ${resultado.eliminadas} categorías eliminadas`);
        }
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { 
  limpiarCategoriasVacias,
  identificarCategoriasVacias
};