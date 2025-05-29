// scripts/verificar-config-tulum.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarConfigTulum() {
  console.log('🔍 === VERIFICACIÓN CONFIGURACIÓN TULUM ===\n');
  
  try {
    const cuit = '30718236564';
    const configuracionEsperada = [
      { pv: 3, sucursal: 'Bariloche' },
      { pv: 5, sucursal: 'Neuquén' },
      { pv: 7, sucursal: 'Mendoza Centro' }
    ];
    
    // 1. Verificar configuraciones activas
    console.log('1️⃣ Configuraciones AFIP activas:');
    const configs = await prisma.configuracionAFIP.findMany({
      where: { activo: true, cuit },
      include: { sucursal: true },
      orderBy: { puntoVenta: 'asc' }
    });
    
    configs.forEach(config => {
      const esperada = configuracionEsperada.find(e => e.pv === config.puntoVenta);
      const status = esperada ? '✅' : '⚠️';
      console.log(`   ${status} PV ${config.puntoVenta}: ${config.sucursal.nombre}`);
    });
    
    // 2. Verificar que estén todas las esperadas
    console.log('\n2️⃣ Verificando configuraciones esperadas:');
    for (const esperada of configuracionEsperada) {
      const config = configs.find(c => c.puntoVenta === esperada.pv);
      if (config) {
        const nombreCoincide = config.sucursal.nombre.toLowerCase().includes(esperada.sucursal.toLowerCase());
        console.log(`   ✅ PV ${esperada.pv}: ${nombreCoincide ? 'OK' : 'NOMBRE NO COINCIDE'}`);
      } else {
        console.log(`   ❌ PV ${esperada.pv}: FALTANTE`);
      }
    }
    
    // 3. Verificar tokens
    console.log('\n3️⃣ Estado del token:');
    const token = await prisma.tokenAFIP.findFirst({
      where: { cuit }
    });
    
    if (token) {
      const hoursUntilExpiry = (token.expirationTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const status = hoursUntilExpiry > 0 ? '✅ VÁLIDO' : '❌ EXPIRADO';
      console.log(`   ${status} Expira en: ${hoursUntilExpiry.toFixed(1)} horas`);
    } else {
      console.log('   ❌ No hay token para este CUIT');
    }
    
    // 4. Test rápido de conectividad (opcional)
    console.log('\n4️⃣ Test de conectividad AFIP:');
    try {
      const { AfipSoapClient } = await import('../src/lib/afip/afipSoapClient.js');
      const client = new AfipSoapClient(cuit);
      
      // Test servidor
      const serverStatus = await client.getServerStatus();
      const serverOk = serverStatus.AppServer === 'OK' && serverStatus.DbServer === 'OK';
      console.log(`   📡 Servidor AFIP: ${serverOk ? '✅ OK' : '❌ ERROR'}`);
      
      if (serverOk && token && hoursUntilExpiry > 0) {
        // Test último comprobante para cada PV
        for (const config of configs) {
          try {
            const ultimoNumero = await client.getLastInvoiceNumber(config.puntoVenta, 6);
            console.log(`   📄 PV ${config.puntoVenta} último comprobante: ${ultimoNumero}`);
          } catch (pvError) {
            console.log(`   ❌ PV ${config.puntoVenta}: Error - ${pvError.message}`);
          }
        }
      }
      
    } catch (connectError) {
      console.log(`   ⚠️ Error de conectividad: ${connectError.message}`);
    }
    
    // 5. Resumen final
    const configuracionCompleta = configs.length === 3 && 
                                 configuracionEsperada.every(e => configs.some(c => c.puntoVenta === e.pv));
    const tokenValido = token && (token.expirationTime.getTime() - Date.now()) > 0;
    
    console.log('\n📊 RESUMEN:');
    console.log(`   Configuraciones: ${configuracionCompleta ? '✅ COMPLETAS' : '❌ INCOMPLETAS'}`);
    console.log(`   Token: ${tokenValido ? '✅ VÁLIDO' : '❌ INVÁLIDO/FALTANTE'}`);
    console.log(`   Estado general: ${configuracionCompleta && tokenValido ? '🚀 LISTO' : '⚠️ REQUIERE ATENCIÓN'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarConfigTulum();