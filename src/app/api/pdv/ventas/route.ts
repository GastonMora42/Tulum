// src/app/api/pdv/ventas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { ventaService } from '@/server/services/venta/ventaService';
import { v4 as uuidv4 } from 'uuid';

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
    const medioPago = searchParams.get('medioPago');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (sucursalId && user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para ver ventas de esta sucursal' },
        { status: 403 }
      );
    }
    
    // Construir objeto de filtros
    const where: any = {};
    
    // Si no es admin y no especifica sucursal, mostrar solo su sucursal
    if (!sucursalId && user.sucursalId && user.roleId !== 'role-admin') {
      where.sucursalId = user.sucursalId;
    } else if (sucursalId) {
      where.sucursalId = sucursalId;
    }
    
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    if (facturada !== undefined) {
      where.facturada = facturada;
    }
    
    if (desde || hasta) {
      where.fecha = {};
      
      if (desde) {
        where.fecha.gte = desde;
      }
      
      if (hasta) {
        // Incluir todo el día
        const hastaFinal = new Date(hasta);
        hastaFinal.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaFinal;
      }
    }
    
    // Filtro por medio de pago
    if (medioPago) {
      where.pagos = {
        some: { medioPago }
      };
    }
    
    // Contar total para paginación
    const total = await prisma.venta.count({ where });
    
    // Obtener ventas
    const ventas = await prisma.venta.findMany({
      where,
      include: {
        items: {
          include: {
            producto: true
          }
        },
        pagos: true,
        sucursal: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        facturaElectronica: {
          select: {
            id: true,
            tipoComprobante: true,
            numeroFactura: true,
            cae: true,
            estado: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });
    
    // Calcular estadísticas
    const totalVentas = await prisma.venta.aggregate({
      where,
      _sum: {
        total: true
      }
    });
    
    const ventasFacturadas = await prisma.venta.aggregate({
      where: {
        ...where,
        facturada: true
      },
      _sum: {
        total: true
      },
      _count: true
    });
    
    const pagosPorMedio = await prisma.pago.groupBy({
      by: ['medioPago'],
      where: {
        venta: { ...where }
      },
      _sum: {
        monto: true
      },
      _count: true
    });
    
    return NextResponse.json({
      data: ventas,
      stats: {
        total: totalVentas._sum.total || 0,
        cantidadVentas: total,
        totalFacturado: ventasFacturadas._sum.total || 0,
        cantidadFacturadas: ventasFacturadas._count || 0,
        pagosPorMedio: pagosPorMedio.map(p => ({
          medioPago: p.medioPago,
          total: p._sum.monto || 0,
          cantidad: p._count
        }))
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Si no se proporcionó sucursalId, usar la del usuario
    let sucursalId = body.sucursalId;
    if (!sucursalId) {
      if (!user.sucursalId) {
        return NextResponse.json(
          { error: 'No se ha proporcionado sucursalId y el usuario no tiene sucursal asignada' },
          { status: 400 }
        );
      }
      sucursalId = user.sucursalId;
    }
    
    // Verificar acceso a la sucursal
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para crear ventas en esta sucursal' },
        { status: 403 }
      );
    }
    
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
    
    // Asegurarse que el total de pagos coincide con el total de la venta
    const totalPagos = body.pagos.reduce((sum: number, pago: any) => sum + pago.monto, 0);
    
    if (Math.abs(totalPagos - body.total) > 0.01) { // Permitir pequeña diferencia por redondeo
      return NextResponse.json(
        { error: `El total de pagos (${totalPagos}) no coincide con el total de la venta (${body.total})` },
        { status: 400 }
      );
    }
    
    // Validar stock disponible para todos los items
    for (const item of body.items) {
      const stock = await prisma.stock.findFirst({
        where: {
          productoId: item.productoId,
          ubicacionId: sucursalId
        }
      });
      
      if (!stock || stock.cantidad < item.cantidad) {
        return NextResponse.json({
          error: `Stock insuficiente para el producto ${item.productoId}`,
          producto: item.productoId,
          stockDisponible: stock?.cantidad || 0,
          stockRequerido: item.cantidad
        }, { status: 400 });
      }
    }
    
    // Crear venta usando el servicio
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
    

if (body.facturar && venta) {
  try {
    console.log(`[VENTA] Iniciando facturación directa para venta ${venta.id}`);
    
    // Verificar datos para factura A
    if (body.facturar === 'A' && (!body.clienteCuit || !body.clienteNombre)) {
      throw new Error('Para facturas tipo A se requiere CUIT y nombre del cliente');
    }
    
    // Obtener servicio de facturación
    const { getFacturacionService } = await import('@/server/services/facturacion/factoryService');
    const facturacionService = await getFacturacionService(sucursalId);
    
    // Procesar factura DIRECTAMENTE
    console.log(`[VENTA] Llamando a generarFactura...`);
    const resultadoFacturacion = await facturacionService.generarFactura(venta.id);
    
    console.log(`[VENTA] Resultado facturación:`, {
      success: resultadoFacturacion.success,
      cae: resultadoFacturacion.cae,
      message: resultadoFacturacion.message
    });
    
    if (resultadoFacturacion.success && resultadoFacturacion.cae) {
      // Marcar venta como facturada
      await prisma.venta.update({
        where: { id: venta.id },
        data: { facturada: true }
      });
      
      return NextResponse.json({
        ...venta,
        facturaId: resultadoFacturacion.facturaId,
        cae: resultadoFacturacion.cae,
        message: 'Venta creada y facturada exitosamente'
      }, { status: 201 });
    } else {
      // Si falla la facturación, aún devolver la venta pero con error
      return NextResponse.json({
        ...venta,
        facturaError: resultadoFacturacion.message,
        message: 'Venta creada pero falló la facturación'
      }, { status: 201 });
    }
    
  } catch (errorFactura) {
    console.error('[VENTA] Error al generar factura:', errorFactura);
    
    // Registrar contingencia
    await prisma.contingencia.create({
      data: {
        titulo: `Error facturación venta ${venta.id}`,
        descripcion: errorFactura instanceof Error ? errorFactura.message : 'Error desconocido',
        origen: 'pdv',
        creadoPor: user.id,
        estado: 'pendiente',
        tipo: 'facturacion'
      }
    });
    
    return NextResponse.json({
      ...venta,
      facturaError: errorFactura instanceof Error ? errorFactura.message : 'Error desconocido',
      message: 'Venta creada pero hubo error en facturación'
    }, { status: 201 });
  }
}
    
    // Si no se solicita facturación, retornar la venta normalmente
    return NextResponse.json(venta, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear venta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear venta' },
      { status: 500 }
    );
  }
}