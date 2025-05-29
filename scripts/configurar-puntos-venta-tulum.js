// scripts/configurar-puntos-venta-tulum.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function configurarPuntosVentaTulum() {
  console.log('🏪 === CONFIGURANDO PUNTOS DE VENTA TULUM ===\n');
  
  try {
    const cuit = '30718236564';
    
    // Configuración deseada
    const configuracionDeseada = [
      { sucursalNombre: 'Sucursal Bariloche', puntoVenta: 3, activo: true },
      { sucursalNombre: 'Sucursal Neuquén', puntoVenta: 5, activo: true },
      { sucursalNombre: 'Sucursal Mendoza Centro', puntoVenta: 7, activo: true }
    ];
    
    console.log('🎯 Configuración objetivo:');
    configuracionDeseada.forEach(config => {
      console.log(`   PV ${config.puntoVenta}: ${config.sucursalNombre}`);
    });
    console.log('');
    
    // 1. Obtener todas las sucursales
    const sucursales = await prisma.ubicacion.findMany({
      where: { tipo: 'sucursal' },
      include: {
        configuracionAFIP: true
      }
    });
    
    console.log('📋 Sucursales encontradas:');
    sucursales.forEach(s => {
      const config = s.configuracionAFIP;
      const configInfo = config ? `PV ${config.puntoVenta} (${config.activo ? 'ACTIVO' : 'INACTIVO'})` : 'SIN CONFIG';
      console.log(`   ${s.nombre}: ${configInfo}`);
    });
    console.log('');
    
    // 2. Desactivar todas las configuraciones existentes primero
    console.log('🔄 Desactivando configuraciones existentes...');
    await prisma.configuracionAFIP.updateMany({
      where: { cuit },
      data: { activo: false }
    });
    console.log('✅ Configuraciones existentes desactivadas\n');
    
    // 3. Configurar cada punto de venta
    for (const config of configuracionDeseada) {
      console.log(`⚙️ Configurando ${config.sucursalNombre}...`);
      
      // Buscar sucursal por nombre (usando includes para flexibilidad)
      const sucursal = sucursales.find(s => 
        s.nombre.toLowerCase().includes(config.sucursalNombre.toLowerCase().replace('Sucursal ', ''))
      );
      
      if (!sucursal) {
        console.log(`   ❌ No se encontró sucursal: ${config.sucursalNombre}`);
        continue;
      }
      
      console.log(`   📍 Sucursal encontrada: ${sucursal.nombre} (ID: ${sucursal.id})`);
      
      // Verificar si ya existe configuración para esta sucursal
      const configExistente = await prisma.configuracionAFIP.findFirst({
        where: { sucursalId: sucursal.id }
      });
      
      if (configExistente) {
        // Actualizar configuración existente
        await prisma.configuracionAFIP.update({
          where: { id: configExistente.id },
          data: {
            cuit: cuit,
            puntoVenta: config.puntoVenta,
            activo: config.activo
          }
        });
        console.log(`   🔄 Configuración actualizada: PV ${config.puntoVenta}`);
      } else {
        // Crear nueva configuración
        await prisma.configuracionAFIP.create({
          data: {
            sucursalId: sucursal.id,
            cuit: cuit,
            puntoVenta: config.puntoVenta,
            activo: config.activo
          }
        });
        console.log(`   ✅ Nueva configuración creada: PV ${config.puntoVenta}`);
      }
    }
    
    // 4. Verificar configuración final
    console.log('\n🔍 Verificando configuración final...');
    const configuracionesFinal = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true },
      orderBy: { puntoVenta: 'asc' }
    });
    
    console.log('\n✅ CONFIGURACIÓN FINAL:');
    configuracionesFinal.forEach(config => {
      console.log(`   PV ${config.puntoVenta}: ${config.sucursal.nombre} (CUIT: ${config.cuit})`);
    });
    
    // 5. Verificar duplicados
    const puntosVenta = configuracionesFinal.map(c => c.puntoVenta);
    const duplicados = puntosVenta.filter((pv, index) => puntosVenta.indexOf(pv) !== index);
    
    if (duplicados.length > 0) {
      console.log(`\n⚠️ ADVERTENCIA: Puntos de venta duplicados encontrados: ${duplicados.join(', ')}`);
    } else {
      console.log('\n✅ No hay puntos de venta duplicados');
    }
    
    // 6. Mostrar configuraciones inactivas (por si hay que limpiar)
    const configuracionesInactivas = await prisma.configuracionAFIP.findMany({
      where: { activo: false },
      include: { sucursal: true }
    });
    
    if (configuracionesInactivas.length > 0) {
      console.log('\n📋 Configuraciones inactivas (pueden eliminarse):');
      configuracionesInactivas.forEach(config => {
        console.log(`   PV ${config.puntoVenta}: ${config.sucursal.nombre} (INACTIVO)`);
      });
      
      console.log('\n🗑️ Para limpiar configuraciones inactivas, ejecuta:');
      console.log('   node scripts/limpiar-configuraciones-inactivas.js');
    }
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('1. Verificar tokens AFIP: node scripts/debug-facturas-pendientes.js');
    console.log('2. Test de conectividad: node scripts/test-facturacion-completa-prod.js');
    console.log('3. Test de factura: node scripts/test-factura-individual.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

configurarPuntosVentaTulum();