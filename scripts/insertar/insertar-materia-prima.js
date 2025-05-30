// scripts/insertar-materia-prima.js - VERSIÓN MEJORADA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Materia prima real basada en los datos proporcionados
const materiaPrima = [
  // Líquidos base
  {
    nombre: 'Perfumina',
    descripcion: 'Perfumina base para productos aromáticos',
    unidadMedida: 'litro',
    stockMinimo: 5,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Esencia',
    descripcion: 'Esencia concentrada para aromaterapia',
    unidadMedida: 'litro',
    stockMinimo: 3,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Líquido para difusor',
    descripcion: 'Líquido base para difusores aromáticos',
    unidadMedida: 'litro',
    stockMinimo: 10,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Jabón líquido',
    descripcion: 'Jabón líquido base para productos de higiene',
    unidadMedida: 'litro',
    stockMinimo: 5,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Espuma de baño',
    descripcion: 'Espuma de baño aromática',
    unidadMedida: 'litro',
    stockMinimo: 3,
    proveedorId: null,
    activo: true
  },
  
  // Envases plásticos
  {
    nombre: 'Envase plástico Lyon 250 ámbar',
    descripcion: 'Envase plástico Lyon de 250ml color ámbar',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Pote pack envase plástico transparente PET Oslo 130cm3',
    descripcion: 'Envase plástico transparente PET Oslo de 130cm3',
    unidadMedida: 'unidad',
    stockMinimo: 30,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Envase plástico Lyon 125 ámbar',
    descripcion: 'Envase plástico Lyon de 125ml color ámbar',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Envase plástico Sevilla 200 ámbar',
    descripcion: 'Envase plástico Sevilla de 200ml color ámbar',
    unidadMedida: 'unidad',
    stockMinimo: 40,
    proveedorId: null,
    activo: true
  },
  
  // Tapas y accesorios
  {
    nombre: 'Tapa spray enfundada plata brillo',
    descripcion: 'Tapa spray con acabado plata brillo enfundada',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Tapa gatillo negro',
    descripcion: 'Tapa tipo gatillo color negro',
    unidadMedida: 'unidad',
    stockMinimo: 30,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Tapa free top negra',
    descripcion: 'Tapa free top color negro',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Tapa ciega oro',
    descripcion: 'Tapa ciega color oro',
    unidadMedida: 'unidad',
    stockMinimo: 40,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Cremera enfundada plata brillo pico negro',
    descripcion: 'Tapa cremera enfundada plata brillo con pico negro',
    unidadMedida: 'unidad',
    stockMinimo: 30,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Tapa difusor aluminio cobre',
    descripcion: 'Tapa para difusor de aluminio color cobre',
    unidadMedida: 'unidad',
    stockMinimo: 25,
    proveedorId: null,
    activo: true
  },
  
  // Accesorios para difusores
  {
    nombre: 'Varillas de rattan para difusores',
    descripcion: 'Varillas de rattan natural para difusores aromáticos',
    unidadMedida: 'unidad',
    stockMinimo: 200,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Caja para difusores',
    descripcion: 'Caja de presentación para difusores',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  },
  
  // Sales y sólidos
  {
    nombre: 'Sal de baño',
    descripcion: 'Sal de baño aromática para productos de relajación',
    unidadMedida: 'kilogramo',
    stockMinimo: 10,
    proveedorId: null,
    activo: true
  },
  
  // Etiquetas
  {
    nombre: 'Etiqueta envase sales',
    descripcion: 'Etiquetas adhesivas para envases de sales',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Etiqueta pote 250',
    descripcion: 'Etiquetas adhesivas para potes de 250ml',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Etiqueta pote 125',
    descripcion: 'Etiquetas adhesivas para potes de 125ml',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    proveedorId: null,
    activo: true
  },
  {
    nombre: 'Etiqueta caja difusor',
    descripcion: 'Etiquetas adhesivas para cajas de difusores',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    proveedorId: null,
    activo: true
  }
];

