// src/app/api/admin/envios-insumos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear envío
const envioInsumoSchema = z.object({
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

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtrado
    const estado = searchParams.get('estado');
    const origenId = searchParams.get('origenId');
    const destinoId = searchParams.get('destinoId');
    
    // Construir filtro
    const where: any = {
      // Filtramos solo los envíos de tipo insumo
      items: {
        some: {
          insumoId: { not: null }
        }
      }
    };
    
    if (estado) {
      where.estado = estado;
    }
    
    if (origenId) {
      where.origenId = origenId;
    }
    
    if (destinoId) {
      where.destinoId = destinoId;
    }
    
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
  const permissionError = await checkPermission('envio:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = envioInsumoSchema.safeParse(body);
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
    
    // Verificar que el destino sea de tipo fábrica
    if (destino.tipo !== 'fabrica') {
      return NextResponse.json(
        { error: 'El destino debe ser una fábrica' },
        { status: 400 }
      );
    }
    
    // Obtener usuario de la request
    const user = (req as any).user;
    
    // Verificar stock disponible en origen para cada insumo
    for (const item of items) {
      const stockInsumo = await prisma.stock.findFirst({
        where: {
          insumoId: item.insumoId,
          ubicacionId: origenId
        }
      });
      
      // Si no hay stock o es insuficiente
      if (!stockInsumo || stockInsumo.cantidad < item.cantidad) {
        const insumo = await prisma.insumo.findUnique({
          where: { id: item.insumoId }
        });
        
        const nombreInsumo = insumo ? insumo.nombre : item.insumoId;
        const stockActual = stockInsumo ? stockInsumo.cantidad : 0;
        
        return NextResponse.json(
          { 
            error: `Stock insuficiente para ${nombreInsumo}. Disponible: ${stockActual}, Solicitado: ${item.cantidad}` 
          },
          { status: 400 }
        );
      }
    }
    
    // Crear envío y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear el envío
      const envio = await tx.envio.create({
        data: {
          origenId,
          destinoId,
          estado: 'pendiente',
          fechaCreacion: new Date(),
          usuarioId: user.id,
          // Aquí podríamos agregar un campo tipo para diferenciar envíos de productos e insumos
        }
      });
      
      // 2. Crear los items del envío
      for (const item of items) {
        // Crear el item con referencia al insumo
        await tx.itemEnvio.create({
          data: {
            envioId: envio.id,
            cantidad: item.cantidad,
            insumoId: item.insumoId, // Agregamos esta relación al modelo
            // El campo productoId quedará null
          }
        });
        
        // 3. Descontar del stock de origen
        const stockOrigen = await tx.stock.findFirst({
          where: {
            insumoId: item.insumoId,
            ubicacionId: origenId
          }
        });
        
        if (stockOrigen) {
          await tx.stock.update({
            where: { id: stockOrigen.id },
            data: {
              cantidad: stockOrigen.cantidad - item.cantidad,
              ultimaActualizacion: new Date(),
              version: { increment: 1 }
            }
          });
          
          // 4. Registrar el movimiento de stock
          await tx.movimientoStock.create({
            data: {
              stockId: stockOrigen.id,
              tipoMovimiento: 'salida',
              cantidad: item.cantidad,
              motivo: `Envío #${envio.id} a ${destino.nombre}`,
              usuarioId: user.id,
              envioId: envio.id,
              fecha: new Date()
            }
          });
        }
      }
      
      // 5. Retornar el envío creado con sus relaciones
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
    console.error('Error al crear envío de insumos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear envío de insumos' },
      { status: 500 }
    );
  }
}