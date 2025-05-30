// scripts/insertar-insumos-pdv.js - VERSIÓN CORREGIDA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Insumos PDV reales basados en los datos proporcionados
const insumosPdv = [
  // Bolsas craft
  {
    nombre: 'Bolsas craft Nº 2',
    descripcion: 'Bolsas de papel craft número 2 para empaque',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    activo: true
  },
  {
    nombre: 'Bolsas craft Nº 4',
    descripcion: 'Bolsas de papel craft número 4 para empaque',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    activo: true
  },
  {
    nombre: 'Bolsas craft Nº 5',
    descripcion: 'Bolsas de papel craft número 5 para empaque',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    activo: true
  },
  {
    nombre: 'Bolsas craft Nº 7',
    descripcion: 'Bolsas de papel craft número 7 para empaque',
    unidadMedida: 'unidad',
    stockMinimo: 100,
    activo: true
  },
  
  // Papeles para impresión
  {
    nombre: 'Hojas craft para impresiones',
    descripcion: 'Hojas de papel craft para impresiones y etiquetado',
    unidadMedida: 'unidad',
    stockMinimo: 20,
    activo: true
  },
  {
    nombre: 'Resma hoja A4 para impresiones',
    descripcion: 'Resma de hojas A4 blancas para impresiones',
    unidadMedida: 'unidad',
    stockMinimo: 1,
    activo: true
  },
  
  // Insumos de contingencia
  {
    nombre: 'Cajas difusores (caso de contingencia)',
    descripcion: 'Cajas para difusores en casos de contingencia',
    unidadMedida: 'unidad',
    stockMinimo: 10,
    activo: true
  },
  {
    nombre: 'Varillas de rattan (caso de contingencia)',
    descripcion: 'Varillas de rattan para difusores en casos de contingencia',
    unidadMedida: 'unidad',
    stockMinimo: 60,
    activo: true
  },
  {
    nombre: 'Etiqueta de caja difusor (contingencia)',
    descripcion: 'Etiquetas para cajas de difusores en casos de contingencia',
    unidadMedida: 'unidad',
    stockMinimo: 10,
    activo: true
  },
  
  // Bolsas Tulum branded
  {
    nombre: 'Bolsa Tulum chica',
    descripcion: 'Bolsa con marca Tulum tamaño chico',
    unidadMedida: 'unidad',
    stockMinimo: 70,
    activo: true
  },
  {
    nombre: 'Bolsa Tulum mediana',
    descripcion: 'Bolsa con marca Tulum tamaño mediano',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    activo: true
  },
  {
    nombre: 'Bolsa Tulum grande',
    descripcion: 'Bolsa con marca Tulum tamaño grande',
    unidadMedida: 'unidad',
    stockMinimo: 50,
    activo: true
  },
  
  // Rollos de papel para equipos
  {
    nombre: 'Rollo papel térmico comandera',
    descripcion: 'Rollo de papel térmico para impresora comandera',
    unidadMedida: 'unidad',
    stockMinimo: 10,
    activo: true
  },
  {
    nombre: 'Rollo papel posnet',
    descripcion: 'Rollo de papel para terminal posnet',
    unidadMedida: 'unidad',
    stockMinimo: 5,
    activo: true
  }
];

async function limpiarInsumosPdvExistentes() {
  console.log('🧹 Eliminando insumos PDV existentes...');
  
  try {
    // Primero verificar si hay insumos PDV
    const count = await prisma.insumoPdv.count();
    console.log(`   Encontrados ${count} insumos PDV existentes`);
    
    if (count === 0) {
      console.log('   No hay insumos PDV para eliminar');
      return { eliminados: 0 };
    }
    
    // Eliminar todos los insumos PDV
    const resultado = await prisma.insumoPdv.deleteMany({});
    
    console.log(`   ✅ Eliminados ${resultado.count} insumos PDV`);
    return { eliminados: resultado.count };
    
  } catch (error) {
    console.error('❌ Error al eliminar insumos PDV existentes:', error);
    
    // Si hay error por restricciones de FK, intentar desactivar en lugar de eliminar
    console.log('⚠️ Intentando desactivar insumos PDV en lugar de eliminar...');
    try {
      const resultado = await prisma.insumoPdv.updateMany({
        data: { activo: false }
      });
      console.log(`   🔄 Desactivados ${resultado.count} insumos PDV`);
      return { desactivados: resultado.count };
    } catch (deactivateError) {
      console.error('❌ Error al desactivar insumos PDV:', deactivateError);
      throw error;
    }
  }
}