async function verificarDependencias() {
  console.log('🔍 Verificando dependencias de insumos existentes...');
  
  try {
    // Verificar recetas que usan insumos
    const recetasConInsumos = await prisma.recetaItem.findMany({
      include: {
        insumo: true,
        receta: true
      }
    });
    
    // Verificar stock de insumos
    const stockInsumos = await prisma.stock.findMany({
      where: { insumoId: { not: null } },
      include: { insumo: true }
    });
    
    // Verificar movimientos de stock
    const movimientosStock = await prisma.movimientoStock.count({
      where: {
        stock: {
          insumoId: { not: null }
        }
      }
    });
    
    console.log(`   📋 Recetas que usan insumos: ${recetasConInsumos.length}`);
    console.log(`   📦 Registros de stock: ${stockInsumos.length}`);
    console.log(`   📊 Movimientos de stock: ${movimientosStock}`);
    
    if (recetasConInsumos.length > 0) {
      console.log('\n   🔗 Recetas que usan insumos:');
      const recetasAgrupadas = recetasConInsumos.reduce((acc, item) => {
        if (!acc[item.receta.nombre]) {
          acc[item.receta.nombre] = [];
        }
        acc[item.receta.nombre].push(item.insumo.nombre);
        return acc;
      }, {});
      
      Object.entries(recetasAgrupadas).forEach(([receta, insumos]) => {
        console.log(`      - ${receta}: ${insumos.join(', ')}`);
      });
    }
    
    return {
      recetas: recetasConInsumos.length,
      stock: stockInsumos.length,
      movimientos: movimientosStock
    };
    
  } catch (error) {
    console.error('❌ Error al verificar dependencias:', error);
    return { recetas: 0, stock: 0, movimientos: 0 };
  }
}

async function actualizarOCrearInsumos() {
  console.log('🔄 Actualizando o creando insumos...');
  
  try {
    let actualizados = 0;
    let creados = 0;
    let errores = 0;
    
    for (const insumoData of materiaPrima) {
      try {
        // Buscar si ya existe un insumo con el mismo nombre
        const existente = await prisma.insumo.findFirst({
          where: { nombre: insumoData.nombre }
        });
        
        if (existente) {
          // Actualizar el insumo existente
          const actualizado = await prisma.insumo.update({
            where: { id: existente.id },
            data: {
              descripcion: insumoData.descripcion,
              unidadMedida: insumoData.unidadMedida,
              stockMinimo: insumoData.stockMinimo,
              activo: true // Reactivar si estaba desactivado
            }
          });
          
          console.log(`🔄 Insumo actualizado: ${actualizado.nombre} (${actualizado.unidadMedida}) - Stock mín: ${actualizado.stockMinimo}`);
          actualizados++;
        } else {
          // Crear nuevo insumo
          const nuevo = await prisma.insumo.create({
            data: insumoData
          });
          
          console.log(`✅ Insumo creado: ${nuevo.nombre} (${nuevo.unidadMedida}) - Stock mín: ${nuevo.stockMinimo}`);
          creados++;
        }
        
      } catch (error) {
        console.error(`❌ Error al procesar insumo "${insumoData.nombre}":`, error.message);
        errores++;
      }
    }
    
    console.log(`\n📊 Resumen de procesamiento:`);
    console.log(`   🔄 Actualizados: ${actualizados}`);
    console.log(`   ✅ Creados: ${creados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📝 Total procesados: ${materiaPrima.length}`);
    
    return { actualizados, creados, errores };
    
  } catch (error) {
    console.error('❌ Error general en procesamiento:', error);
    throw error;
  }
}

async function limpiarInsumosObsoletos() {
  console.log('🧹 Desactivando insumos obsoletos...');
  
  try {
    // Obtener nombres de los insumos que queremos mantener
    const nombresActuales = materiaPrima.map(insumo => insumo.nombre);
    
    // Buscar insumos que no están en la lista actual y están activos
    const insumosObsoletos = await prisma.insumo.findMany({
      where: {
        nombre: { notIn: nombresActuales },
        activo: true
      }
    });
    
    if (insumosObsoletos.length === 0) {
      console.log('   No hay insumos obsoletos para desactivar');
      return { desactivados: 0 };
    }
    
    console.log(`   Encontrados ${insumosObsoletos.length} insumos obsoletos:`);
    insumosObsoletos.forEach(insumo => {
      console.log(`      - ${insumo.nombre}`);
    });
    
    // Desactivar insumos obsoletos
    const resultado = await prisma.insumo.updateMany({
      where: {
        nombre: { notIn: nombresActuales },
        activo: true
      },
      data: { activo: false }
    });
    
    console.log(`   🔄 Desactivados ${resultado.count} insumos obsoletos`);
    return { desactivados: resultado.count };
    
  } catch (error) {
    console.error('❌ Error al desactivar insumos obsoletos:', error);
    return { desactivados: 0 };
  }
}

