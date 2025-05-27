// src/app/api/admin/punto-equilibrio/configuracion/[sucursalId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: { sucursalId: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const año = parseInt(searchParams.get('año') || new Date().getFullYear().toString());
    
    // Obtener configuraciones de los últimos 12 meses
    const configuraciones = await prisma.puntoEquilibrioConfig.findMany({
      where: {
        sucursalId: params.sucursalId,
        año: { in: [año - 1, año] }
      },
      include: {
        usuario: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { año: 'desc' },
        { mes: 'desc' }
      ]
    });
    
    return NextResponse.json(configuraciones);
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { sucursalId: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const user = (req as any).user;
    const body = await req.json();
    
    const { costosFijos, costosVariables, metaMensual, mes, año } = body;
    
    // Validaciones
    if (!costosFijos || costosFijos < 0) {
      return NextResponse.json(
        { error: 'Los costos fijos deben ser mayor a 0' },
        { status: 400 }
      );
    }
    
    if (!costosVariables || costosVariables < 0 || costosVariables > 100) {
      return NextResponse.json(
        { error: 'Los costos variables deben estar entre 0 y 100%' },
        { status: 400 }
      );
    }
    
    if (!metaMensual || metaMensual < 0) {
      return NextResponse.json(
        { error: 'La meta mensual debe ser mayor a 0' },
        { status: 400 }
      );
    }
    
    // Upsert configuración
    const config = await prisma.puntoEquilibrioConfig.upsert({
      where: {
        sucursalId_mes_año: {
          sucursalId: params.sucursalId,
          mes: parseInt(mes),
          año: parseInt(año)
        }
      },
      update: {
        costosFijos,
        costosVariables,
        metaMensual,
        updatedAt: new Date()
      },
      create: {
        sucursalId: params.sucursalId,
        costosFijos,
        costosVariables,
        metaMensual,
        mes: parseInt(mes),
        año: parseInt(año),
        creadoPor: user.id
      },
      include: {
        usuario: {
          select: {
            name: true
          }
        }
      }
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}