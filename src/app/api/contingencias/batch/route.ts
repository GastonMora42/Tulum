// src/app/api/contingencias/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { contingenciaService } from '@/server/services/contingencia/contingenciaService';
import { z } from 'zod';

const batchActionSchema = z.object({
  action: z.enum(['marcar_revision', 'marcar_urgente', 'asignar_responsable', 'archivar']),
  contingenciaIds: z.array(z.string()).min(1),
  data: z.object({
    responsableId: z.string().optional(),
    observaciones: z.string().optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const user = (req as any).user;
    const body = await req.json();
    
    const validation = batchActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { action, contingenciaIds, data } = validation.data;
    const results = [];

    for (const contingenciaId of contingenciaIds) {
      try {
        let result;
        
        switch (action) {
          case 'marcar_revision':
            result = await contingenciaService.enRevisionContingencia(contingenciaId, user.id);
            break;
            
          case 'marcar_urgente':
            result = await contingenciaService.marcarUrgente(contingenciaId, true);
            break;
            
          case 'asignar_responsable':
            if (!data?.responsableId) {
              throw new Error('Responsable requerido');
            }
            result = await contingenciaService.asignarResponsable(contingenciaId, data.responsableId);
            break;
            
          case 'archivar':
            result = await contingenciaService.archivarContingencia(contingenciaId, user.id);
            break;
            
          default:
            throw new Error('Acción no válida');
        }
        
        results.push({ id: contingenciaId, success: true, result });
      } catch (error) {
        results.push({ 
          id: contingenciaId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: contingenciaIds.length,
      results
    });
  } catch (error) {
    console.error('Error en acción en lote:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción en lote' },
      { status: 500 }
    );
  }
}