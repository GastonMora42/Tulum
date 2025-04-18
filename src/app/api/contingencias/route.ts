// src/app/api/contingencias/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { contingenciaService } from '@/server/services/contingencia/contingenciaService';
import { z } from 'zod';

// Esquema de validación para crear contingencia
const crearContingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  origen: z.enum(['fabrica', 'sucursal', 'oficina']),
  produccionId: z.string().optional(),
  envioId: z.string().optional()
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    
    const filtros: {
      estado?: string;
      origen?: string;
      creadoPor?: string;
    } = {};
    
    const estado = searchParams.get('estado');
    if (estado) filtros.estado = estado;
    
    const origen = searchParams.get('origen');
    if (origen) filtros.origen = origen;
    
    const creadoPor = searchParams.get('creadoPor');
    if (creadoPor) filtros.creadoPor = creadoPor;

    const contingencias = await contingenciaService.listarContingencias(filtros);
    return NextResponse.json(contingencias);
  } catch (error) {
    console.error('Error al listar contingencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener contingencias' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    // Accedemos al usuario desde req.user
    const user = (req as any).user;
    const body = await req.json();
    
    // Validar datos
    const validation = crearContingenciaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const contingencia = await contingenciaService.crearContingencia({
      ...validation.data,
      creadoPor: user.id
    });
    
    return NextResponse.json(contingencia, { status: 201 });
  } catch (error) {
    console.error('Error al crear contingencia:', error);
    return NextResponse.json(
      { error: 'Error al crear contingencia' },
      { status: 500 }
    );
  }
}