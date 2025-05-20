// src/app/api/envios/marcar/route.ts - Crear este archivo si no existe
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { envioService } from '@/server/services/envio/envioService';
import prisma from '@/server/db/client';

// src/app/api/envios/marcar/route.ts
export async function POST(req: NextRequest) {
    // Aplicar middleware de autenticación
    const authError = await authMiddleware(req);
    if (authError) return authError;
    
    try {
      const body = await req.json();
      const { envioId } = body;
      const user = (req as any).user;
      
      if (!envioId) {
        return NextResponse.json(
          { error: 'ID de envío no proporcionado' },
          { status: 400 }
        );
      }
      
      console.log(`Marcando envío ${envioId} como enviado por usuario ${user.id}`);
      
      try {
        const resultado = await envioService.marcarEnviado(envioId, user.id);
        
        const envioCompleto = await prisma.envio.findUnique({
            where: { id: envioId },
            include: {
              items: true,
              origen: true,
              destino: true
            }
          });
          
          return NextResponse.json({
            success: true,
            envio: envioCompleto
          });
      } catch (serviceError) {
        console.error('Error de servicio:', serviceError);
        return NextResponse.json(
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Error al marcar envío como enviado:', error);
      return NextResponse.json(
        { error: error.message || 'Error al marcar envío' },
        { status: 500 }
      );
    }
  }