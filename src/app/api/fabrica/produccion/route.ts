// src/app/api/fabrica/produccion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { produccionService } from '@/server/services/produccion/produccionService';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema para validar creación de producción
const produccionSchema = z.object({
  recetaId: z.string(),
  cantidad: z.number().positive(),
  ubicacionId: z.string(),
  observaciones: z.string().optional()
});

export async function GET(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Filtros
    const estado = searchParams.get('estado');
    const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
    const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
    
    const producciones = await produccionService.getProducciones({
      estado: estado || undefined,
      desde,
      hasta,
      usuarioId: searchParams.get('usuarioId') || undefined
    });
    
    return NextResponse.json(producciones);
  } catch (error: any) {
    console.error('Error al obtener producciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener producciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = produccionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Iniciar producción
    const produccion = await produccionService.iniciarProduccion({
      recetaId: validation.data.recetaId,
      cantidad: validation.data.cantidad,
      usuarioId: user.id,
      ubicacionId: validation.data.ubicacionId,
      observaciones: validation.data.observaciones
    });
    
    return NextResponse.json(produccion, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear producción' },
      { status: 500 }
    );
  }
}