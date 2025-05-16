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
  envioId: z.string().optional(),
  ubicacionId: z.string().optional(),
  conciliacionId: z.string().optional(),
  imagenUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  mediaType: z.string().optional(),
  urgente: z.boolean().optional(),
  tipo: z.string().optional()
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    
    const filtros: {
      ubicacionId: string;
      conciliacionId: string;
      estado?: string;
      origen?: string;
      creadoPor?: string;
    } = {
      ubicacionId: '',
      conciliacionId: ''
    };
    
    const estado = searchParams.get('estado');
    if (estado) filtros.estado = estado;
    
    const origen = searchParams.get('origen');
    if (origen) filtros.origen = origen;

    const ubicacionId = searchParams.get('ubicacionId');
    if (ubicacionId) filtros.ubicacionId = ubicacionId;
    
    const conciliacionId = searchParams.get('conciliacionId');
    if (conciliacionId) filtros.conciliacionId = conciliacionId;
    
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
    
    console.log("[API] Datos originales recibidos para contingencia:", {
      titulo: body.titulo,
      descripcion: body.descripcion?.substring(0, 20) + '...',
      origen: body.origen,
      mediaType: body.mediaType,
      tieneImagen: !!body.imagenUrl,
      tieneVideo: !!body.videoUrl,
      produccionId: body.produccionId || 'no definido',
      envioId: body.envioId || 'no definido',
      ubicacionId: body.ubicacionId || 'no definido',
      conciliacionId: body.conciliacionId || 'no definido'
    });
    
    // Normalizamos los datos para el servicio - IMPORTANTE: usar undefined, no null
    const datosNormalizados = {
      titulo: body.titulo,
      descripcion: body.descripcion,
      origen: body.origen || 'sucursal', // Valor predeterminado
      
      // Convertir null/string vacía a undefined para campos opcionales
      produccionId: body.produccionId || undefined,
      envioId: body.envioId || undefined,
      ubicacionId: body.ubicacionId || undefined,
      conciliacionId: body.conciliacionId || undefined,
      
      // Campos multimedia
      imagenUrl: body.mediaType === 'image' ? (body.imagenUrl || body.mediaUrl || undefined) : undefined,
      videoUrl: body.mediaType === 'video' ? (body.videoUrl || body.imagenUrl || body.mediaUrl || undefined) : undefined,
      mediaType: body.mediaType || undefined,
      
      // Otros campos opcionales
      tipo: body.tipo || undefined,
      urgente: body.urgente || false
    };
    
    console.log("[API] Datos normalizados para contingencia:", {
      titulo: datosNormalizados.titulo,
      origen: datosNormalizados.origen,
      tieneImagen: !!datosNormalizados.imagenUrl,
      tieneVideo: !!datosNormalizados.videoUrl,
      mediaType: datosNormalizados.mediaType,
      produccionId: datosNormalizados.produccionId || 'undefined',
      envioId: datosNormalizados.envioId || 'undefined',
      ubicacionId: datosNormalizados.ubicacionId || 'undefined',
      conciliacionId: datosNormalizados.conciliacionId || 'undefined'
    });
    
    // Validar datos
    const validation = crearContingenciaSchema.safeParse(datosNormalizados);
    if (!validation.success) {
      console.error("[API] Error de validación:", validation.error.errors);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    try {
      // Crear la contingencia
      const contingencia = await contingenciaService.crearContingencia({
        ...validation.data,
        creadoPor: user.id
      });
      
      console.log(`[API] Contingencia creada exitosamente con ID: ${contingencia.id}`);
      return NextResponse.json(contingencia, { status: 201 });
    } catch (serviceError: any) {
      console.error('[API] Error específico del servicio:', serviceError);
      
      return NextResponse.json(
        { error: serviceError.message || 'Error al procesar la contingencia' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Error general al crear contingencia:', error);
    return NextResponse.json(
      { error: 'Error al crear contingencia' },
      { status: 500 }
    );
  }
}