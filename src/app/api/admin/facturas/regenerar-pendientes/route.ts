// src/app/api/admin/facturas/regenerar-pendientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    // Buscar facturas pendientes o con error
    const facturas = await prisma.facturaElectronica.findMany({
      where: {
        estado: { in: ['pendiente', 'error'] }
      },
      include: {
        venta: true
      }
    });
    
    if (facturas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay facturas pendientes para regenerar',
        count: 0
      });
    }
    
    // Agrupar por sucursal para optimizar
    const facturasPorSucursal = facturas.reduce((acc, factura) => {
      if (!acc[factura.sucursalId]) {
        acc[factura.sucursalId] = [];
      }
      acc[factura.sucursalId].push(factura);
      return acc;
    }, {} as Record<string, typeof facturas>);
    
    // Procesar facturas en segundo plano
    // Nota: En producción, esto debería hacerse mediante un worker o tarea programada
    setTimeout(async () => {
      for (const [sucursalId, facturasSucursal] of Object.entries(facturasPorSucursal)) {
        try {
          // Obtener servicio de facturación para esta sucursal
          const facturacionService = await getFacturacionService(sucursalId);
          
          for (const factura of facturasSucursal) {
            try {
              // Actualizar estado a procesando
              await prisma.facturaElectronica.update({
                where: { id: factura.id },
                data: {
                  estado: 'procesando',
                  error: null
                }
              });
              
              // Intentar generar factura
              await facturacionService.generarFactura(factura.ventaId);
            } catch (facturaError) {
              console.error(`Error regenerando factura ${factura.id}:`, facturaError);
            }
          }
        } catch (sucursalError) {
          console.error(`Error procesando facturas para sucursal ${sucursalId}:`, sucursalError);
        }
      }
    }, 100);
    
    return NextResponse.json({
      success: true,
      message: 'Proceso de regeneración iniciado',
      count: facturas.length
    });
  } catch (error: any) {
    console.error('Error al regenerar facturas pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al regenerar facturas pendientes' },
      { status: 500 }
    );
  }
}