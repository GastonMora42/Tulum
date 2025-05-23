// src/app/api/pdv/facturas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    // Buscar factura
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id },
      include: {
        venta: {
          include: {
            items: {
              include: {
                producto: true
              }
            },
            sucursal: true,
            pagos: true
          }
        },
        sucursal: {
          include: {
            configuracionAFIP: true
          }
        }
      }
    });
    
    
    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...factura,
      cuit: factura.sucursal?.configuracionAFIP?.cuit || null
    });
  } catch (error) {
    console.error('Error al obtener factura:', error);
    return NextResponse.json(
      { error: 'Error al obtener factura' },
      { status: 500 }
    );
  }
}