// src/app/api/contingencias/[id]/route.ts

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
  context: { params: { id: string } }  // Cambiar aquí para usar context
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    // Usar context.params en lugar de params directamente
    const id = context.params.id;
    
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
  context: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const id = context.params.id;
    const user = (req as any).user;
    const body = await req.json();
    const { accion } = body;
    
    let resultado;
    
    switch (accion) {
      case 'resolver':
        // Validar datos para resolver
        const validacionResolver = resolverContingenciaSchema.safeParse(body);
        if (!validacionResolver.success) {
          return NextResponse.json(
            { error: 'Datos inválidos', details: validacionResolver.error.errors },
            { status: 400 }
          );
        }
        
        resultado = await contingenciaService.resolverContingencia(
          id,
          {
            respuesta: body.respuesta,
            resueltoPor: user.id,
            ajusteRealizado: body.ajusteRealizado,
            eliminarArchivos: body.mantenerArchivos !== true // Por defecto elimina archivos
          }
        );
        break;
        
      case 'rechazar':
        // Validar datos para rechazar
        const validacionRechazar = rechazarContingenciaSchema.safeParse(body);
        if (!validacionRechazar.success) {
          return NextResponse.json(
            { error: 'Datos inválidos', details: validacionRechazar.error.errors },
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
        break;
        
      case 'eliminar_archivo':
        resultado = await contingenciaService.eliminarArchivoMultimedia(id);
        break;
        
      case 'en_revision':
        resultado = await contingenciaService.enRevisionContingencia(
          id,
          user.id
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error al actualizar contingencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar contingencia' },
      { status: 500 }
    );
  }
}