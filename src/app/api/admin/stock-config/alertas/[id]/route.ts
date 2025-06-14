
// src/app/api/admin/stock-config/alertas/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const authError = await authMiddleware(req);
    if (authError) return authError;
  
    const permError = await checkPermission('admin')(req);
    if (permError) return permError;
  
    try {
      const body = await req.json();
      const user = (req as any).user;
      const { accion } = body;
  
      if (accion === 'marcar_vista') {
        const alerta = await stockSucursalService.marcarAlertaVista(params.id, user.id);
        return NextResponse.json(alerta);
      }
  
      if (accion === 'desactivar') {
        const alerta = await prisma.alertaStock.update({
          where: { id: params.id },
          data: { activa: false }
        });
        return NextResponse.json(alerta);
      }
  
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error al actualizar alerta:', error);
      return NextResponse.json(
        { error: 'Error al actualizar alerta' },
        { status: 500 }
      );
    }
  }