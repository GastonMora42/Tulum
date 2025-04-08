// src/server/services/stock/stockService.ts
import prisma from '@/server/db/client';
import { Prisma } from '@prisma/client';

interface StockFilter {
  ubicacionId?: string;
  productoId?: string;
  insumoId?: string;
  includeProducto?: boolean;
  includeInsumo?: boolean;
}

interface AjusteStockParams {
  productoId?: string;
  insumoId?: string;
  ubicacionId: string;
  cantidad: number
  motivo: string;
 usuarioId: string;
 ventaId?: string;
 envioId?: string;
 produccionId?: string;
}

class StockService {
 // Obtener stock con filtros
 async getStock(filter: StockFilter) {
   const where: Prisma.StockWhereInput = {};
   
   if (filter.ubicacionId) {
     where.ubicacionId = filter.ubicacionId;
   }
   
   if (filter.productoId) {
     where.productoId = filter.productoId;
   }
   
   if (filter.insumoId) {
     where.insumoId = filter.insumoId;
   }
   
   return prisma.stock.findMany({
     where,
     include: {
       producto: filter.includeProducto || false,
       insumo: filter.includeInsumo || false,
       ubicacion: true
     }
   });
 }
 
 // Obtener productos con stock bajo
 async getProductosStockBajo(ubicacionId?: string) {
   const stocks = await prisma.stock.findMany({
     where: {
       ...(ubicacionId ? { ubicacionId } : {}),
       productoId: { not: null },
       producto: {
         activo: true
       }
     },
     include: {
       producto: true,
       ubicacion: true
     }
   });
   
   return stocks.filter(stock => {
     if (!stock.producto) return false;
     return stock.cantidad <= stock.producto.stockMinimo;
   });
 }
 
 // Obtener insumos con stock bajo
 async getInsumosStockBajo(ubicacionId?: string) {
   const stocks = await prisma.stock.findMany({
     where: {
       ...(ubicacionId ? { ubicacionId } : {}),
       insumoId: { not: null },
       insumo: {
         activo: true
       }
     },
     include: {
       insumo: true,
       ubicacion: true
     }
   });
   
   return stocks.filter(stock => {
     if (!stock.insumo) return false;
     return stock.cantidad <= stock.insumo.stockMinimo;
   });
 }
 
 // Ajustar stock (incrementar o decrementar)
 async ajustarStock(params: AjusteStockParams) {
   const { productoId, insumoId, ubicacionId, cantidad, motivo, usuarioId, ventaId, envioId, produccionId } = params;
   
   if (!productoId && !insumoId) {
     throw new Error('Debe especificar un producto o un insumo');
   }
   
   // Verificar si existe stock para este producto/insumo en esta ubicación
   return prisma.$transaction(async tx => {
     let stock = await tx.stock.findFirst({
       where: {
         ...(productoId ? { productoId } : {}),
         ...(insumoId ? { insumoId } : {}),
         ubicacionId
       }
     });
     
     // Si no existe stock y estamos decrementando, es un error
     if (!stock && cantidad < 0) {
       throw new Error('No se puede reducir stock inexistente');
     }
     
     // Si no existe stock, crearlo
     if (!stock) {
       stock = await tx.stock.create({
         data: {
           ...(productoId ? { productoId } : {}),
           ...(insumoId ? { insumoId } : {}),
           ubicacionId,
           cantidad,
           ultimaActualizacion: new Date()
         }
       });
     } else {
       // Verificar que no quede negativo
       if (stock.cantidad + cantidad < 0) {
         throw new Error('El ajuste dejaría el stock en negativo');
       }
       
       // Actualizar stock existente y su versión para concurrencia optimista
       stock = await tx.stock.update({
         where: { id: stock.id },
         data: {
           cantidad: { increment: cantidad },
           version: { increment: 1 },
           ultimaActualizacion: new Date()
         }
       });
     }
     
     // Registrar movimiento
     const movimiento = await tx.movimientoStock.create({
       data: {
         stockId: stock.id,
         tipoMovimiento: cantidad > 0 ? 'entrada' : 'salida',
         cantidad: Math.abs(cantidad),
         motivo,
         ventaId,
         envioId,
         produccionId,
         usuarioId
       }
     });
     
     return { stock, movimiento };
   });
 }
 
 // Verificar stock disponible
 async verificarStockDisponible(productoId: string, ubicacionId: string, cantidadRequerida: number) {
   const stock = await prisma.stock.findFirst({
     where: {
       productoId,
       ubicacionId
     }
   });
   
   if (!stock) {
     return { disponible: false, stockActual: 0, stockRequerido: cantidadRequerida };
   }
   
   return {
     disponible: stock.cantidad >= cantidadRequerida,
     stockActual: stock.cantidad,
     stockRequerido: cantidadRequerida
   };
 }
 
 // Verificar stock de insumos para producción
 async verificarStockInsumosParaProduccion(recetaId: string, cantidadProduccion: number, ubicacionId: string) {
   // Obtener items de la receta
   const recetaItems = await prisma.recetaItem.findMany({
     where: { recetaId },
     include: { insumo: true }
   });
   
   const resultados = [];
   
   for (const item of recetaItems) {
     // Calcular cantidad necesaria para esta producción
     const cantidadNecesaria = item.cantidad * cantidadProduccion;
     
     // Verificar stock disponible
     const stock = await prisma.stock.findFirst({
       where: {
         insumoId: item.insumoId,
         ubicacionId
       }
     });
     
     resultados.push({
       insumoId: item.insumoId,
       nombre: item.insumo.nombre,
       cantidadNecesaria,
       stockDisponible: stock?.cantidad || 0,
       suficiente: (stock?.cantidad || 0) >= cantidadNecesaria,
       unidadMedida: item.insumo.unidadMedida
     });
   }
   
   return {
     suficienteParaProduccion: resultados.every(r => r.suficiente),
     detalleInsumos: resultados
   };
 }
}

// Singleton para uso en la aplicación
export const stockService = new StockService();