// src/app/api/admin/descuentos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación
const codigoDescuentoSchema = z.object({
  codigo: z.string().min(3),
  descripcion: z.string().optional(),
  tipoDescuento: z.enum(['porcentaje', 'monto_fijo']),
  valor: z.number().positive(),
  fechaInicio: z.string().or(z.date()),
  fechaFin: z.string().optional().nullable(),
  usoMaximo: z.number().int().positive().optional().nullable(),
  activo: z.boolean().default(true)
});

// GET - Listar códigos
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const codigos = await prisma.codigoDescuento.findMany({
      orderBy: {
        fechaInicio: 'desc'
      }
    });
    
    return NextResponse.json(codigos);
  } catch (error: any) {
    console.error('Error al obtener códigos de descuento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener códigos de descuento' },
      { status: 500 }
    );
  }
}

// POST - Crear código
export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = codigoDescuentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Convertir fechas si son strings
    const fechaInicio = typeof data.fechaInicio === 'string' 
      ? new Date(data.fechaInicio) 
      : data.fechaInicio;
    
    const fechaFin = data.fechaFin 
      ? typeof data.fechaFin === 'string' 
        ? new Date(data.fechaFin) 
        : data.fechaFin
      : null;
    
    // Verificar si ya existe un código igual
    const existente = await prisma.codigoDescuento.findUnique({
      where: { codigo: data.codigo }
    });
    
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un código con ese nombre' },
        { status: 400 }
      );
    }
    
    // Crear código
    const codigo = await prisma.codigoDescuento.create({
      data: {
        ...data,
        fechaInicio,
        fechaFin,
        usosActuales: 0
      }
    });
    
    return NextResponse.json(codigo, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear código de descuento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear código de descuento' },
      { status: 500 }
    );
  }
}