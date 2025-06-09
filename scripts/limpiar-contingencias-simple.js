// scripts/insertar/limpiar-contingencias-simple.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para mostrar banner
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🧹  LIMPIEZA SIMPLE DE CONTINGENCIAS  🧹           ║
║                                                              ║
║  Versión simplificada para eliminar contingencias           ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para analizar contingencias de forma simple
async function analizarContingenciasSimple() {
  console.log('🔍 Analizando contingencias...\n');
  
  try {
    const totalContingencias = await prisma.contingencia.count();
    console.log(`📋 Total contingencias: ${totalContingencias}`);
    
    if (totalContingencias === 0) {
      console.log('✅ No hay contingencias para limpiar.');
      return { total: 0, muestra: [] };
    }
    
    // Obtener una muestra pequeña para mostrar
    const muestra = await prisma.contingencia.findMany({
      take: 3,
      select: {
        id: true,
        titulo: true,
        estado: true,
        fechaCreacion: true,
        imagenUrl: true,
        videoUrl: true
      }
    });
    
    console.log('📋 Muestra de contingencias:');
    muestra.forEach((cont, index) => {
      console.log(`   ${index + 1}. ${cont.titulo || cont.id}`);
      console.log(`      📅 Fecha: ${cont.fechaCreacion?.toLocaleDateString() || 'N/A'}`);
      console.log(`      📊 Estado: ${cont.estado || 'N/A'}`);
      if (cont.imagenUrl) console.log(`      🖼️ Tiene imagen`);
      if (cont.videoUrl) console.log(`      🎥 Tiene video`);
    });
    
    return { total: totalContingencias, muestra };
    
  } catch (error) {
    console.error('❌ Error analizando contingencias:', error);
    throw error;
  }
}

// Función para generar backup simple
async function generarBackupSimple() {
  console.log('\n💾 Generando backup...');
  
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const nombreBackup = `backup-contingencias-${fecha}-${hora}.json`;
    
    const contingencias = await prisma.contingencia.findMany();
    
    const backup = {
      timestamp: new Date().toISOString(),
      total: contingencias.length,
      contingencias: contingencias
    };
    
    const fs = require('fs').promises;
    await fs.writeFile(nombreBackup, JSON.stringify(backup, null, 2));
    
    console.log(`   ✅ Backup generado: ${nombreBackup} (${contingencias.length} contingencias)`);
    return nombreBackup;
    
  } catch (error) {
    console.error('❌ Error generando backup:', error);
    return null;
  }
}

// Función para solicitar confirmación simple
function solicitarConfirmacionSimple(total) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`\n⚠️ CONFIRMACIÓN REQUERIDA`);
    console.log(`Se eliminarán ${total} contingencias de la base de datos.`);
    console.log('Esta acción NO se puede deshacer.');
    console.log('');
    
    rl.question('¿Está seguro? Escriba "ELIMINAR" para confirmar: ', (respuesta) => {
      rl.close();
      resolve(respuesta.trim().toUpperCase() === 'ELIMINAR');
    });
  });
}

// Función para eliminar todas las contingencias
async function eliminarContingenciasSimple() {
  console.log('\n🗑️ Eliminando contingencias...');
  
  try {
    const resultado = await prisma.contingencia.deleteMany({});
    
    console.log(`   ✅ Eliminadas ${resultado.count} contingencias`);
    return { eliminadas: resultado.count };
    
  } catch (error) {
    console.error('❌ Error eliminando contingencias:', error);
    throw error;
  }
}

// Función principal simplificada
async function limpiarContingenciasSimple(opciones = {}) {
  const { verificarSolo = false, forzar = false, conBackup = true } = opciones;
  
  try {
    mostrarBanner();
    
    // 1. Analizar contingencias
    const analisis = await analizarContingenciasSimple();
    
    if (analisis.total === 0) {
      console.log('\n🎉 No hay contingencias para eliminar.');
      return { success: true, message: 'No hay contingencias' };
    }
    
    // 2. Si solo verificación, terminar
    if (verificarSolo) {
      console.log('\n✅ Verificación completada.');
      console.log('💡 Use --eliminar para proceder con la eliminación.');
      return { success: true, analisis };
    }
    
    // 3. Solicitar confirmación
    if (!forzar) {
      const confirmar = await solicitarConfirmacionSimple(analisis.total);
      if (!confirmar) {
        console.log('\n🚫 Eliminación cancelada.');
        return { success: false, message: 'Cancelado' };
      }
    }
    
    // 4. Generar backup
    let backup = null;
    if (conBackup) {
      backup = await generarBackupSimple();
    }
    
    // 5. Eliminar contingencias
    const resultado = await eliminarContingenciasSimple();
    
    // 6. Verificar resultado
    const restantes = await prisma.contingencia.count();
    
    // 7. Mostrar resumen
    console.log('\n🎉 === ELIMINACIÓN COMPLETADA ===');
    console.log(`🗑️ Contingencias eliminadas: ${resultado.eliminadas}`);
    console.log(`📊 Contingencias restantes: ${restantes}`);
    
    if (backup) {
      console.log(`💾 Backup guardado: ${backup}`);
    }
    
    return {
      success: true,
      eliminadas: resultado.eliminadas,
      restantes,
      backup
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
📚 Uso: node scripts/insertar/limpiar-contingencias-simple.js [opciones]

🔧 Opciones:
   --verificar      Solo contar y mostrar contingencias (sin eliminar)
   --eliminar       Eliminar todas las contingencias (con confirmación)
   --forzar         Eliminar sin confirmación
   --sin-backup     No generar backup
   --ayuda          Mostrar esta ayuda

📖 Ejemplos:
   # Ver cuántas contingencias hay
   node scripts/insertar/limpiar-contingencias-simple.js --verificar
   
   # Eliminar con confirmación
   node scripts/insertar/limpiar-contingencias-simple.js --eliminar
   
   # Eliminar automáticamente
   node scripts/insertar/limpiar-contingencias-simple.js --forzar

💡 Esta versión simplificada:
   - Solo elimina de la base de datos
   - No maneja archivos S3
   - Genera backup básico
   - Menos propenso a errores de campos
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
  
  if (args.includes('--eliminar')) {
    opciones.verificarSolo = false;
  }
  
  // Por defecto verificar si no se especifica acción
  if (!args.includes('--eliminar') && !args.includes('--forzar')) {
    opciones.verificarSolo = true;
  }
  
  limpiarContingenciasSimple(opciones)
    .then((resultado) => {
      if (resultado.success) {
        console.log('\n✅ Proceso completado');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { 
  limpiarContingenciasSimple,
  analizarContingenciasSimple
};