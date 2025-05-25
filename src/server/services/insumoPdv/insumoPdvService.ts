// src/server/services/insumoPdv/insumoPdvService.ts
import prisma from '@/server/db/client';
import { contingenciaService } from '@/server/services/contingencia/contingenciaService';

interface FiltroEgresos {
  sucursalId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

interface RegistrarEgresoParams {
  insumoPdvId: string;
  sucursalId: string;
  cantidad: number;
  motivo: string;
  usuarioId: string;
  observaciones?: string;
}

interface RecibirEnvioParams {
  envioId: string;
  items: Array<{
    itemId: string;
    cantidadRecibida: number;
  }>;
  usuarioId: string;
  observaciones?: string;
}

class InsumoPdvService {
  
  // Obtener stock con filtros
  async obtenerStock(filtros: {
    ubicacionId: string;
    soloStockBajo?: boolean;
  }) {
    console.log('[InsumoPdvService] Obteniendo stock:', filtros);
    
    const where: any = {
      ubicacionId: filtros.ubicacionId
    };

    const stocks = await prisma.stockInsumoPdv.findMany({
      where,
      include: {
        insumoPdv: true,
        ubicacion: true
      },
      orderBy: {
        insumoPdv: { nombre: 'asc' }
      }
    });

    if (filtros.soloStockBajo) {
      return stocks.filter(stock => 
        stock.cantidad <= stock.insumoPdv.stockMinimo
      );
    }

    return stocks;
  }

