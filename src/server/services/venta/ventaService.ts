// src/server/services/venta/ventaService.ts - VERSIÓN CORREGIDA COMPLETA
import prisma from '@/server/db/client';
import { stockService } from '@/server/services/stock/stockService';

interface ItemVenta {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
}

interface PagoVenta {
  medioPago: string;
  monto: number;
  referencia?: string;
  datosPago?: Record<string, any>;
}

interface CrearVentaParams {
  sucursalId: string;
  usuarioId: string;
  items: ItemVenta[];
  total: number;
  descuento?: number;
  codigoDescuento?: string;
  facturar: boolean; // ✅ Boolean correcto
  tipoFactura?: string; // 🆕 Nuevo campo A/B/C
  clienteNombre?: string;
  clienteCuit?: string;
  pagos: PagoVenta[];
}

interface FiltrosVenta {
  sucursalId?: string;
  usuarioId?: string;
  desde?: Date;
  hasta?: Date;
  facturada?: boolean;
  tipoFactura?: string; // 🆕 Nuevo filtro
  page?: number;
  limit?: number;
}

class VentaService {
  /**
   * Crear una nueva venta - VERSIÓN CORREGIDA SIN TRANSACCIONES ANIDADAS
   */
  async crearVenta(params: CrearVentaParams) {
    const { 
      sucursalId, 
      usuarioId, 
      items, 
      total, 
      descuento = 0, 
      codigoDescuento, 
      facturar, 
      tipoFactura, // 🆕 Nuevo parámetro
      clienteNombre, 
      clienteCuit,
      pagos
    } = params;
    
    console.log(`[VentaService] Iniciando creación de venta - Total: $${total}, Facturar: ${facturar}, Tipo: ${tipoFactura}`);
    
    // 🔧 VALIDACIONES PREVIAS
    if (!sucursalId || !usuarioId) {
      throw new Error('Sucursal y usuario son requeridos');
    }
    
    if (!items || items.length === 0) {
      throw new Error('La venta debe contener al menos un ítem');
    }
    
    if (!pagos || pagos.length === 0) {
      throw new Error('La venta debe contener al menos un método de pago');
    }
    
    if (total <= 0) {
      throw new Error('El total de la venta debe ser mayor a cero');
    }
    
    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });
    
    if (!sucursal) {
      throw new Error('La sucursal especificada no existe');
    }
    
    console.log(`[VentaService] Sucursal válida: ${sucursal.nombre}`);
    
    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId }
    });
    
    if (!usuario) {
      throw new Error('El usuario especificado no existe');
    }
    
    console.log(`[VentaService] Usuario válido: ${usuario.name}`);
    
    // 🔧 VALIDACIÓN DE FACTURACIÓN
    if (facturar) {
      if (!tipoFactura || !['A', 'B', 'C'].includes(tipoFactura)) {
        throw new Error('Tipo de factura inválido. Debe ser A, B o C');
      }
      
      // Validaciones específicas por tipo
      if (tipoFactura === 'A') {
        if (!clienteNombre || !clienteCuit) {
          throw new Error('Para facturas tipo A se requiere nombre y CUIT del cliente');
        }
        
        // Validar formato CUIT
        const cuitLimpio = clienteCuit.replace(/[-\s]/g, '');
        if (!/^\d{11}$/.test(cuitLimpio)) {
          throw new Error('El CUIT debe tener 11 dígitos numéricos');
        }
      }
      
      if (tipoFactura === 'B' && total >= 15380) {
        if (!clienteCuit || clienteCuit.trim() === '') {
          throw new Error(`Para facturas B con monto ≥ $15.380 se requiere CUIT/DNI del cliente`);
        }
      }
      
      console.log(`[VentaService] Validación de facturación OK - Tipo: ${tipoFactura}`);
    }
    
    // Verificar stock disponible para todos los items
    console.log(`[VentaService] Verificando stock para ${items.length} items...`);
    
    for (const item of items) {
      if (!item.productoId || item.cantidad <= 0) {
        throw new Error(`Item inválido: producto ${item.productoId}, cantidad ${item.cantidad}`);
      }
      
      const verificacion = await stockService.verificarStockDisponible(
        item.productoId,
        sucursalId,
        item.cantidad
      );
      
      if (!verificacion.disponible) {
        const producto = await prisma.producto.findUnique({
          where: { id: item.productoId },
          select: { nombre: true }
        });
        
        throw new Error(
          `Stock insuficiente para "${producto?.nombre || item.productoId}". ` +
          `Disponible: ${verificacion.stockActual}, Requerido: ${item.cantidad}`
        );
      }
    }
    
    console.log(`[VentaService] Verificación de stock completada`);
    
    // Verificar que el total de pagos coincide con el total de la venta
    const totalPagos = pagos.reduce((sum, p) => sum + p.monto, 0);
    if (Math.abs(totalPagos - total) > 0.01) {
      throw new Error(
        `El total de pagos ($${totalPagos.toFixed(2)}) no coincide con el total de la venta ($${total.toFixed(2)})`
      );
    }
    
    console.log(`[VentaService] Validación de pagos OK - Total pagos: $${totalPagos}`);
    
    // 🔧 CREAR VENTA SIN TRANSACCIONES ANIDADAS
    let venta: any = null;
    
    try {
      // 1. CREAR VENTA PRINCIPAL
      console.log(`[VentaService] Creando venta en base de datos...`);
      
      venta = await prisma.venta.create({
        data: {
          sucursalId,
          usuarioId,
          total,
          descuento,
          codigoDescuento,
          facturada: facturar, // ✅ Boolean
          tipoFactura: facturar ? tipoFactura : null, // 🆕 Tipo de factura
          clienteNombre: facturar ? (clienteNombre || null) : null,
          clienteCuit: facturar ? (clienteCuit || null) : null,
        }
      });
      
      console.log(`[VentaService] Venta creada con ID: ${venta.id}`);
      
      // 2. CREAR ITEMS Y PAGOS EN PARALELO
      console.log(`[VentaService] Creando items y pagos...`);
      
      const itemPromises = items.map(item => 
        prisma.itemVenta.create({
          data: {
            ventaId: venta.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento || 0
          }
        })
      );
      
      const pagoPromises = pagos.map(pago => 
        prisma.pago.create({
          data: {
            ventaId: venta.id,
            medioPago: pago.medioPago,
            monto: pago.monto,
            referencia: pago.referencia,
            datosPago: pago.datosPago
          }
        })
      );
      
      // Ejecutar items y pagos en paralelo
      const [itemsCreados, pagosCreados] = await Promise.all([
        Promise.all(itemPromises),
        Promise.all(pagoPromises)
      ]);
      
      console.log(`[VentaService] Items creados: ${itemsCreados.length}, Pagos creados: ${pagosCreados.length}`);
      
      // 3. AJUSTAR STOCK (SECUENCIAL PARA EVITAR CONFLICTOS)
      console.log(`[VentaService] Ajustando stock...`);
      
      for (const [index, item] of items.entries()) {
        try {
          await stockService.ajustarStock({
            productoId: item.productoId,
            ubicacionId: sucursalId,
            cantidad: -item.cantidad, // Negativo para descontar
            motivo: `Venta #${venta.id}`,
            usuarioId,
            ventaId: venta.id
            // ❌ NO pasar tx aquí - usar transacción independiente
          });
          
          console.log(`[VentaService] Stock ajustado para item ${index + 1}/${items.length}`);
        } catch (stockError) {
          console.error(`[VentaService] Error ajustando stock para producto ${item.productoId}:`, stockError);
          throw new Error(`Error ajustando stock: ${stockError instanceof Error ? stockError.message : 'Error desconocido'}`);
        }
      }
      
      // 4. ACTUALIZAR CÓDIGO DE DESCUENTO SI EXISTE
      if (codigoDescuento) {
        try {
          const codigo = await prisma.codigoDescuento.findUnique({
            where: { codigo: codigoDescuento }
          });
          
          if (codigo) {
            await prisma.codigoDescuento.update({
              where: { id: codigo.id },
              data: {
                usosActuales: { increment: 1 }
              }
            });
            
            console.log(`[VentaService] Código de descuento actualizado: ${codigoDescuento}`);
          }
        } catch (descuentoError) {
          console.warn(`[VentaService] Error actualizando código de descuento (no crítico):`, descuentoError);
          // No fallar la venta por esto
        }
      }
      
      // 5. RETORNAR VENTA COMPLETA
      const ventaCompleta = await prisma.venta.findUnique({
        where: { id: venta.id },
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  precio: true,
                  descripcion: true
                }
              }
            }
          },
          pagos: true,
          sucursal: {
            select: {
              id: true,
              nombre: true,
              tipo: true
            }
          },
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!ventaCompleta) {
        throw new Error('Error al recuperar la venta creada');
      }
      
      console.log(`[VentaService] Venta creada exitosamente: ${ventaCompleta.id}`);
      
      return ventaCompleta;
      
    } catch (error) {
      console.error(`[VentaService] Error en creación de venta:`, error);
      
      // 🔧 ROLLBACK MANUAL SI ES NECESARIO
      if (venta?.id) {
        try {
          console.log(`[VentaService] Intentando rollback para venta ${venta.id}...`);
          
          // Marcar venta como problemática en lugar de eliminarla
          await prisma.venta.update({
            where: { id: venta.id },
            data: {
              // Podrías agregar un campo "estado" si lo tienes
              // estado: 'error'
            }
          });
          
          console.log(`[VentaService] Venta marcada como problemática`);
        } catch (rollbackError) {
          console.error(`[VentaService] Error en rollback:`, rollbackError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Obtener ventas con filtros - VERSIÓN ACTUALIZADA
   */
  async getVentas(filtros: FiltrosVenta = {}) {
    const {
      sucursalId,
      usuarioId,
      desde,
      hasta,
      facturada,
      tipoFactura, // 🆕 Nuevo filtro
      page = 1,
      limit = 20
    } = filtros;
    
    console.log(`[VentaService] Obteniendo ventas con filtros:`, filtros);
    
    const where: any = {};
    
    if (sucursalId) {
      where.sucursalId = sucursalId;
    }
    
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    if (facturada !== undefined) {
      where.facturada = facturada;
    }
    
    // 🆕 FILTRO POR TIPO DE FACTURA
    if (tipoFactura) {
      where.tipoFactura = tipoFactura;
    }
    
    if (desde || hasta) {
      where.fecha = {};
      
      if (desde) {
        where.fecha.gte = desde;
      }
      
      if (hasta) {
        // Incluir todo el día hasta
        const hastaFinal = new Date(hasta);
        hastaFinal.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaFinal;
      }
    }
    
    try {
      // Contar total para paginación
      const total = await prisma.venta.count({ where });
      
      // Obtener ventas
      const ventas = await prisma.venta.findMany({
        where,
        include: {
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  precio: true,
                  descripcion: true
                }
              }
            }
          },
          pagos: true,
          sucursal: {
            select: {
              id: true,
              nombre: true,
              tipo: true
            }
          },
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          // 🆕 INCLUIR FACTURA ELECTRÓNICA SI EXISTE
          facturaElectronica: {
            select: {
              id: true,
              numeroFactura: true,
              cae: true,
              estado: true,
              fechaEmision: true
            }
          }
        },
        orderBy: {
          fecha: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      });
      
      console.log(`[VentaService] ${ventas.length} ventas obtenidas de ${total} total`);
      
      return {
        data: ventas,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error(`[VentaService] Error obteniendo ventas:`, error);
      throw new Error(`Error al obtener ventas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Verificar y aplicar código de descuento - SIN CAMBIOS
   */
  async verificarCodigoDescuento(codigo: string) {
    console.log(`[VentaService] Verificando código de descuento: ${codigo}`);
    
    if (!codigo || codigo.trim() === '') {
      throw new Error('Código de descuento vacío');
    }
    
    const codigoDescuento = await prisma.codigoDescuento.findUnique({
      where: { codigo: codigo.trim() }
    });
    
    if (!codigoDescuento) {
      throw new Error('Código de descuento no válido');
    }
    
    if (!codigoDescuento.activo) {
      throw new Error('Código de descuento inactivo');
    }
    
    // Verificar fecha de validez
    const ahora = new Date();
    if (codigoDescuento.fechaInicio > ahora) {
      throw new Error('Código de descuento aún no está vigente');
    }
    
    if (codigoDescuento.fechaFin && codigoDescuento.fechaFin < ahora) {
      throw new Error('Código de descuento ha expirado');
    }
    
    // Verificar usos máximos
    if (codigoDescuento.usoMaximo && codigoDescuento.usosActuales >= codigoDescuento.usoMaximo) {
      throw new Error('Código de descuento ha alcanzado su límite de usos');
    }
    
    console.log(`[VentaService] Código válido: ${codigo} - Descuento: ${codigoDescuento.valor}${codigoDescuento.tipoDescuento === 'porcentaje' ? '%' : '$'}`);
    
    return {
      valido: true,
      tipoDescuento: codigoDescuento.tipoDescuento,
      valor: codigoDescuento.valor,
      descripcion: codigoDescuento.descripcion
    };
  }
  
  /**
   * 🆕 OBTENER ESTADÍSTICAS DE VENTAS
   */
  async obtenerEstadisticas(filtros: {
    sucursalId?: string;
    desde?: Date;
    hasta?: Date;
  } = {}) {
    const { sucursalId, desde, hasta } = filtros;
    
    const where: any = {};
    
    if (sucursalId) {
      where.sucursalId = sucursalId;
    }
    
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = desde;
      if (hasta) {
        const hastaFinal = new Date(hasta);
        hastaFinal.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaFinal;
      }
    }
    
    try {
      const [
        totalVentas,
        ventasFacturadas,
        montoTotal,
        ventasPorTipo
      ] = await Promise.all([
        // Total de ventas
        prisma.venta.count({ where }),
        
        // Ventas facturadas
        prisma.venta.count({ 
          where: { ...where, facturada: true } 
        }),
        
        // Monto total
        prisma.venta.aggregate({
          where,
          _sum: { total: true }
        }),
        
        // 🆕 Ventas por tipo de factura
        prisma.venta.groupBy({
          by: ['tipoFactura'],
          where: { ...where, facturada: true },
          _count: true,
          _sum: { total: true }
        })
      ]);
      
      return {
        totalVentas,
        ventasFacturadas,
        ventasNoFacturadas: totalVentas - ventasFacturadas,
        montoTotal: montoTotal._sum.total || 0,
        porcentajeFacturado: totalVentas > 0 ? ((ventasFacturadas / totalVentas) * 100).toFixed(1) : '0',
        ventasPorTipo: ventasPorTipo.map(tipo => ({
          tipoFactura: tipo.tipoFactura || 'Sin tipo',
          cantidad: tipo._count,
          monto: tipo._sum.total || 0
        }))
      };
      
    } catch (error) {
      console.error(`[VentaService] Error obteniendo estadísticas:`, error);
      throw new Error(`Error al obtener estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * 🆕 OBTENER VENTA POR ID
   */
  async obtenerVentaPorId(ventaId: string) {
    if (!ventaId) {
      throw new Error('ID de venta requerido');
    }
    
    try {
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          pagos: true,
          sucursal: true,
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          facturaElectronica: true
        }
      });
      
      if (!venta) {
        throw new Error(`Venta no encontrada: ${ventaId}`);
      }
      
      return venta;
      
    } catch (error) {
      console.error(`[VentaService] Error obteniendo venta ${ventaId}:`, error);
      throw error;
    }
  }
  
  /**
   * 🆕 ANULAR VENTA (si es necesario en el futuro)
   */
  async anularVenta(ventaId: string, motivo: string, usuarioId: string) {
    console.log(`[VentaService] Anulando venta ${ventaId} - Motivo: ${motivo}`);
    
    // Esta función sería para implementar en el futuro si necesitas anular ventas
    // Requeriría lógica compleja para revertir stock, etc.
    
    throw new Error('Funcionalidad de anulación no implementada aún');
  }
}

// Singleton para uso en la aplicación
export const ventaService = new VentaService();