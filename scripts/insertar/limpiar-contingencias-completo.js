// scripts/insertar/limpiar-contingencias-completo.js
const { PrismaClient } = require('@prisma/client');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const prisma = new PrismaClient();

// Configurar S3 para eliminar archivos multimedia
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';

// Función para obtener usuario admin (para logs)
async function obtenerUsuarioAdmin() {
  const usuario = await prisma.user.findFirst({
    where: { roleId: 'role-admin' }
  });

  if (!usuario) {
    console.warn('⚠️ No se encontró usuario admin, continuando sin verificación de permisos');
    return null;
  }

  return usuario;
}

// Función para eliminar archivo de S3
async function eliminarArchivoS3(url) {
  try {
    if (!url) return { success: true, message: 'No hay archivo para eliminar' };
    
    // Extraer la clave del objeto desde la URL
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Eliminar la barra inicial
    
    const deleteParams = {
      Bucket: bucketName,
      Key: key
    };
    
    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`   ✅ Archivo eliminado de S3: ${key}`);
    
    return { success: true, key };
  } catch (error) {
    console.error(`   ❌ Error eliminando archivo de S3: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Función para eliminar archivos multimedia de contingencias
async function eliminarArchivosMultimedia(contingencias) {
  console.log('🗂️ === ELIMINANDO ARCHIVOS MULTIMEDIA ===');
  
  let archivosEliminados = 0;
  let erroresEliminacion = 0;
  
  for (const contingencia of contingencias) {
    try {
      // Eliminar imagen si existe
      if (contingencia.imagenUrl) {
        const resultado = await eliminarArchivoS3(contingencia.imagenUrl);
        if (resultado.success) {
          archivosEliminados++;
        } else {
          erroresEliminacion++;
        }
      }
      
      // Eliminar video si existe
      if (contingencia.videoUrl) {
        const resultado = await eliminarArchivoS3(contingencia.videoUrl);
        if (resultado.success) {
          archivosEliminados++;
        } else {
          erroresEliminacion++;
        }
      }
    } catch (error) {
      console.error(`   ❌ Error procesando archivos de contingencia ${contingencia.id}:`, error.message);
      erroresEliminacion++;
    }
  }
  
  console.log(`   ✅ Archivos eliminados de S3: ${archivosEliminados}`);
  console.log(`   ❌ Errores en eliminación: ${erroresEliminacion}`);
  
  return { archivosEliminados, erroresEliminacion };
}

// Función para obtener estadísticas antes de eliminar
async function obtenerEstadisticasContingencias() {
  console.log('📊 === ANALIZANDO CONTINGENCIAS EXISTENTES ===');
  
  // Contar total
  const totalContingencias = await prisma.contingencia.count();
  console.log(`   📋 Total de contingencias: ${totalContingencias}`);
  
  if (totalContingencias === 0) {
    console.log('   ✅ No hay contingencias para eliminar');
    return {
      total: 0,
      porEstado: {},
      porOrigen: {},
      porTipo: {},
      conArchivos: 0,
      masAntigua: null,
      masReciente: null
    };
  }
  
  // Obtener todas las contingencias para análisis
  const contingencias = await prisma.contingencia.findMany({
    include: {
      usuario: {
        select: { name: true, email: true }
      },
      ubicacion: {
        select: { nombre: true }
      }
    },
    orderBy: { fechaCreacion: 'asc' }
  });
  
  // Análisis por estado
  const porEstado = {};
  contingencias.forEach(c => {
    porEstado[c.estado] = (porEstado[c.estado] || 0) + 1;
  });
  
  // Análisis por origen
  const porOrigen = {};
  contingencias.forEach(c => {
    porOrigen[c.origen] = (porOrigen[c.origen] || 0) + 1;
  });
  
  // Análisis por tipo
  const porTipo = {};
  contingencias.forEach(c => {
    const tipo = c.tipo || 'sin_tipo';
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });
  
  // Contar contingencias con archivos
  const conArchivos = contingencias.filter(c => c.imagenUrl || c.videoUrl).length;
  
  // Fechas extremas
  const masAntigua = contingencias[0];
  const masReciente = contingencias[contingencias.length - 1];
  
  // Mostrar estadísticas
  console.log('   📊 Por estado:');
  Object.entries(porEstado).forEach(([estado, cantidad]) => {
    console.log(`      ${estado}: ${cantidad}`);
  });
  
  console.log('   📊 Por origen:');
  Object.entries(porOrigen).forEach(([origen, cantidad]) => {
    console.log(`      ${origen}: ${cantidad}`);
  });
  
  console.log('   📊 Por tipo:');
  Object.entries(porTipo).forEach(([tipo, cantidad]) => {
    console.log(`      ${tipo}: ${cantidad}`);
  });
  
  console.log(`   🗂️ Con archivos multimedia: ${conArchivos}`);
  
  if (masAntigua) {
    console.log(`   📅 Más antigua: ${masAntigua.fechaCreacion.toISOString().split('T')[0]} - "${masAntigua.titulo}"`);
  }
  
  if (masReciente && masReciente.id !== masAntigua?.id) {
    console.log(`   📅 Más reciente: ${masReciente.fechaCreacion.toISOString().split('T')[0]} - "${masReciente.titulo}"`);
  }
  
  return {
    total: totalContingencias,
    porEstado,
    porOrigen,
    porTipo,
    conArchivos,
    masAntigua,
    masReciente,
    contingencias // Retornamos las contingencias para usar en la eliminación
  };
}

// Función para confirmar eliminación (simulada para script automatizado)
async function confirmarEliminacion(estadisticas) {
  console.log('\n⚠️ === CONFIRMACIÓN DE ELIMINACIÓN ===');
  console.log(`🗑️ Se eliminarán ${estadisticas.total} contingencias`);
  console.log(`🗂️ Se eliminarán ${estadisticas.conArchivos} archivos multimedia de S3`);
  console.log('❌ Esta acción NO SE PUEDE DESHACER');
  
  // En un entorno de producción, aquí podrías añadir una pausa
  // o requerir confirmación manual
  console.log('⏳ Continuando eliminación en 3 segundos...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return true;
}

// Función principal de limpieza
async function limpiarContingenciasCompleto() {
  console.log('🗑️ === LIMPIEZA COMPLETA DE CONTINGENCIAS ===\n');
  
  try {
    // 1. Verificar usuario admin (para logs)
    const usuario = await obtenerUsuarioAdmin();
    if (usuario) {
      console.log(`👤 Ejecutado por: ${usuario.name} (${usuario.email})`);
    }
    
    // 2. Obtener estadísticas antes de eliminar
    const estadisticas = await obtenerEstadisticasContingencias();
    
    if (estadisticas.total === 0) {
      console.log('\n✅ No hay contingencias para eliminar. Base de datos limpia.');
      return {
        contingenciasEliminadas: 0,
        archivosEliminados: 0,
        errores: 0,
        duracion: 0
      };
    }
    
    // 3. Confirmar eliminación
    await confirmarEliminacion(estadisticas);
    
    const inicioEliminacion = Date.now();
    
    // 4. Eliminar archivos multimedia de S3
    let resultadoArchivos = { archivosEliminados: 0, erroresEliminacion: 0 };
    if (estadisticas.conArchivos > 0) {
      resultadoArchivos = await eliminarArchivosMultimedia(estadisticas.contingencias);
    } else {
      console.log('🗂️ No hay archivos multimedia para eliminar');
    }
    
    // 5. Eliminar todas las contingencias de la base de datos
    console.log('\n🗑️ === ELIMINANDO CONTINGENCIAS DE LA BASE DE DATOS ===');
    
    const contingenciasEliminadas = await prisma.contingencia.deleteMany({});
    
    console.log(`   ✅ ${contingenciasEliminadas.count} contingencias eliminadas de la base de datos`);
    
    const finEliminacion = Date.now();
    const duracion = Math.round((finEliminacion - inicioEliminacion) / 1000);
    
    // 6. Verificar limpieza completa
    console.log('\n🔍 === VERIFICACIÓN DE LIMPIEZA ===');
    const contingenciasRestantes = await prisma.contingencia.count();
    
    if (contingenciasRestantes === 0) {
      console.log('   ✅ Verificación exitosa: No quedan contingencias en la base de datos');
    } else {
      console.log(`   ⚠️ Advertencia: Aún quedan ${contingenciasRestantes} contingencias`);
    }
    
    // 7. Mostrar resumen final
    console.log('\n📊 === RESUMEN DE LIMPIEZA ===');
    console.log(`🗑️ Contingencias eliminadas: ${contingenciasEliminadas.count}`);
    console.log(`🗂️ Archivos multimedia eliminados: ${resultadoArchivos.archivosEliminados}`);
    console.log(`❌ Errores en archivos: ${resultadoArchivos.erroresEliminacion}`);
    console.log(`⏱️ Tiempo total: ${duracion} segundos`);
    console.log(`📅 Fecha de limpieza: ${new Date().toISOString()}`);
    
    // Mostrar estadísticas de lo que se eliminó
    console.log('\n📋 Estadísticas de contingencias eliminadas:');
    console.log('   Por estado:', Object.entries(estadisticas.porEstado).map(([k,v]) => `${k}:${v}`).join(', '));
    console.log('   Por origen:', Object.entries(estadisticas.porOrigen).map(([k,v]) => `${k}:${v}`).join(', '));
    console.log('   Por tipo:', Object.entries(estadisticas.porTipo).map(([k,v]) => `${k}:${v}`).join(', '));
    
    if (estadisticas.masAntigua && estadisticas.masReciente) {
      const rangoFechas = Math.ceil(
        (estadisticas.masReciente.fechaCreacion - estadisticas.masAntigua.fechaCreacion) / (1000 * 60 * 60 * 24)
      );
      console.log(`   📅 Rango temporal: ${rangoFechas} días`);
    }
    
    return {
      contingenciasEliminadas: contingenciasEliminadas.count,
      archivosEliminados: resultadoArchivos.archivosEliminados,
      errores: resultadoArchivos.erroresEliminacion,
      duracion,
      estadisticasEliminadas: estadisticas
    };
    
  } catch (error) {
    console.error('\n💥 === ERROR EN LA LIMPIEZA ===');
    console.error('Error:', error.message);
    
    // Intentar mostrar estadísticas parciales
    try {
      const contingenciasRestantes = await prisma.contingencia.count();
      console.log(`📊 Contingencias restantes: ${contingenciasRestantes}`);
    } catch (countError) {
      console.error('No se pudo verificar contingencias restantes:', countError.message);
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para verificar solo sin eliminar
async function verificarContingencias() {
  console.log('🔍 === VERIFICACIÓN DE CONTINGENCIAS (SOLO LECTURA) ===\n');
  
  try {
    const estadisticas = await obtenerEstadisticasContingencias();
    
    console.log('\n✅ Verificación completada sin realizar cambios');
    
    return estadisticas;
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Script de Limpieza Completa de Contingencias

🎯 Propósito:
   Eliminar TODAS las contingencias existentes en la base de datos
   y sus archivos multimedia asociados en S3.

🔧 Uso:
   node scripts/insertar/limpiar-contingencias-completo.js [opciones]

📋 Opciones:
   --verificar     Solo verificar y mostrar estadísticas sin eliminar
   --ayuda         Mostrar esta ayuda

⚠️ ADVERTENCIA CRÍTICA:
   Este script ELIMINA PERMANENTEMENTE todas las contingencias.
   NO SE PUEDE DESHACER esta operación.

📋 Qué hace:
   ✅ Analiza todas las contingencias existentes
   ✅ Muestra estadísticas detalladas (por estado, origen, tipo)
   ✅ Elimina archivos multimedia de S3 (imágenes y videos)
   ✅ Elimina todos los registros de contingencias de la base de datos
   ✅ Verifica que la limpieza fue completa
   ✅ Genera reporte detallado de la operación

💡 Casos de uso:
   - Limpieza de base de datos de desarrollo
   - Reset completo del sistema de contingencias
   - Mantenimiento periódico (con mucho cuidado en producción)

🔒 Precauciones:
   - Respalda la base de datos antes de ejecutar en producción
   - Verifica que los archivos S3 no sean críticos
   - Ejecuta primero con --verificar para ver qué se eliminará

🗂️ Archivos afectados:
   - Registros de tabla 'contingencia'
   - Archivos de imágenes en S3
   - Archivos de videos en S3

📊 Información que se perderá:
   - Historial de contingencias reportadas
   - Archivos multimedia subidos
   - Respuestas y resoluciones
   - Seguimiento de problemas
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
    console.log('🔍 Modo verificación - Solo lectura\n');
    
    verificarContingencias()
      .then((estadisticas) => {
        console.log('\n📊 Verificación completada');
        if (estadisticas.total > 0) {
          console.log(`\n💡 Para eliminar estas ${estadisticas.total} contingencias, ejecuta:`);
          console.log('   node scripts/insertar/limpiar-contingencias-completo.js');
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Error en verificación:', error.message);
        process.exit(1);
      });
  } else {
    console.log('🚀 Iniciando limpieza completa de contingencias...\n');
    console.log('⚠️ ESTA OPERACIÓN NO SE PUEDE DESHACER\n');
    
    limpiarContingenciasCompleto()
      .then((resultado) => {
        console.log('\n🎉 === LIMPIEZA COMPLETADA EXITOSAMENTE ===');
        console.log(`🗑️ ${resultado.contingenciasEliminadas} contingencias eliminadas`);
        console.log(`🗂️ ${resultado.archivosEliminados} archivos eliminados de S3`);
        
        if (resultado.errores > 0) {
          console.log(`⚠️ ${resultado.errores} errores en eliminación de archivos`);
        }
        
        console.log(`⏱️ Completado en ${resultado.duracion} segundos`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 === ERROR EN LA LIMPIEZA ===');
        console.error(error.message);
        process.exit(1);
      });
  }
}

module.exports = { 
  limpiarContingenciasCompleto, 
  verificarContingencias, 
  obtenerEstadisticasContingencias 
};