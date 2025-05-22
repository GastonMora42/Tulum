// scripts/test-afip-simple.js
require('dotenv').config();

// Test básico de configuración AFIP
async function testAfipBasico() {
  try {
    console.log('🔍 Verificando configuración AFIP...');
    
    // 1. Verificar variables de ambiente
    console.log('\n📋 Verificando variables de ambiente:');
    const requiredVars = ['AFIP_CERT', 'AFIP_KEY', 'AFIP_CUIT', 'AFIP_ENV'];
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value) {
        if (varName === 'AFIP_CERT' || varName === 'AFIP_KEY') {
          console.log(`   ✅ ${varName}: Configurado (${value.length} caracteres)`);
        } else {
          console.log(`   ✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`   ❌ ${varName}: NO CONFIGURADO`);
        return;
      }
    }
    
    // 2. Verificar URLs según ambiente
    const isProduction = process.env.AFIP_ENV === 'production';
    console.log(`\n🌐 Ambiente: ${isProduction ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}`);
    
    const wsaaUrl = isProduction 
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
      
    const wsfeUrl = isProduction
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
    
    console.log(`   📡 WSAA URL: ${wsaaUrl}`);
    console.log(`   📄 WSFE URL: ${wsfeUrl}`);
    
    // 3. Verificar certificado
    console.log('\n🔐 Verificando certificado...');
    try {
      const cert = Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8');
      const key = Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8');
      
      if (cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE')) {
        console.log('   ✅ Certificado tiene formato válido');
      } else {
        console.log('   ❌ Certificado no tiene formato PEM válido');
        return;
      }
      
      if (key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY')) {
        console.log('   ✅ Clave privada tiene formato válido');
      } else {
        console.log('   ❌ Clave privada no tiene formato PEM válido');
        return;
      }
    } catch (error) {
      console.log(`   ❌ Error al decodificar certificado: ${error.message}`);
      return;
    }
    
    // 4. Test de conectividad básica
    console.log('\n🌐 Probando conectividad con AFIP...');
    
    try {
      const https = require('https');
      const { URL } = require('url');
      
      const testUrl = new URL(wsfeUrl + '?WSDL');
      
      await new Promise((resolve, reject) => {
        const req = https.get({
          hostname: testUrl.hostname,
          path: testUrl.pathname + testUrl.search,
          timeout: 10000
        }, (res) => {
          if (res.statusCode === 200) {
            console.log('   ✅ Conectividad con AFIP OK');
            resolve(true);
          } else {
            console.log(`   ⚠️ AFIP responde pero con status ${res.statusCode}`);
            resolve(true);
          }
        });
        
        req.on('timeout', () => {
          console.log('   ❌ Timeout al conectar con AFIP');
          reject(new Error('Timeout'));
        });
        
        req.on('error', (error) => {
          console.log(`   ❌ Error de conectividad: ${error.message}`);
          reject(error);
        });
      });
      
    } catch (error) {
      console.log(`   ❌ No se puede conectar con AFIP: ${error.message}`);
      return;
    }
    
    console.log('\n🎉 ¡CONFIGURACIÓN BÁSICA CORRECTA!');
    console.log('✅ Todas las verificaciones básicas pasaron');
    console.log('🚀 Ahora puedes probar la facturación completa');
    
  } catch (error) {
    console.error('💥 Error en test básico:', error);
  }
}

testAfipBasico();