// scripts/limpiar-configuraciones-inactivas.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarConfiguracionesInactivas() {
  console.log('🗑️ === LIMPIANDO CONFIGURACIONES INACTIVAS ===\n');
  
  try {
    // Buscar configuraciones inactivas
    const configuracionesInactivas = await prisma.configuracionAFIP.findMany({
      where: { activo: false },
      include: { sucursal: true }
    });
    
    if (configuracionesInactivas.length === 0) {
      console.log('✅ No hay configuraciones inactivas para limpiar');
      return;
    }
    
    console.log(`📋 Configuraciones inactivas encontradas: ${configuracionesInactivas.length}`);
    configuracionesInactivas.forEach(config => {
      console.log(`   - PV ${config.puntoVenta}: ${config.sucursal.nombre}`);
    });
    
    // Verificar si hay facturas asociadas
    for (const config of configuracionesInactivas) {
      const facturasCount = await prisma.facturaElectronica.count({
        where: { sucursalId: config.sucursalId }
      });
      
      if (facturasCount > 0) {
        console.log(`\n⚠️ ADVERTENCIA: ${config.sucursal.nombre} tiene ${facturasCount} facturas asociadas`);
        console.log('   No se eliminará automáticamente por precaución');
      } else {
        console.log(`\n🗑️ Eliminando configuración de ${config.sucursal.nombre}...`);
        await prisma.configuracionAFIP.delete({
          where: { id: config.id }
        });
        console.log('   ✅ Eliminada');
      }
    }
    
    console.log('\n🎉 Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

limpiarConfiguracionesInactivas();