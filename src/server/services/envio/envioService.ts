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
  }>;
  observaciones?: string;
}

class EnvioService {
  // Crear nuevo envío
  async crearEnvio(params: CrearEnvioParams) {
    const { origenId, destinoId, usuarioId, items } = params;
    
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
  
  // Marcar envío como enviado
  async marcarEnviado(envioId: string, usuarioId: string) {
    const envio = await prisma.envio.findUnique({
      where: { id: envioId }
    });
    
    if (!envio) {
      throw new Error('El envío no existe');
    }
    
    if (envio.estado !== 'pendiente') {
      throw new Error('El envío no está en estado pendiente');
    }
    
    return prisma.envio.update({
      where: { id: envioId },
      data: {
        estado: 'en_transito',
        fechaEnvio: new Date()
      }
    });
  }
  
  // Recibir envío
  async recibirEnvio(params: RecibirEnvioParams) {
    const { envioId, usuarioId, items, observaciones } = params;
    
    // Verificar que el envío existe y está en tránsito
    const envio = await prisma.envio.findUnique({
      where: { id: envioId },
      include: {
        items: true,
        destino: true
      }
    });
    
    if (!envio) {
      throw new Error('El envío no existe');
    }
    
    if (envio.estado !== 'en_transito') {
      throw new Error('El envío no está en tránsito');
    }
    
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
      
      // Procesar cada item
      for (const itemRecibido of items) {
        const itemEnvio = itemsEnvioMap.get(itemRecibido.itemEnvioId)!;
        
        // Actualizar cantidad recibida
        await tx.itemEnvio.update({
          where: { id: itemRecibido.itemEnvioId },
          data: {
            cantidadRecibida: itemRecibido.cantidadRecibida
          }
        });
        
        // Incrementar stock en destino
        await stockService.ajustarStock({
          productoId: itemEnvio.productoId,
          ubicacionId: envio.destinoId,
          cantidad: itemRecibido.cantidadRecibida,
          motivo: `Recepción de envío #${envioId}`,
          usuarioId,
          envioId
        });
        
        // Si hay discrepancia, crear contingencia
        if (itemRecibido.cantidadRecibida !== itemEnvio.cantidad) {
          await tx.contingencia.create({
            data: {
              titulo: `Discrepancia en envío #${envioId}`,
              descripcion: `Producto ${itemEnvio.productoId}: Enviado ${itemEnvio.cantidad}, Recibido ${itemRecibido.cantidadRecibida}`,
              origen: 'sucursal',
              envioId,
              creadoPor: usuarioId,
              estado: 'pendiente'
            }
          });
          
          // Marcar envío con contingencia
          await tx.envio.update({
            where: { id: envioId },
            data: {
              estado: 'con_contingencia'
            }
          });
        }
      }
      
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