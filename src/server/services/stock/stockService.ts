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
  allowNegative?: boolean;
}

class StockService {
  corregirInconsistencias() {
      throw new Error('Method not implemented.');
  }
  // Obtener stock con filtros
  async getStock(filter: StockFilter) {
    console.log(`[StockService] Consultando stock con filtros:`, filter);
    
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
    
    try {
      const resultado = await prisma.stock.findMany({
        where,
        include: {
          producto: filter.includeProducto || false,
          insumo: filter.includeInsumo || false,
          ubicacion: true
        }
      });
      
      console.log(`[StockService] Se encontraron ${resultado.length} registros de stock`);
      return resultado;
    } catch (error) {
      console.error(`[StockService] Error al consultar stock:`, error);
      throw error;
    }
  }
  
  // Obtener productos con stock bajo
  async getProductosStockBajo(ubicacionId?: string) {
    console.log(`[StockService] Consultando productos con stock bajo en ubicación: ${ubicacionId || 'todas'}`);
    
    try {
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
      
      const bajosStock = stocks.filter(stock => {
        if (!stock.producto) return false;
        return stock.cantidad <= stock.producto.stockMinimo;
      });
      
      console.log(`[StockService] Se encontraron ${bajosStock.length} productos con stock bajo`);
      return bajosStock;
    } catch (error) {
      console.error(`[StockService] Error al consultar productos con stock bajo:`, error);
      throw error;
    }
  }
  
  // Obtener insumos con stock bajo
  async getInsumosStockBajo(ubicacionId?: string) {
    console.log(`[StockService] Consultando insumos con stock bajo en ubicación: ${ubicacionId || 'todas'}`);
    
    try {
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
      
      const bajosStock = stocks.filter(stock => {
        if (!stock.insumo) return false;
        return stock.cantidad <= stock.insumo.stockMinimo;
      });
      
      console.log(`[StockService] Se encontraron ${bajosStock.length} insumos con stock bajo`);
      return bajosStock;
    } catch (error) {
      console.error(`[StockService] Error al consultar insumos con stock bajo:`, error);
      throw error;
    }
  }
  