  // Registrar egreso de insumo
  async registrarEgreso(params: RegistrarEgresoParams) {
    console.log('[InsumoPdvService] Registrando egreso:', params);

    return prisma.$transaction(async tx => {
      // Verificar stock actual
      const stock = await tx.stockInsumoPdv.findUnique({
        where: {
          insumoPdvId_ubicacionId: {
            insumoPdvId: params.insumoPdvId,
            ubicacionId: params.sucursalId
          }
        },
        include: { insumoPdv: true }
      });

      if (!stock) {
        throw new Error('No hay stock del insumo en esta ubicación');
      }

      if (stock.cantidad < params.cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${stock.cantidad}, solicitado: ${params.cantidad}`);
      }

      // Crear egreso
      const egreso = await tx.egresoInsumoPdv.create({
        data: {
          insumoPdvId: params.insumoPdvId,
          sucursalId: params.sucursalId,
          cantidad: params.cantidad,
          motivo: params.motivo,
          usuarioId: params.usuarioId,
          observaciones: params.observaciones
        }
      });

      // Actualizar stock
      await tx.stockInsumoPdv.update({
        where: { id: stock.id },
        data: {
          cantidad: { decrement: params.cantidad },
          ultimaActualizacion: new Date()
        }
      });

      // Registrar movimiento
      await tx.movimientoStockInsumoPdv.create({
        data: {
          stockId: stock.id,
          tipoMovimiento: 'salida',
          cantidad: params.cantidad,
          motivo: `Egreso: ${params.motivo}`,
          usuarioId: params.usuarioId
        }
      });

      // Verificar si queda stock bajo mínimo
      const stockActualizado = stock.cantidad - params.cantidad;
      if (stockActualizado <= stock.insumoPdv.stockMinimo) {
        // Crear contingencia por stock bajo
        await contingenciaService.crearContingencia({
          titulo: `Stock bajo de insumo PDV: ${stock.insumoPdv.nombre}`,
          descripcion: `El insumo ${stock.insumoPdv.nombre} está por debajo del stock mínimo (${stock.insumoPdv.stockMinimo}). Stock actual: ${stockActualizado}`,
          origen: 'sucursal',
          tipo: 'stock',
          urgente: stockActualizado <= 0,
          ubicacionId: params.sucursalId,
          creadoPor: params.usuarioId
        });
      }

      return tx.egresoInsumoPdv.findUnique({
        where: { id: egreso.id },
        include: {
          insumoPdv: true,
          sucursal: true,
          usuario: true
        }
      });
    });
  }

  // Obtener egresos
  async obtenerEgresos(filtros: FiltroEgresos) {
    const where: any = {};

    if (filtros.sucursalId) {
      where.sucursalId = filtros.sucursalId;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) {
        where.fecha.gte = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        where.fecha.lte = filtros.fechaHasta;
      }
    }

    return prisma.egresoInsumoPdv.findMany({
      where,
      include: {
        insumoPdv: true,
        sucursal: true,
        usuario: true
      },
      orderBy: { fecha: 'desc' }
    });
  }

  // Recibir envío
  async recibirEnvio(params: RecibirEnvioParams) {
    console.log('[InsumoPdvService] Recibiendo envío:', params);

    return prisma.$transaction(async tx => {
      // Obtener envío
      const envio = await tx.envioInsumoPdv.findUnique({
        where: { id: params.envioId },
        include: {
          items: {
            include: { insumoPdv: true }
          },
          destino: true
        }
      });

      if (!envio) {
        throw new Error('Envío no encontrado');
      }

      if (envio.estado !== 'pendiente' && envio.estado !== 'enviado') {
        throw new Error(`El envío no está en estado válido para recepción: ${envio.estado}`);
      }

      // Actualizar envío
      await tx.envioInsumoPdv.update({
        where: { id: params.envioId },
        data: {
          estado: 'recibido',
          fechaRecepcion: new Date(),
          usuarioRecepcion: params.usuarioId,
          observaciones: params.observaciones
        }
      });

      let hayDiscrepancia = false;

      // Procesar cada item
      for (const itemRecibido of params.items) {
        const itemEnvio = envio.items.find(i => i.id === itemRecibido.itemId);
        
        if (!itemEnvio) {
          throw new Error(`Item ${itemRecibido.itemId} no encontrado en el envío`);
        }

        // Actualizar cantidad recibida
        await tx.itemEnvioInsumoPdv.update({
          where: { id: itemRecibido.itemId },
          data: { cantidadRecibida: itemRecibido.cantidadRecibida }
        });

        // Buscar o crear stock
        let stock = await tx.stockInsumoPdv.findUnique({
          where: {
            insumoPdvId_ubicacionId: {
              insumoPdvId: itemEnvio.insumoPdvId,
              ubicacionId: envio.destinoId
            }
          }
        });

        if (!stock) {
          stock = await tx.stockInsumoPdv.create({
            data: {
              insumoPdvId: itemEnvio.insumoPdvId,
              ubicacionId: envio.destinoId,
              cantidad: itemRecibido.cantidadRecibida
            }
          });
        } else {
          stock = await tx.stockInsumoPdv.update({
            where: { id: stock.id },
            data: {
              cantidad: { increment: itemRecibido.cantidadRecibida },
              ultimaActualizacion: new Date()
            }
          });
        }

        // Registrar movimiento
        await tx.movimientoStockInsumoPdv.create({
          data: {
            stockId: stock.id,
            tipoMovimiento: 'entrada',
            cantidad: itemRecibido.cantidadRecibida,
            motivo: `Recepción de envío ${params.envioId}`,
            usuarioId: params.usuarioId,
            envioId: params.envioId
          }
        });

        // Verificar discrepancias
        if (itemRecibido.cantidadRecibida !== itemEnvio.cantidad) {
          hayDiscrepancia = true;
        }
      }

      // Si hay discrepancias, crear contingencia
      if (hayDiscrepancia) {
        await tx.envioInsumoPdv.update({
          where: { id: params.envioId },
          data: { estado: 'con_contingencia' }
        });

        await contingenciaService.crearContingencia({
          titulo: `Discrepancia en envío de insumos PDV #${params.envioId}`,
          descripcion: `Se detectaron diferencias entre las cantidades enviadas y recibidas en el envío de insumos PDV.`,
          origen: 'sucursal',
          tipo: 'envio',
          ubicacionId: envio.destinoId,
          creadoPor: params.usuarioId
        });
      }

      return tx.envioInsumoPdv.findUnique({
        where: { id: params.envioId },
        include: {
          items: {
            include: { insumoPdv: true }
          },
          origen: true,
          destino: true
        }
      });
    });
  }

  // Crear solicitud de insumos
  async crearSolicitud(params: {
    sucursalId: string;
    usuarioId: string;
    items: Array<{
      insumoPdvId: string;
      cantidad: number;
      observaciones?: string;
    }>;
    observaciones?: string;
  }) {
    console.log('[InsumoPdvService] Creando solicitud:', params);

    return prisma.$transaction(async tx => {
      const solicitud = await tx.solicitudInsumoPdv.create({
        data: {
          sucursalId: params.sucursalId,
          usuarioId: params.usuarioId,
          estado: 'pendiente',
          observaciones: params.observaciones
        }
      });

      for (const item of params.items) {
        await tx.itemSolicitudInsumoPdv.create({
          data: {
            solicitudId: solicitud.id,
            insumoPdvId: item.insumoPdvId,
            cantidadSolicitada: item.cantidad,
            observaciones: item.observaciones
          }
        });
      }

      return tx.solicitudInsumoPdv.findUnique({
        where: { id: solicitud.id },
        include: {
          items: {
            include: { insumoPdv: true }
          },
          sucursal: true,
          usuario: true
        }
      });
    });
  }

  // Obtener estadísticas de stock bajo
  async obtenerStockBajo(ubicacionId?: string) {
    const where: any = {};
    
    if (ubicacionId) {
      where.ubicacionId = ubicacionId;
    }

    const stocksBajos = await prisma.stockInsumoPdv.findMany({
      where,
      include: {
        insumoPdv: true,
        ubicacion: true
      }
    });

    return stocksBajos.filter(stock => 
      stock.cantidad <= stock.insumoPdv.stockMinimo
    );
  }

  // Dashboard de estadísticas
  async obtenerDashboard(ubicacionId: string) {
    const [stockTotal, stockBajo, solicitudesPendientes, enviosPendientes] = await Promise.all([
      prisma.stockInsumoPdv.count({
        where: { ubicacionId }
      }),
      this.obtenerStockBajo(ubicacionId),
      prisma.solicitudInsumoPdv.count({
        where: {
          sucursalId: ubicacionId,
          estado: 'pendiente'
        }
      }),
      prisma.envioInsumoPdv.count({
        where: {
          destinoId: ubicacionId,
          estado: { in: ['pendiente', 'enviado'] }
        }
      })
    ]);

    return {
      stockTotal,
      stockBajo: stockBajo.length,
      solicitudesPendientes,
      enviosPendientes,
      insumosStockBajo: stockBajo
    };
  }
}

export const insumoPdvService = new InsumoPdvService();