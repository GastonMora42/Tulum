// src/server/services/produccion/produccionService.ts
import prisma from '@/server/db/client';
import { stockService } from '@/server/services/stock/stockService';

interface IniciarProduccionParams {
  recetaId: string;
  cantidad: number;
  usuarioId: string;
  ubicacionId: string; // Fábrica
  observaciones?: string;
}

interface FinalizarProduccionParams {
  produccionId: string;
  usuarioId: string;
  productoId: string;
  ubicacionId: string;
  cantidadProducida: number;
  observaciones?: string;
}

class ProduccionService {
  // Iniciar proceso de producción
  async iniciarProduccion(params: IniciarProduccionParams) {
    const { recetaId, cantidad, usuarioId, ubicacionId, observaciones } = params;
    
    // Verificar que la receta existe
    const receta = await prisma.receta.findUnique({
      where: { id: recetaId },
      include: {
        items: {
          include: {
            insumo: true
          }
        },
        productoRecetas: {
          include: {
            producto: true
          }
        }
      }
    });
    
    if (!receta) {
      throw new Error('La receta no existe');
    }
    
    // Verificar stock disponible de insumos
    const verificacionStock = await stockService.verificarStockInsumosParaProduccion(
      recetaId,
      cantidad,
      ubicacionId
    );
    
    if (!verificacionStock.suficienteParaProduccion) {
      throw new Error('No hay suficiente stock de insumos para esta producción');
    }
    
    // Crear el registro de producción
    return prisma.$transaction(async tx => {
      // Crear producción
      const produccion = await tx.production.create({
        data: {
          recetaId,
          cantidad,
          usuarioId,
          estado: 'en_proceso',
          fechaInicio: new Date(),
          observaciones
        }
      });
      
      // Descontar insumos del stock
      for (const item of receta.items) {
        // Cantidad a descontar por insumo
        const cantidadInsumo = item.cantidad * cantidad;
        
        await stockService.ajustarStock({
          insumoId: item.insumoId,
          ubicacionId,
          cantidad: -cantidadInsumo, // Valor negativo para descontar
          motivo: `Producción #${produccion.id}`,
          usuarioId,
          produccionId: produccion.id
        });
      }
      
      return produccion;
    });
  }
  
  // Finalizar producción
  async finalizarProduccion(params: FinalizarProduccionParams) {
    const { produccionId, usuarioId, productoId, ubicacionId, cantidadProducida, observaciones } = params;
    
    // Verificar que la producción existe y está en proceso
    const produccion = await prisma.production.findUnique({
      where: { id: produccionId }
    });
    
    if (!produccion) {
      throw new Error('La producción no existe');
    }
    
    if (produccion.estado !== 'en_proceso') {
      throw new Error('La producción no está en proceso');
    }
    
    return prisma.$transaction(async tx => {
      // Actualizar producción
      const produccionActualizada = await tx.production.update({
        where: { id: produccionId },
        data: {
          estado: 'finalizada',
          fechaFin: new Date(),
          observaciones: observaciones
            ? `${produccion.observaciones || ''}\n${observaciones}`
            : produccion.observaciones
        }
      });
      
      // Incrementar stock del producto
      await stockService.ajustarStock({
        productoId,
        ubicacionId,
        cantidad: cantidadProducida,
        motivo: `Producción finalizada #${produccionId}`,
        usuarioId,
        produccionId
      });
      
      return produccionActualizada;
    });
  }
  
  // Registrar contingencia en producción
  async registrarContingencia(
    produccionId: string, 
    usuarioId: string, 
    titulo: string, 
    descripcion: string
  ) {
    // Verificar que la producción existe
    const produccion = await prisma.production.findUnique({
      where: { id: produccionId }
    });
    
    if (!produccion) {
      throw new Error('La producción no existe');
    }
    
    return prisma.$transaction(async tx => {
      // Marcar producción con contingencia
      await tx.production.update({
        where: { id: produccionId },
        data: {
          estado: 'con_contingencia'
        }
      });
      
      // Crear registro de contingencia
      const contingencia = await tx.contingencia.create({
        data: {
          titulo,
          descripcion,
          origen: 'fabrica',
          produccionId,
          creadoPor: usuarioId,
          estado: 'pendiente'
        }
      });
      
      return contingencia;
    });
  }
  
  // Obtener producciones con filtros
  async getProducciones(filtros: {
    estado?: string;
    desde?: Date;
    hasta?: Date;
    usuarioId?: string;
  }) {
    const where: any = {};
    
    if (filtros.estado) {
      where.estado = filtros.estado;
    }
    
    if (filtros.desde || filtros.hasta) {
      where.fechaInicio = {};
      
      if (filtros.desde) {
        where.fechaInicio.gte = filtros.desde;
      }
      
      if (filtros.hasta) {
        where.fechaInicio.lte = filtros.hasta;
      }
    }
    
    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }
    
    return prisma.production.findMany({
      where,
      include: {
        receta: true,
        usuario: true,
        contingencias: true
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    });
  }
}

// Singleton para uso en la aplicación
export const produccionService = new ProduccionService();