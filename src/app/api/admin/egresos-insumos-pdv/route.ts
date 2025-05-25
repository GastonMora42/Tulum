// src/app/api/admin/egresos-insumos-pdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { z } from 'zod';
import { insumoPdvService } from '@/server/services/insumoPdv/insumoPdvService';

const egresoSchema = z.object({
  insumoPdvId: z.string(),
  cantidad: z.number().positive(),
  motivo: z.enum(['uso_normal', 'perdida', 'daño', 'vencimiento', 'otros']),
  observaciones: z.string().optional()
});

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const filtros = {
      sucursalId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined
    };

    const egresos = await insumoPdvService.obtenerEgresos;
    return NextResponse.json(egresos);
  } catch (error) {
    console.error('Error al obtener egresos:', error);
    return NextResponse.json(
      { error: 'Error al obtener egresos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const user = (req as any).user;
    const body = await req.json();
    
    const validation = egresoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const egreso = await insumoPdvService.registrarEgreso({
      ...validation.data,
      sucursalId: user.sucursalId,
      usuarioId: user.id
    });

    return NextResponse.json(egreso, { status: 201 });
  } catch (error: any) {
    console.error('Error al registrar egreso:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar egreso' },
      { status: 500 }
    );
  }
}