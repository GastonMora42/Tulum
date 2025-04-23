// src/app/api/admin/envios-insumos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear envío de insumos
const solicitudSchema = z.object({
  origenId: z.string({ required_error: 'El origen es requerido' }),
  destinoId: z.string({ required_error: 'El destino es requerido' }),
  observaciones: z.string().optional(),
  items: z.array(
    z.object({
      insumoId: z.string({ required_error: 'El insumo es requerido' }),
      cantidad: z.number().positive({ message: 'La cantidad debe ser positiva' })
    })
  ).min(1, { message: 'Debe incluir al menos un insumo' })
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('stock:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtrado
    const estado = searchParams.get('estado');
    const origenId = searchParams.get('origenId');
    const destinoId = searchParams.get('destinoId');
    
    // Construir filtro
    const where: any = {};
    
    if (estado) {
      where.estado = estado;
    }
    
    if (origenId) {
      where.origenId = origenId;
    }
    
    if (destinoId) {
      where.destinoId = destinoId;
    }
    
    // Filtrar para solo obtener envíos de insumos
    where.items = {
      some: {
        insumoId: { not: null },
        productoId: null
      }
    };
    
    // Obtener envíos
    const envios = await prisma.envio.findMany({
      where,
      include: {
        origen: true,
        destino: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            insumo: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
    
    return NextResponse.json(envios);
  } catch (error: any) {
    console.error('Error al obtener envíos de insumos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envíos de insumos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('stock:ajustar')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = solicitudSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { origenId, destinoId, observaciones, items } = validation.data;
    
    // Verificar que origen y destino existen
    const origen = await prisma.ubicacion.findUnique({
      where: { id: origenId }
    });
    
    if (!origen) {
      return NextResponse.json(
        { error: 'La ubicación de origen no existe' },
        { status: 404 }
      );
    }
    
    const destino = await prisma.ubicacion.findUnique({
      where: { id: destinoId }
    });
    
    if (!destino) {
      return NextResponse.json(
        { error: 'La ubicación de destino no existe' },
        { status: 404 }
      );
    }
    
    // Obtener usuario de la request
    const user = (req as any).user;
    
    // Crear envío en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear el envío
      const envio = await tx.envio.create({
        data: {
          origenId,
          destinoId,
          estado: 'pendiente',
          fechaCreacion: new Date(),
          usuarioId: user.id
        }
      });
      
      // 2. Crear los items del envío
      for (const item of items) {
        // Crear el item con referencia al insumo
        await tx.itemEnvio.create({
          data: {
            envioId: envio.id,
            cantidad: item.cantidad,
            insumoId: item.insumoId
          }
        });
      }
      
      // 3. Retornar el envío creado con sus relaciones
      return tx.envio.findUnique({
        where: { id: envio.id },
        include: {
          origen: true,
          destino: true,
          usuario: true,
          items: {
            include: {
              insumo: true
            }
          }
        }
      });
    });
    
    return NextResponse.json(resultado, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear solicitud de insumos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear solicitud de insumos' },
      { status: 500 }
    );
  }
}