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
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const contingencia = await contingenciaService.obtenerContingencia(params.id);
    
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
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
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
          params.id,
          {
            respuesta: body.respuesta,
            resueltoPor: user.id,
            ajusteRealizado: body.ajusteRealizado
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
          params.id,
          {
            respuesta: body.respuesta,
            resueltoPor: user.id
          }
        );
        break;
        
      case 'en_revision':
        resultado = await contingenciaService.enRevisionContingencia(
          params.id,
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