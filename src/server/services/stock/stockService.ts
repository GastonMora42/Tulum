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
  cantidad: number;
  motivo: string;
  usuarioId: string;
  ventaId?: string;
  envioId?: string;
  produccionId?: string;
  allowNegative?: boolean; // Nuevo parámetro para permitir stock negativo
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
    const { 
      productoId, 
      insumoId, 
      ubicacionId, 
      cantidad, 
      motivo, 
      usuarioId, 
      ventaId, 
      envioId, 
      produccionId,
      allowNegative = false
    } = params;
    
    if (!productoId && !insumoId) {
      throw new Error('Debe especificar un producto o un insumo');
    }
    
    return prisma.$transaction(async tx => {
      // Intentar verificar si el usuario es admin
      let isAdmin = false;
      
      try {
        const usuario = await tx.user.findUnique({
          where: { id: usuarioId },
          include: { role: true }
        });
        
        // Considerar admin si es role-admin o tiene el permiso explícito
        isAdmin = usuario?.roleId === 'role-admin' || allowNegative;
      } catch (error) {
        console.error('Error al verificar rol de usuario:', error);
        // Si no podemos verificar, asumimos que no es admin a menos que allowNegative sea true
        isAdmin = allowNegative;
      }
      
      // Buscar stock existente
      let stock = await tx.stock.findFirst({
        where: {
          ...(productoId ? { productoId } : {}),
          ...(insumoId ? { insumoId } : {}),
          ubicacionId
        }
      });
      
      // Manejar caso de stock no existente
      if (!stock) {
        // Si no existe stock y es admin o estamos incrementando, lo creamos
        if (isAdmin || cantidad > 0) {
          stock = await tx.stock.create({
            data: {
              ...(productoId ? { productoId } : {}),
              ...(insumoId ? { insumoId } : {}),
              ubicacionId,
              cantidad: isAdmin && cantidad < 0 ? 0 : cantidad, // Si es admin y decrementando, crear con 0
              ultimaActualizacion: new Date()
            }
          });
          
          // Si creamos con 0 para admin y queremos decrementar
          if (isAdmin && cantidad < 0 && stock.cantidad === 0) {
            stock = await tx.stock.update({
              where: { id: stock.id },
              data: {
                cantidad: { increment: cantidad }, // Esto hará que quede negativo
                version: { increment: 1 },
                ultimaActualizacion: new Date()
              }
            });
          }
        } else {
          // No es admin y estamos decrementando, error
          throw new Error('No se puede reducir stock inexistente');
        }
      } else {
        // Stock existe, pero verificar que no quede negativo (excepto para admin)
        if (stock.cantidad + cantidad < 0 && !isAdmin) {
          throw new Error(`El ajuste dejaría el stock en negativo. Disponible: ${stock.cantidad}, Requerido: ${-cantidad}`);
        }
        
        // Actualizar stock
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
          usuarioId,
          fecha: new Date()
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
  
  // Verificar inconsistencias en el stock
  async verificarConsistencia() {
    try {
      const inconsistencias = [];
      
      // 1. Verificar productos/insumos con stock negativo
      const stocksNegativos = await prisma.stock.findMany({
        where: {
          cantidad: {
            lt: 0
          }
        },
        include: {
          producto: true,
          insumo: true,
          ubicacion: true
        }
      });
      
      for (const stock of stocksNegativos) {
        inconsistencias.push({
          tipo: stock.productoId ? 'producto' : 'insumo',
          id: stock.id,
          itemId: stock.productoId || stock.insumoId,
          nombre: stock.producto?.nombre || stock.insumo?.nombre || 'Desconocido',
          ubicacion: stock.ubicacion.nombre,
          ubicacionId: stock.ubicacionId,
          problema: 'Stock negativo',
          valor: stock.cantidad
        });
      }
      
      // 2. Verificar discrepancias entre movimientos y stock actual
      const stocks = await prisma.stock.findMany({
        include: {
          movimientos: true,
          producto: true,
          insumo: true,
          ubicacion: true
        }
      });
      
      for (const stock of stocks) {
        const entradas = stock.movimientos
          .filter(m => m.tipoMovimiento === 'entrada')
          .reduce((sum, m) => sum + m.cantidad, 0);
        
        const salidas = stock.movimientos
          .filter(m => m.tipoMovimiento === 'salida')
          .reduce((sum, m) => sum + m.cantidad, 0);
        
        const calculado = entradas - salidas;
        
        if (Math.abs(calculado - stock.cantidad) > 0.001) {
          inconsistencias.push({
            tipo: stock.productoId ? 'producto' : 'insumo',
            id: stock.id,
            itemId: stock.productoId || stock.insumoId,
            nombre: stock.producto?.nombre || stock.insumo?.nombre || 'Desconocido',
            ubicacion: stock.ubicacion.nombre,
            ubicacionId: stock.ubicacionId,
            problema: 'Discrepancia entre movimientos y stock',
            valorActual: stock.cantidad,
            valorCalculado: calculado,
            diferencia: stock.cantidad - calculado
          });
        }
      }
      
      return inconsistencias;
    } catch (error) {
      console.error('Error al verificar consistencia:', error);
      throw error;
    }
  }
  
  // Corregir inconsistencias detectadas
  async corregirInconsistencias() {
    try {
      const inconsistencias = await this.verificarConsistencia();
      const resultados = [];
      
      // Procesar cada inconsistencia en una transacción
      for (const inconsistencia of inconsistencias) {
        try {
          await prisma.$transaction(async (tx) => {
            if (inconsistencia.problema === 'Stock negativo') {
              // Corregir stock negativo
              await tx.stock.update({
                where: {
                  id: inconsistencia.id
                },
                data: {
                  cantidad: 0,
                  ultimaActualizacion: new Date()
                }
              });
              
              // Registrar movimiento de ajuste
              await tx.movimientoStock.create({
                data: {
                  stockId: inconsistencia.id,
                  tipoMovimiento: 'entrada',
                  cantidad: Math.abs(inconsistencia.valor || 0), // Añade || 0
                  motivo: 'Corrección automática de stock negativo',
                  fecha: new Date(),
                  // Usa un ID válido en vez de 'sistema-auto'
                  usuarioId: process.env.SYSTEM_USER_ID || 'sistema-auto', 
                }
              });

              resultados.push({
                ...inconsistencia,
                corregido: true,
                accion: 'Stock actualizado a 0'
              });
            } 
            else if (inconsistencia.problema === 'Discrepancia entre movimientos y stock') {
              // Corregir discrepancia
              await tx.stock.update({
                where: {
                  id: inconsistencia.id
                },
                data: {
                  cantidad: inconsistencia.valorCalculado,
                  ultimaActualizacion: new Date()
                }
              });
              
              // Registrar movimiento de ajuste
              await tx.movimientoStock.create({
                data: {
                  stockId: inconsistencia.id,
                  tipoMovimiento: inconsistencia.diferencia && inconsistencia.diferencia > 0 ? 'salida' : 'entrada',
                  cantidad: Math.abs(inconsistencia.diferencia || 0),
                  motivo: 'Corrección automática de discrepancia',
                  fecha: new Date(),
                  usuarioId: process.env.SYSTEM_USER_ID || 'sistema-auto',
                }
              });
            
              resultados.push({
                ...inconsistencia,
                corregido: true,
                accion: `Stock actualizado de ${inconsistencia.valorActual} a ${inconsistencia.valorCalculado}`
              });
            }
          });
        } catch (txError) {
          console.error('Error al corregir inconsistencia:', txError);
          resultados.push({
            ...inconsistencia,
            corregido: false,
            error: txError instanceof Error ? txError.message : 'Error desconocido'
          });
        }
      }
      const totalInconsistencias = Array.isArray(inconsistencias) ? inconsistencias.length : 0;
      return {
        totalInconsistencias,
        corregidas: resultados.filter(r => r.corregido).length,
        fallidas: resultados.filter(r => !r.corregido).length,
        detalles: resultados
      };
    } catch (error) {
      console.error('Error al corregir inconsistencias:', error);
      throw error;
    }
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