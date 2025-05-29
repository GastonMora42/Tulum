// scripts/test-factura-individual-api.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFacturaIndividualAPI() {
  console.log('🧪 === TEST DE FACTURA INDIVIDUAL VIA API ===\n');
  
  try {
    // 1. Obtener datos para test
    const sucursal = await prisma.ubicacion.findFirst({
      where: { tipo: 'sucursal' }
    });
    
    const producto = await prisma.producto.findFirst();
    const usuario = await prisma.user.findFirst();
    
    if (!sucursal || !producto || !usuario) {
      console.log('❌ Faltan datos básicos (sucursal, producto o usuario)');
      return;
    }
    
    console.log(`🏪 Sucursal: ${sucursal.nombre}`);
    console.log(`📦 Producto: ${producto.nombre} - $${producto.precio}`);
    console.log(`👤 Usuario: ${usuario.name}\n`);
    
    // 2. Verificar configuración AFIP
    const config = await prisma.configuracionAFIP.findFirst({
      where: {
        sucursalId: sucursal.id,
        activo: true
      }
    });
    
    if (!config) {
      console.log('❌ No hay configuración AFIP para esta sucursal');
      return;
    }
    
    console.log(`⚙️ Config AFIP: CUIT ${config.cuit}, PV ${config.puntoVenta}\n`);
    
    // 3. Verificar token
    const token = await prisma.tokenAFIP.findFirst({
      where: { cuit: config.cuit }
    });
    
    if (!token) {
      console.log('❌ No hay token AFIP para este CUIT');
      return;
    }
    
    const hoursUntilExpiry = (token.expirationTime.getTime() - Date.now()) / (1000 * 60 * 60);
    console.log(`🔐 Token: Expira en ${hoursUntilExpiry.toFixed(1)} horas\n`);
    
    if (hoursUntilExpiry < 0) {
      console.log('❌ Token expirado');
      return;
    }
    
    // 4. Crear token de usuario simulado para API
    console.log('🔑 Generando token de usuario para API...');
    
    // Crear un token simple (en producción usarías JWT real)
    const userToken = Buffer.from(JSON.stringify({
      id: usuario.id,
      email: usuario.email,
      name: usuario.name,
      roleId: usuario.roleId
    })).toString('base64');
    
    console.log(`✅ Token generado\n`);
    
    // 5. Configurar API
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    console.log(`🌐 API URL: ${baseUrl}\n`);
    
    // 6. Crear venta via API
    console.log('🛍️ Creando venta via API...');
    
    const { default: fetch } = await import('node-fetch');
    
    const ventaData = {
      sucursalId: sucursal.id,
      items: [{
        productoId: producto.id,
        cantidad: 1,
        precioUnitario: producto.precio
      }],
      total: producto.precio,
      pagos: [{
        medioPago: 'efectivo',
        monto: producto.precio
      }],
      facturar: 'B' // Factura B para consumidor final
    };
    
    console.log(`📋 Datos de venta:`, JSON.stringify(ventaData, null, 2));
    
    try {
      const ventaResponse = await fetch(`${baseUrl}/api/pdv/ventas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaData)
      });
      
      console.log(`\n📡 Respuesta API: ${ventaResponse.status} ${ventaResponse.statusText}`);
      
      if (!ventaResponse.ok) {
        const errorText = await ventaResponse.text();
        console.log(`❌ Error de API: ${errorText}`);
        return;
      }
      
      const ventaResult = await ventaResponse.json();
      console.log(`✅ Venta creada via API:`);
      console.log(`   ID: ${ventaResult.id}`);
      console.log(`   Total: $${ventaResult.total}`);
      console.log(`   Facturar: ${ventaData.facturar}`);
      
      if (ventaResult.facturaId) {
        console.log(`   Factura ID: ${ventaResult.facturaId}`);
      }
      
      if (ventaResult.message) {
        console.log(`   Mensaje: ${ventaResult.message}`);
      }
      
      // 7. Esperar un momento y verificar estado de factura
      console.log(`\n⏳ Esperando 5 segundos para verificar procesamiento...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 8. Buscar factura en BD
      const facturaGenerada = await prisma.facturaElectronica.findFirst({
        where: { ventaId: ventaResult.id },
        orderBy: { createdAt: 'desc' }
      });
      
      if (facturaGenerada) {
        console.log(`\n🧾 FACTURA ENCONTRADA EN BD:`);
        console.log(`   ID: ${facturaGenerada.id}`);
        console.log(`   Estado: ${facturaGenerada.estado}`);
        console.log(`   Tipo: ${facturaGenerada.tipoComprobante}`);
        console.log(`   PV: ${facturaGenerada.puntoVenta}`);
        console.log(`   Número: ${facturaGenerada.numeroFactura || 'N/A'}`);
        console.log(`   CAE: ${facturaGenerada.cae || 'N/A'}`);
        console.log(`   Error: ${facturaGenerada.error || 'N/A'}`);
        
        const minutosDesdeCreacion = (Date.now() - facturaGenerada.createdAt.getTime()) / (1000 * 60);
        console.log(`   Tiempo desde creación: ${minutosDesdeCreacion.toFixed(1)} minutos`);
        
        if (facturaGenerada.logs) {
          console.log(`\n📝 LOGS (últimas 5 líneas):`);
          const logs = facturaGenerada.logs.split('\n').slice(-5);
          logs.forEach(log => console.log(`   ${log}`));
        }
        
        // 9. Análisis del resultado
        console.log(`\n📊 ANÁLISIS:`);
        
        if (facturaGenerada.estado === 'completada' && facturaGenerada.cae) {
          console.log(`   ✅ ÉXITO: Factura generada correctamente`);
          console.log(`   🎫 CAE: ${facturaGenerada.cae}`);
          console.log(`   📄 Número: ${facturaGenerada.puntoVenta.toString().padStart(5, '0')}-${facturaGenerada.numeroFactura.toString().padStart(8, '0')}`);
        } else if (facturaGenerada.estado === 'pendiente') {
          console.log(`   ⏳ PENDIENTE: La factura sigue procesándose`);
          console.log(`   💡 Tip: Ejecuta el script de procesamiento manual`);
        } else if (facturaGenerada.estado === 'procesando') {
          console.log(`   🔄 PROCESANDO: La factura está en proceso`);
          if (minutosDesdeCreacion > 2) {
            console.log(`   ⚠️ Lleva ${minutosDesdeCreacion.toFixed(1)} minutos, podría estar colgada`);
          }
        } else if (facturaGenerada.estado === 'error') {
          console.log(`   ❌ ERROR: ${facturaGenerada.error}`);
        }
        
      } else {
        console.log(`\n❌ No se encontró factura en BD para la venta ${ventaResult.id}`);
        console.log(`   Esto podría indicar un problema en el proceso de facturación`);
      }
      
      // 10. Comandos útiles para debug
      console.log(`\n🔧 COMANDOS ÚTILES PARA DEBUG:`);
      
      if (facturaGenerada && (facturaGenerada.estado === 'pendiente' || facturaGenerada.estado === 'error')) {
        console.log(`\nPara reintentar esta factura específica:`);
        console.log(`curl -X POST "${baseUrl}/api/pdv/facturas/retry/${facturaGenerada.id}" \\`);
        console.log(`  -H "Authorization: Bearer ${userToken}"`);
      }
      
      console.log(`\nPara ver todas las facturas pendientes:`);
      console.log(`node scripts/debug-facturas-pendientes.js`);
      
      console.log(`\nPara procesar facturas pendientes:`);
      console.log(`node scripts/procesar-facturas-pendientes.js`);
      
    } catch (apiError) {
      console.log(`❌ Error llamando API: ${apiError.message}`);
      
      // Verificar si el servidor está corriendo
      try {
        const healthResponse = await fetch(`${baseUrl}/api/health`);
        if (healthResponse.ok) {
          console.log(`✅ Servidor corriendo, problema con el endpoint específico`);
        }
      } catch (healthError) {
        console.log(`❌ Servidor no disponible en ${baseUrl}`);
        console.log(`💡 Asegúrate de que la aplicación esté corriendo con: npm run dev`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacturaIndividualAPI();