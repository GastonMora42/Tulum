// src/app/api/admin/proveedores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtrado opcionales
    const search = searchParams.get('search') || '';
    const activo = searchParams.get('activo') === 'true' ? true : 
                  searchParams.get('activo') === 'false' ? false : undefined;
    
    // Construir where para filtrado
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (activo !== undefined) {
      where.activo = activo;
    }
    
    // Obtener proveedores
    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json(proveedores);
  } catch (error: any) {
    console.error('Error al obtener proveedores:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener proveedores' },
      { status: 500 }
    );
  }
}

// POST - Crear proveedor (opcional)
export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    // Validación básica
    if (!body.nombre) {
      return NextResponse.json(
        { error: 'El nombre del proveedor es requerido' },
        { status: 400 }
      );
    }
    
    // Crear proveedor
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: body.nombre,
        contacto: body.contacto,
        telefono: body.telefono,
        email: body.email,
        direccion: body.direccion,
        activo: body.activo !== false // Por defecto activo
      }
    });
    
    return NextResponse.json(proveedor, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear proveedor:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear proveedor' },
      { status: 500 }
    );
  }
}