async function insertarInsumosPdv() {
  console.log('🏪 Iniciando inserción de insumos PDV actualizados...');
  
  try {
    let insertados = 0;
    let errores = 0;
    
    for (const insumoData of insumosPdv) {
      try {
        // Crear insumo PDV
        const insumo = await prisma.insumoPdv.create({
          data: insumoData
        });
        
        console.log(`✅ Insumo PDV creado: ${insumo.nombre} (${insumo.unidadMedida}) - Stock mín: ${insumo.stockMinimo}`);
        insertados++;
        
      } catch (error) {
        console.error(`❌ Error al crear insumo PDV "${insumoData.nombre}":`, error.message);
        errores++;
      }
    }
    
    console.log(`\n📊 Resumen de insumos PDV:`);
    console.log(`   ✅ Insertados: ${insertados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📝 Total procesados: ${insumosPdv.length}`);
    
    return { insertados, errores };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
}

// Función para listar insumos PDV agrupados por tipo
async function listarInsumosPdv() {
  try {
    const insumos = await prisma.insumoPdv.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    console.log('\n📋 Insumos PDV en la base de datos:');
    
    // Agrupar por tipo para mejor visualización
    const insumosPorTipo = insumos.reduce((acc, insumo) => {
      let tipo = 'Otros';
      
      if (insumo.nombre.toLowerCase().includes('bolsa craft')) {
        tipo = 'Bolsas Craft';
      } else if (insumo.nombre.toLowerCase().includes('bolsa tulum')) {
        tipo = 'Bolsas Tulum';
      } else if (insumo.nombre.toLowerCase().includes('hoja') || insumo.nombre.toLowerCase().includes('resma')) {
        tipo = 'Papeles';
      } else if (insumo.nombre.toLowerCase().includes('rollo papel')) {
        tipo = 'Rollos Papel';
      } else if (insumo.nombre.toLowerCase().includes('contingencia')) {
        tipo = 'Contingencia';
      }
      
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
    
    return insumos;
  } catch (error) {
    console.error('❌ Error al listar insumos PDV:', error);
    return [];
  }
}

async function actualizarInsumosPdvCompleto() {
  console.log('🔄 === ACTUALIZACIÓN COMPLETA DE INSUMOS PDV ===\n');
  
  try {
    // 1. Limpiar datos existentes
    const limpieza = await limpiarInsumosPdvExistentes();
    
    // 2. Insertar nuevos datos
    console.log('\n📥 Insertando nuevos insumos PDV...');
    const insercion = await insertarInsumosPdv();
    
    // 3. Mostrar resumen
    console.log('\n📋 Listado final de insumos PDV:');
    await listarInsumosPdv();
    
    console.log('\n🎉 === ACTUALIZACIÓN COMPLETADA ===');
    console.log('✅ Insumos PDV actualizados correctamente');
    
    return {
      limpieza,
      insercion
    };
    
  } catch (error) {
    console.error('❌ Error durante la actualización completa:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  actualizarInsumosPdvCompleto()
    .then(() => {
      console.log('\n🎉 Proceso de actualización de insumos PDV completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { 
  actualizarInsumosPdvCompleto,
  insertarInsumosPdv, 
  listarInsumosPdv,
  limpiarInsumosPdvExistentes
};