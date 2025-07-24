// src/server/services/stock/stockSucursalService.ts - VERSIÓN CORREGIDA
import prisma from '@/server/db/client';
import { stockService } from './stockService';

export interface StockConfigData {
  productoId: string;
  sucursalId: string;
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
}

export interface BulkLoadData {
  sucursalId: string;
  nombre: string;
  descripcion?: string;
  modo: 'incrementar' | 'establecer' | 'decrementar';
  items: Array<{
    productoId?: string;
    codigoBarras?: string;
    nombreProducto?: string;
    cantidad: number;
  }>;
}

export interface AlertaStockData {
  productoId: string;
  sucursalId: string;
  tipoAlerta: 'critico' | 'bajo' | 'exceso' | 'reposicion';
  mensaje: string;
  stockActual: number;
  stockReferencia: number;
}

class StockSucursalService {
  
  // =================== CONFIGURACIÓN DE STOCK ===================
  
  async crearConfiguracion(data: StockConfigData, usuarioId: string) {
    console.log(`[StockSucursal] Creando configuración para producto ${data.productoId} en sucursal ${data.sucursalId}`);
    
    // Validaciones
    await this.validarConfiguracion(data);
    
    const config = await prisma.stockConfigSucursal.upsert({
      where: {
        productoId_sucursalId: {
          productoId: data.productoId,
          sucursalId: data.sucursalId
        }
      },
      update: {
        stockMaximo: data.stockMaximo,
        stockMinimo: data.stockMinimo,
        puntoReposicion: data.puntoReposicion,
        updatedAt: new Date()
      },
      create: {
        ...data,
        creadoPor: usuarioId
      },
      include: {
        producto: true,
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      }
    });
    
    // Generar alertas si es necesario después de configurar
    await this.verificarYGenerarAlertas(data.productoId, data.sucursalId);
    
    return config;
  }

  // 🆕 NUEVO: Crear configuración automática básica
  async crearConfiguracionAutomatica(productoId: string, sucursalId: string, usuarioId: string, stockActual: number = 0) {
    console.log(`[StockSucursal] Creando configuración automática para producto ${productoId} en sucursal ${sucursalId}`);
    
    try {
      // Verificar que no existe ya
      const existeConfig = await prisma.stockConfigSucursal.findUnique({
        where: {
          productoId_sucursalId: { productoId, sucursalId }
        }
      });
      
      if (existeConfig) {
        console.log(`[StockSucursal] Ya existe configuración para producto ${productoId}`);
        return existeConfig;
      }
      
      // Obtener información del producto para calcular valores por defecto
      const producto = await prisma.producto.findUnique({
        where: { id: productoId }
      });
      
      if (!producto) {
        throw new Error('Producto no encontrado');
      }
      
      // Calcular valores por defecto inteligentes
      const stockMinimo = Math.max(producto.stockMinimo, 1);
      const stockMaximo = Math.max(stockActual * 3, stockMinimo * 5, 10); // Al menos 3x el stock actual o 5x el mínimo
      const puntoReposicion = Math.ceil(stockMinimo * 1.5);
      
      const config = await prisma.stockConfigSucursal.create({
        data: {
          productoId,
          sucursalId,
          stockMaximo,
          stockMinimo,
          puntoReposicion,
          creadoPor: usuarioId,
          activo: true
        },
        include: {
          producto: true,
          sucursal: true,
          usuario: {
            select: { name: true, email: true }
          }
        }
      });
      
      console.log(`[StockSucursal] ✅ Configuración automática creada: Min=${stockMinimo}, Max=${stockMaximo}, Repo=${puntoReposicion}`);
      return config;
    } catch (error) {
      console.error(`[StockSucursal] Error creando configuración automática:`, error);
      throw error;
    }
  }
  
