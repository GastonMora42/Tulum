// scripts/insertar/limpiar-historial-cierres-caja-completo.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Función para obtener estadísticas detalladas antes de eliminar
async function obtenerEstadisticasCierres() {
  console.log('📊 === ANALIZANDO HISTORIAL DE CIERRES DE CAJA ===');
  
  // Contar total de cierres
  const totalCierres = await prisma.cierreCaja.count();
  console.log(`   📋 Total de cierres de caja: ${totalCierres}`);
  
  if (totalCierres === 0) {
    console.log('   ✅ No hay cierres de caja para eliminar');
    return {
      totalCierres: 0,
      totalEgresos: 0,
      totalRecuperos: 0,
      porEstado: {},
      porSucursal: {},
      rangoFechas: null,
      montosTotales: {
        inicial: 0,
        final: 0,
        egresos: 0,
        diferencias: 0
      }
    };
  }
  
  // Contar registros relacionados
  const totalEgresos = await prisma.cajaEgreso.count();
  const totalRecuperos = await prisma.recuperoFondo.count();
  
  console.log(`   💰 Total de egresos de caja: ${totalEgresos}`);
  console.log(`   🔄 Total de recuperos de fondo: ${totalRecuperos}`);
  
  // Obtener todos los cierres para análisis detallado
  const cierres = await prisma.cierreCaja.findMany({
    include: {
      egresos: true,
      recuperosAplicados: true,
      recuperosGenerados: true
    },
    orderBy: { fechaApertura: 'asc' }
  });
  
  // Análisis por estado
  const porEstado = {};
  cierres.forEach(cierre => {
    porEstado[cierre.estado] = (porEstado[cierre.estado] || 0) + 1;
  });
  
  // Análisis por sucursal
  const porSucursal = {};
  cierres.forEach(cierre => {
    porSucursal[cierre.sucursalId] = (porSucursal[cierre.sucursalId] || 0) + 1;
  });
  
  // Obtener nombres de sucursales para el reporte
  const sucursalIds = Object.keys(porSucursal);
  const sucursales = await prisma.ubicacion.findMany({
    where: { id: { in: sucursalIds } },
    select: { id: true, nombre: true }
  });
  
  const sucursalNombres = {};
  sucursales.forEach(suc => {
    sucursalNombres[suc.id] = suc.nombre;
  });
  
  // Calcular montos totales
  const montosTotales = cierres.reduce((acc, cierre) => {
    acc.inicial += cierre.montoInicial || 0;
    acc.final += cierre.montoFinal || 0;
    acc.diferencias += cierre.diferencia || 0;
    
    // Sumar egresos
    cierre.egresos.forEach(egreso => {
      acc.egresos += egreso.monto || 0;
    });
    
    return acc;
  }, { inicial: 0, final: 0, egresos: 0, diferencias: 0 });
  
  // Rango de fechas
  let rangoFechas = null;
  if (cierres.length > 0) {
    const masAntiguo = cierres[0];
    const masReciente = cierres[cierres.length - 1];
    
    rangoFechas = {
      desde: masAntiguo.fechaApertura,
      hasta: masReciente.fechaApertura,
      dias: Math.ceil((masReciente.fechaApertura - masAntiguo.fechaApertura) / (1000 * 60 * 60 * 24))
    };
  }
  
  // Mostrar estadísticas detalladas
  console.log('\n   📊 Análisis por estado:');
  Object.entries(porEstado).forEach(([estado, cantidad]) => {
    console.log(`      ${estado}: ${cantidad} cierres`);
  });
  
  console.log('\n   📊 Análisis por sucursal:');
  Object.entries(porSucursal).forEach(([sucursalId, cantidad]) => {
    const nombreSucursal = sucursalNombres[sucursalId] || `ID: ${sucursalId}`;
    console.log(`      ${nombreSucursal}: ${cantidad} cierres`);
  });
  
  console.log('\n   💰 Montos totales:');
  console.log(`      Monto inicial acumulado: $${montosTotales.inicial.toLocaleString()}`);
  console.log(`      Monto final acumulado: $${montosTotales.final.toLocaleString()}`);
  console.log(`      Total egresos: $${montosTotales.egresos.toLocaleString()}`);
  console.log(`      Diferencias acumuladas: $${montosTotales.diferencias.toLocaleString()}`);
  
  if (rangoFechas) {
    console.log('\n   📅 Rango temporal:');
    console.log(`      Desde: ${rangoFechas.desde.toISOString().split('T')[0]}`);
    console.log(`      Hasta: ${rangoFechas.hasta.toISOString().split('T')[0]}`);
    console.log(`      Período: ${rangoFechas.dias} días`);
  }
  
  return {
    totalCierres,
    totalEgresos,
    totalRecuperos,
    porEstado,
    porSucursal: sucursalNombres,
    rangoFechas,
    montosTotales,
    cierres // Para uso en eliminación si es necesario
  };
}

