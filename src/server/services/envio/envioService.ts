// src/server/services/envio/envioService.ts
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
    productoId?: string; // Opcional para pasar directo desde el cliente
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
        throw new Error(`No hay suficiente stock del producto ${item.productoId}`);
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
    
    console.log(`[EnvioService] Actualizando estado a 'en_transito' para el envío ${envioId}`);
    
    // CAMBIO: Actualizado para usar "en_transito" en lugar de "enviado"
    return prisma.envio.update({
      where: { id: envioId },
      data: {
        estado: 'en_transito',  // Cambiado de 'enviado' a 'en_transito'
        fechaEnvio: new Date()
      },
      include: {
        origen: true,
        destino: true,
        items: true
      }
    });
  }
  
  // Recibir envío
  async recibirEnvio(params: RecibirEnvioParams) {
    const { envioId, usuarioId, items, observaciones } = params;
    
    console.log(`[EnvioService] Recibiendo envío ${envioId} por usuario ${usuarioId}`);
    console.log(`[EnvioService] Items a recibir:`, items);
    
    // Verificar que el envío existe y está en tránsito o enviado
    const envio = await prisma.envio.findUnique({
      where: { id: envioId },
      include: {
        items: {
          include: {
            producto: true  // Incluir datos del producto
          }
        },
        destino: true
      }
    });
    
    if (!envio) {
      throw new Error('El envío no existe');
    }
    
    // CAMBIO: Aceptar tanto 'en_transito' como 'enviado'
    if (envio.estado !== 'en_transito' && envio.estado !== 'enviado') {
      throw new Error(`El envío no está en estado correcto para recepción. Estado actual: ${envio.estado}`);
    }
    
    console.log(`[EnvioService] Envío encontrado en estado: ${envio.estado}`);
    console.log(`[EnvioService] Destino: ${envio.destino.nombre} (${envio.destinoId})`);
    
    // Verificar que los items recibidos corresponden al envío
    const itemsEnvioMap = new Map(envio.items.map(item => [item.id, item]));
    
    for (const itemRecibido of items) {
      if (!itemsEnvioMap.has(itemRecibido.itemEnvioId)) {
        throw new Error(`El item ${itemRecibido.itemEnvioId} no pertenece a este envío`);
      }
    }
    
    // Procesar recepción en transacción
    return prisma.$transaction(async tx => {
      // Actualizar envío
      await tx.envio.update({
        where: { id: envioId },
        data: {
          estado: 'recibido',
          fechaRecepcion: new Date()
        }
      });
      
      console.log(`[EnvioService] Envío marcado como recibido`);
      
      // Variable para controlar si hay discrepancias
      let hayDiscrepancia = false;
      
      // Procesar cada item
      for (const itemRecibido of items) {
        const itemEnvio = itemsEnvioMap.get(itemRecibido.itemEnvioId)!;
        
        // CAMBIO: Verificar que el producto tiene ID válido
        if (!itemEnvio.productoId && !itemEnvio.producto?.id) {
          console.error(`[EnvioService] Error: Item ${itemRecibido.itemEnvioId} no tiene productoId válido`);
          throw new Error(`El ítem ${itemRecibido.itemEnvioId} no tiene un producto asociado válido`);
        }
        
        // Usar el ID de producto más confiable disponible
        const productoId = itemEnvio.productoId || itemEnvio.producto?.id;
        
        console.log(`[EnvioService] Procesando item: ${itemRecibido.itemEnvioId}`);
        console.log(`[EnvioService] Producto ID: ${productoId}`);
        console.log(`[EnvioService] Cantidad enviada: ${itemEnvio.cantidad}, Cantidad recibida: ${itemRecibido.cantidadRecibida}`);
        
        // Actualizar cantidad recibida
        await tx.itemEnvio.update({
          where: { id: itemRecibido.itemEnvioId },
          data: {
            cantidadRecibida: itemRecibido.cantidadRecibida
          }
        });
        
        // CAMBIO: Asegurar que nunca se pasa undefined como productoId
        await stockService.ajustarStock({
          productoId: productoId!,  // Usar el ID definitivo y asegurar que no es undefined
          ubicacionId: envio.destinoId,
          cantidad: itemRecibido.cantidadRecibida,
          motivo: `Recepción de envío #${envioId}`,
          usuarioId,
          envioId
        });
        
        console.log(`[EnvioService] Stock actualizado para producto ${productoId} en ubicación ${envio.destinoId}`);

        // Si hay discrepancia, crear contingencia
        if (itemRecibido.cantidadRecibida !== itemEnvio.cantidad) {
          hayDiscrepancia = true;
          
          await tx.contingencia.create({
            data: {
              titulo: `Discrepancia en envío #${envioId}`,
              descripcion: `Producto ${productoId}: Enviado ${itemEnvio.cantidad}, Recibido ${itemRecibido.cantidadRecibida}`,
              origen: 'sucursal',
              envioId,
              creadoPor: usuarioId,
              estado: 'pendiente'
            }
          });
          
          console.log(`[EnvioService] Creada contingencia por discrepancia en item ${itemRecibido.itemEnvioId}`);
        }
      }
      
      // Marcar envío con contingencia si hubo discrepancias
      if (hayDiscrepancia) {
        await tx.envio.update({
          where: { id: envioId },
          data: {
            estado: 'con_contingencia'
          }
        });
        
        console.log(`[EnvioService] Envío marcado con contingencia por discrepancias`);
      }
      
      console.log(`[EnvioService] Recepción completada exitosamente`);
      
      return tx.envio.findUnique({
        where: { id: envioId },
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
            producto: true
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