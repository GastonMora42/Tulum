// src/server/services/venta/ventaService.ts
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
  facturar: boolean;
  clienteNombre?: string;
  clienteCuit?: string;
  pagos: PagoVenta[];
}

class VentaService {
  // Crear una nueva venta
  async crearVenta(params: CrearVentaParams) {
    const { 
      sucursalId, 
      usuarioId, 
      items, 
      total, 
      descuento = 0, 
      codigoDescuento, 
      facturar, 
      clienteNombre, 
      clienteCuit,
      pagos
    } = params;
    
    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });
    
    if (!sucursal) {
      throw new Error('La sucursal no existe');
    }
    
    // Verificar stock disponible
    for (const item of items) {
      const verificacion = await stockService.verificarStockDisponible(
        item.productoId,
        sucursalId,
        item.cantidad
      );
      
      if (!verificacion.disponible) {
        throw new Error(`No hay suficiente stock del producto ${item.productoId}`);
      }
    }
    
    // Verificar que el total de pagos coincide con el total de la venta
    const totalPagos = pagos.reduce((sum, p) => sum + p.monto, 0);
    if (Math.abs(totalPagos - total) > 0.01) { // Permitir pequeña diferencia por redondeo
      throw new Error(`El total de pagos (${totalPagos}) no coincide con el total de la venta (${total})`);
    }
    
    // Crear venta en transacción
    return prisma.$transaction(async tx => {
      // Crear venta
      const venta = await tx.venta.create({
        data: {
          sucursalId,
          usuarioId,
          total,
          descuento,
          codigoDescuento,
          facturada: facturar,
          clienteNombre: facturar ? clienteNombre : null,
          clienteCuit: facturar ? clienteCuit : null,
        }
      });

      
      
      // Crear items de venta
      for (const item of items) {
        await tx.itemVenta.create({
          data: {
            ventaId: venta.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento || 0
          }
        });
        
        // Descontar del stock
        await stockService.ajustarStock({
          productoId: item.productoId,
          ubicacionId: sucursalId,
          cantidad: -item.cantidad, // Negativo para descontar
          motivo: `Venta #${venta.id}`,
          usuarioId,
          ventaId: venta.id
        });
      }
      
      // Registrar pagos
      for (const pago of pagos) {
        await tx.pago.create({
          data: {
            ventaId: venta.id,
            medioPago: pago.medioPago,
            monto: pago.monto,
            referencia: pago.referencia,
            datosPago: pago.datosPago
          }
        });
      }
      
      // Si hay código de descuento, incrementar usos
      if (codigoDescuento) {
        const codigo = await tx.codigoDescuento.findUnique({
          where: { codigo: codigoDescuento }
        });
        
        if (codigo) {
          await tx.codigoDescuento.update({
            where: { id: codigo.id },
            data: {
              usosActuales: { increment: 1 }
            }
          });
        }
      }
      
      return tx.venta.findUnique({
        where: { id: venta.id },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          pagos: true,
          sucursal: true,
          usuario: true
        }
      });
    });
  }
  
  // Obtener ventas con filtros
  async getVentas(filtros: {
    sucursalId?: string;
    usuarioId?: string;
    desde?: Date;
    hasta?: Date;
    facturada?: boolean;
  }) {
    const where: any = {};
    
    if (filtros.sucursalId) {
      where.sucursalId = filtros.sucursalId;
    }
    
    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }
    
    if (filtros.facturada !== undefined) {
      where.facturada = filtros.facturada;
    }
    
    if (filtros.desde || filtros.hasta) {
      where.fecha = {};
      
      if (filtros.desde) {
        where.fecha.gte = filtros.desde;
      }
      
      if (filtros.hasta) {
        where.fecha.lte = filtros.hasta;
      }
    }
    
    return prisma.venta.findMany({
      where,
      include: {
        items: {
          include: {
            producto: true
          }
        },
        pagos: true,
        sucursal: true,
        usuario: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });
  }
  
  // Verificar y aplicar código de descuento
  async verificarCodigoDescuento(codigo: string) {
    const codigoDescuento = await prisma.codigoDescuento.findUnique({
      where: { codigo }
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
    
    return {
      valido: true,
      tipoDescuento: codigoDescuento.tipoDescuento,
      valor: codigoDescuento.valor,
      descripcion: codigoDescuento.descripcion
    };
  }
}

// Singleton para uso en la aplicación
export const ventaService = new VentaService();