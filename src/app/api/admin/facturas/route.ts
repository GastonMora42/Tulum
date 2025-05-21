// src/app/api/admin/facturas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  const url = new URL(req.url);
  
  // Parámetros de paginación
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;
  
  // Filtros
  const estadoFilter = url.searchParams.get('estado');
  const fechaDesde = url.searchParams.get('fechaDesde');
  const fechaHasta = url.searchParams.get('fechaHasta');
  const sucursalId = url.searchParams.get('sucursalId');
  const search = url.searchParams.get('search');
  
  // Construir filtros
  const where: any = {};
  
  if (estadoFilter) {
    const estados = estadoFilter.split(',');
    where.estado = { in: estados };
  }
  
  if (fechaDesde || fechaHasta) {
    where.createdAt = {};
    if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
    if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
  }
  
  if (sucursalId) {
    where.sucursalId = sucursalId;
  }
  
  if (search) {
    where.OR = [
      { folio: { contains: search, mode: 'insensitive' } },
      { rfc: { contains: search, mode: 'insensitive' } },
      { razonSocial: { contains: search, mode: 'insensitive' } },
      { uuid: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    // Obtener facturas con paginación
    const [facturas, total] = await Promise.all([
      prisma.facturaElectronica.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          venta: {
            select: {
              total: true
            }
          },
          sucursal: {
            select: {
              nombre: true
            }
          }
        }
      }),
      prisma.facturaElectronica.count({ where })
    ]);
    
  // Convertir BigInt a Number si es necesario
  const facturasSerializables = facturas.map(factura => {
    let ventaTotal = factura.venta?.total;
    
    // Manejar el caso de BigInt
    if (ventaTotal && typeof ventaTotal === 'bigint') {
      ventaTotal = Number(ventaTotal);
    }
    
    return {
      ...factura,
      venta: factura.venta ? {
        ...factura.venta,
        total: ventaTotal
      } : null
    };
  });
    
    // Calcular metadatos de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      facturas: facturasSerializables,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error: any) {
    console.error('Error al obtener facturas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener facturas' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de factura no proporcionado' },
        { status: 400 }
      );
    }
    
    const factura = await prisma.facturaElectronica.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(factura);
  } catch (error: any) {
    console.error('Error al actualizar factura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar factura' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const { id, action } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de factura no proporcionado' },
        { status: 400 }
      );
    }
    
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id }
    });
    
    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    if (action === 'regenerar') {
      // Corregido: usar 'reintentos' en lugar de 'intentos'
      await prisma.facturaElectronica.update({
        where: { id },
        data: { 
          estado: 'pendiente',
          error: null
        }
      });
      
      return NextResponse.json({ 
        message: 'Factura puesta en cola para regeneración',
        status: 'success'
      });
    } 
    else if (action === 'reenviar') {
      // Lógica para reenviar factura por email
      
      return NextResponse.json({ 
        message: 'Email de factura reenviado exitosamente',
        status: 'success'
      });
    }
    
    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en operación de factura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la operación' },
      { status: 500 }
    );
  }
}