  async obtenerConfiguraciones(filtros?: {
    sucursalId?: string;
    productoId?: string;
    includeStats?: boolean;
  }) {
    const where: any = {};
    if (filtros?.sucursalId) where.sucursalId = filtros.sucursalId;
    if (filtros?.productoId) where.productoId = filtros.productoId;
    
    const configs = await prisma.stockConfigSucursal.findMany({
      where,
      include: {
        producto: true,
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      },
      orderBy: [
        { sucursal: { nombre: 'asc' } },
        { producto: { nombre: 'asc' } }
      ]
    });
    
    if (!filtros?.includeStats) {
      return configs;
    }
    
    // Agregar estadísticas de stock actual
    const configsConStats = await Promise.all(configs.map(async (config) => {
      const stats = await this.calcularEstadisticasStock(config.productoId, config.sucursalId, config);
      return {
        ...config,
        stockActual: stats
      };
    }));
    
    return configsConStats;
  }
  
  private async validarConfiguracion(data: StockConfigData) {
    // Verificar que producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId }
    });
    if (!producto) {
      throw new Error('Producto no encontrado');
    }
    
    // Verificar que sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: data.sucursalId }
    });
    if (!sucursal) {
      throw new Error('Sucursal no encontrada');
    }
    
    // Validar rangos
    if (data.stockMaximo < 0 || data.stockMinimo < 0 || data.puntoReposicion < 0) {
      throw new Error('Los valores de stock no pueden ser negativos');
    }
    
    if (data.stockMinimo > data.stockMaximo) {
      throw new Error('El stock mínimo no puede ser mayor al máximo');
    }
    
    if (data.puntoReposicion > data.stockMaximo) {
      throw new Error('El punto de reposición no puede ser mayor al stock máximo');
    }
  }
  
  // =================== ANÁLISIS Y DASHBOARD MEJORADO ===================
  
  // 🔧 CORRECCIÓN: Dashboard mejorado que incluye productos sin configuración
  async generarDashboard(sucursalId?: string) {
    console.log(`[StockSucursal] Generando dashboard mejorado para sucursal: ${sucursalId || 'todas'}`);
    
    const where: any = { activo: true };
    if (sucursalId) where.sucursalId = sucursalId;
    
    // 1. Obtener productos con configuración explícita
    const configs = await prisma.stockConfigSucursal.findMany({
      where,
      include: {
        producto: true,
        sucursal: true
      }
    });
    
    console.log(`[StockSucursal] Encontradas ${configs.length} configuraciones explícitas`);
    
    // 2. 🆕 NUEVO: Obtener productos con stock pero sin configuración
    const stocksSinConfig = await prisma.stock.findMany({
      where: {
        ...(sucursalId ? { ubicacionId: sucursalId } : {}),
        productoId: { not: null },
        cantidad: { gt: 0 }, // Solo mostrar productos con stock > 0
        // Excluir productos que ya tienen configuración
        NOT: {
          productoId: {
            in: configs.map(c => c.productoId)
          }
        }
      },
      include: {
        producto: true,
        ubicacion: true
      }
    });
    
    console.log(`[StockSucursal] Encontrados ${stocksSinConfig.length} productos con stock sin configuración`);
    
    // 3. Analizar productos con configuración
    const analisisConConfig = await Promise.all(configs.map(async (config) => {
      const stats = await this.calcularEstadisticasStock(config.productoId, config.sucursalId, config);
      
      return {
        id: config.id,
        producto: {
          id: config.producto.id,
          nombre: config.producto.nombre,
          codigoBarras: config.producto.codigoBarras
        },
        sucursal: {
          id: config.sucursal.id,
          nombre: config.sucursal.nombre,
          tipo: config.sucursal.tipo
        },
        configuracion: {
          stockMaximo: config.stockMaximo,
          stockMinimo: config.stockMinimo,
          puntoReposicion: config.puntoReposicion
        },
        tieneConfiguracion: true,
        ...stats
      };
    }));
    
    // 4. 🆕 NUEVO: Analizar productos sin configuración con valores por defecto
    const analisisSinConfig = stocksSinConfig.map((stock) => {
      const stockActual = stock.cantidad;
      const producto = stock.producto!;
      
      // Usar valores por defecto basados en el stockMinimo del producto
      const stockMinimo = Math.max(producto.stockMinimo, 1);
      const stockMaximo = stockMinimo * 5; // Por defecto 5x el mínimo
      const puntoReposicion = Math.ceil(stockMinimo * 1.5);
      
      const configuracionPorDefecto = {
        stockMaximo,
        stockMinimo,
        puntoReposicion
      };
      
      // Calcular estadísticas usando la configuración por defecto
      const stats = this.calcularEstadisticasStockDirecto(stockActual, configuracionPorDefecto);
      
      return {
        id: `sin-config-${stock.id}`, // ID temporal
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras
        },
        sucursal: {
          id: stock.ubicacion.id,
          nombre: stock.ubicacion.nombre,
          tipo: stock.ubicacion.tipo
        },
        configuracion: configuracionPorDefecto,
        tieneConfiguracion: false, // Marcar como sin configuración
        ...stats,
        // Agregar flag para identificar que necesita configuración
        requiereConfiguracion: true
      };
    });
    
    // 5. Combinar ambos análisis
    const analisisCompleto = [...analisisConConfig, ...analisisSinConfig]
      .sort((a, b) => b.prioridad - a.prioridad);
    
    console.log(`[StockSucursal] Dashboard generado: ${analisisConConfig.length} con config + ${analisisSinConfig.length} sin config = ${analisisCompleto.length} total`);
    
    // 6. Calcular estadísticas generales
    const estadisticas = {
      total: analisisCompleto.length,
      conConfiguracion: analisisConConfig.length,
      sinConfiguracion: analisisSinConfig.length,
      criticos: analisisCompleto.filter(a => a.estado === 'critico').length,
      bajos: analisisCompleto.filter(a => a.estado === 'bajo').length,
      normales: analisisCompleto.filter(a => a.estado === 'normal').length,
      excesos: analisisCompleto.filter(a => a.estado === 'exceso').length,
      necesitanReposicion: analisisCompleto.filter(a => a.acciones.necesitaReposicion).length,
      conExceso: analisisCompleto.filter(a => a.acciones.tieneExceso).length
    };
    
    // 7. Resumen por sucursal
    const resumenSucursales = this.agruparPorSucursal(analisisCompleto);
    
    // 8. Top productos
    const topDeficit = analisisCompleto
      .filter(a => a.diferencia > 0)
      .sort((a, b) => b.diferencia - a.diferencia)
      .slice(0, 10);
      
    const topExceso = analisisCompleto
      .filter(a => a.acciones.tieneExceso)
      .sort((a, b) => b.acciones.excesoActual - a.acciones.excesoActual)
      .slice(0, 10);
    
    return {
      estadisticas,
      resumenSucursales,
      analisisCompleto,
      topDeficit,
      topExceso,
      ultimaActualizacion: new Date()
    };
  }
  
  private async calcularEstadisticasStock(productoId: string, sucursalId: string, config: any) {
    const stock = await prisma.stock.findFirst({
      where: {
        productoId,
        ubicacionId: sucursalId
      }
    });
    
    const cantidadActual = stock?.cantidad || 0;
    return this.calcularEstadisticasStockDirecto(cantidadActual, config);
  }
  
  // 🆕 NUEVO: Función auxiliar para calcular estadísticas sin consulta a BD
  private calcularEstadisticasStockDirecto(cantidadActual: number, config: any) {
    const diferencia = config.stockMaximo - cantidadActual;
    const porcentajeUso = config.stockMaximo > 0 ? (cantidadActual / config.stockMaximo) * 100 : 0;
    
    // Determinar estado y prioridad
    let estado = 'normal';
    let prioridad = 1;
    
    if (cantidadActual <= config.stockMinimo) {
      estado = 'critico';
      prioridad = 4;
    } else if (cantidadActual <= config.puntoReposicion) {
      estado = 'bajo';
      prioridad = 3;
    } else if (cantidadActual > config.stockMaximo) {
      estado = 'exceso';
      prioridad = 2;
    }
    
    return {
      stockActual: cantidadActual,
      diferencia,
      diferenciaPorcentual: config.stockMaximo > 0 ? Math.round((diferencia / config.stockMaximo) * 100) : 0,
      porcentajeUso: Math.round(porcentajeUso),
      estado,
      prioridad,
      acciones: {
        necesitaReposicion: cantidadActual <= config.puntoReposicion,
        puedeCargar: cantidadActual < config.stockMaximo,
        cantidadSugerida: Math.max(0, config.stockMaximo - cantidadActual),
        tieneExceso: cantidadActual > config.stockMaximo,
        excesoActual: Math.max(0, cantidadActual - config.stockMaximo)
      }
    };
  }
  
  private agruparPorSucursal(analisis: any[]) {
    return analisis.reduce((acc, item) => {
      const sucursalId = item.sucursal.id;
      
      if (!acc[sucursalId]) {
        acc[sucursalId] = {
          sucursal: item.sucursal,
          total: 0,
          criticos: 0,
          bajos: 0,
          normales: 0,
          excesos: 0,
          conConfiguracion: 0,
          sinConfiguracion: 0
        };
      }
      
      acc[sucursalId].total++;
      acc[sucursalId][item.estado + 's']++;
      
      if (item.tieneConfiguracion) {
        acc[sucursalId].conConfiguracion++;
      } else {
        acc[sucursalId].sinConfiguracion++;
      }
      
      return acc;
    }, {});
  }
  
  // =================== CARGA MASIVA MEJORADA ===================
  
  // 🔧 CORRECCIÓN: Procesar carga masiva con creación automática de configuración
  async procesarCargaMasiva(data: BulkLoadData, usuarioId: string) {
    console.log(`[StockSucursal] Iniciando carga masiva: ${data.nombre} con ${data.items.length} items`);
    
    // Crear registro de carga
    const carga = await prisma.cargaMasivaStock.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        sucursalId: data.sucursalId,
        usuarioId,
        totalItems: data.items.length,
        estado: 'procesando'
      }
    });
    
    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];
    
    for (const item of data.items) {
      try {
        console.log(`[StockSucursal] Procesando item: ${item.nombreProducto || item.productoId}`);
        
        const resultado = await this.procesarItemCarga(carga.id, item, data.modo, data.sucursalId, usuarioId);
        resultados.push(resultado);
        
        if (resultado.estado === 'procesado') {
          itemsProcesados++;
          
          // 🆕 NUEVO: Crear configuración automática si no existe
          try {
            await this.crearConfiguracionAutomatica(
              resultado.producto.id, 
              data.sucursalId, 
              usuarioId, 
              resultado.cantidadFinal
            );
          } catch (configError) {
            console.warn(`[StockSucursal] No se pudo crear configuración automática para ${resultado.producto.nombre}:`, configError);
            // No fallar la carga por esto
          }
        } else {
          itemsErrores++;
        }
      } catch (error) {
        console.error(`[StockSucursal] Error procesando item:`, error);
        itemsErrores++;
        
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: carga.id,
            codigoBarras: item.codigoBarras,
            nombreProducto: item.nombreProducto,
            cantidadCargar: item.cantidad,
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        });
      }
    }
    
    // Finalizar carga
    const cargaFinalizada = await prisma.cargaMasivaStock.update({
      where: { id: carga.id },
      data: {
        estado: itemsErrores === 0 ? 'completado' : 'completado_con_errores',
        itemsProcesados,
        itemsErrores,
        fechaFin: new Date()
      },
      include: {
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      }
    });
    
    // Generar alertas para productos afectados
    await this.verificarAlertasParaSucursal(data.sucursalId);
    
    console.log(`[StockSucursal] ✅ Carga masiva completada: ${itemsProcesados} procesados, ${itemsErrores} errores`);
    
    return {
      carga: cargaFinalizada,
      resumen: {
        totalItems: data.items.length,
        itemsProcesados,
        itemsErrores,
        porcentajeExito: Math.round((itemsProcesados / data.items.length) * 100)
      },
      resultados
    };
  }
  
  private async procesarItemCarga(
    cargaId: string, 
    item: any, 
    modo: string, 
    sucursalId: string, 
    usuarioId: string
  ) {
    // Buscar producto (lógica existente mejorada)
    let producto = null;
    
    if (item.productoId) {
      producto = await prisma.producto.findUnique({ 
        where: { id: item.productoId, activo: true } 
      });
    } else if (item.codigoBarras) {
      producto = await prisma.producto.findFirst({
        where: { codigoBarras: item.codigoBarras, activo: true }
      });
    } else if (item.nombreProducto) {
      // Búsqueda más inteligente por nombre
      const searchTerms = item.nombreProducto.toLowerCase().split(' ').filter((term: string) => term.length > 2);
      
      // Primero búsqueda exacta
      producto = await prisma.producto.findFirst({
        where: { 
          nombre: { equals: item.nombreProducto, mode: 'insensitive' },
          activo: true 
        }
      });
      
      // Si no encuentra, búsqueda por términos
      if (!producto && searchTerms.length > 0) {
        producto = await prisma.producto.findFirst({
          where: { 
            AND: searchTerms.map((term: any) => ({
              nombre: { contains: term, mode: 'insensitive' }
            })),
            activo: true 
          }
        });
      }
      
      // Último intento: búsqueda parcial
      if (!producto) {
        producto = await prisma.producto.findFirst({
          where: { 
            nombre: { contains: item.nombreProducto, mode: 'insensitive' },
            activo: true 
          }
        });
      }
    }
    
    if (!producto) {
      throw new Error(`Producto no encontrado: ${item.productoId || item.codigoBarras || item.nombreProducto}`);
    }
    
    console.log(`[StockSucursal] ✅ Producto encontrado: ${producto.nombre}`);
    
    // Obtener stock actual
    const stockActual = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });
    
    const cantidadAnterior = stockActual?.cantidad || 0;
    let cantidadAjuste = 0;
    let cantidadFinal = 0;
    
    // Calcular ajuste según modo
    switch (modo) {
      case 'incrementar':
        cantidadAjuste = item.cantidad;
        cantidadFinal = cantidadAnterior + item.cantidad;
        break;
      case 'establecer':
        cantidadAjuste = item.cantidad - cantidadAnterior;
        cantidadFinal = item.cantidad;
        break;
      case 'decrementar':
        cantidadAjuste = -item.cantidad;
        cantidadFinal = Math.max(0, cantidadAnterior - item.cantidad);
        break;
      default:
        throw new Error('Modo de carga inválido');
    }
    
    console.log(`[StockSucursal] Ajuste calculado: ${cantidadAnterior} -> ${cantidadFinal} (${cantidadAjuste > 0 ? '+' : ''}${cantidadAjuste})`);
    
    // Realizar ajuste si es necesario
    if (cantidadAjuste !== 0) {
      const resultado = await stockService.ajustarStock({
        productoId: producto.id,
        ubicacionId: sucursalId,
        cantidad: cantidadAjuste,
        motivo: `Carga masiva: ${cargaId}`,
        usuarioId,
        allowNegative: true
      });
      
      console.log(`[StockSucursal] ✅ Stock ajustado para ${producto.nombre}`);
    }
    
    // Obtener stock final real
    const stockFinal = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });
    
    const cantidadFinalReal = stockFinal?.cantidad || 0;
    
    // Crear registro del item
    await prisma.cargaMasivaStockItem.create({
      data: {
        cargaId,
        productoId: producto.id,
        codigoBarras: item.codigoBarras,
        nombreProducto: item.nombreProducto || producto.nombre,
        cantidadCargar: item.cantidad,
        cantidadAnterior,
        cantidadFinal: cantidadFinalReal,
        estado: 'procesado',
        procesadoEn: new Date()
      }
    });
    
    console.log(`[StockSucursal] ✅ Item registrado: ${producto.nombre} (${cantidadAnterior} -> ${cantidadFinalReal})`);
    
    return {
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras
      },
      cantidadAnterior,
      cantidadAjuste,
      cantidadFinal: cantidadFinalReal,
      estado: 'procesado'
    };
  }
  
  // =================== SISTEMA DE ALERTAS (mantener igual) ===================
  
  async generarAlerta(data: AlertaStockData) {
    const alertaExistente = await prisma.alertaStock.findFirst({
      where: {
        productoId: data.productoId,
        sucursalId: data.sucursalId,
        tipoAlerta: data.tipoAlerta,
        activa: true
      }
    });
    
    if (alertaExistente) {
      return await prisma.alertaStock.update({
        where: { id: alertaExistente.id },
        data: {
          mensaje: data.mensaje,
          stockActual: data.stockActual,
          stockReferencia: data.stockReferencia,
          createdAt: new Date(),
          vistaPor: null,
          fechaVista: null
        }
      });
    } else {
      return await prisma.alertaStock.create({
        data
      });
    }
  }
  
  async verificarYGenerarAlertas(productoId: string, sucursalId: string) {
    const config = await prisma.stockConfigSucursal.findUnique({
      where: {
        productoId_sucursalId: { productoId, sucursalId }
      },
      include: { producto: true, sucursal: true }
    });
    
    if (!config) return;
    
    const stock = await prisma.stock.findFirst({
      where: { productoId, ubicacionId: sucursalId }
    });
    
    const cantidadActual = stock?.cantidad || 0;
    
    // Limpiar alertas existentes
    await prisma.alertaStock.updateMany({
      where: {
        productoId,
        sucursalId,
        activa: true
      },
      data: { activa: false }
    });
    
    // Generar nuevas alertas
    if (cantidadActual <= config.stockMinimo) {
      await this.generarAlerta({
        productoId,
        sucursalId,
        tipoAlerta: 'critico',
        mensaje: `Stock crítico: ${config.producto.nombre} tiene solo ${cantidadActual} unidades (mínimo: ${config.stockMinimo})`,
        stockActual: cantidadActual,
        stockReferencia: config.stockMinimo
      });
    } else if (cantidadActual <= config.puntoReposicion) {
      await this.generarAlerta({
        productoId,
        sucursalId,
        tipoAlerta: 'bajo',
        mensaje: `Stock bajo: ${config.producto.nombre} necesita reposición (${cantidadActual}/${config.puntoReposicion})`,
        stockActual: cantidadActual,
        stockReferencia: config.puntoReposicion
      });
    } else if (cantidadActual > config.stockMaximo) {
      await this.generarAlerta({
        productoId,
        sucursalId,
        tipoAlerta: 'exceso',
        mensaje: `Exceso de stock: ${config.producto.nombre} supera el máximo (${cantidadActual}/${config.stockMaximo})`,
        stockActual: cantidadActual,
        stockReferencia: config.stockMaximo
      });
    }
  }
  
  async verificarAlertasParaSucursal(sucursalId: string) {
    const configs = await prisma.stockConfigSucursal.findMany({
      where: { sucursalId, activo: true }
    });
    
    for (const config of configs) {
      await this.verificarYGenerarAlertas(config.productoId, config.sucursalId);
    }
  }
  
  async obtenerAlertas(filtros?: {
    sucursalId?: string;
    tipoAlerta?: string;
    activa?: boolean;
  }) {
    const where: any = {};
    if (filtros?.sucursalId) where.sucursalId = filtros.sucursalId;
    if (filtros?.tipoAlerta) where.tipoAlerta = filtros.tipoAlerta;
    if (filtros?.activa !== undefined) where.activa = filtros.activa;
    
    return await prisma.alertaStock.findMany({
      where,
      include: {
        producto: true,
        sucursal: true
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });
  }
  
  async marcarAlertaVista(alertaId: string, usuarioId: string) {
    return await prisma.alertaStock.update({
      where: { id: alertaId },
      data: {
        vistaPor: usuarioId,
        fechaVista: new Date()
      }
    });
  }
  
  // =================== REPORTES Y ANÁLISIS ===================
  
  async generarReporteStock(sucursalId?: string, fechaDesde?: Date, fechaHasta?: Date) {
    const configs = await this.obtenerConfiguraciones({ 
      sucursalId, 
      includeStats: true 
    });
    
    // Obtener historial de cargas masivas
    const cargasHistorial = await prisma.cargaMasivaStock.findMany({
      where: {
        ...(sucursalId ? { sucursalId } : {}),
        ...(fechaDesde || fechaHasta ? {
          fechaInicio: {
            ...(fechaDesde ? { gte: fechaDesde } : {}),
            ...(fechaHasta ? { lte: fechaHasta } : {})
          }
        } : {})
      },
      include: {
        sucursal: true,
        usuario: { select: { name: true } }
      },
      orderBy: { fechaInicio: 'desc' }
    });
    
    return {
      configuraciones: configs,
      historialCargas: cargasHistorial,
      fechaGeneracion: new Date()
    };
  }
}

export const stockSucursalService = new StockSucursalService();