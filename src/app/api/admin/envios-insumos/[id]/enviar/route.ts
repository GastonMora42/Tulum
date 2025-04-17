// src/app/api/admin/envios-insumos/[id]/enviar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('envio:enviar')(req);
  if (permissionError) return permissionError;
  
  try {
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar que el envío existe y está en estado pendiente
    const envio = await prisma.envio.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    if (envio.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `El envío no puede ser enviado porque está en estado ${envio.estado}` },
        { status: 400 }
      );
    }
    
    // Verificar que tiene items de insumos
    const tieneInsumos = envio.items.some(item => item.insumoId !== null);
    if (!tieneInsumos) {
      return NextResponse.json(
        { error: 'Este envío no contiene insumos' },
        { status: 400 }
      );
    }
    
    // Actualizar estado del envío
    const envioActualizado = await prisma.envio.update({
      where: { id: params.id },
      data: {
        estado: 'enviado',
        fechaEnvio: new Date()
      },
      include: {
        origen: true,
        destino: true,
        usuario: true,
        items: {
          include: {
            insumo: true
          }
        }
      }
    });
    
    return NextResponse.json(envioActualizado);
  } catch (error: any) {
    console.error('Error al marcar envío como enviado:', error);
    return NextResponse.json(
      { error: error.message || 'Error al marcar envío como enviado' },
      { status: 500 }
    );
  }
}