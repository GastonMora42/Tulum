// src/app/api/admin/envios-insumos-pdv/[id]/recibir/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { insumoPdvService } from '@/server/services/insumoPdv/insumoPdvService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const user = (req as any).user;
    const body = await req.json();
    const { items, observaciones } = body;

    const envio = await insumoPdvService.recibirEnvio({
      envioId: params.id,
      items,
      usuarioId: user.id,
      observaciones
    });

    return NextResponse.json(envio);
  } catch (error: any) {
    console.error('Error al recibir envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recibir envío' },
      { status: 500 }
    );
  }
}