// Función para listar insumos agrupados por tipo
async function listarMateriaPrima() {
  try {
    const insumos = await prisma.insumo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    console.log('\n📋 Materia prima (insumos) ACTIVOS en la base de datos:');
    
    // Agrupar por tipo de unidad de medida para mejor visualización
    const insumosPorTipo = insumos.reduce((acc, insumo) => {
      const tipo = insumo.unidadMedida.toUpperCase();
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push(insumo);
      return acc;
    }, {});
    
    Object.entries(insumosPorTipo).forEach(([tipo, insumos]) => {
      console.log(`\n   📦 ${tipo}:`);
      insumos.forEach((insumo, index) => {
        console.log(`      ${index + 1}. ${insumo.nombre} - Stock mín: ${insumo.stockMinimo} ${insumo.unidadMedida}`);
      });
    });
    
    // Mostrar también insumos inactivos si existen
    const insumosInactivos = await prisma.insumo.count({
      where: { activo: false }
    });
    
    if (insumosInactivos > 0) {
      console.log(`\n⚠️ Hay ${insumosInactivos} insumos inactivos en la base de datos`);
    }
    
    return insumos;
  } catch (error) {
    console.error('❌ Error al listar materia prima:', error);
    return [];
  }
}

async function actualizarMateriaPrimaCompleta() {
  console.log('🔄 === ACTUALIZACIÓN INTELIGENTE DE MATERIA PRIMA ===\n');
  
  try {
    // 1. Verificar dependencias
    const dependencias = await verificarDependencias();
    
    // 2. Actualizar o crear insumos
    console.log('\n📥 Procesando materia prima...');
    const procesamiento = await actualizarOCrearInsumos();
    
    // 3. Limpiar insumos obsoletos
    console.log('\n🧹 Limpiando insumos obsoletos...');
    const limpieza = await limpiarInsumosObsoletos();
    
    // 4. Mostrar resumen
    console.log('\n📋 Listado final de materia prima:');
    await listarMateriaPrima();
    
    console.log('\n🎉 === ACTUALIZACIÓN COMPLETADA ===');
    console.log('✅ Materia prima actualizada correctamente sin afectar recetas existentes');
    
    return {
      dependencias,
      procesamiento,
      limpieza
    };
    
  } catch (error) {
    console.error('❌ Error durante la actualización completa:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para limpiar completamente (solo si no hay dependencias)
async function limpiezaCompletaForzada() {
  console.log('⚠️ === LIMPIEZA COMPLETA FORZADA (USO CON PRECAUCIÓN) ===\n');
  
  try {
    console.log('🗑️ Eliminando todas las dependencias...');
    
    // 1. Eliminar items de recetas
    const recetaItems = await prisma.recetaItem.deleteMany({});
    console.log(`   Eliminados ${recetaItems.count} items de recetas`);
    
    // 2. Eliminar movimientos de stock
    const movimientos = await prisma.movimientoStock.deleteMany({});
    console.log(`   Eliminados ${movimientos.count} movimientos de stock`);
    
    // 3. Eliminar stock
    const stock = await prisma.stock.deleteMany({
      where: { insumoId: { not: null } }
    });
    console.log(`   Eliminados ${stock.count} registros de stock de insumos`);
    
    // 4. Ahora sí eliminar insumos
    const insumos = await prisma.insumo.deleteMany({});
    console.log(`   Eliminados ${insumos.count} insumos`);
    
    // 5. Insertar nuevos insumos
    console.log('\n📥 Insertando nueva materia prima...');
    await actualizarOCrearInsumos();
    
    console.log('\n⚠️ ADVERTENCIA: Se han eliminado todas las recetas y stock relacionado');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza forzada:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const modo = args[0];
  
  if (modo === '--forzar-limpieza') {
    console.log('⚠️ MODO LIMPIEZA FORZADA ACTIVADO');
    limpiezaCompletaForzada()
      .then(() => {
        console.log('\n🎉 Limpieza forzada completada');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error en limpieza forzada:', error);
        process.exit(1);
      });
  } else {
    actualizarMateriaPrimaCompleta()
      .then(() => {
        console.log('\n🎉 Proceso de actualización de materia prima completado');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error en el proceso:', error);
        process.exit(1);
      });
  }
}

module.exports = { 
  actualizarMateriaPrimaCompleta,
  actualizarOCrearInsumos, 
  listarMateriaPrima,
  verificarDependencias,
  limpiezaCompletaForzada
};