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
    const { ventaId } = body;

    if (!ventaId) {
      return NextResponse.json({ error: 'El ID de venta es requerido' }, { status: 400 });
    }

    // Verificar si la venta existe
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        sucursal: true,
        facturaElectronica: true
      }
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    // Verificar si ya tiene factura
    if (venta.facturaElectronica) {
      return NextResponse.json({ 
        message: 'La venta ya tiene una factura asociada',
        facturaId: venta.facturaElectronica.id,
        success: true
      });
    }

    // Verificar si la sucursal tiene configuración AFIP
    const config = await prisma.configuracionAFIP.findFirst({
      where: { 
        sucursalId: venta.sucursalId,
        activo: true
      }
    });

    if (!config) {
      return NextResponse.json({ 
        error: 'La sucursal no tiene configuración AFIP activa' 
      }, { status: 400 });
    }

    // Obtener servicio de facturación
    const facturacionService = await getFacturacionService(venta.sucursalId);
    
    // Generar factura
    const resultado = await facturacionService.generarFactura(ventaId);
    
    if (!resultado.success) {
      throw new Error(resultado.message || 'Error al generar factura');
    }
    
    // Marcar venta como facturada
    await prisma.venta.update({
      where: { id: ventaId },
      data: { facturada: true }
    });
    
    return NextResponse.json({
      success: true,
      message: resultado.message || 'Factura generada correctamente',
      facturaId: resultado.facturaId
    });
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
      },
      orderBy: { createdAt: 'desc' }
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