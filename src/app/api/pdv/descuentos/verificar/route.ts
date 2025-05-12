// src/app/api/pdv/descuentos/verificar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const codigo = searchParams.get('codigo');
    
    if (!codigo) {
      return NextResponse.json(
        { error: 'Se requiere un código de descuento' },
        { status: 400 }
      );
    }
    
    // Buscar código en la BD
    const codigoDescuento = await prisma.codigoDescuento.findUnique({
      where: { codigo }
    });
    
    if (!codigoDescuento) {
      return NextResponse.json(
        { error: 'Código de descuento no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar si está activo
    if (!codigoDescuento.activo) {
      return NextResponse.json(
        { error: 'Código de descuento inactivo' },
        { status: 400 }
      );
    }
    
    // Verificar rango de fechas
    const ahora = new Date();
    if (codigoDescuento.fechaInicio > ahora) {
      return NextResponse.json(
        { error: 'Código de descuento aún no vigente' },
        { status: 400 }
      );
    }
    
    if (codigoDescuento.fechaFin && codigoDescuento.fechaFin < ahora) {
      return NextResponse.json(
        { error: 'Código de descuento vencido' },
        { status: 400 }
      );
    }
    
    // Verificar usos máximos
    if (codigoDescuento.usoMaximo && codigoDescuento.usosActuales >= codigoDescuento.usoMaximo) {
      return NextResponse.json(
        { error: 'Código de descuento ha alcanzado su límite de uso' },
        { status: 400 }
      );
    }
    
    // Retornar datos del código
    return NextResponse.json({
      codigo: codigoDescuento.codigo,
      descripcion: codigoDescuento.descripcion,
      tipoDescuento: codigoDescuento.tipoDescuento,
      valor: codigoDescuento.valor
    });
  } catch (error: any) {
    console.error('Error al verificar código de descuento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar código de descuento' },
      { status: 500 }
    );
  }
}