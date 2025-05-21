// src/app/api/admin/jobs/process-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { facturaId } = body;
    
    if (!facturaId) {
      return NextResponse.json(
        { error: 'Se requiere ID de factura' },
        { status: 400 }
      );
    }
    
    // Buscar la factura
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id: facturaId },
      include: { 
        venta: true,
        sucursal: true
      }
    });
    
    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }
    
    if (factura.estado !== 'pendiente') {
      return NextResponse.json({
        message: `La factura ya está en estado ${factura.estado}`,
        estado: factura.estado
      });
    }
    
    // Actualizar a estado procesando
    await prisma.facturaElectronica.update({
      where: { id: facturaId },
      data: { 
        estado: 'procesando',
        updatedAt: new Date()
      }
    });
    
    console.log(`Iniciando procesamiento de factura ${facturaId} para venta ${factura.ventaId}`);
    
    // Obtener servicio y procesar
    const facturacionService = await getFacturacionService(factura.sucursalId);
    const resultado = await facturacionService.generarFactura(factura.ventaId);
    
    if (resultado.success) {
      console.log(`Factura ${facturaId} procesada exitosamente. CAE: ${resultado.cae}`);
      return NextResponse.json({
        success: true,
        message: 'Factura procesada exitosamente',
        cae: resultado.cae
      });
    } else {
      console.error(`Error al procesar factura ${facturaId}:`, resultado.message);
      return NextResponse.json({
        success: false,
        message: resultado.message,
        error: resultado.error
      });
    }
  } catch (error) {
    console.error('Error en procesamiento de factura:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}