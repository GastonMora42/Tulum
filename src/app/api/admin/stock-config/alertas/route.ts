// src/app/api/admin/stock-config/alertas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission(['admin', 'stock:ver'])(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const tipoAlerta = searchParams.get('tipoAlerta');
    const activa = searchParams.get('activa');

    const filtros: any = {};
    if (sucursalId) filtros.sucursalId = sucursalId;
    if (tipoAlerta) filtros.tipoAlerta = tipoAlerta;
    if (activa !== null) filtros.activa = activa === 'true';

    const alertas = await stockSucursalService.obtenerAlertas(filtros);

    // Agrupar estadísticas
    const estadisticas = {
      total: alertas.length,
      criticas: alertas.filter((a: { tipoAlerta: string; }) => a.tipoAlerta === 'critico').length,
      bajas: alertas.filter((a: { tipoAlerta: string; }) => a.tipoAlerta === 'bajo').length,
      excesos: alertas.filter((a: { tipoAlerta: string; }) => a.tipoAlerta === 'exceso').length,
      reposicion: alertas.filter((a: { tipoAlerta: string; }) => a.tipoAlerta === 'reposicion').length,
      noVistas: alertas.filter((a: { vistaPor: any; }) => !a.vistaPor).length
    };

    return NextResponse.json({
      alertas,
      estadisticas
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return NextResponse.json(
      { error: 'Error al obtener alertas de stock' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const body = await req.json();
    const { accion, alertaId, productoId, sucursalId } = body;
    const user = (req as any).user;

    switch (accion) {
      case 'marcar_vista':
        if (!alertaId) {
          return NextResponse.json(
            { error: 'Se requiere ID de alerta' },
            { status: 400 }
          );
        }
        
        const alertaMarcada = await stockSucursalService.marcarAlertaVista(alertaId, user.id);
        return NextResponse.json(alertaMarcada);

      case 'verificar_producto':
        if (!productoId || !sucursalId) {
          return NextResponse.json(
            { error: 'Se requiere productoId y sucursalId' },
            { status: 400 }
          );
        }
        
        await stockSucursalService.verificarYGenerarAlertas(productoId, sucursalId);
        return NextResponse.json({ success: true });

      case 'verificar_sucursal':
        if (!sucursalId) {
          return NextResponse.json(
            { error: 'Se requiere sucursalId' },
            { status: 400 }
          );
        }
        
        await stockSucursalService.verificarAlertasParaSucursal(sucursalId);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error al procesar alerta:', error);
    return NextResponse.json(
      { error: 'Error al procesar acción de alerta' },
      { status: 500 }
    );
  }
}

// src/app/api/admin/stock-config/alertas/[id]/route.ts
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