// Función para confirmar eliminación
async function confirmarEliminacion(estadisticas) {
  console.log('\n⚠️ === CONFIRMACIÓN DE ELIMINACIÓN ===');
  console.log(`🗑️ Se eliminarán ${estadisticas.totalCierres} cierres de caja`);
  console.log(`🗑️ Se eliminarán ${estadisticas.totalEgresos} egresos asociados`);
  console.log(`🗑️ Se eliminarán ${estadisticas.totalRecuperos} recuperos de fondo`);
  console.log(`💰 Montos involucrados: $${(estadisticas.montosTotales.inicial + estadisticas.montosTotales.final).toLocaleString()}`);
  
  if (estadisticas.rangoFechas) {
    console.log(`📅 Período: ${estadisticas.rangoFechas.dias} días de historial`);
  }
  
  console.log('\n❌ ESTA ACCIÓN NO SE PUEDE DESHACER');
  console.log('❌ SE PERDERÁ TODO EL HISTORIAL DE CIERRES DE CAJA');
  console.log('❌ SE PERDERÁN TODOS LOS REGISTROS CONTABLES ASOCIADOS');
  
  // Pausa de seguridad
  console.log('\n⏳ Continuando eliminación en 5 segundos...');
  console.log('   (Presiona Ctrl+C para cancelar)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return true;
}

// Función principal de limpieza
async function limpiarHistorialCierresCaja() {
  console.log('🗑️ === LIMPIEZA COMPLETA DEL HISTORIAL DE CIERRES DE CAJA ===\n');
  
  try {
    // 1. Verificar usuario admin
    const usuario = await obtenerUsuarioAdmin();
    if (usuario) {
      console.log(`👤 Ejecutado por: ${usuario.name} (${usuario.email})`);
    }
    
    // 2. Obtener estadísticas antes de eliminar
    const estadisticas = await obtenerEstadisticasCierres();
    
    if (estadisticas.totalCierres === 0) {
      console.log('\n✅ No hay cierres de caja para eliminar. Historial limpio.');
      return {
        cierresEliminados: 0,
        egresosEliminados: 0,
        recuperosEliminados: 0,
        errores: 0,
        duracion: 0
      };
    }
    
    // 3. Confirmar eliminación
    await confirmarEliminacion(estadisticas);
    
    const inicioEliminacion = Date.now();
    
    // 4. Eliminar en orden de dependencias
    
    // 4.1. Eliminar egresos de caja
    console.log('\n💰 === ELIMINANDO EGRESOS DE CAJA ===');
    const egresosEliminados = await prisma.cajaEgreso.deleteMany({});
    console.log(`   ✅ ${egresosEliminados.count} egresos eliminados`);
    
    // 4.2. Eliminar recuperos de fondo
    console.log('\n🔄 === ELIMINANDO RECUPEROS DE FONDO ===');
    const recuperosEliminados = await prisma.recuperoFondo.deleteMany({});
    console.log(`   ✅ ${recuperosEliminados.count} recuperos eliminados`);
    
    // 4.3. Eliminar cierres de caja
    console.log('\n📋 === ELIMINANDO CIERRES DE CAJA ===');
    const cierresEliminados = await prisma.cierreCaja.deleteMany({});
    console.log(`   ✅ ${cierresEliminados.count} cierres eliminados`);
    
    const finEliminacion = Date.now();
    const duracion = Math.round((finEliminacion - inicioEliminacion) / 1000);
    
    // 5. Verificar limpieza completa
    console.log('\n🔍 === VERIFICACIÓN DE LIMPIEZA ===');
    
    const cierresRestantes = await prisma.cierreCaja.count();
    const egresosRestantes = await prisma.cajaEgreso.count();
    const recuperosRestantes = await prisma.recuperoFondo.count();
    
    console.log(`   📋 Cierres restantes: ${cierresRestantes}`);
    console.log(`   💰 Egresos restantes: ${egresosRestantes}`);
    console.log(`   🔄 Recuperos restantes: ${recuperosRestantes}`);
    
    const limpiezaCompleta = cierresRestantes === 0 && egresosRestantes === 0 && recuperosRestantes === 0;
    
    if (limpiezaCompleta) {
      console.log('   ✅ Verificación exitosa: Historial completamente limpio');
    } else {
      console.log('   ⚠️ Advertencia: La limpieza no fue completa');
    }
    
    // 6. Mostrar resumen final
    console.log('\n📊 === RESUMEN DE LIMPIEZA ===');
    console.log(`📋 Cierres de caja eliminados: ${cierresEliminados.count}`);
    console.log(`💰 Egresos eliminados: ${egresosEliminados.count}`);
    console.log(`🔄 Recuperos eliminados: ${recuperosEliminados.count}`);
    console.log(`⏱️ Tiempo total: ${duracion} segundos`);
    console.log(`📅 Fecha de limpieza: ${new Date().toISOString()}`);
    
    // Mostrar estadísticas de lo que se eliminó
    console.log('\n📋 Estadísticas del historial eliminado:');
    console.log('   Por estado:', Object.entries(estadisticas.porEstado).map(([k,v]) => `${k}:${v}`).join(', '));
    
    console.log('   Por sucursal:');
    Object.entries(estadisticas.porSucursal).forEach(([id, nombre]) => {
      const cantidad = Object.keys(estadisticas.porSucursal).length;
      console.log(`      ${nombre}: registros en período`);
    });
    
    console.log('\n💰 Montos del historial eliminado:');
    console.log(`   Monto inicial total: $${estadisticas.montosTotales.inicial.toLocaleString()}`);
    console.log(`   Monto final total: $${estadisticas.montosTotales.final.toLocaleString()}`);
    console.log(`   Egresos totales: $${estadisticas.montosTotales.egresos.toLocaleString()}`);
    console.log(`   Diferencias acumuladas: $${estadisticas.montosTotales.diferencias.toLocaleString()}`);
    
    if (estadisticas.rangoFechas) {
      console.log(`\n📅 Período eliminado: ${estadisticas.rangoFechas.dias} días de historial`);
      console.log(`   Desde: ${estadisticas.rangoFechas.desde.toISOString().split('T')[0]}`);
      console.log(`   Hasta: ${estadisticas.rangoFechas.hasta.toISOString().split('T')[0]}`);
    }
    
    return {
      cierresEliminados: cierresEliminados.count,
      egresosEliminados: egresosEliminados.count,
      recuperosEliminados: recuperosEliminados.count,
      errores: 0,
      duracion,
      estadisticasEliminadas: estadisticas,
      limpiezaCompleta
    };
    
  } catch (error) {
    console.error('\n💥 === ERROR EN LA LIMPIEZA ===');
    console.error('Error:', error.message);
    
    // Intentar mostrar estado actual
    try {
      const cierresRestantes = await prisma.cierreCaja.count();
      const egresosRestantes = await prisma.cajaEgreso.count();
      const recuperosRestantes = await prisma.recuperoFondo.count();
      
      console.log('\n📊 Estado actual después del error:');
      console.log(`   Cierres restantes: ${cierresRestantes}`);
      console.log(`   Egresos restantes: ${egresosRestantes}`);
      console.log(`   Recuperos restantes: ${recuperosRestantes}`);
    } catch (countError) {
      console.error('No se pudo verificar el estado actual:', countError.message);
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para verificar solo sin eliminar
async function verificarHistorialCierres() {
  console.log('🔍 === VERIFICACIÓN DEL HISTORIAL DE CIERRES (SOLO LECTURA) ===\n');
  
  try {
    const estadisticas = await obtenerEstadisticasCierres();
    
    console.log('\n✅ Verificación completada sin realizar cambios');
    
    if (estadisticas.totalCierres > 0) {
      console.log('\n💡 INFORMACIÓN ADICIONAL:');
      console.log('   📋 Este historial incluye:');
      console.log('      - Registros de apertura y cierre de caja');
      console.log('      - Montos iniciales y finales');
      console.log('      - Diferencias y ajustes');
      console.log('      - Egresos asociados (adelantos, compras, etc.)');
      console.log('      - Recuperos de fondo entre turnos');
      console.log('      - Información contable y de auditoría');
      
      console.log('\n⚠️ IMPACTO DE LA ELIMINACIÓN:');
      console.log('   ❌ Se perderá TODO el historial contable');
      console.log('   ❌ No se podrán generar reportes históricos');
      console.log('   ❌ Se perderá la trazabilidad de diferencias');
      console.log('   ❌ No se podrá auditar movimientos pasados');
    }
    
    return estadisticas;
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para limpiar solo cierres antiguos (opcional)
async function limpiarCierresAntiguos(diasAntiguedad = 90) {
  console.log(`🗑️ === LIMPIEZA DE CIERRES ANTIGUOS (>${diasAntiguedad} DÍAS) ===\n`);
  
  try {
    const fechaCorte = new Date();
    fechaCorte.setDate(fechaCorte.getDate() - diasAntiguedad);
    
    console.log(`📅 Eliminando cierres anteriores a: ${fechaCorte.toISOString().split('T')[0]}`);
    
    // Obtener cierres antiguos
    const cierresAntiguos = await prisma.cierreCaja.findMany({
      where: {
        fechaApertura: { lt: fechaCorte }
      },
      include: {
        egresos: true,
        recuperosAplicados: true,
        recuperosGenerados: true
      }
    });
    
    console.log(`   📋 Cierres antiguos encontrados: ${cierresAntiguos.length}`);
    
    if (cierresAntiguos.length === 0) {
      console.log('   ✅ No hay cierres antiguos para eliminar');
      return { cierresEliminados: 0, egresosEliminados: 0, recuperosEliminados: 0 };
    }
    
    const cierreIds = cierresAntiguos.map(c => c.id);
    
    // Eliminar egresos asociados
    const egresosEliminados = await prisma.cajaEgreso.deleteMany({
      where: { cierreCajaId: { in: cierreIds } }
    });
    
    // Eliminar recuperos asociados
    const recuperosEliminados = await prisma.recuperoFondo.deleteMany({
      where: {
        OR: [
          { cierreCajaId: { in: cierreIds } },
          { cierreCajaOrigenId: { in: cierreIds } }
        ]
      }
    });
    
    // Eliminar cierres
    const cierresEliminados = await prisma.cierreCaja.deleteMany({
      where: { id: { in: cierreIds } }
    });
    
    console.log('\n📊 Limpieza de antiguos completada:');
    console.log(`   📋 Cierres eliminados: ${cierresEliminados.count}`);
    console.log(`   💰 Egresos eliminados: ${egresosEliminados.count}`);
    console.log(`   🔄 Recuperos eliminados: ${recuperosEliminados.count}`);
    
    return {
      cierresEliminados: cierresEliminados.count,
      egresosEliminados: egresosEliminados.count,
      recuperosEliminados: recuperosEliminados.count
    };
    
  } catch (error) {
    console.error('❌ Error en limpieza de antiguos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Script de Limpieza del Historial de Cierres de Caja

🎯 Propósito:
   Eliminar COMPLETAMENTE el historial de cierres de caja, egresos
   y recuperos de fondo de todas las sucursales.

🔧 Uso:
   node scripts/insertar/limpiar-historial-cierres-caja-completo.js [opciones]

📋 Opciones:
   --verificar           Solo verificar y mostrar estadísticas sin eliminar
   --antiguos [días]     Eliminar solo cierres antiguos (ej: --antiguos 90)
   --ayuda              Mostrar esta ayuda

⚠️ ADVERTENCIA CRÍTICA:
   Este script ELIMINA PERMANENTEMENTE todo el historial de caja.
   NO SE PUEDE DESHACER esta operación.

📋 Qué elimina:
   🗑️ Todos los registros de CierreCaja
   🗑️ Todos los CajaEgreso asociados
   🗑️ Todos los RecuperoFondo asociados

📊 Información que se perderá:
   ❌ Historial completo de cierres de caja
   ❌ Montos de apertura y cierre
   ❌ Diferencias y ajustes registrados
   ❌ Egresos (adelantos, compras, etc.)
   ❌ Recuperos de fondo entre turnos
   ❌ Trazabilidad contable y auditoría
   ❌ Reportes históricos de caja

💰 Datos financieros incluidos:
   - Montos iniciales y finales de caja
   - Diferencias encontradas en cierres
   - Egresos por diferentes motivos
   - Recuperos de fondos entre turnos
   - Configuraciones de monto fijo

🔒 Precauciones OBLIGATORIAS:
   📋 Respalda la base de datos ANTES de ejecutar
   📋 Exporta reportes contables si los necesitas
   📋 Verifica que no hay auditorías pendientes
   📋 Coordina con el área contable
   📋 Ejecuta primero con --verificar

💡 Casos de uso apropiados:
   ✅ Limpieza de base de datos de desarrollo/testing
   ✅ Reset completo del sistema (con mucho cuidado)
   ✅ Migración a nuevo sistema contable
   ❌ NUNCA en producción sin respaldo completo

🚨 EN PRODUCCIÓN:
   1. Hacer respaldo completo de la base de datos
   2. Exportar todos los reportes contables necesarios
   3. Coordinar con contabilidad y gerencia
   4. Ejecutar en horario de menor actividad
   5. Verificar inmediatamente después

📱 Ejemplos de uso:
   # Solo verificar qué se eliminaría
   node scripts/insertar/limpiar-historial-cierres-caja-completo.js --verificar
   
   # Eliminar solo cierres de más de 90 días
   node scripts/insertar/limpiar-historial-cierres-caja-completo.js --antiguos 90
   
   # Limpieza completa (¡PELIGROSO!)
   node scripts/insertar/limpiar-historial-cierres-caja-completo.js
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
    
    verificarHistorialCierres()
      .then((estadisticas) => {
        console.log('\n📊 Verificación completada');
        if (estadisticas.totalCierres > 0) {
          console.log(`\n💡 Para eliminar estos ${estadisticas.totalCierres} cierres, ejecuta:`);
          console.log('   node scripts/insertar/limpiar-historial-cierres-caja-completo.js');
          console.log('\n⚠️ RECUERDA: Esta operación NO se puede deshacer');
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Error en verificación:', error.message);
        process.exit(1);
      });
  } else if (args.includes('--antiguos')) {
    const index = args.indexOf('--antiguos');
    const dias = parseInt(args[index + 1]) || 90;
    
    console.log(`🗑️ Modo limpieza de antiguos - Eliminando cierres de más de ${dias} días\n`);
    
    limpiarCierresAntiguos(dias)
      .then((resultado) => {
        console.log('\n🎉 Limpieza de antiguos completada');
        console.log(`📋 ${resultado.cierresEliminados} cierres antiguos eliminados`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Error en limpieza de antiguos:', error.message);
        process.exit(1);
      });
  } else {
    console.log('🚀 Iniciando limpieza COMPLETA del historial de cierres...\n');
    console.log('🚨 ESTA OPERACIÓN NO SE PUEDE DESHACER');
    console.log('🚨 SE ELIMINARÁ TODO EL HISTORIAL CONTABLE DE CAJA\n');
    
    limpiarHistorialCierresCaja()
      .then((resultado) => {
        console.log('\n🎉 === LIMPIEZA COMPLETADA ===');
        console.log(`📋 ${resultado.cierresEliminados} cierres eliminados`);
        console.log(`💰 ${resultado.egresosEliminados} egresos eliminados`);
        console.log(`🔄 ${resultado.recuperosEliminados} recuperos eliminados`);
        
        if (resultado.limpiezaCompleta) {
          console.log('✅ Historial completamente limpio');
        } else {
          console.log('⚠️ Limpieza incompleta - revisar logs');
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
  limpiarHistorialCierresCaja, 
  verificarHistorialCierres, 
  limpiarCierresAntiguos,
  obtenerEstadisticasCierres 
};