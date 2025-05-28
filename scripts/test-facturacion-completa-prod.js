// scripts/test-facturacion-completa-prod.js - VERSIÓN CORREGIDA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFacturacionCompleta() {
  console.log('🧪 === TEST COMPLETO DE FACTURACIÓN PRODUCCIÓN ===');
  
  try {
    // 1. Verificar configuraciones
    console.log('\n1️⃣ Verificando configuraciones...');
    const configs = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true }
    });
    
    console.log(`✅ Configuraciones encontradas: ${configs.length}`);
    configs.forEach(c => {
      console.log(`   - CUIT: ${c.cuit}, PV: ${c.puntoVenta}, Sucursal: ${c.sucursal.nombre}`);
    });
    
    // 2. Verificar tokens
    console.log('\n2️⃣ Verificando tokens...');
    const tokens = await prisma.tokenAFIP.findMany();
    const now = new Date();
    
    tokens.forEach(token => {
      const hoursUntilExpiry = (token.expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const status = hoursUntilExpiry > 0 ? '✅ VÁLIDO' : '❌ EXPIRADO';
      console.log(`   - CUIT: ${token.cuit}, Expira en: ${hoursUntilExpiry.toFixed(1)}h, ${status}`);
    });
    
    // 3. Test de conectividad mediante API endpoints
    console.log('\n3️⃣ Testeando conectividad AFIP mediante API...');
    
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    const adminToken = process.env.ADMIN_TOKEN || 'admin-token-aqui';
    
    try {
      // Test del endpoint de estado
      console.log('🔍 Consultando estado via API...');
      
      const { default: fetch } = await import('node-fetch');
      
      const response = await fetch(`${baseUrl}/api/admin/jobs/afip-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Estado obtenido via API:');
        console.log(`   - Total tokens: ${data.total}`);
        console.log(`   - Tokens válidos: ${data.valid}`);
        console.log(`   - Tokens expirados: ${data.expired}`);
        
        data.tokens.forEach(token => {
          const status = token.valid ? '✅' : '❌';
          console.log(`   ${status} CUIT: ${token.cuit}, Expira en: ${token.hoursUntilExpiry}h`);
        });
      } else {
        console.log(`❌ Error consultando API: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.log(`⚠️ No se pudo conectar a la API: ${apiError.message}`);
      console.log('   Esto es normal si la aplicación no está corriendo.');
    }
    
    // 4. Verificar puntos de venta únicos
    console.log('\n4️⃣ Verificando configuración de puntos de venta...');
    
    // Agrupar por punto de venta para detectar duplicados
    const puntoVentaMap = new Map();
    configs.forEach(config => {
      if (!puntoVentaMap.has(config.puntoVenta)) {
        puntoVentaMap.set(config.puntoVenta, []);
      }
      puntoVentaMap.get(config.puntoVenta).push(config);
    });
    
    let duplicateWarning = false;
    puntoVentaMap.forEach((configsForPV, pv) => {
      if (configsForPV.length > 1) {
        console.log(`⚠️ ADVERTENCIA: Punto de Venta ${pv} usado por múltiples sucursales:`);
        configsForPV.forEach(c => {
          console.log(`   - ${c.sucursal.nombre}`);
        });
        duplicateWarning = true;
      } else {
        console.log(`✅ PV ${pv}: ${configsForPV[0].sucursal.nombre}`);
      }
    });
    
    if (duplicateWarning) {
      console.log('\n⚠️ IMPORTANTE: Cada sucursal debe tener un punto de venta único.');
      console.log('   Ejecuta: node scripts/fix-puntos-venta.js para corregir');
    }
    
    // 5. Verificar variables de entorno de producción
    console.log('\n5️⃣ Verificando configuración de producción...');
    
    const requiredEnvVars = [
      'AFIP_ENV',
      'AFIP_CUIT', 
      'AFIP_CERT',
      'AFIP_KEY',
      'DATABASE_URL'
    ];
    
    let envOk = true;
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (!value) {
        console.log(`❌ ${envVar}: No configurada`);
        envOk = false;
      } else {
        const displayValue = envVar.includes('KEY') || envVar.includes('CERT') || envVar.includes('URL') 
          ? `${value.substring(0, 20)}...` 
          : value;
        console.log(`✅ ${envVar}: ${displayValue}`);
      }
    });
    
    // 6. Test de creación de venta (solo mostrar ejemplo)
    console.log('\n6️⃣ Ejemplo de venta para testing...');
    
    const producto = await prisma.producto.findFirst();
    const sucursal = await prisma.ubicacion.findFirst({ where: { tipo: 'sucursal' } });
    const usuario = await prisma.user.findFirst();
    
    if (producto && sucursal && usuario) {
      console.log('📝 Datos para test de venta:');
      console.log(`   Producto: ${producto.nombre} - $${producto.precio}`);
      console.log(`   Sucursal: ${sucursal.nombre}`);
      console.log(`   Usuario: ${usuario.name}`);
      
      console.log('\n🧪 Para crear venta de prueba, ejecuta:');
      console.log(`curl -X POST "${baseUrl}/api/pdv/ventas" \\`);
      console.log(`  -H "Authorization: Bearer TOKEN_USUARIO" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{`);
      console.log(`    "sucursalId": "${sucursal.id}",`);
      console.log(`    "items": [{"productoId": "${producto.id}", "cantidad": 1, "precioUnitario": ${producto.precio}}],`);
      console.log(`    "total": ${producto.precio},`);
      console.log(`    "pagos": [{"medioPago": "efectivo", "monto": ${producto.precio}}],`);
      console.log(`    "facturar": "B"`);
      console.log(`  }'`);
    } else {
      console.log('⚠️ Faltan datos básicos (producto, sucursal o usuario) para test de venta');
    }
    
    // 7. Resumen final
    console.log('\n🎉 TEST COMPLETO FINALIZADO');
    
    const configsActivas = configs.filter(c => c.activo).length;
    const tokensValidos = tokens.filter(t => t.expirationTime > now).length;
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`   Configuraciones AFIP activas: ${configsActivas}`);
    console.log(`   Tokens válidos: ${tokensValidos}`);
    console.log(`   Variables de entorno: ${envOk ? '✅ OK' : '❌ FALTANTES'}`);
    console.log(`   Puntos de venta: ${duplicateWarning ? '⚠️ DUPLICADOS' : '✅ OK'}`);
    
    const readyForProduction = configsActivas > 0 && tokensValidos > 0 && envOk && !duplicateWarning;
    console.log(`   Estado general: ${readyForProduction ? '🚀 LISTO PARA PRODUCCIÓN' : '⚠️ REQUIERE ATENCIÓN'}`);
    
    if (!readyForProduction) {
      console.log('\n🔧 ACCIONES REQUERIDAS:');
      if (configsActivas === 0) console.log('   - Configurar al menos una sucursal AFIP');
      if (tokensValidos === 0) console.log('   - Obtener/renovar tokens AFIP');
      if (!envOk) console.log('   - Configurar variables de entorno faltantes');
      if (duplicateWarning) console.log('   - Corregir puntos de venta duplicados');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacturacionCompleta();