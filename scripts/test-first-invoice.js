const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestInvoice() {
  console.log('🧾 CREANDO FACTURA DE PRUEBA\n');
  
  try {
    // Buscar primera sucursal activa
    const config = await prisma.configuracionAFIP.findFirst({
      where: { activo: true },
      include: { sucursal: true }
    });
    
    if (!config) {
      console.log('❌ No hay configuración AFIP activa');
      return;
    }
    
    console.log(`🏪 Usando sucursal: ${config.sucursal.nombre}`);
    console.log(`📊 CUIT: ${config.cuit}, Punto de Venta: ${config.puntoVenta}`);
    
    // Buscar primer producto
    const producto = await prisma.producto.findFirst();
    if (!producto) {
      console.log('❌ No hay productos en el sistema');
      return;
    }
    
    // Buscar primer usuario
    const usuario = await prisma.user.findFirst();
    if (!usuario) {
      console.log('❌ No hay usuarios en el sistema');
      return;
    }
    
    console.log('📦 Creando venta de prueba...');
    
    // Crear venta de prueba
    const venta = await prisma.venta.create({
      data: {
        sucursalId: config.sucursalId,
        usuarioId: usuario.id,
        total: 1000, // $1000 para prueba
        descuento: 0,
        facturada: false,
        clienteNombre: 'CLIENTE DE PRUEBA',
        clienteCuit: null, // Factura B
        items: {
          create: [{
            productoId: producto.id,
            cantidad: 1,
            precioUnitario: 1000,
            descuento: 0
          }]
        },
        pagos: {
          create: [{
            medioPago: 'efectivo',
            monto: 1000
          }]
        }
      }
    });
    
    console.log(`✅ Venta creada: ${venta.id}`);
    console.log('\n🔧 AHORA GENERAR FACTURA:');
    console.log('1. Ir al panel de administración');
    console.log('2. Acceder a PDV/Ventas');
    console.log(`3. Buscar venta ID: ${venta.id}`);
    console.log('4. Hacer clic en "Facturar"');
    console.log('5. Verificar que se genere CAE correctamente');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInvoice();
