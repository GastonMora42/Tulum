// src/app/api/contingencias/[id]/route.ts - VERSIÓN CORREGIDA

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { contingenciaService } from '@/server/services/contingencia/contingenciaService';
import { z } from 'zod';

const resolverContingenciaSchema = z.object({
  respuesta: z.string().min(10, { message: 'La respuesta debe tener al menos 10 caracteres' }),
  ajusteRealizado: z.boolean()
});

const rechazarContingenciaSchema = z.object({
  respuesta: z.string().min(10, { message: 'La respuesta debe tener al menos 10 caracteres' })
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }  // ✅ Corregido: Promise
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    // ✅ Corregido: Await params
    const { id } = await context.params;
    
    const contingencia = await contingenciaService.obtenerContingencia(id);
    
    if (!contingencia) {
      return NextResponse.json(
        { error: 'Contingencia no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(contingencia);
  } catch (error) {
    console.error('Error al obtener contingencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener contingencia' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }  // ✅ Corregido: Promise
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    // ✅ Corregido: Await params
    const { id } = await context.params;
    const user = (req as any).user;
    const body = await req.json();
    const { accion } = body;
    
    console.log(`[CONTINGENCIA-API] Procesando acción "${accion}" para contingencia ${id}`);
    console.log(`[CONTINGENCIA-API] Usuario: ${user.email} (${user.roleId})`);
    console.log(`[CONTINGENCIA-API] Datos recibidos:`, {
      accion,
      tieneRespuesta: !!body.respuesta,
      longitudRespuesta: body.respuesta?.length || 0,
      ajusteRealizado: body.ajusteRealizado,
      mantenerArchivos: body.mantenerArchivos
    });
    
    let resultado;
    
    switch (accion) {
      case 'resolver':
        // Validar datos para resolver
        const validacionResolver = resolverContingenciaSchema.safeParse(body);
        if (!validacionResolver.success) {
          console.error('[CONTINGENCIA-API] Error de validación al resolver:', validacionResolver.error.errors);
          return NextResponse.json(
            { 
              error: 'Datos inválidos para resolver contingencia', 
              details: validacionResolver.error.errors 
            },
            { status: 400 }
          );
        }
        
        resultado = await contingenciaService.resolverContingencia(
          id,
          {
            respuesta: body.respuesta,
            resueltoPor: user.id,
            ajusteRealizado: body.ajusteRealizado || false,
            eliminarArchivos: body.mantenerArchivos !== true // Por defecto elimina archivos
          }
        );
        console.log(`[CONTINGENCIA-API] Contingencia ${id} resuelta exitosamente`);
        break;
        
      case 'rechazar':
        // Validar datos para rechazar
        const validacionRechazar = rechazarContingenciaSchema.safeParse(body);
        if (!validacionRechazar.success) {
          console.error('[CONTINGENCIA-API] Error de validación al rechazar:', validacionRechazar.error.errors);
          return NextResponse.json(
            { 
              error: 'Datos inválidos para rechazar contingencia', 
              details: validacionRechazar.error.errors 
            },
            { status: 400 }
          );
        }
        
        resultado = await contingenciaService.rechazarContingencia(
          id,
          {
            respuesta: body.respuesta,
            resueltoPor: user.id,
            eliminarArchivos: body.mantenerArchivos !== true
          }
        );
        console.log(`[CONTINGENCIA-API] Contingencia ${id} rechazada exitosamente`);
        break;
        
      case 'eliminar_archivo':
        resultado = await contingenciaService.eliminarArchivoMultimedia(id);
        console.log(`[CONTINGENCIA-API] Archivo eliminado de contingencia ${id}`);
        break;
        
      case 'en_revision':
        resultado = await contingenciaService.enRevisionContingencia(
          id,
          user.id
        );
        console.log(`[CONTINGENCIA-API] Contingencia ${id} marcada en revisión`);
        break;
        
      default:
        console.error(`[CONTINGENCIA-API] Acción no válida: ${accion}`);
        return NextResponse.json(
          { error: `Acción no válida: ${accion}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('[CONTINGENCIA-API] Error al actualizar contingencia:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error al actualizar contingencia',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}