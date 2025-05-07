// src/app/api/admin/configuracion/afip/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  // Autenticar y autorizar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = params;
    const body = await req.json();
    
    // Validar datos
    const { sucursalId, cuit, puntoVenta } = body;
    
    if (!sucursalId || !cuit || !puntoVenta) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }
    
    // Validar CUIT
    if (!/^\d{11}$/.test(cuit)) {
      return NextResponse.json(
        { error: 'El CUIT debe tener 11 dígitos' },
        { status: 400 }
      );
    }
    
    // Verificar que existe la configuración
    const existingConfig = await prisma.configuracionAFIP.findUnique({
      where: { id }
    });
    
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' },
        { status: 404 }
      );
    }
    
    // Si cambia la sucursal, verificar que no exista otra config para esa sucursal
    if (sucursalId !== existingConfig.sucursalId) {
      const otherConfig = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId,
          id: { not: id }
        }
      });
      
      if (otherConfig) {
        return NextResponse.json(
          { error: 'Ya existe una configuración para esta sucursal' },
          { status: 400 }
        );
      }
    }
    
    // Actualizar configuración
    const config = await prisma.configuracionAFIP.update({
      where: { id },
      data: {
        sucursalId,
        cuit,
        puntoVenta
      },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración AFIP:', error);
    
    // Manejar error de unicidad
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe una configuración para esta sucursal' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar configuración AFIP' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // Autenticar y autorizar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = params;
    
    // Verificar que existe la configuración
    const existingConfig = await prisma.configuracionAFIP.findUnique({
      where: { id }
    });
    
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si tiene facturas asociadas
    const facturasCount = await prisma.facturaElectronica.count({
      where: { sucursalId: existingConfig.sucursalId }
    });
    
    if (facturasCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar la configuración porque tiene ${facturasCount} facturas asociadas` },
        { status: 400 }
      );
    }
    
    // Eliminar configuración
    await prisma.configuracionAFIP.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar configuración AFIP:', error);
    return NextResponse.json(
      { error: 'Error al eliminar configuración AFIP' },
      { status: 500 }
    );
  }
}