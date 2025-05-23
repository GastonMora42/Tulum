const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSalesPoints() {
  console.log('🏪 VERIFICANDO PUNTOS DE VENTA\n');
  
  try {
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true }
    });
    
    if (configuraciones.length === 0) {
      console.log('❌ No hay configuraciones AFIP activas');
      return;
    }
    
    console.log('📊 CONFIGURACIONES ENCONTRADAS:');
    configuraciones.forEach((config, i) => {
      console.log(`${i + 1}. ${config.sucursal.nombre}`);
      console.log(`   CUIT: ${config.cuit}`);
      console.log(`   Punto de Venta: ${config.puntoVenta}`);
      console.log(`   Activo: ${config.activo ? '✅' : '❌'}`);
      console.log('');
    });
    
    // Verificar que el CUIT coincida con el del certificado
    const cuitEnv = process.env.AFIP_CUIT;
    const cuitsDiferentes = configuraciones.filter(c => c.cuit !== cuitEnv);
    
    if (cuitsDiferentes.length > 0) {
      console.log('⚠️ ADVERTENCIA: Algunos CUITs no coinciden con AFIP_CUIT');
      cuitsDiferentes.forEach(c => {
        console.log(`   ${c.sucursal.nombre}: ${c.cuit} ≠ ${cuitEnv}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error consultando base de datos:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSalesPoints();
