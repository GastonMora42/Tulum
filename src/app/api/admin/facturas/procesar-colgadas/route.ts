// src/app/api/admin/facturas/procesar-colgadas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';
import prisma from '@/server/db/client';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    console.log('[ADMIN] Iniciando procesamiento de facturas colgadas');
    
    // Obtener todas las configuraciones activas
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true }
    });

    const resultadosGlobales = {
      totalProcesadas: 0,
      totalExitosas: 0,
      totalErrores: 0,
      detallesPorSucursal: []
    };

    for (const config of configuraciones) {
      try {
        const service = await getFacturacionService(config.sucursalId);
        const resultado = await service.procesarFacturasColgadas();
        
        resultadosGlobales.totalProcesadas += resultado.procesadas;
        resultadosGlobales.totalExitosas += resultado.exitosas;
        resultadosGlobales.totalErrores += resultado.errores;
        
        (resultadosGlobales.detallesPorSucursal as any).push({
          sucursalId: config.sucursalId,
          cuit: config.cuit,
          ...resultado
        });
      } catch (error) {
        console.error(`Error procesando sucursal ${config.sucursalId}:`, error);
        (resultadosGlobales.detallesPorSucursal as any).push({
          sucursalId: config.sucursalId,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json(resultadosGlobales);
  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}