import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    console.log('[TEST-FACTURA] Iniciando test de factura completo');
    
    // 1. Crear una venta de prueba
    const sucursal = await prisma.ubicacion.findFirst({
      where: { tipo: 'sucursal' }
    });
    
    if (!sucursal) {
      throw new Error('No hay sucursales disponibles');
    }
    
    const producto = await prisma.producto.findFirst();
    if (!producto) {
      throw new Error('No hay productos disponibles');
    }
    
    const user = (req as any).user;
    
    // Crear venta de prueba
    const venta = await prisma.venta.create({
      data: {
        sucursalId: sucursal.id,
        fecha: new Date(),
        total: 1000, // $1000 de prueba
        descuento: 0,
        usuarioId: user.id,
        facturada: false,
        // Para factura B (consumidor final)
        clienteNombre: 'Consumidor Final',
        clienteCuit: null,
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
      },
      include: {
        items: { include: { producto: true } },
        sucursal: true
      }
    });
    
    console.log(`[TEST-FACTURA] Venta creada: ${venta.id}`);
    
    // 2. Intentar generar factura
    const facturacionService = await getFacturacionService(sucursal.id);
    const resultado = await facturacionService.generarFactura(venta.id);
    
    // 3. Verificar en BD
    const facturaGenerada = await prisma.facturaElectronica.findFirst({
      where: { ventaId: venta.id },
      include: {
        venta: true,
        sucursal: true
      }
    });
    
    return NextResponse.json({
      ventaId: venta.id,
      facturaId: facturaGenerada?.id,
      estado: facturaGenerada?.estado,
      cae: facturaGenerada?.cae,
      numeroFactura: facturaGenerada?.numeroFactura,
      error: facturaGenerada?.error,
      logs: facturaGenerada?.logs,
      resultado
    });
    
  } catch (error) {
    console.error('[TEST-FACTURA] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}