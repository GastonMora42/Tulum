// src/app/api/fabrica/produccion/[id]/finalizar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { produccionService } from '@/server/services/produccion/produccionService';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema para validar finalización
const finalizarSchema = z.object({
  productoId: z.string(),
  ubicacionId: z.string(),
  cantidadProducida: z.number().positive(),
  observaciones: z.string().optional()
});

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Verificar autenticación primero
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Extraer ID después de la autenticación
  const id = context.params.id;
  
// Verificar permiso - MODIFICAMOS PARA USAR produccion:crear EN LUGAR DE produccion:editar
const permissionError = await checkPermission('produccion:crear')(req);
if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = finalizarSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Finalizar producción
    const produccion = await produccionService.finalizarProduccion({
      produccionId: id,
      usuarioId: user.id,
      productoId: validation.data.productoId,
      ubicacionId: validation.data.ubicacionId,
      cantidadProducida: validation.data.cantidadProducida,
      observaciones: validation.data.observaciones
    });
    
    return NextResponse.json(produccion);
  } catch (error: any) {
    console.error('Error al finalizar producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al finalizar producción' },
      { status: 500 }
    );
  }
}