// src/app/api/pdv/ventas/route.ts (continuación)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { ventaService } from '@/server/services/venta/ventaService';

// GET - Obtener ventas con filtros
export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['venta:ver', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Filtros opcionales
    const sucursalId = searchParams.get('sucursalId');
    const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
    const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
    const usuarioId = searchParams.get('usuarioId');
    const facturada = searchParams.get('facturada') === 'true' ? true : 
                     searchParams.get('facturada') === 'false' ? false : undefined;
    
    // Construir objeto de filtros
    const filtros: any = {};
    
    if (sucursalId) filtros.sucursalId = sucursalId;
    if (desde) filtros.desde = desde;
    if (hasta) filtros.hasta = hasta;
    if (usuarioId) filtros.usuarioId = usuarioId;
    if (facturada !== undefined) filtros.facturada = facturada;
    
    // Obtener ventas usando el servicio
    const ventas = await ventaService.getVentas(filtros);
    
    return NextResponse.json(ventas);
  } catch (error: any) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva venta
export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar que haya ítems
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe contener al menos un ítem' },
        { status: 400 }
      );
    }
    
    // Validar que haya pagos
    if (!body.pagos || !Array.isArray(body.pagos) || body.pagos.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe contener al menos un método de pago' },
        { status: 400 }
      );
    }
    
    // Verificar que hay una caja abierta
    const sucursalId = body.sucursalId;
    const cajaAbierta = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        estado: 'abierto'
      }
    });
    
    if (!cajaAbierta) {
      return NextResponse.json(
        { error: 'No hay una caja abierta para esta sucursal. Debe abrir una caja antes de realizar ventas.' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Asegurarse que el total de pagos coincide con el total de la venta
    const totalPagos = body.pagos.reduce((sum: number, pago: any) => sum + pago.monto, 0);
    
    if (Math.abs(totalPagos - body.total) > 0.01) { // Permitir pequeña diferencia por redondeo
      return NextResponse.json(
        { error: `El total de pagos (${totalPagos}) no coincide con el total de la venta (${body.total})` },
        { status: 400 }
      );
    }
    
const venta = await ventaService.crearVenta({
    sucursalId,
    usuarioId: user.id,
    items: body.items,
    total: body.total,
    descuento: body.descuento || 0,
    codigoDescuento: body.codigoDescuento,
    facturar: body.facturar || false,
    clienteNombre: body.clienteNombre,
    clienteCuit: body.clienteCuit,
    pagos: body.pagos
  });
  
  // Verificar que venta no sea nulo antes de acceder a sus propiedades
  if (!venta) {
    return NextResponse.json(
      { error: 'Error al crear la venta' },
      { status: 500 }
    );
  }
  
  // Ahora podemos acceder a venta.id con seguridad
  console.log(`Integrando con ARCA para facturación de venta ${venta.id}`);
    
    // Si se requiere facturación, integrar con ARCA (sistema externo)
    if (body.facturar && body.clienteCuit) {
      try {
        // Código para integración con ARCA
        // Este es un placeholder para la integración real
        console.log(`Integrando con ARCA para facturación de venta ${venta.id}`);
        
        // Placeholder para respuesta de ARCA
        const arcaResponse = {
          success: true,
          numeroFactura: `A-0001-${Math.floor(Math.random() * 10000).toString().padStart(8, '0')}`,
          fechaFactura: new Date().toISOString()
        };
        
        // Actualizar la venta con número de factura
        if (arcaResponse.success) {
          await prisma.venta.update({
            where: { id: venta.id },
            data: {
              numeroFactura: arcaResponse.numeroFactura
            }
          });
        }
      } catch (facturacionError) {
        console.error('Error en facturación con ARCA:', facturacionError);
        // No fallamos la venta por error de facturación, pero lo registramos
        await prisma.contingencia.create({
          data: {
            titulo: `Error de facturación en venta ${venta.id}`,
            descripcion: `No se pudo generar la factura: ${facturacionError instanceof Error ? facturacionError.message : 'Error desconocido'}`,
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente'
          }
        });
      }
    }
    
    return NextResponse.json(venta, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear venta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear venta' },
      { status: 500 }
    );
  }
}