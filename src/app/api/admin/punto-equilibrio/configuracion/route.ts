// src/app/api/admin/punto-equilibrio/configuracion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const user = (req as any).user;
    const body = await req.json();
    
    const { sucursalId, costosFijos, costosVariables, metaMensual, mes, año } = body;
    
    // Upsert configuración
    const config = await prisma.puntoEquilibrioConfig.upsert({
      where: {
        sucursalId_mes_año: {
          sucursalId,
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
        sucursalId,
        costosFijos,
        costosVariables,
        metaMensual,
        mes: parseInt(mes),
        año: parseInt(año),
        creadoPor: user.id
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