// src/app/api/pdv/facturas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { format } from 'date-fns';

// GET - Listar facturas
export async function GET(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['venta:ver', 'admin'])(req);
  if (permissionError) return permissionError;

  try {
    const { searchParams } = new URL(req.url);
    const ventaId = searchParams.get('ventaId');
    const sucursalId = searchParams.get('sucursalId');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const estado = searchParams.get('estado');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (sucursalId && user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para ver facturas de esta sucursal' },
        { status: 403 }
      );
    }
    
    // Construir filtro
    const where: any = {};
    if (ventaId) where.ventaId = ventaId;
    if (sucursalId) where.sucursalId = sucursalId;
    if (estado) where.estado = estado;
    
    // Filtro de fechas
    if (desde || hasta) {
      where.fechaEmision = {};
      if (desde) where.fechaEmision.gte = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.fechaEmision.lte = hastaDate;
      }
    }
    
    // Si no es admin, limitar a su sucursal
    if (!sucursalId && user.sucursalId && user.roleId !== 'role-admin') {
      where.sucursalId = user.sucursalId;
    }
    
    // Contar total para paginación
    const total = await prisma.facturaElectronica.count({ where });
    
    // Buscar facturas
    const facturas = await prisma.facturaElectronica.findMany({
      where,
      include: {
        venta: {
          include: {
            sucursal: true,
            usuario: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        sucursal: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });
    
    // Formatear respuesta
    const formattedFacturas = facturas.map(factura => ({
      id: factura.id,
      tipoComprobante: factura.tipoComprobante,
      puntoVenta: factura.puntoVenta,
      numeroFactura: factura.numeroFactura,
      fechaEmision: factura.fechaEmision,
      cae: factura.cae,
      vencimientoCae: factura.vencimientoCae,
      estado: factura.estado,
      venta: {
        id: factura.venta.id,
        total: factura.venta.total,
        fecha: factura.venta.fecha,
        clienteNombre: factura.venta.clienteNombre,
        clienteCuit: factura.venta.clienteCuit
      },
      sucursal: factura.sucursal.nombre,
      usuario: factura.venta.usuario?.name || 'Desconocido'
    }));
    
    return NextResponse.json({
      data: formattedFacturas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error al buscar facturas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar facturas' },
      { status: 500 }
    );
  }
}

// POST - Generar factura para una venta
export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['venta:facturar', 'admin'])(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const { ventaId } = body;

    if (!ventaId) {
      return NextResponse.json({ 
        error: 'El ID de venta es requerido' 
      }, { status: 400 });
    }

    // Verificar si la venta existe
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        sucursal: true,
        facturaElectronica: true,
        usuario: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!venta) {
      return NextResponse.json({ 
        error: 'Venta no encontrada' 
      }, { status: 404 });
    }
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== venta.sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json({
        error: 'No tiene permisos para facturar ventas de esta sucursal'
      }, { status: 403 });
    }

    // Verificar si ya tiene factura
    if (venta.facturaElectronica) {
      return NextResponse.json({ 
        message: 'La venta ya tiene una factura asociada',
        facturaId: venta.facturaElectronica.id,
        success: true,
        cae: venta.facturaElectronica.cae
      });
    }

    // Verificar que la venta tenga información de cliente para facturas A
    if (body.tipoComprobante === 'A' && (!venta.clienteCuit || !venta.clienteNombre)) {
      return NextResponse.json({ 
        error: 'Para facturas tipo A se requiere CUIT y nombre del cliente' 
      }, { status: 400 });
    }

    // Verificar si la sucursal tiene configuración AFIP
    const config = await prisma.configuracionAFIP.findFirst({
      where: { 
        sucursalId: venta.sucursalId,
        activo: true
      }
    });

    if (!config) {
      // Registrar contingencia y devolver error
      await prisma.contingencia.create({
        data: {
          titulo: `Error de facturación - Sin configuración AFIP`,
          descripcion: `La sucursal ${venta.sucursal.nombre} no tiene configuración AFIP activa.`,
          origen: 'pdv',
          creadoPor: user.id,
          estado: 'pendiente',
          tipo: 'facturacion'
        }
      });
      
      return NextResponse.json({ 
        error: 'La sucursal no tiene configuración AFIP activa',
        detalles: 'Se ha registrado una contingencia'
      }, { status: 400 });
    }

    // Obtener servicio de facturación
    const facturacionService = await getFacturacionService(venta.sucursalId);
    
    try {
      // Generar factura
      const resultado = await facturacionService.generarFactura(ventaId);
      
      if (!resultado.success) {
        throw new Error(resultado.message || 'Error al generar factura');
      }
      
      // Marcar venta como facturada
      await prisma.venta.update({
        where: { id: ventaId },
        data: { facturada: true }
      });
      
      // Registrar en log de actividad
      console.log(`[FACTURACION] Usuario ${user.name} generó factura para venta ${ventaId} - CAE: ${resultado.cae}`);
      
      return NextResponse.json({
        success: true,
        message: 'Factura generada correctamente',
        facturaId: resultado.facturaId,
        cae: resultado.cae
      });
    } catch (error: any) {
      console.error(`[FACTURACION] Error al generar factura para venta ${ventaId}:`, error);
      
      // Registrar contingencia automáticamente
      await prisma.contingencia.create({
        data: {
          titulo: `Error en facturación de venta ${ventaId}`,
          descripcion: `Error: ${error.message}\nUsuario: ${user.name}\nSucursal: ${venta.sucursal.nombre}`,
          origen: 'pdv',
          estado: 'pendiente',
          creadoPor: user.id,
          tipo: 'facturacion'
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Error en facturación',
          message: error.message || 'Error desconocido en facturación',
          detalles: 'Se ha registrado una contingencia'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error general en facturación:', error);
    return NextResponse.json(
      { error: error.message || 'Error en facturación' },
      { status: 500 }
    );
  }
}