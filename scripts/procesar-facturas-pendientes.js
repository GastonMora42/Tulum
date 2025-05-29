// scripts/procesar-facturas-pendientes.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function procesarFacturasPendientes() {
  console.log('🔄 === PROCESANDO FACTURAS PENDIENTES MANUALMENTE ===\n');
  
  try {
    // Buscar facturas pendientes
    const facturasPendientes = await prisma.facturaElectronica.findMany({
      where: {
        OR: [
          { estado: 'pendiente' },
          { 
            estado: 'procesando',
            updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } // Más de 5 minutos
          }
        ]
      },
      include: {
        venta: {
          include: { sucursal: true }
        }
      },
      take: 5 // Procesar de a pocas para evitar saturar AFIP
    });
    
    console.log(`📋 Facturas para procesar: ${facturasPendientes.length}\n`);
    
    if (facturasPendientes.length === 0) {
      console.log('✅ No hay facturas pendientes para procesar');
      return;
    }
    
    // Procesar cada factura
    for (const factura of facturasPendientes) {
      console.log(`🔄 Procesando factura ${factura.id}...`);
      console.log(`   Venta: $${factura.venta.total} - ${factura.venta.sucursal.nombre}`);
      
      try {
        // Importar servicio dinámicamente
        const { getFacturacionService } = await import('../src/server/services/facturacion/factoryService.js');
        
        // Resetear estado
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: {
            estado: 'procesando',
            error: null,
            logs: `${factura.logs || ''}\n[MANUAL] ${new Date().toISOString()}: Reintento manual iniciado`
          }
        });
        
        // Obtener servicio y procesar
        const facturacionService = await getFacturacionService(factura.venta.sucursalId);
        const resultado = await facturacionService.generarFactura(factura.ventaId);
        
        if (resultado.success && resultado.cae) {
          console.log(`   ✅ Éxito: CAE ${resultado.cae}`);
        } else {
          console.log(`   ❌ Error: ${resultado.message || 'Sin CAE obtenido'}`);
        }
        
        // Pausa entre facturas
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Error procesando: ${error.message}`);
        
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: {
            estado: 'error',
            error: error.message,
            logs: `${factura.logs || ''}\n[ERROR] ${new Date().toISOString()}: ${error.message}`
          }
        });
      }
    }
    
    console.log('\n🎉 Procesamiento manual completado');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

procesarFacturasPendientes();