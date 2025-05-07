// src/app/api/pdv/facturas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { ventaId, sucursalId } = body;

    if (!ventaId) {
      return NextResponse.json({ error: 'Venta ID es requerido' }, { status: 400 });
    }

    // Usar sucursalId del body o buscarlo en la venta
    let sucId = sucursalId;
    if (!sucId) {
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId }
      });
      if (!venta) {
        return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      }
      sucId = venta.sucursalId;
    }

    // Obtener servicio de facturación
    const facturacionService = await getFacturacionService(sucId);
    
    // Generar factura
    const resultado = await facturacionService.generarFactura(ventaId);
    
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en facturación:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en facturación' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const ventaId = searchParams.get('ventaId');
    const sucursalId = searchParams.get('sucursalId');
    
    // Construir filtro
    const where: any = {};
    if (ventaId) where.ventaId = ventaId;
    if (sucursalId) where.sucursalId = sucursalId;
    
    // Buscar facturas
    const facturas = await prisma.facturaElectronica.findMany({
      where,
      include: {
        venta: {
          include: {
            sucursal: true
          }
        }
      }
    });
    
    return NextResponse.json(facturas);
  } catch (error) {
    console.error('Error al buscar facturas:', error);
    return NextResponse.json(
      { error: 'Error al buscar facturas' },
      { status: 500 }
    );
  }
}