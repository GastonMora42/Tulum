// src/app/api/admin/contingencias/envio/[id]/resolver/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para resolver contingencia
const resolucionSchema = z.object({
  accion: z.enum(['aceptar_recibido', 'ajustar_stock']),
  observaciones: z.string(),
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadFinal: z.number().nonnegative()
    })
  ).optional() // Solo necesario si accion es 'ajustar_stock'
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('contingencia:resolver')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = resolucionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { accion, observaciones, items } = validation.data;
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar que existe la contingencia y está relacionada con el envío
    const contingencia = await prisma.contingencia.findFirst({
      where: {
        envioId: params.id,
        estado: 'pendiente'
      }
    });
    
    if (!contingencia) {
      return NextResponse.json(
        { error: 'Contingencia no encontrada o ya resuelta' },
        { status: 404 }
      );
    }
    
    // Verificar que el envío existe y está en estado con_contingencia
    const envio = await prisma.envio.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        destino: true
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    if (envio.estado !== 'con_contingencia') {
      return NextResponse.json(
        { error: `El envío no está en estado de contingencia` },
        { status: 400 }
      );
    }
    
    // Procesar según la acción elegida
    const resultado = await prisma.$transaction(async (tx) => {
      // Resolver la contingencia
      await tx.contingencia.update({
        where: { id: contingencia.id },
        data: {
          estado: 'resuelto',
          respuesta: observaciones,
          resueltoPor: user.id,
          fechaRespuesta: new Date(),
          ajusteRealizado: true
        }
      });
      
      if (accion === 'aceptar_recibido') {
        // Aceptar las cantidades recibidas tal cual y actualizar stock
        await tx.envio.update({
          where: { id: params.id },
          data: {
            estado: 'recibido'
          }
        });
        
        // Actualizar stock con las cantidades recibidas
        for (const item of envio.items) {
          if (item.insumoId && item.cantidadRecibida !== null) {
            // Buscar o crear stock en destino
            let stockDestino = await tx.stock.findFirst({
              where: {
                insumoId: item.insumoId,
                ubicacionId: envio.destinoId
              }
            });
            
            if (stockDestino) {
              // Actualizar stock existente
              stockDestino = await tx.stock.update({
                where: { id: stockDestino.id },
                data: {
                  cantidad: stockDestino.cantidad + item.cantidadRecibida,
                  ultimaActualizacion: new Date(),
                  version: { increment: 1 }
                }
              });
            } else {
              // Crear nuevo registro de stock
              stockDestino = await tx.stock.create({
                data: {
                  insumoId: item.insumoId,
                  ubicacionId: envio.destinoId,
                  cantidad: item.cantidadRecibida,
                  ultimaActualizacion: new Date()
                }
              });
            }
            
            // Registrar movimiento de stock
            await tx.movimientoStock.create({
              data: {
                stockId: stockDestino.id,
                tipoMovimiento: 'entrada',
                cantidad: item.cantidadRecibida,
                motivo: `Recepción ajustada de envío #${envio.id}`,
                usuarioId: user.id,
                envioId: envio.id,
                fecha: new Date()
              }
            });
          }
        }
      } else if (accion === 'ajustar_stock') {
        // Validar que se proporcionaron items para ajustar
        if (!items || items.length === 0) {
          throw new Error('Se requieren items para ajustar el stock');
        }
        
        // Crear un mapa de los items del envío para fácil acceso
        const itemsEnvioMap = new Map();
        envio.items.forEach(item => {
          itemsEnvioMap.set(item.id, item);
        });
        
        // Verificar que todos los items a ajustar pertenecen al envío
        for (const itemAjuste of items) {
          if (!itemsEnvioMap.has(itemAjuste.itemEnvioId)) {
            throw new Error(`El item con ID ${itemAjuste.itemEnvioId} no pertenece a este envío`);
          }
        }
        
        // Actualizar envío
        await tx.envio.update({
          where: { id: params.id },
          data: {
            estado: 'recibido'
          }
        });
        
        // Ajustar cada item y actualizar stock
        for (const itemAjuste of items) {
          const itemEnvio = itemsEnvioMap.get(itemAjuste.itemEnvioId);
          
          // Actualizar cantidad final recibida
          await tx.itemEnvio.update({
            where: { id: itemAjuste.itemEnvioId },
            data: {
              cantidadRecibida: itemAjuste.cantidadFinal
            }
          });
          
          // Si es insumo, actualizar stock
          if (itemEnvio.insumoId) {
            // Buscar o crear stock en destino
            let stockDestino = await tx.stock.findFirst({
              where: {
                insumoId: itemEnvio.insumoId,
                ubicacionId: envio.destinoId
              }
            });
            
            if (stockDestino) {
              // Actualizar stock existente
              stockDestino = await tx.stock.update({
                where: { id: stockDestino.id },
                data: {
                  cantidad: stockDestino.cantidad + itemAjuste.cantidadFinal,
                  ultimaActualizacion: new Date(),
                  version: { increment: 1 }
                }
              });
            } else {
              // Crear nuevo registro de stock
              stockDestino = await tx.stock.create({
                data: {
                  insumoId: itemEnvio.insumoId,
                  ubicacionId: envio.destinoId,
                  cantidad: itemAjuste.cantidadFinal,
                  ultimaActualizacion: new Date()
                }
              });
            }
            
            // Registrar movimiento de stock
            await tx.movimientoStock.create({
              data: {
                stockId: stockDestino.id,
                tipoMovimiento: 'entrada',
                cantidad: itemAjuste.cantidadFinal,
                motivo: `Recepción ajustada manual de envío #${envio.id}`,
                usuarioId: user.id,
                envioId: envio.id,
                fecha: new Date()
              }
            });
          }
        }
      }
      
      // Retornar el envío actualizado
      return tx.envio.findUnique({
        where: { id: params.id },
        include: {
          origen: true,
          destino: true,
          usuario: true,
          items: {
            include: {
              insumo: true
            }
          },
          contingencias: {
            include: {
              usuario: true
            }
          }
        }
      });
    });
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error al resolver contingencia de envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al resolver contingencia de envío' },
      { status: 500 }
    );
  }
}