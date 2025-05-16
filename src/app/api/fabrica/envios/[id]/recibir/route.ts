// src/app/api/fabrica/envios/[id]/recibir/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para recepción
const recepcionEnvioSchema = z.object({
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadRecibida: z.number().nonnegative()
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
  
// Verificar permiso - USAMOS 'stock:ajustar' EN LUGAR DE 'fabrica:recibir-envios'
const permissionError = await checkPermission('envio:recibir')(req);
if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = recepcionEnvioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { items, observaciones } = validation.data;
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar que el envío existe y está en estado enviado
    const envio = await prisma.envio.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            insumo: true
          }
        },
        destino: true
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    if (envio.estado !== 'enviado') {
      return NextResponse.json(
        { error: `El envío no puede ser recibido porque está en estado ${envio.estado}` },
        { status: 400 }
      );
    }
    
    // Verificar que el destino coincide con la sucursal del usuario o es la fábrica predeterminada
    const userSucursalId = user.sucursalId || 'ubicacion-fabrica';
    
    if (envio.destinoId !== userSucursalId) {
      return NextResponse.json(
        { error: 'No tiene permiso para recibir este envío' },
        { status: 403 }
      );
    }
    
    // Crear un mapa de los items del envío para fácil acceso
    const itemsEnvioMap = new Map();
    envio.items.forEach((item) => {
      itemsEnvioMap.set(item.id, item);
    });
    
    // Verificar que todos los items recibidos corresponden al envío
    for (const itemRecibido of items) {
      if (!itemsEnvioMap.has(itemRecibido.itemEnvioId)) {
        return NextResponse.json(
          { error: `El item con ID ${itemRecibido.itemEnvioId} no pertenece a este envío` },
          { status: 400 }
        );
      }
    }
    
    // Detectar discrepancias
    let hayDiscrepancias = false;
    const discrepancias: { insumo: any; cantidadEnviada: any; cantidadRecibida: number; diferencia: number; }[] = [];
    
    for (const itemRecibido of items) {
      const itemEnvio = itemsEnvioMap.get(itemRecibido.itemEnvioId);
      
      if (itemRecibido.cantidadRecibida !== itemEnvio.cantidad) {
        hayDiscrepancias = true;
        discrepancias.push({
          insumo: itemEnvio.insumo?.nombre || 'Desconocido',
          cantidadEnviada: itemEnvio.cantidad,
          cantidadRecibida: itemRecibido.cantidadRecibida,
          diferencia: itemEnvio.cantidad - itemRecibido.cantidadRecibida
        });
      }
    }
    
    // Procesar la recepción según si hay discrepancias o no
    const resultado = await prisma.$transaction(async (tx) => {
      if (hayDiscrepancias) {
        // Registrar la recepción con discrepancias
        const envioActualizado = await tx.envio.update({
          where: { id: params.id },
          data: {
            estado: 'con_contingencia',
            fechaRecepcion: new Date()
          }
        });
        
        // Actualizar cantidades recibidas en cada item
        for (const itemRecibido of items) {
          await tx.itemEnvio.update({
            where: { id: itemRecibido.itemEnvioId },
            data: {
              cantidadRecibida: itemRecibido.cantidadRecibida
            }
          });
        }
        
        // Crear contingencia
        const contingencia = await tx.contingencia.create({
          data: {
            titulo: `Discrepancia en envío de insumos #${envio.id}`,
            descripcion: `Se encontraron discrepancias en las cantidades de insumos recibidos:\n${JSON.stringify(discrepancias, null, 2)}`,
            origen: 'fabrica',
            envioId: envio.id,
            creadoPor: user.id,
            estado: 'pendiente'
          }
        });
        
        return {
          envio: envioActualizado,
          hayDiscrepancias: true,
          discrepancias,
          contingencia
        };
      } else {
        // Recepción sin discrepancias - actualizar stock
        const envioActualizado = await tx.envio.update({
          where: { id: params.id },
          data: {
            estado: 'recibido',
            fechaRecepcion: new Date()
          }
        });
        
        // Actualizar cantidades recibidas en cada item
        for (const itemRecibido of items) {
          const itemEnvio = itemsEnvioMap.get(itemRecibido.itemEnvioId);
          
          await tx.itemEnvio.update({
            where: { id: itemRecibido.itemEnvioId },
            data: {
              cantidadRecibida: itemRecibido.cantidadRecibida
            }
          });
          
          // Incrementar stock en destino
          if (itemEnvio.insumoId) {
            // Buscar si ya existe stock de este insumo en el destino
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
                  cantidad: stockDestino.cantidad + itemRecibido.cantidadRecibida,
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
                  cantidad: itemRecibido.cantidadRecibida,
                  ultimaActualizacion: new Date()
                }
              });
            }
            
            // Registrar movimiento de stock
            await tx.movimientoStock.create({
              data: {
                stockId: stockDestino.id,
                tipoMovimiento: 'entrada',
                cantidad: itemRecibido.cantidadRecibida,
                motivo: `Recepción de envío #${envio.id}`,
                usuarioId: user.id,
                envioId: envio.id,
                fecha: new Date()
              }
            });
          }
        }
        
        return {
          envio: envioActualizado,
          hayDiscrepancias: false
        };
      }
    });
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error al recibir envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recibir envío' },
      { status: 500 }
    );
  }
}