// src/app/api/fabrica/produccion/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    // Obtener datos para inicializar formulario
    const { searchParams } = new URL(req.url);
    const recetaId = searchParams.get('recetaId');
    
    // Obtener todas las recetas
    const recetas = await prisma.receta.findMany({
      include: {
        items: {
          include: {
            insumo: true
          }
        },
        productoRecetas: {
          include: {
            producto: true
          }
        }
      }
    });
    
    // Si hay recetaId, obtener stock de insumos para esa receta
    let stockInsumos: { insumoId: string; nombre: string; unidadMedida: string; stockActual: number; cantidadNecesaria: number; }[] = [];
    if (recetaId) {
      const receta = recetas.find(r => r.id === recetaId);
      if (receta) {
        // Obtener stock actual de cada insumo
        stockInsumos = await Promise.all(receta.items.map(async (item) => {
          const stock = await prisma.stock.findFirst({
            where: {
              insumoId: item.insumoId,
              ubicacionId: 'ubicacion-fabrica'
            }
          });
          
          return {
            insumoId: item.insumoId,
            nombre: item.insumo.nombre,
            unidadMedida: item.insumo.unidadMedida,
            stockActual: stock?.cantidad || 0,
            cantidadNecesaria: item.cantidad
          };
        }));
      }
    }
    
    return NextResponse.json({
      recetas,
      stockInsumos
    });
  } catch (error: any) {
    console.error('Error al obtener datos iniciales:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener datos iniciales' },
      { status: 500 }
    );
  }
}