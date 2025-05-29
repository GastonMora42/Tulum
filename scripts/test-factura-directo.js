// scripts/test-factura-directo.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFacturaDirecto() {
  console.log('🧪 === TEST DIRECTO DE FACTURACIÓN ===\n');
  
  try {
    // Configurar paths para módulos TypeScript
    require('ts-node/register');
    
    // Importar módulos necesarios
    const { AfipSoapClient } = require('../src/lib/afip/afipSoapClient.ts');
    
    const cuit = '30718236564';
    
    console.log('🔍 Verificando conectividad AFIP...');
    
    // 1. Test básico de conectividad
    const client = new AfipSoapClient(cuit);
    
    // Test servidor
    const serverStatus = await client.getServerStatus();
    console.log(`📡 Servidor AFIP:`);
    console.log(`   App: ${serverStatus.AppServer}`);
    console.log(`   DB: ${serverStatus.DbServer}`);
    console.log(`   Auth: ${serverStatus.AuthServer}`);
    
    const serverOk = serverStatus.AppServer === 'OK' && 
                    serverStatus.DbServer === 'OK' && 
                    serverStatus.AuthServer === 'OK';
    
    if (!serverOk) {
      console.log('❌ Servidor AFIP no disponible');
      return;
    }
    
    // 2. Test autenticación
    console.log('\n🔐 Testeando autenticación...');
    const auth = await client.getAuth();
    console.log(`✅ Token obtenido: ${auth.Token.length} caracteres`);
    console.log(`✅ Sign obtenido: ${auth.Sign.length} caracteres`);
    
    // 3. Test último comprobante para cada PV
    console.log('\n📄 Testeando últimos comprobantes:');
    
    const puntosVenta = [3, 5, 7]; // Tus PVs configurados
    
    for (const pv of puntosVenta) {
      try {
        const ultimoNumero = await client.getLastInvoiceNumber(pv, 6); // Factura B
        console.log(`   PV ${pv}: Último comprobante ${ultimoNumero}`);
      } catch (pvError) {
        console.log(`   PV ${pv}: ❌ Error - ${pvError.message}`);
      }
    }
    
    // 4. Test de factura simple
    console.log('\n🧾 Test de factura simple...');
    
    try {
      // Datos de prueba para factura B
      const facturaTest = await client.createInvoice({
        puntoVenta: 3, // PV Bariloche
        comprobanteTipo: 6, // Factura B
        concepto: 1, // Productos
        docTipo: 99, // Consumidor Final
        docNro: '0',
        fechaComprobante: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        importeTotal: 100.00,
        importeNeto: 100.00,
        importeIVA: 0,
        monedaId: 'PES',
        cotizacion: 1,
        iva: [],
        items: [{
          descripcion: 'Producto Test',
          cantidad: 1,
          precioUnitario: 100,
          bonificacion: 0,
          subtotal: 100
        }]
      });
      
      console.log('📊 RESULTADO DE TEST:');
      console.log(`   Resultado: ${facturaTest.Resultado}`);
      console.log(`   CAE: ${facturaTest.CAE || 'N/A'}`);
      console.log(`   Número: ${facturaTest.CbteNro || 'N/A'}`);
      console.log(`   Fecha Vto: ${facturaTest.CAEFchVto || 'N/A'}`);
      
      if (facturaTest.Errores) {
        console.log(`   Errores: ${JSON.stringify(facturaTest.Errores)}`);
      }
      
      if (facturaTest.Observaciones) {
        console.log(`   Observaciones: ${JSON.stringify(facturaTest.Observaciones)}`);
      }
      
    } catch (facturaError) {
      console.log(`❌ Error en test de factura: ${facturaError.message}`);
    }
    
    console.log('\n🎉 Test directo completado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (error.message.includes('ts-node')) {
      console.log('\n💡 Para ejecutar este script, instala ts-node:');
      console.log('npm install -g ts-node');
      console.log('O usa el script via API: node scripts/test-factura-individual-api.js');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFacturaDirecto();