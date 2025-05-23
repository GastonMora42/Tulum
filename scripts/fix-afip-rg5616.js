// scripts/fix-afip-rg5616.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirFacturasPendientes() {
  console.log('🔧 Aplicando correcciones para RG 5616...');
  
  // 1. Buscar facturas en error por falta de CondicionIVAReceptorId
  const facturasError = await prisma.facturaElectronica.findMany({
    where: {
      estado: 'error',
      error: {
        contains: 'Condicion IVA'
      }
    }
  });
  
  console.log(`Encontradas ${facturasError.length} facturas con error de Condición IVA`);
  
  // 2. Resetear a pendiente para reintento
  for (const factura of facturasError) {
    await prisma.facturaElectronica.update({
      where: { id: factura.id },
      data: {
        estado: 'pendiente',
        error: null,
        logs: `${factura.logs || ''}\n[CORRECCIÓN RG5616] ${new Date().toISOString()}: Reintentando con campo CondicionIVAReceptorId`
      }
    });
  }
  
  console.log(`✅ ${facturasError.length} facturas marcadas para reintento`);
}

corregirFacturasPendientes()
  .then(() => {
    console.log('🎉 Corrección completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });