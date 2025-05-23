// scripts/debug-facturacion.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFacturacion() {
  console.log('🔍 === DIAGNÓSTICO DE FACTURACIÓN ===');
  
  try {
    // Buscar facturas problemáticas
    const facturasProblema = await prisma.facturaElectronica.findMany({
      where: {
        OR: [
          { estado: 'pendiente' },
          { estado: 'procesando' },
          { AND: [{ estado: 'completada' }, { cae: null }] },
          { AND: [{ estado: 'completada' }, { cae: '' }] }
        ]
      },
      include: {
        venta: {
          select: {
            id: true,
            total: true,
            clienteNombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Encontradas ${facturasProblema.length} facturas con problemas:`);
    
    facturasProblema.forEach((f, i) => {
      console.log(`\n${i + 1}. Factura ${f.id.substring(0, 8)}...`);
      console.log(`   Estado: ${f.estado}`);
      console.log(`   CAE: "${f.cae}" (${f.cae ? f.cae.length : 0} chars)`);
      console.log(`   Número: ${f.numeroFactura}`);
      console.log(`   Venta: $${f.venta?.total} - ${f.venta?.clienteNombre || 'CF'}`);
      console.log(`   Creada: ${f.createdAt}`);
      console.log(`   Error: ${f.error ? f.error.substring(0, 100) + '...' : 'None'}`);
      
      if (f.logs) {
        const logs = f.logs.split('\n');
        const lastLogs = logs.slice(-3);
        console.log(`   Últimos logs:`);
        lastLogs.forEach(log => console.log(`     ${log}`));
      }
    });
    
    // Verificar configuración AFIP
    console.log(`\n🔧 Verificando configuraciones AFIP...`);
    const configs = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: {
        sucursal: {
          select: { nombre: true }
        }
      }
    });
    
    configs.forEach(config => {
      console.log(`   ✅ ${config.sucursal.nombre}: CUIT ${config.cuit}, PV ${config.puntoVenta}`);
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFacturacion();