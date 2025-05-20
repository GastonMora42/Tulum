// src/app/api/pdv/facturas/retry/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    // Buscar factura
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id },
      include: { venta: true }
    });
    
    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    // Verificar que la factura está en estado de error o pendiente
    if (factura.estado !== 'error' && factura.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden reintentar facturas en estado de error o pendiente' },
        { status: 400 }
      );
    }
    
    // Actualizar estado a procesando
    await prisma.facturaElectronica.update({
      where: { id },
      data: {
        estado: 'procesando',
        error: null
      }
    });
    
    // Obtener servicio de facturación
    const facturacionService = await getFacturacionService(factura.sucursalId);
    
    // Iniciar proceso de facturación en segundo plano
    setTimeout(async () => {
      try {
        const resultado = await facturacionService.generarFactura(factura.ventaId);
        console.log(`Resultado de reintento de factura ${id}:`, resultado.success ? 'Éxito' : 'Error');
      } catch (error) {
        console.error(`Error en reintento de factura ${id}:`, error);
      }
    }, 100);
    
    return NextResponse.json({
      success: true,
      message: 'Reintento de facturación iniciado'
    });
  } catch (error: any) {
    console.error('Error al reintentar factura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al reintentar factura' },
      { status: 500 }
    );
  }
}