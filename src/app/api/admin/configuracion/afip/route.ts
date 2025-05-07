// src/app/api/admin/configuracion/afip/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  // Autenticar y autorizar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const configuraciones = await prisma.configuracionAFIP.findMany({
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    return NextResponse.json(configuraciones);
  } catch (error) {
    console.error('Error al obtener configuraciones AFIP:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones AFIP' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Autenticar y autorizar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos
    const { sucursalId, cuit, puntoVenta } = body;
    
    if (!sucursalId || !cuit || !puntoVenta) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }
    
    // Validar CUIT
    if (!/^\d{11}$/.test(cuit)) {
      return NextResponse.json(
        { error: 'El CUIT debe tener 11 dígitos' },
        { status: 400 }
      );
    }
    
    // Validar que la sucursal exista
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });
    
    if (!sucursal) {
      return NextResponse.json(
        { error: 'La sucursal no existe' },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe configuración para esta sucursal
    const existingConfig = await prisma.configuracionAFIP.findFirst({
      where: { sucursalId }
    });
    
    if (existingConfig) {
      return NextResponse.json(
        { error: 'Ya existe una configuración para esta sucursal' },
        { status: 400 }
      );
    }
    
    // Crear configuración
    const config = await prisma.configuracionAFIP.create({
      data: {
        sucursalId,
        cuit,
        puntoVenta,
        activo: true
      }
    });
    
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error al crear configuración AFIP:', error);
    
    // Manejar error de unicidad
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe una configuración para esta sucursal' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear configuración AFIP' },
      { status: 500 }
    );
  }
}