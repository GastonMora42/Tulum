// src/app/api/admin/jobs/process-pending-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export const maxDuration = 300; // 5 minutos para Vercel

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    console.log('Buscando facturas pendientes...');
    
    // Obtener facturas pendientes o atascadas
    const facturasPendientes = await prisma.facturaElectronica.findMany({
      where: {
        OR: [
          { estado: 'pendiente' },
          // También procesar las que quedaron en "procesando" por más de 5 minutos
          { 
            estado: 'procesando',
            updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
          }
        ]
      },
      include: {
        sucursal: true,
        venta: true
      },
      take: 3 // Procesar en lotes pequeños para evitar timeout
    });
    
    console.log(`Se encontraron ${facturasPendientes.length} facturas pendientes`);
    
    const resultados = [];
    
    // Procesar cada factura
    for (const factura of facturasPendientes) {
      try {
        console.log(`Procesando factura ${factura.id} para venta ${factura.ventaId}`);
        
        // Actualizar a procesando
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: { 
            estado: 'procesando',
            updatedAt: new Date()
          }
        });
        
        // Obtener servicio y procesar
        const facturacionService = await getFacturacionService(factura.sucursalId);
        const resultado = await facturacionService.generarFactura(factura.ventaId);
        
        resultados.push({
          facturaId: factura.id,
          success: resultado.success,
          message: resultado.message,
          error: resultado.error
        });
        
        console.log(`Resultado para factura ${factura.id}: ${resultado.success ? 'Éxito' : 'Error'}`);
      } catch (facturaError) {
        console.error(`Error procesando factura ${factura.id}:`, facturaError);
        
        // Marcar como error
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: {
            estado: 'error',
            error: facturaError instanceof Error ? facturaError.message : 'Error en procesamiento'
          }
        });
        
        resultados.push({
          facturaId: factura.id,
          success: false,
          error: facturaError instanceof Error ? facturaError.message : 'Error desconocido'
        });
      }
    }
    
    return NextResponse.json({
      procesadas: facturasPendientes.length,
      resultados
    });
  } catch (error) {
    console.error('Error en proceso de facturas pendientes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}