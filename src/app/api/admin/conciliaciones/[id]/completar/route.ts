// src/app/api/admin/conciliaciones/[id]/completar/route.ts - VERSIÓN MEJORADA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('conciliacion:completar')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const { observaciones } = body;
    
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id: params.id },
      include: {
        contingencias: {
          where: {
            estado: { in: ['pendiente', 'en_revision'] },
            tipo: 'conciliacion' // 🔥 Solo contingencias de conciliación
          }
        }
      }
    });
    
    if (!conciliacion) {
      return NextResponse.json(
        { error: 'Conciliación no encontrada' },
        { status: 404 }
      );
    }
    
    if (conciliacion.estado === 'completada') {
      return NextResponse.json(
        { error: 'La conciliación ya está completada' },
        { status: 400 }
      );
    }
    
    if (conciliacion.contingencias.length > 0) {
      return NextResponse.json(
        { error: 'No se puede completar la conciliación con contingencias de conciliación pendientes' },
        { status: 400 }
      );
    }
    
    // 🆕 COMPLETAR CON DESBLOQUEO AUTOMÁTICO
    const result = await prisma.$transaction(async (tx) => {
      // 1. Completar la conciliación
      const conciliacionActualizada = await tx.conciliacion.update({
        where: { id: params.id },
        data: {
          estado: 'completada',
          observaciones: observaciones || conciliacion.observaciones
        },
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
      });
      
      // 2. 🔥 RESOLVER AUTOMÁTICAMENTE LAS CONTINGENCIAS DE CONCILIACIÓN ASOCIADAS
      const contingenciasRelacionadas = await tx.contingencia.findMany({
        where: {
          ubicacionId: conciliacion.sucursalId,
          tipo: 'conciliacion',
          estado: { in: ['pendiente', 'en_revision'] }
        }
      });
      
      if (contingenciasRelacionadas.length > 0) {
        await tx.contingencia.updateMany({
          where: {
            id: { in: contingenciasRelacionadas.map(c => c.id) },
            tipo: 'conciliacion'
          },
          data: {
            estado: 'resuelto',
            respuesta: `Contingencia resuelta automáticamente al completar la conciliación desde administración. ${observaciones ? `Observaciones: ${observaciones}` : ''}`,
            resueltoPor: (req as any).user.id,
            fechaRespuesta: new Date(),
            ajusteRealizado: true
          }
        });
        
        console.log(`[ADMIN] Se resolvieron ${contingenciasRelacionadas.length} contingencias de conciliación automáticamente`);
      }
      
      return {
        conciliacion: conciliacionActualizada,
        contingenciasResueltas: contingenciasRelacionadas.length
      };
    });
    
    return NextResponse.json({
      ...result.conciliacion,
      mensaje: result.contingenciasResueltas > 0 
        ? `Conciliación completada y ${result.contingenciasResueltas} contingencias de conciliación resueltas automáticamente.`
        : 'Conciliación completada exitosamente.'
    });
  } catch (error) {
    console.error('Error al completar conciliación:', error);
    return NextResponse.json(
      { error: 'Error al completar conciliación' },
      { status: 500 }
    );
  }
}