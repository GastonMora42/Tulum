// scripts/test-factura-individual.js  
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFacturaIndividual() {
  console.log('🧪 === TEST DE FACTURA INDIVIDUAL ===\n');
  
  try {
    // 1. Crear venta de prueba
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
    
    // Verificar configuración AFIP
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
    
    // Verificar token
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
    
    // 2. Crear venta
    console.log('🛍️ Creando venta de prueba...');
    
    const venta = await prisma.venta.create({
      data: {
        sucursalId: sucursal.id,
        usuarioId: usuario.id,
        total: producto.precio,
        descuento: 0,
        facturada: false,
        clienteNombre: 'Consumidor Final Test',
        items: {
          create: [{
            productoId: producto.id,
            cantidad: 1,
            precioUnitario: producto.precio,
            descuento: 0
          }]
        },
        pagos: {
          create: [{
            medioPago: 'efectivo',
            monto: producto.precio
          }]
        }
      }
    });
    
    console.log(`✅ Venta creada: ${venta.id}\n`);
    
    // 3. Generar factura directamente
    console.log('🧾 Generando factura...');
    
    try {
      const { getFacturacionService } = await import('../src/server/services/facturacion/factoryService.js');
      
      const facturacionService = await getFacturacionService(sucursal.id);
      const resultado = await facturacionService.generarFactura(venta.id);
      
      console.log(`\n📊 RESULTADO:`);
      console.log(`   Éxito: ${resultado.success ? '✅' : '❌'}`);
      console.log(`   Mensaje: ${resultado.message || 'N/A'}`);
      console.log(`   CAE: ${resultado.cae || 'N/A'}`);
      console.log(`   Factura ID: ${resultado.facturaId || 'N/A'}`);
      
      if (resultado.error) {
        console.log(`   Error: ${JSON.stringify(resultado.error, null, 2)}`);
      }
      
      // Verificar en BD
      const facturaVerificacion = await prisma.facturaElectronica.findFirst({
        where: { ventaId: venta.id }
      });
      
      if (facturaVerificacion) {
        console.log(`\n🔍 VERIFICACIÓN EN BD:`);
        console.log(`   Estado: ${facturaVerificacion.estado}`);
        console.log(`   CAE: ${facturaVerificacion.cae || 'N/A'}`);
        console.log(`   Número: ${facturaVerificacion.numeroFactura || 'N/A'}`);
        console.log(`   Error: ${facturaVerificacion.error || 'N/A'}`);
        
        if (facturaVerificacion.logs) {
          console.log(`\n📝 LOGS (últimas 5 líneas):`);
          const logs = facturaVerificacion.logs.split('\n').slice(-5);
          logs.forEach(log => console.log(`   ${log}`));
        }
      }
      
    } catch (facturaError) {
      console.log(`❌ Error generando factura: ${facturaError.message}`);
      console.log(`Stack: ${facturaError.stack}`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacturaIndividual();