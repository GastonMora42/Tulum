// scripts/debug-facturas-pendientes.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFacturasPendientes() {
  console.log('🔍 === DIAGNÓSTICO DE FACTURAS PENDIENTES ===\n');
  
  try {
    // 1. Buscar facturas pendientes/procesando
    const facturasPendientes = await prisma.facturaElectronica.findMany({
      where: {
        estado: { in: ['pendiente', 'procesando'] }
      },
      include: {
        venta: {
          include: {
            sucursal: true,
            items: { include: { producto: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📋 Facturas pendientes/procesando: ${facturasPendientes.length}\n`);
    
    if (facturasPendientes.length === 0) {
      console.log('✅ No hay facturas pendientes');
      return;
    }
    
    // 2. Analizar cada factura pendiente
    for (const factura of facturasPendientes) {
      console.log(`🧾 Factura ID: ${factura.id}`);
      console.log(`   Estado: ${factura.estado}`);
      console.log(`   Venta: $${factura.venta.total}`);
      console.log(`   Sucursal: ${factura.venta.sucursal.nombre}`);
      console.log(`   Creada: ${factura.createdAt.toLocaleString()}`);
      console.log(`   Actualizada: ${factura.updatedAt.toLocaleString()}`);
      
      const minutosDesdeCreacion = (Date.now() - factura.createdAt.getTime()) / (1000 * 60);
      const minutosDesdeActualizacion = (Date.now() - factura.updatedAt.getTime()) / (1000 * 60);
      
      console.log(`   Tiempo desde creación: ${minutosDesdeCreacion.toFixed(1)} minutos`);
      console.log(`   Tiempo desde actualización: ${minutosDesdeActualizacion.toFixed(1)} minutos`);
      
      if (factura.error) {
        console.log(`   ❌ Error: ${factura.error}`);
      }
      
      if (factura.logs) {
        console.log(`   📝 Últimas líneas de log:`);
        const logs = factura.logs.split('\n').slice(-3);
        logs.forEach(log => console.log(`      ${log}`));
      }
      
      // Verificar configuración AFIP para esta sucursal
      const config = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId: factura.venta.sucursalId,
          activo: true
        }
      });
      
      if (config) {
        console.log(`   ⚙️ Config AFIP: CUIT ${config.cuit}, PV ${config.puntoVenta}`);
      } else {
        console.log(`   ❌ Sin configuración AFIP para esta sucursal`);
      }
      
      console.log('');
    }
    
    // 3. Verificar si hay facturas muy antiguas pendientes
    const facturasAntiguas = facturasPendientes.filter(f => {
      const minutos = (Date.now() - f.createdAt.getTime()) / (1000 * 60);
      return minutos > 10; // Más de 10 minutos
    });
    
    if (facturasAntiguas.length > 0) {
      console.log(`⚠️ ${facturasAntiguas.length} facturas llevan más de 10 minutos pendientes`);
      console.log('   Estas facturas necesitan procesamiento manual');
    }
    
    // 4. Sugerir acciones
    console.log('\n🔧 ACCIONES SUGERIDAS:');
    console.log('1. Ejecutar procesamiento manual de facturas pendientes:');
    console.log('   curl -X POST "tu-dominio/api/admin/facturas/procesar-colgadas" \\');
    console.log('     -H "Authorization: Bearer ADMIN_TOKEN"');
    
    console.log('\n2. O procesar facturas individualmente:');
    facturasPendientes.forEach(f => {
      console.log(`   curl -X POST "tu-dominio/api/pdv/facturas/retry/${f.id}" \\`);
      console.log(`     -H "Authorization: Bearer USER_TOKEN"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFacturasPendientes();