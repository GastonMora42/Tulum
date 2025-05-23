require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullProductionTest() {
  console.log('🚀 TEST COMPLETO DE PREPARACIÓN PARA PRODUCCIÓN\n');
  
  const results = {
    environment: false,
    certificate: false,
    database: false,
    connectivity: false,
    configuration: false
  };
  
  // 1. Verificar entorno
  console.log('1️⃣ Verificando entorno...');
  if (process.env.AFIP_ENV === 'production' && 
      process.env.AFIP_CUIT && 
      process.env.AFIP_CERT && 
      process.env.AFIP_KEY) {
    console.log('✅ Variables de entorno OK');
    results.environment = true;
  } else {
    console.log('❌ Variables de entorno incompletas');
  }
  
  // 2. Verificar certificado
  console.log('\n2️⃣ Verificando certificado...');
  try {
    const forge = require('node-forge');
    const certPem = Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8');
    const certificate = forge.pki.certificateFromPem(certPem);
    
    if (new Date() < certificate.validity.notAfter) {
      console.log('✅ Certificado válido');
      results.certificate = true;
    } else {
      console.log('❌ Certificado expirado');
    }
  } catch (error) {
    console.log('❌ Error en certificado:', error.message);
  }
  
  // 3. Verificar base de datos
  console.log('\n3️⃣ Verificando base de datos...');
  try {
    const configs = await prisma.configuracionAFIP.count({ where: { activo: true } });
    if (configs > 0) {
      console.log(`✅ ${configs} configuración(es) AFIP activa(s)`);
      results.database = true;
    } else {
      console.log('❌ No hay configuraciones AFIP activas');
    }
  } catch (error) {
    console.log('❌ Error en base de datos:', error.message);
  }
  
  // 4. Test de conectividad
  console.log('\n4️⃣ Test de conectividad...');
  try {
    const response = await fetch('https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL', {
      timeout: 10000
    });
    if (response.ok) {
      console.log('✅ Conectividad con AFIP OK');
      results.connectivity = true;
    } else {
      console.log('❌ No se puede conectar con AFIP');
    }
  } catch (error) {
    console.log('❌ Error de conectividad:', error.message);
  }
  
  // Resumen
  console.log('\n📊 RESUMEN:');
  const total = Object.values(results).filter(Boolean).length;
  const max = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, value]) => {
    console.log(`${value ? '✅' : '❌'} ${key}`);
  });
  
  console.log(`\n🎯 PREPARACIÓN: ${total}/${max} (${Math.round(total/max*100)}%)`);
  
  if (total === max) {
    console.log('🎉 ¡LISTO PARA PRODUCCIÓN!');
  } else {
    console.log('⚠️ Completar elementos faltantes antes de ir a producción');
  }
  
  await prisma.$disconnect();
}

fullProductionTest();
