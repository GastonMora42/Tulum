// src/app/api/fabrica/envios/nuevo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { envioService } from '@/server/services/envio/envioService';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema para validar
const envioSchema = z.object({
  destinoId: z.string(),
  items: z.array(z.object({
    productoId: z.string(),
    cantidad: z.number().positive()
  }))
});

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('envio:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = envioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Obtener fábrica como origen
    const fabrica = 'ubicacion-fabrica'; // En un caso real, obtener del usuario o contexto
    
    // Crear envío
    const envio = await envioService.crearEnvio({
      origenId: fabrica,
      destinoId: validation.data.destinoId,
      usuarioId: user.id,
      items: validation.data.items
    });
    
    return NextResponse.json(envio, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear envío' },
      { status: 500 }
    );
  }
}