  // Ajustar stock (incrementar o decrementar)
  async ajustarStock(params: AjusteStockParams) {
    // Agregar log detallado para facilitar depuración
    console.log(`[StockService] Ajustando stock:`, {
      productoId: params.productoId,
      insumoId: params.insumoId,
      ubicacionId: params.ubicacionId,
      cantidad: params.cantidad,
      motivo: params.motivo,
      produccionId: params.produccionId,
      ventaId: params.ventaId,
      envioId: params.envioId
    });
    
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
        // Verificar rol del usuario
        const usuario = await prisma.user.findUnique({
          where: { id: params.usuarioId },
          include: { role: true }
        });
        
        if (usuario?.roleId === 'role-fabrica' && !params.produccionId && !params.envioId) {
          throw new Error('Los operadores de fábrica solo pueden modificar stock a través de producciones o envíos.');
        }
        
        // Considerar admin si es role-admin o tiene el permiso explícito
        isAdmin = usuario?.roleId === 'role-admin' || allowNegative;
        console.log(`[StockService] Usuario ${usuarioId} es admin o tiene permiso de stock negativo: ${isAdmin}`);
      } catch (error) {
        console.error('[StockService] Error al verificar rol de usuario:', error);
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
      
      console.log(`[StockService] Stock actual: ${stock ? stock.cantidad : 'no existe'}`);
      
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
          
          console.log(`[StockService] Stock creado con cantidad inicial: ${stock.cantidad}`);
          
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
            
            console.log(`[StockService] Stock actualizado a valor negativo: ${stock.cantidad}`);
          }
        } else {
          // No es admin y estamos decrementando, error
          console.error(`[StockService] Error: No se puede reducir stock inexistente`);
          throw new Error('No se puede reducir stock inexistente');
        }
      } else {
        // Stock existe, pero verificar que no quede negativo (excepto para admin)
        if (stock.cantidad + cantidad < 0 && !isAdmin) {
          const errorMsg = `El ajuste dejaría el stock en negativo. Disponible: ${stock.cantidad}, Requerido: ${-cantidad}`;
          console.error(`[StockService] Error: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        // Actualizar stock
        const cantidadAnterior = stock.cantidad;
        stock = await tx.stock.update({
          where: { id: stock.id },
          data: {
            cantidad: { increment: cantidad },
            version: { increment: 1 },
            ultimaActualizacion: new Date()
          }
        });
        
        console.log(`[StockService] Stock actualizado de ${cantidadAnterior} a ${stock.cantidad}`);
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
      
      console.log(`[StockService] Movimiento registrado: ${movimiento.id}, tipo: ${movimiento.tipoMovimiento}, cantidad: ${movimiento.cantidad}`);
      
      return { stock, movimiento };
    });
  }
  
  // Verificar stock disponible
  async verificarStockDisponible(productoId: string, ubicacionId: string, cantidadRequerida: number) {
    console.log(`[StockService] Verificando stock disponible para producto ${productoId} en ubicación ${ubicacionId}, cantidad: ${cantidadRequerida}`);
    
    try {
      const stock = await prisma.stock.findFirst({
        where: {
          productoId,
          ubicacionId
        },
        include: {
          producto: true
        }
      });
      
      if (!stock) {
        console.log(`[StockService] No hay stock registrado para producto ${productoId}`);
        return { disponible: false, stockActual: 0, stockRequerido: cantidadRequerida };
      }
      
      const disponible = stock.cantidad >= cantidadRequerida;
      console.log(`[StockService] Stock disponible: ${stock.cantidad}, suficiente: ${disponible}`);
      
      return {
        disponible,
        stockActual: stock.cantidad,
        stockRequerido: cantidadRequerida,
        producto: stock.producto
      };
    } catch (error) {
      console.error(`[StockService] Error al verificar stock disponible:`, error);
      throw error;
    }
  }
  
  // Verificar inconsistencias en el stock
  async verificarConsistencia() {
    console.log(`[StockService] Verificando consistencia de stock`);
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
      
      console.log(`[StockService] Se encontraron ${inconsistencias.length} inconsistencias`);
      return inconsistencias;
    } catch (error) {
      console.error(`[StockService] Error al verificar consistencia:`, error);
      throw error;
    }
  }
  
// src/server/services/stock/stockService.ts - Verifica que este método funciona correctamente
async verificarStockInsumosParaProduccion(recetaId: string, cantidadProduccion: number, ubicacionId: string) {
  console.log(`[StockService] Verificando stock para producción - Receta: ${recetaId}, Cantidad: ${cantidadProduccion}, Ubicación: ${ubicacionId}`);
  
  try {
    // Obtener receta completa con sus items e insumos
    const receta = await prisma.receta.findUnique({
      where: { id: recetaId },
      include: {
        items: {
          include: { insumo: true }
        }
      }
    });
    
    if (!receta) {
      throw new Error(`No se encontró la receta con ID ${recetaId}`);
    }
    
    // Extraer IDs de insumos para consultar stock en una sola operación
    const insumoIds = receta.items.map(item => item.insumoId);
    
    // Obtener stock actual de todos los insumos en una sola consulta
    const stocks = await prisma.stock.findMany({
      where: {
        insumoId: { in: insumoIds },
        ubicacionId
      }
    });
    
    // Crear un mapa para acceso rápido
    const stockMap = new Map();
    stocks.forEach(stock => {
      stockMap.set(stock.insumoId, stock.cantidad);
    });
    
    // Analizar cada item para ver si hay suficiente stock
    const resultados = receta.items.map(item => {
      // Calcular cantidad necesaria según la cantidad a producir
      const cantidadNecesaria = item.cantidad * cantidadProduccion;
      // Obtener stock disponible actual (0 si no existe)
      const stockDisponible = stockMap.get(item.insumoId) || 0;
      // Verificar si hay suficiente stock
      const suficiente = stockDisponible >= cantidadNecesaria;
      
      return {
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        cantidadNecesaria,
        stockDisponible,
        suficiente,
        unidadMedida: item.insumo.unidadMedida,
        faltante: suficiente ? 0 : cantidadNecesaria - stockDisponible
      };
    });
    
    // Determinar si hay suficiente stock para toda la producción
    const suficienteParaProduccion = resultados.every(r => r.suficiente);
    
    return {
      suficienteParaProduccion,
      detalleInsumos: resultados,
      receta: {
        id: receta.id,
        nombre: receta.nombre,
        rendimiento: receta.rendimiento
      }
    };
  } catch (error) {
    console.error(`[StockService] Error al verificar stock para producción:`, error);
    throw error;
  }
}

  // Método para el dashboard que muestra estadísticas de stock
  async getDashboardStock(ubicacionId: string) {
    console.log(`[StockService] Obteniendo estadísticas de stock para ubicación ${ubicacionId}`);
    
    try {
      // Obtener conteos y listas de productos e insumos con stock bajo
      const [productosStockBajo, insumosStockBajo] = await Promise.all([
        this.getProductosStockBajo(ubicacionId),
        this.getInsumosStockBajo(ubicacionId)
      ]);
      
      // Obtener totales generales
      const [productosStats, insumosStats] = await Promise.all([
        prisma.stock.count({
          where: {
            ubicacionId,
            productoId: { not: null }
          }
        }),
        prisma.stock.count({
          where: {
            ubicacionId,
            insumoId: { not: null }
          }
        })
      ]);
      
      return {
        productos: {
          total: productosStats,
          bajoMinimo: productosStockBajo.length,
          listaBajoMinimo: productosStockBajo
        },
        insumos: {
          total: insumosStats,
          bajoMinimo: insumosStockBajo.length,
          listaBajoMinimo: insumosStockBajo
        },
        ultimaActualizacion: new Date()
      };
    } catch (error) {
      console.error(`[StockService] Error al obtener estadísticas de stock:`, error);
      throw error;
    }
  }
}

// Singleton para uso en la aplicación
export const stockService = new StockService();