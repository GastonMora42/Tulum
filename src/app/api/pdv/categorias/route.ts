// src/app/api/pdv/categorias/route.ts - NUEVA API PARA CATEGORÍAS
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // 🔧 OBTENER CATEGORÍAS QUE TIENEN PRODUCTOS CON STOCK EN LA SUCURSAL
    const categoriasConStock = await prisma.categoria.findMany({
      where: {
        productos: {
          some: {
            stocks: {
              some: {
                ubicacionId: sucursalId,
                cantidad: { gt: 0 } // Solo categorías con productos que tienen stock
              }
            }
          }
        }
      },
      include: {
        _count: {
          select: {
            productos: {
              where: {
                stocks: {
                  some: {
                    ubicacionId: sucursalId
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    
    // 🆕 VERIFICAR ESTADO DE CONCILIACIÓN PARA CADA CATEGORÍA
    const categoriasConEstado = await Promise.all(
      categoriasConStock.map(async (categoria) => {
        // Verificar si hay contingencia pendiente para esta categoría
        const contingenciaPendiente = await prisma.contingencia.findFirst({
          where: {
            ubicacionId: sucursalId,
            tipo: 'conciliacion',
            estado: { in: ['pendiente', 'en_revision'] },
            descripcion: { contains: `Categoría: ${categoria.id}` }
          }
        });
        
        // Verificar si hay conciliación activa para esta categoría
        const conciliacionActiva = await prisma.conciliacion.findFirst({
          where: {
            sucursalId,
            estado: { in: ['pendiente', 'en_proceso'] },
            observaciones: { contains: `Categoría: ${categoria.id}` }
          }
        });
        
        return {
          id: categoria.id,
          nombre: categoria.nombre,
          imagen: categoria.imagen,
          productCount: categoria._count.productos,
          estado: contingenciaPendiente ? 'bloqueado' : 
                  conciliacionActiva ? 'en_proceso' : 'disponible',
          contingenciaId: contingenciaPendiente?.id || null,
          conciliacionId: conciliacionActiva?.id || null
        };
      })
    );
    
    return NextResponse.json(categoriasConEstado);
  } catch (error: any) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}