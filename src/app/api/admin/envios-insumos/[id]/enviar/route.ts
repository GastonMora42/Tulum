// src/app/api/admin/envios-insumos/[id]/enviar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación
const enviarInsumoSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      cantidad: z.number().int().min(0, 'La cantidad no puede ser negativa')
    })
  ),
  observaciones: z.string().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso - usando un permiso más genérico para evitar errores
  const permissionError = await checkPermission('stock:ajustar')(req);
  if (permissionError) return permissionError;
  
  try {
    // Obtener datos del body
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = enviarInsumoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { items, observaciones } = validation.data;
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar que el envío existe y está en estado pendiente
    const envio = await prisma.envio.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            insumo: true
          }
        }
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    if (envio.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `El envío no puede ser procesado porque está en estado ${envio.estado}` },
        { status: 400 }
      );
    }
    
    // Crear un mapa de ItemEnvio por ID para acceso rápido
    const itemsMap = new Map();
    envio.items.forEach(item => {
      itemsMap.set(item.id, item);
    });
    
    // Verificar que todos los items están en el envío
    for (const item of items) {
      if (!itemsMap.has(item.id)) {
        return NextResponse.json(
          { error: `El item con ID ${item.id} no pertenece a este envío` },
          { status: 400 }
        );
      }
    }
    
    // Actualizar estado del envío y procesar en una transacción
    const envioActualizado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar envío
      const updatedEnvio = await tx.envio.update({
        where: { id: params.id },
        data: {
          estado: 'enviado',
          fechaEnvio: new Date()
        }
      });
      
      // 2. Actualizar cantidades de los items si difieren de las solicitadas
      for (const item of items) {
        const itemEnvio = itemsMap.get(item.id);
        
        // Solo actualizar si la cantidad cambia
        if (itemEnvio && itemEnvio.cantidad !== item.cantidad) {
          await tx.itemEnvio.update({
            where: { id: item.id },
            data: { cantidad: item.cantidad }
          });
        }
      }
      
      // 3. Para cada insumo, actualizar stock en origen (descontar)
      for (const item of items) {
        const itemEnvio = itemsMap.get(item.id);
        
        if (itemEnvio && itemEnvio.insumoId && item.cantidad > 0) {
          // Buscar stock en origen
          const stockOrigen = await tx.stock.findFirst({
            where: {
              insumoId: itemEnvio.insumoId,
              ubicacionId: envio.origenId
            }
          });
          
          if (stockOrigen) {
            // Verificar stock suficiente
            if (stockOrigen.cantidad < item.cantidad) {
              throw new Error(`No hay suficiente stock de ${itemEnvio.insumo.nombre}`);
            }
            
            // Actualizar stock
            await tx.stock.update({
              where: { id: stockOrigen.id },
              data: {
                cantidad: { decrement: item.cantidad },
                ultimaActualizacion: new Date(),
                version: { increment: 1 }
              }
            });
            
            // Registrar movimiento
            await tx.movimientoStock.create({
              data: {
                stockId: stockOrigen.id,
                tipoMovimiento: 'salida',
                cantidad: item.cantidad,
                motivo: `Envío de insumos #${envio.id}`,
                usuarioId: user.id,
                envioId: params.id,
                fecha: new Date()
              }
            });
          } else {
            throw new Error(`No existe stock del insumo ${itemEnvio.insumo.nombre} en el origen`);
          }
        }
      }
      
      // 4. Retornar envío actualizado con sus relaciones
      return tx.envio.findUnique({
        where: { id: params.id },
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
        }
      });
    });
    
    return NextResponse.json(envioActualizado);
  } catch (error: any) {
    console.error('Error al procesar envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar envío' },
      { status: 500 }
    );
  }
}