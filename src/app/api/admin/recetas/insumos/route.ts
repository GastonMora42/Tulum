// src/app/api/admin/recetas/insumos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    
    // Construir where para filtrado
    const where: any = {
      activo: true
    };
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Obtener insumos
    const insumos = await prisma.insumo.findMany({
      where,
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json(insumos);
  } catch (error: any) {
    console.error('Error al obtener insumos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener insumos' },
      { status: 500 }
    );
  }
}