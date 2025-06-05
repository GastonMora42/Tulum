// src/app/api/admin/impresoras/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission(['admin', 'venta:ver'])(req);
  if (permissionError) return permissionError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    const user = (req as any).user;
    
    // Construir filtro
    const where: any = { activa: true };
    
    if (sucursalId) {
      where.sucursalId = sucursalId;
    } else if (user.sucursalId && user.roleId !== 'role-admin') {
      where.sucursalId = user.sucursalId;
    }

    const impresoras = await prisma.configuracionImpresora.findMany({
      where,
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { esPorDefecto: 'desc' },
        { nombre: 'asc' }
      ]
    });

    // Transformar a formato esperado por el frontend
    const formattedPrinters = impresoras.map((imp: { id: any; nombre: any; tipo: any; sucursalId: any; esPorDefecto: any; configuracion: any; sucursal: { nombre: any; }; }) => ({
      id: imp.id,
      name: imp.nombre,
      type: imp.tipo,
      sucursalId: imp.sucursalId,
      isDefault: imp.esPorDefecto,
      settings: imp.configuracion,
      sucursal: imp.sucursal.nombre
    }));

    return NextResponse.json(formattedPrinters);
  } catch (error) {
    console.error('Error obteniendo impresoras:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de impresoras' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission(['admin', 'venta:crear'])(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const { name, type, sucursalId, isDefault, settings } = body;

    if (!name || !type || !sucursalId) {
      return NextResponse.json(
        { error: 'Nombre, tipo y sucursal son requeridos' },
        { status: 400 }
      );
    }

    const user = (req as any).user;
    
    // Verificar acceso a la sucursal
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para configurar impresoras en esta sucursal' },
        { status: 403 }
      );
    }

    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // Si es por defecto, quitar el flag de otras impresoras de la misma sucursal
    if (isDefault) {
      await prisma.configuracionImpresora.updateMany({
        where: { sucursalId },
        data: { esPorDefecto: false }
      });
    }

    // Crear nueva impresora
    const nuevaImpresora = await prisma.configuracionImpresora.create({
      data: {
        nombre: name,
        tipo: type,
        sucursalId,
        esPorDefecto: isDefault,
        configuracion: settings || {},
        activa: true
      },
      include: {
        sucursal: {
          select: {
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      id: nuevaImpresora.id,
      name: nuevaImpresora.nombre,
      type: nuevaImpresora.tipo,
      sucursalId: nuevaImpresora.sucursalId,
      isDefault: nuevaImpresora.esPorDefecto,
      settings: nuevaImpresora.configuracion,
      sucursal: nuevaImpresora.sucursal.nombre
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando impresora:', error);
    return NextResponse.json(
      { error: 'Error al crear configuración de impresora' },
      { status: 500 }
    );
  }
}
