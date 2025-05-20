// src/app/api/fabrica/envios/[id]/recibir/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';
import { envioService } from '@/server/services/envio/envioService';
import prisma from '@/server/db/client';

// Esquema de validación para recepción
const recepcionEnvioSchema = z.object({
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadRecibida: z.number().nonnegative()
    })
  ),
  observaciones: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('envio:recibir')(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = params;
    console.log(`[API] Procesando recepción de envío ${id}`);
    
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = recepcionEnvioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { items, observaciones } = validation.data;
    console.log(`[API] Items a recibir:`, items);
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar que el envío existe
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true,
            insumo: true
          }
        },
        destino: true
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    // CAMBIO: Aceptar tanto "enviado" como "en_transito"
    if (envio.estado !== 'enviado' && envio.estado !== 'en_transito') {
      return NextResponse.json(
        { error: `El envío no puede ser recibido porque está en estado ${envio.estado}. Los estados válidos son 'enviado' y 'en_transito'.` },
        { status: 400 }
      );
    }
    
    // Verificar que el destino coincide con la sucursal del usuario o es la fábrica predeterminada
    const userSucursalId = user.sucursalId || 'ubicacion-fabrica';
    
    if (envio.destinoId !== userSucursalId) {
      return NextResponse.json(
        { error: 'No tiene permiso para recibir este envío' },
        { status: 403 }
      );
    }
    
    // CAMBIO: Usar el servicio envioService para procesar la recepción
    console.log(`[API] Invocando envioService.recibirEnvio para el envío ${id}`);
    const resultado = await envioService.recibirEnvio({
      envioId: id,
      usuarioId: user.id,
      items,
      observaciones
    });
    
    console.log(`[API] Recepción completada exitosamente`);
    return NextResponse.json({
      envio: resultado,
      message: 'Envío recibido correctamente'
    });
    
  } catch (error: any) {
    console.error('Error al recibir envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recibir envío' },
      { status: 500 }
    );
  }
}