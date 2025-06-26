// src/server/services/envio/envioService.ts - VERSIÓN CORREGIDA PARA STOCK
import prisma from '@/server/db/client';
import { stockService } from '@/server/services/stock/stockService';

interface CrearEnvioParams {
  origenId: string;
  destinoId: string;
  usuarioId: string;
  items: Array<{
    productoId: string;
    cantidad: number;
  }>;
}

interface RecibirEnvioParams {
  envioId: string;
  usuarioId: string;
  items: Array<{
    itemEnvioId: string;
    cantidadRecibida: number;
  }>;
  observaciones?: string;
}

class EnvioService {
  
  // Crear nuevo envío
  async crearEnvio(params: CrearEnvioParams) {
    const { origenId, destinoId, usuarioId, items } = params;
    
    console.log(`[EnvioService] Creando envío desde ${origenId} hacia ${destinoId}`);
    
    // Verificar que origen y destino existen
    const origen = await prisma.ubicacion.findUnique({
      where: { id: origenId }
    });
    
    if (!origen) {
      throw new Error('La ubicación de origen no existe');
    }
    
    const destino = await prisma.ubicacion.findUnique({
      where: { id: destinoId }
    });
    
    if (!destino) {
      throw new Error('La ubicación de destino no existe');
    }
    
    // Verificar stock disponible en origen
    for (const item of items) {
      const verificacion = await stockService.verificarStockDisponible(
        item.productoId,
        origenId,
        item.cantidad
      );
      
      if (!verificacion.disponible) {
        throw new Error(`No hay suficiente stock del producto ${item.productoId}. Disponible: ${verificacion.stockActual}, Requerido: ${item.cantidad}`);
      }
    }
    
    // Crear envío en transacción
    return prisma.$transaction(async tx => {
      // Crear envío
      const envio = await tx.envio.create({
        data: {
          origenId,
          destinoId,
          usuarioId,
          estado: 'pendiente',
          fechaCreacion: new Date()
        }
      });
      
      console.log(`[EnvioService] Envío creado con ID: ${envio.id}`);
      
      // Crear items del envío
      for (const item of items) {
        await tx.itemEnvio.create({
          data: {
            envioId: envio.id,
            productoId: item.productoId,
            cantidad: item.cantidad
          }
        });
        
        // Descontar del stock de origen
        await stockService.ajustarStock({
          productoId: item.productoId,
          ubicacionId: origenId,
          cantidad: -item.cantidad, // Negativo para descontar
          motivo: `Envío #${envio.id} a ${destino.nombre}`,
          usuarioId,
          envioId: envio.id
        });
      }
      
      return tx.envio.findUnique({
        where: { id: envio.id },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          origen: true,
          destino: true
        }
      });
    });
  }
  
  async marcarEnviado(envioId: string, usuarioId: string) {
    console.log(`[EnvioService] Marcando envío ${envioId} como enviado por usuario ${usuarioId}`);
    
    const envio = await prisma.envio.findUnique({
      where: { id: envioId },
      include: {
        origen: true,
        destino: true
      }
    });
    
    if (!envio) {
      throw new Error('El envío no existe');
    }
    
    // Si ya está enviado, simplemente retornar el envío sin error
    if (envio.estado === 'enviado' || envio.estado === 'en_transito') {
      console.log(`[EnvioService] El envío ${envioId} ya está marcado como enviado o en tránsito`);
      return envio;
    }
    
    // Solo permitir marcar como enviado desde estado pendiente
    if (envio.estado !== 'pendiente') {
      throw new Error(`No se puede marcar como enviado un envío en estado ${envio.estado}`);
    }
    
    console.log(`[EnvioService] Actualizando estado a 'enviado' para el envío ${envioId}`);
    
    // 🔧 CORREGIDO: Usar estado 'enviado' para PDV
    return prisma.envio.update({
      where: { id: envioId },
      data: {
        estado: 'enviado', // Estado que PDV puede recibir
        fechaEnvio: new Date()
      },
      include: {
        origen: true,
        destino: true,
        items: true
      }
    });
  }
  
  // 🔧 MÉTODO DE RECEPCIÓN CORREGIDO
  async recibirEnvio(params: RecibirEnvioParams) {
    const { envioId, usuarioId, items, observaciones } = params;
    
    console.log(`[EnvioService] 🚀 INICIANDO RECEPCIÓN DE ENVÍO ${envioId}`);
    console.log(`[EnvioService] Usuario: ${usuarioId}`);
    console.log(`[EnvioService] Items a recibir:`, items.map(i => `${i.itemEnvioId}: ${i.cantidadRecibida}`));
    
    // 🔧 VERIFICAR QUE EL ENVÍO EXISTE Y ESTÁ EN ESTADO CORRECTO
    const envio = await prisma.envio.findUnique({
      where: { id: envioId },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigoBarras: true
              }
            },
            insumo: {
              select: {
                id: true,
                nombre: true,
                unidadMedida: true
              }
            }
          }
        },
        destino: {
          select: {
            id: true,
            nombre: true,
            tipo: true
          }
        },
        origen: {
          select: {
            id: true,
            nombre: true,
            tipo: true
          }
        }
      }
    });
    
    if (!envio) {
      throw new Error('El envío no existe');
    }
    
    console.log(`[EnvioService] ✅ Envío encontrado: ${envio.origen.nombre} → ${envio.destino.nombre}`);
    console.log(`[EnvioService] Estado actual: ${envio.estado}`);
    console.log(`[EnvioService] Items en envío: ${envio.items.length}`);
    
    // 🔧 ACEPTAR TANTO 'enviado' COMO 'en_transito'
    const estadosValidos = ['enviado', 'en_transito'];
    if (!estadosValidos.includes(envio.estado)) {
      throw new Error(`El envío no está en estado correcto para recepción. Estado actual: ${envio.estado}. Estados válidos: ${estadosValidos.join(', ')}`);
    }
    
    // 🔧 VALIDAR QUE TODOS LOS ITEMS RECIBIDOS PERTENECEN AL ENVÍO
    const itemsEnvioMap = new Map(envio.items.map(item => [item.id, item]));
    
    for (const itemRecibido of items) {
      if (!itemsEnvioMap.has(itemRecibido.itemEnvioId)) {
        throw new Error(`El item ${itemRecibido.itemEnvioId} no pertenece a este envío`);
      }
    }
    
    console.log(`[EnvioService] ✅ Validaciones completadas. Iniciando transacción de recepción...`);
    
    // 🔧 PROCESAR RECEPCIÓN EN TRANSACCIÓN
    return prisma.$transaction(async tx => {
      console.log(`[EnvioService] 📦 Procesando recepción en transacción...`);
      
      // Variable para controlar si hay discrepancias
      let hayDiscrepancia = false;
      const discrepancias = [];
      
      // 🔧 PROCESAR CADA ITEM CON LOGS DETALLADOS
      for (const itemRecibido of items) {
        const itemEnvio = itemsEnvioMap.get(itemRecibido.itemEnvioId)!;
        
        console.log(`[EnvioService] 📋 Procesando item: ${itemRecibido.itemEnvioId}`);
        console.log(`[EnvioService] Producto/Insumo: ${itemEnvio.producto?.nombre || itemEnvio.insumo?.nombre}`);
        console.log(`[EnvioService] Cantidad enviada: ${itemEnvio.cantidad}`);
        console.log(`[EnvioService] Cantidad recibida: ${itemRecibido.cantidadRecibida}`);
        
        // 🔧 VERIFICAR QUE TENEMOS UN PRODUCTO O INSUMO VÁLIDO
        const tieneProducto = itemEnvio.productoId && itemEnvio.producto;
        const tieneInsumo = itemEnvio.insumoId && itemEnvio.insumo;
        
        if (!tieneProducto && !tieneInsumo) {
          throw new Error(`El ítem ${itemRecibido.itemEnvioId} no tiene un producto o insumo asociado válido`);
        }
        
        // Actualizar cantidad recibida en el item del envío
        await tx.itemEnvio.update({
          where: { id: itemRecibido.itemEnvioId },
          data: {
            cantidadRecibida: itemRecibido.cantidadRecibida
          }
        });
        
        console.log(`[EnvioService] ✅ Cantidad recibida actualizada en item envío`);
        
        // 🔧 ACTUALIZAR STOCK EN DESTINO (SOLO SI LA CANTIDAD RECIBIDA > 0)
        if (itemRecibido.cantidadRecibida > 0) {
          try {
            if (tieneProducto) {
              // Actualizar stock de producto
              const ajusteStock = await stockService.ajustarStock({
                productoId: itemEnvio.productoId!,
                ubicacionId: envio.destinoId,
                cantidad: itemRecibido.cantidadRecibida,
                motivo: `Recepción de envío #${envioId}`,
                usuarioId,
                envioId,
                allowNegative: false // No permitir stock negativo en recepción
              });
              
              console.log(`[EnvioService] ✅ Stock de producto actualizado: ${ajusteStock.stock.cantidad}`);
              
            } else if (tieneInsumo) {
              // Actualizar stock de insumo
              const ajusteStock = await stockService.ajustarStock({
                insumoId: itemEnvio.insumoId!,
                ubicacionId: envio.destinoId,
                cantidad: itemRecibido.cantidadRecibida,
                motivo: `Recepción de envío #${envioId}`,
                usuarioId,
                envioId,
                allowNegative: false
              });
              
              console.log(`[EnvioService] ✅ Stock de insumo actualizado: ${ajusteStock.stock.cantidad}`);
            }
          } catch (stockError) {
            console.error(`[EnvioService] ❌ Error al actualizar stock:`, stockError);
            throw new Error(`Error al actualizar stock para item ${itemRecibido.itemEnvioId}: ${stockError instanceof Error ? stockError.message : 'Error desconocido'}`);
          }
        } else {
          console.log(`[EnvioService] ⚠️ Cantidad recibida es 0, no se actualiza stock`);
        }
        
        // 🔧 DETECTAR DISCREPANCIAS
        if (itemRecibido.cantidadRecibida !== itemEnvio.cantidad) {
          hayDiscrepancia = true;
          const discrepancia = {
            itemId: itemRecibido.itemEnvioId,
            nombre: itemEnvio.producto?.nombre || itemEnvio.insumo?.nombre,
            enviado: itemEnvio.cantidad,
            recibido: itemRecibido.cantidadRecibida,
            diferencia: itemRecibido.cantidadRecibida - itemEnvio.cantidad
          };
          discrepancias.push(discrepancia);
          
          console.log(`[EnvioService] ⚠️ Discrepancia detectada:`, discrepancia);
        }
      }
      
      // 🔧 CREAR CONTINGENCIA SI HAY DISCREPANCIAS
      if (hayDiscrepancia) {
        const descripcionDiscrepancias = discrepancias.map(d => 
          `${d.nombre}: Enviado ${d.enviado}, Recibido ${d.recibido} (${d.diferencia > 0 ? '+' : ''}${d.diferencia})`
        ).join('; ');
        
        await tx.contingencia.create({
          data: {
            titulo: `Discrepancia en recepción de envío #${envioId}`,
            descripcion: `Se detectaron diferencias en la recepción: ${descripcionDiscrepancias}. ${observaciones ? 'Observaciones: ' + observaciones : ''}`,
            origen: 'sucursal',
            envioId,
            ubicacionId: envio.destinoId,
            creadoPor: usuarioId,
            estado: 'pendiente',
            tipo: 'stock',
            urgente: discrepancias.some(d => Math.abs(d.diferencia) > 5) // Urgente si hay diferencias grandes
          }
        });
        
        console.log(`[EnvioService] 🚨 Contingencia creada por discrepancias`);
      }
      
      // 🔧 ACTUALIZAR ESTADO DEL ENVÍO
      const estadoFinal = hayDiscrepancia ? 'con_contingencia' : 'recibido';
      
      await tx.envio.update({
        where: { id: envioId },
        data: {
          estado: estadoFinal,
          fechaRecepcion: new Date()
        }
      });
      
      console.log(`[EnvioService] ✅ Envío marcado como: ${estadoFinal}`);
      
      // 🔧 OBTENER ENVÍO COMPLETO ACTUALIZADO
      const envioFinalizado = await tx.envio.findUnique({
        where: { id: envioId },
        include: {
          items: {
            include: {
              producto: true,
              insumo: true
            }
          },
          origen: true,
          destino: true,
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`[EnvioService] 🎉 RECEPCIÓN COMPLETADA EXITOSAMENTE`);
      console.log(`[EnvioService] Resumen: ${items.length} items procesados, ${discrepancias.length} discrepancias`);
      
      return envioFinalizado;
    });
  }
  
  // Obtener envíos con filtros
  async getEnvios(filtros: {
    estado?: string;
    origenId?: string;
    destinoId?: string;
    desde?: Date;
    hasta?: Date;
  }) {
    const where: any = {};
    
    if (filtros.estado) {
      where.estado = filtros.estado;
    }
    
    if (filtros.origenId) {
      where.origenId = filtros.origenId;
    }
    
    if (filtros.destinoId) {
      where.destinoId = filtros.destinoId;
    }
    
    if (filtros.desde || filtros.hasta) {
      where.fechaCreacion = {};
      
      if (filtros.desde) {
        where.fechaCreacion.gte = filtros.desde;
      }
      
      if (filtros.hasta) {
        where.fechaCreacion.lte = filtros.hasta;
      }
    }
    
    return prisma.envio.findMany({
      where,
      include: {
        items: {
          include: {
            producto: true,
            insumo: true
          }
        },
        origen: true,
        destino: true,
        usuario: true
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
  }
}

// Singleton para uso en la aplicación
export const envioService = new EnvioService();