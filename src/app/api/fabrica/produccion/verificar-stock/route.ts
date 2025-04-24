// src/app/api/fabrica/produccion/verificar-stock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { recetaId, cantidad } = body;
    
    if (!recetaId || !cantidad) {
      return NextResponse.json(
        { error: 'Receta y cantidad son requeridos' },
        { status: 400 }
      );
    }
    
    // Obtener receta con sus insumos
    const receta = await prisma.receta.findUnique({
      where: { id: recetaId },
      include: {
        items: {
          include: {
            insumo: true
          }
        }
      }
    });
    
    if (!receta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar stock disponible para cada insumo
    const resultados = await Promise.all(receta.items.map(async (item) => {
      // Calcular cantidad necesaria
      const cantidadNecesaria = item.cantidad * cantidad;
      
      // Obtener stock actual
      const stock = await prisma.stock.findFirst({
        where: {
          insumoId: item.insumoId,
          ubicacionId: 'ubicacion-fabrica'
        }
      });
      
      const stockDisponible = stock?.cantidad || 0;
      
      return {
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        cantidadNecesaria,
        stockDisponible,
        suficiente: stockDisponible >= cantidadNecesaria,
        unidadMedida: item.insumo.unidadMedida
      };
    }));
    
    // Determinar si hay suficiente stock para toda la producción
    const suficienteParaProduccion = resultados.every(r => r.suficiente);
    
    return NextResponse.json({
      suficienteParaProduccion,
      detalleInsumos: resultados,
      receta: {
        id: receta.id,
        nombre: receta.nombre,
        rendimiento: receta.rendimiento
      }
    });
  } catch (error: any) {
    console.error('Error al verificar stock para producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar stock para producción' },
      { status: 500 }
    );
  }
}