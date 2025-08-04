// src/app/api/admin/punto-equilibrio/configuracion/[sucursalId]/route.ts - VERSIÓN CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sucursalId: string }> } // 🔧 CORREGIDO: Promise
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const resolvedParams = await params; // 🔧 CORREGIDO: Await params
    const { searchParams } = new URL(req.url);
    const año = parseInt(searchParams.get('año') || new Date().getFullYear().toString());
    
    console.log(`[PUNTO-EQUILIBRIO-API] Obteniendo configuraciones para sucursal: ${resolvedParams.sucursalId}, año: ${año}`);
    
    // Obtener configuraciones de los últimos 12 meses
    const configuraciones = await prisma.puntoEquilibrioConfig.findMany({
      where: {
        sucursalId: resolvedParams.sucursalId,
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
    
    console.log(`[PUNTO-EQUILIBRIO-API] Encontradas ${configuraciones.length} configuraciones`);
    return NextResponse.json(configuraciones);
  } catch (error) {
    console.error('[PUNTO-EQUILIBRIO-API] Error al obtener configuraciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sucursalId: string }> } // 🔧 CORREGIDO: Promise
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params; // 🔧 CORREGIDO: Await params
    const user = (req as any).user;
    const body = await req.json();
    
    const { costosFijos, costosVariables, metaMensual, mes, año } = body;
    
    console.log(`[PUNTO-EQUILIBRIO-API] Guardando configuración:`, {
      sucursalId: resolvedParams.sucursalId,
      costosFijos,
      costosVariables,
      metaMensual,
      mes,
      año,
      usuario: user.id
    });
    
    // 🔧 VALIDACIONES MEJORADAS
    if (!costosFijos || costosFijos < 0) {
      return NextResponse.json(
        { error: 'Los costos fijos deben ser mayor a 0' },
        { status: 400 }
      );
    }
    
    if (costosVariables === undefined || costosVariables < 0 || costosVariables > 100) {
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

    if (!mes || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: 'Mes inválido' },
        { status: 400 }
      );
    }

    if (!año || año < 2020 || año > 2030) {
      return NextResponse.json(
        { error: 'Año inválido' },
        { status: 400 }
      );
    }
    
    // 🔧 VERIFICAR QUE LA SUCURSAL EXISTE
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: resolvedParams.sucursalId }
    });
    
    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }
    
    // Upsert configuración
    const config = await prisma.puntoEquilibrioConfig.upsert({
      where: {
        sucursalId_mes_año: {
          sucursalId: resolvedParams.sucursalId,
          mes: parseInt(mes.toString()),
          año: parseInt(año.toString())
        }
      },
      update: {
        costosFijos: parseFloat(costosFijos.toString()),
        costosVariables: parseFloat(costosVariables.toString()),
        metaMensual: parseFloat(metaMensual.toString()),
        updatedAt: new Date()
      },
      create: {
        sucursalId: resolvedParams.sucursalId,
        costosFijos: parseFloat(costosFijos.toString()),
        costosVariables: parseFloat(costosVariables.toString()),
        metaMensual: parseFloat(metaMensual.toString()),
        mes: parseInt(mes.toString()),
        año: parseInt(año.toString()),
        creadoPor: user.id
      },
      include: {
        usuario: {
          select: {
            name: true
          }
        },
        sucursal: {
          select: {
            nombre: true
          }
        }
      }
    });
    
    console.log(`[PUNTO-EQUILIBRIO-API] ✅ Configuración guardada exitosamente:`, {
      id: config.id,
      sucursal: config.sucursal?.nombre,
      mes: config.mes,
      año: config.año
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('[PUNTO-EQUILIBRIO-API] Error al guardar configuración:', error);
    return NextResponse.json(
      { 
        error: 'Error al guardar configuración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sucursalId: string }> } // 🔧 CORREGIDO: Promise
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params; // 🔧 CORREGIDO: Await params
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get('mes');
    const año = searchParams.get('año');
    
    if (!mes || !año) {
      return NextResponse.json(
        { error: 'Se requieren parámetros mes y año' },
        { status: 400 }
      );
    }
    
    console.log(`[PUNTO-EQUILIBRIO-API] Eliminando configuración: sucursal=${resolvedParams.sucursalId}, mes=${mes}, año=${año}`);
    
    const config = await prisma.puntoEquilibrioConfig.findUnique({
      where: {
        sucursalId_mes_año: {
          sucursalId: resolvedParams.sucursalId,
          mes: parseInt(mes),
          año: parseInt(año)
        }
      }
    });
    
    if (!config) {
      return NextResponse.json(
        { error: 'Configuración no encontrada' },
        { status: 404 }
      );
    }
    
    await prisma.puntoEquilibrioConfig.delete({
      where: { id: config.id }
    });
    
    console.log(`[PUNTO-EQUILIBRIO-API] ✅ Configuración eliminada exitosamente`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuración eliminada correctamente' 
    });
  } catch (error) {
    console.error('[PUNTO-EQUILIBRIO-API] Error al eliminar configuración:', error);
    return NextResponse.json(
      { error: 'Error al eliminar configuración' },
      { status: 500 }
    );
  }
}