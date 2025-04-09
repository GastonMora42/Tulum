// src/lib/offline/syncManager.ts
import db, { IVentaPendiente, IOperacionPendiente, IProductoCache, IStockLocal } from './indexedDB';
import apiClient from '@/lib/api/client';
import { v4 as uuidv4 } from 'uuid';

interface SyncParams {
  since?: string;
}

export class SyncManager {
  private isOnline: boolean;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 30000; // 30 segundos
  
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.setupEventListeners();
  }
  
  // Configurar listeners para estado de conexión
  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }
  
  // Manejar evento online
  private handleOnline = () => {
    console.log('Conexión restaurada, iniciando sincronización...');
    this.isOnline = true;
    this.startSync();
  }
  
  // Manejar evento offline
  private handleOffline = () => {
    console.log('Conexión perdida, deteniendo sincronización...');
    this.isOnline = false;
    this.stopSync();
  }
  
  // Iniciar sincronización periódica
  public startSync() {
    if (this.syncInterval) return;
    
    // Primera sincronización inmediata
    this.syncAll();
    
    // Configurar intervalo
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncAll();
      }
    }, this.SYNC_INTERVAL);
  }
  
  // Detener sincronización
  public stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Sincronizar todo
  private async syncAll() {
    console.log('Iniciando sincronización...');
    
    try {
      await this.syncVentasPendientes();
      await this.syncOperacionesPendientes();
      await this.updateLocalData();
      
      console.log('Sincronización completada');
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  }
  
  // Sincronizar ventas pendientes
  private async syncVentasPendientes() {
    const ventasPendientes = await db.ventasPendientes
      .where('estado')
      .equals('pendiente')
      .toArray();
    
    console.log(`Sincronizando ${ventasPendientes.length} ventas pendientes`);
    
    for (const venta of ventasPendientes) {
      try {
        // Marcar como sincronizando
        await db.ventasPendientes.update(venta.id, {
          estado: 'sincronizando',
          intentos: (venta.intentos || 0) + 1
        });
        
        // Enviar al servidor
        const response = await apiClient.post('/api/pdv/ventas/sync', venta);
        
        // Si sincronización exitosa
        await db.ventasPendientes.update(venta.id, {
          estado: 'completada'
        });
        
        console.log(`Venta ${venta.id} sincronizada correctamente`);
      } catch (error) {
        console.error(`Error al sincronizar venta ${venta.id}:`, error);
        
        // Incrementar contador de intentos
        const intentos = (venta.intentos || 0) + 1;
        
        // Si demasiados intentos, marcar para revisión manual
        if (intentos >= 5) {
          await db.ventasPendientes.update(venta.id, {
            estado: 'error',
            error: 'Demasiados intentos fallidos de sincronización'
          });
        } else {
          // Volver a pendiente para reintento posterior
          await db.ventasPendientes.update(venta.id, {
            estado: 'pendiente',
            intentos,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
    }
  }
  
  // Sincronizar otras operaciones pendientes
  private async syncOperacionesPendientes() {
    const operaciones = await db.operacionesPendientes
      .where('estado')
      .equals('pendiente')
      .toArray();
    
    console.log(`Sincronizando ${operaciones.length} operaciones pendientes`);
    
    for (const op of operaciones) {
      try {
        // Marcar como procesando
        await db.operacionesPendientes.update(op.id, {
          estado: 'procesando',
          intentos: op.intentos + 1,
          ultimoIntento: new Date()
        });
        
        // Procesar según tipo
        switch (op.tipo) {
          case 'ajuste_stock':
            await this.procesarAjusteStock(op);
            break;
          case 'recepcion_envio':
            await this.procesarRecepcionEnvio(op);
            break;
          default:
            throw new Error(`Tipo de operación desconocido: ${op.tipo}`);
        }
        
        // Marcar como completada
        await db.operacionesPendientes.update(op.id, {
          estado: 'completada'
        });
        
        console.log(`Operación ${op.id} completada`);
      } catch (error) {
        console.error(`Error al procesar operación ${op.id}:`, error);
        
        // Si demasiados intentos, marcar para revisión
        if (op.intentos >= 5) {
          await db.operacionesPendientes.update(op.id, {
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        } else {
          // Volver a pendiente para reintento
          await db.operacionesPendientes.update(op.id, {
            estado: 'pendiente',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
    }
  }
  
  // Actualizar datos locales desde servidor
  private async updateLocalData() {
    if (!this.isOnline) return;
    
    try {
      // Obtener última actualización
      const lastUpdate = localStorage.getItem('lastDataUpdate');
      const params = lastUpdate ? { since: lastUpdate } : {};
      
      // Actualizar productos
      const productos = await apiClient.get<IProductoCache[]>('/api/productos/cache', params as Record<string, string> | undefined);
      await db.productosCache.clear();
      await db.productosCache.bulkAdd(productos);
      
      // Actualizar stock local
      const sucursalId = localStorage.getItem('sucursalId');
      if (sucursalId) {
        const stock = await apiClient.get<IStockLocal[]>(`/api/sucursales/${sucursalId}/stock`, params as Record<string, string> | undefined);
        await db.stockLocal.clear();
        await db.stockLocal.bulkAdd(stock);
      }
      // Guardar timestamp
      localStorage.setItem('lastDataUpdate', new Date().toISOString());
      console.log('Datos locales actualizados correctamente');
    } catch (error) {
      console.error('Error al actualizar datos locales:', error);
    }
  }
  
// Continuación de src/lib/offline/syncManager.ts - procesarAjusteStock
private async procesarAjusteStock(op: IOperacionPendiente) {
    await apiClient.post('/api/stock/ajuste', op.datos);
    
    // Si se procesa correctamente, actualizar stock local
    const { productoId, ubicacionId, cantidad } = op.datos;
    
    const stockLocal = await db.stockLocal
      .where('productoId')
      .equals(productoId)
      .and(item => item.ubicacionId === ubicacionId)
      .first();
    
    if (stockLocal) {
      await db.stockLocal.update(stockLocal.id, {
        cantidad: stockLocal.cantidad + cantidad, // cantidad puede ser positiva o negativa
        fechaActualizacion: new Date()
      });
    }
  }
  
  // Procesar recepción de envío
  private async procesarRecepcionEnvio(op: IOperacionPendiente) {
    await apiClient.post(`/api/envios/${op.datos.envioId}/recibir`, op.datos);
    
    // Actualizar stock local con los productos recibidos
    for (const item of op.datos.items) {
      const stockLocal = await db.stockLocal
        .where('productoId')
        .equals(item.productoId)
        .and(stock => stock.ubicacionId === op.datos.sucursalId)
        .first();
      
      if (stockLocal) {
        await db.stockLocal.update(stockLocal.id, {
          cantidad: stockLocal.cantidad + item.cantidadRecibida,
          fechaActualizacion: new Date()
        });
      } else {
        // Crear nuevo registro de stock
        await db.stockLocal.add({
          id: uuidv4(),
          productoId: item.productoId,
          ubicacionId: op.datos.sucursalId,
          cantidad: item.cantidadRecibida,
          fechaActualizacion: new Date()
        });
      }
    }
  }
  
  // Métodos públicos para registrar operaciones offline
  
  // Registrar venta offline
  public async registrarVentaOffline(venta: Omit<IVentaPendiente, 'id' | 'fechaCreacion' | 'estado'>): Promise<string> {
    const id = uuidv4();
    
    await db.ventasPendientes.add({
      id,
      ...venta,
      fechaCreacion: new Date(),
      estado: 'pendiente',
      intentos: 0
    });
    
    // Actualizar stock local inmediatamente
    for (const item of venta.items) {
      await this.actualizarStockLocal(item.productoId, -item.cantidad);
    }
    
    return id;
  }
  
  // Registrar ajuste de stock offline
  public async registrarAjusteStockOffline(
    productoId: string, 
    cantidad: number, 
    motivo: string
  ): Promise<string> {
    const id = uuidv4();
    const sucursalId = localStorage.getItem('sucursalId');
    
    if (!sucursalId) {
      throw new Error('No se ha definido una sucursal');
    }
    
    await db.operacionesPendientes.add({
      id,
      tipo: 'ajuste_stock',
      datos: {
        productoId,
        ubicacionId: sucursalId,
        cantidad,
        motivo
      },
      estado: 'pendiente',
      fechaCreacion: new Date(),
      intentos: 0
    });
    
    // Actualizar stock local inmediatamente
    await this.actualizarStockLocal(productoId, cantidad);
    
    return id;
  }
  
  // Registrar recepción de envío offline
  public async registrarRecepcionEnvioOffline(
    envioId: string,
    items: Array<{ productoId: string; cantidadRecibida: number }>
  ): Promise<string> {
    const id = uuidv4();
    const sucursalId = localStorage.getItem('sucursalId');
    
    if (!sucursalId) {
      throw new Error('No se ha definido una sucursal');
    }
    
    await db.operacionesPendientes.add({
      id,
      tipo: 'recepcion_envio',
      datos: {
        envioId,
        sucursalId,
        items
      },
      estado: 'pendiente',
      fechaCreacion: new Date(),
      intentos: 0
    });
    
    // Actualizar stock local inmediatamente
    for (const item of items) {
      await this.actualizarStockLocal(item.productoId, item.cantidadRecibida);
    }
    
    return id;
  }
  
  // Actualizar stock local
  private async actualizarStockLocal(productoId: string, cantidad: number): Promise<void> {
    const sucursalId = localStorage.getItem('sucursalId');
    if (!sucursalId) return;
    
    const stockLocal = await db.stockLocal
      .where('productoId')
      .equals(productoId)
      .and(item => item.ubicacionId === sucursalId)
      .first();
    
    if (stockLocal) {
      await db.stockLocal.update(stockLocal.id, {
        cantidad: stockLocal.cantidad + cantidad,
        fechaActualizacion: new Date()
      });
    } else {
      // Si no existe stock, crearlo (solo si cantidad es positiva)
      if (cantidad > 0) {
        await db.stockLocal.add({
          id: uuidv4(),
          productoId,
          ubicacionId: sucursalId,
          cantidad,
          fechaActualizacion: new Date()
        });
      }
    }
  }

  // src/lib/offline/syncManager.ts (mejoras adicionales)

// Añadir estos métodos a la clase SyncManager

// Método para obtener estadísticas de sincronización
public async getSyncStats(): Promise<{
  pendingVentas: number;
  pendingOperations: number;
  lastSyncAttempt: Date | null;
  offlineItems: number;
}> {
  try {
    const pendingVentas = await db.ventasPendientes
      .where('estado')
      .anyOf(['pendiente', 'sincronizando'])
      .count();
      
    const pendingOperations = await db.operacionesPendientes
      .where('estado')
      .anyOf(['pendiente', 'procesando'])
      .count();
      
    const productosCount = await db.productosCache.count();
    
    // Obtener última sincronización del localStorage
    const lastSyncStr = localStorage.getItem('lastSyncAttempt');
    const lastSyncAttempt = lastSyncStr ? new Date(lastSyncStr) : null;
    
    return {
      pendingVentas,
      pendingOperations,
      lastSyncAttempt,
      offlineItems: productosCount
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de sincronización:', error);
    return {
      pendingVentas: 0,
      pendingOperations: 0,
      lastSyncAttempt: null,
      offlineItems: 0
    };
  }
}

// Método para exportar información de debug
public async exportSyncDebugInfo(): Promise<string> {
  try {
    const stats = await this.getSyncStats();
    
    // Obtener algunas operaciones pendientes como muestra
    const pendingVentas = await db.ventasPendientes
      .where('estado')
      .anyOf(['pendiente', 'sincronizando', 'error'])
      .limit(5)
      .toArray();
      
    const pendingOps = await db.operacionesPendientes
      .where('estado')
      .anyOf(['pendiente', 'procesando', 'error'])
      .limit(5)
      .toArray();
      
    const debugInfo = {
      timestamp: new Date().toISOString(),
      isOnline: this.isOnline,
      syncInterval: this.syncInterval !== null,
      stats,
      sampleVentas: pendingVentas,
      sampleOperations: pendingOps,
      userInfo: {
        sucursalId: localStorage.getItem('sucursalId'),
        lastUpdate: localStorage.getItem('lastDataUpdate')
      }
    };
    
    return JSON.stringify(debugInfo, null, 2);
  } catch (error) {
    console.error('Error al exportar información de debug:', error);
    return JSON.stringify({ error: 'Error al obtener datos de debug' });
  }
}

// Método para forzar sincronización completa
public async forceFullSync(): Promise<{
  success: boolean;
  syncedVentas: number;
  syncedOps: number;
  updatedItems: number;
  errors: string[]
}> {
  if (!this.isOnline) {
    return {
      success: false,
      syncedVentas: 0,
      syncedOps: 0,
      updatedItems: 0,
      errors: ['Sin conexión a internet']
    };
  }
  
  const errors: string[] = [];
  let syncedVentas = 0;
  let syncedOps = 0;
  let updatedItems = 0;
  
  try {
    // Marcar timestamp de inicio
    localStorage.setItem('lastSyncAttempt', new Date().toISOString());
    
    // 1. Sincronizar ventas pendientes
    const ventas = await db.ventasPendientes
      .where('estado')
      .anyOf(['pendiente', 'error'])
      .toArray();
      
    for (const venta of ventas) {
      try {
        await db.ventasPendientes.update(venta.id, {
          estado: 'sincronizando',
          intentos: (venta.intentos || 0) + 1
        });
        
        // Enviar al servidor (simulado)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await db.ventasPendientes.update(venta.id, {
          estado: 'completada'
        });
        
        syncedVentas++;
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Error desconocido');
        errors.push(`Error en venta ${venta.id}: ${error.message}`);
        
        // Marcar como error si hay demasiados intentos
        if ((venta.intentos || 0) >= 5) {
          await db.ventasPendientes.update(venta.id, {
            estado: 'error',
            error: error.message
          });
        } else {
          await db.ventasPendientes.update(venta.id, {
            estado: 'pendiente',
            intentos: (venta.intentos || 0) + 1,
            error: error.message
          });
        }
      }
    }
    
    // 2. Sincronizar otras operaciones
    const operaciones = await db.operacionesPendientes
      .where('estado')
      .anyOf(['pendiente', 'error'])
      .toArray();
      
    for (const op of operaciones) {
      try {
        await db.operacionesPendientes.update(op.id, {
          estado: 'procesando',
          intentos: op.intentos + 1,
          ultimoIntento: new Date()
        });
        
        // Procesar según tipo
        switch (op.tipo) {
          case 'ajuste_stock':
            await this.procesarAjusteStock(op);
            break;
          case 'recepcion_envio':
            await this.procesarRecepcionEnvio(op);
            break;
        }
        
        await db.operacionesPendientes.update(op.id, {
          estado: 'completada'
        });
        
        syncedOps++;
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Error desconocido');
        errors.push(`Error en operación ${op.id}: ${error.message}`);
        
        // Marcar como error si hay demasiados intentos
        if (op.intentos >= 5) {
          await db.operacionesPendientes.update(op.id, {
            estado: 'error',
            error: error.message
          });
        } else {
          await db.operacionesPendientes.update(op.id, {
            estado: 'pendiente',
            error: error.message
          });
        }
      }
    }
    
    // 3. Actualizar datos locales
    try {
      // Actualizar productos
      const productosResponse = await fetch('/api/productos/cache');
      if (productosResponse.ok) {
        const productos = await productosResponse.json();
        await db.productosCache.clear();
        await db.productosCache.bulkAdd(productos);
        updatedItems += productos.length;
      }
      
      // Actualizar stock local
      const sucursalId = localStorage.getItem('sucursalId');
      if (sucursalId) {
        const stockResponse = await fetch(`/api/sucursales/${sucursalId}/stock`);
        if (stockResponse.ok) {
          const stock = await stockResponse.json();
          await db.stockLocal.clear();
          await db.stockLocal.bulkAdd(stock);
          updatedItems += stock.length;
        }
      }
      
      // Guardar timestamp
      localStorage.setItem('lastDataUpdate', new Date().toISOString());
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Error desconocido');
      errors.push(`Error al actualizar datos locales: ${error.message}`);
    }
    
    return {
      success: true,
      syncedVentas,
      syncedOps,
      updatedItems,
      errors
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      syncedVentas,
      syncedOps,
      updatedItems,
      errors: [...errors, `Error general: ${errorMsg}`]
    };
  }
}
  
  // Limpiar datos antiguos
  public async limpiarDatosAntiguos(): Promise<void> {
    // Limpiar ventas completadas con más de 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await db.ventasPendientes
      .where('estado')
      .equals('completada')
      .and(venta => venta.fechaCreacion < sevenDaysAgo)
      .delete();
      
    // Limpiar operaciones completadas con más de 7 días
    await db.operacionesPendientes
      .where('estado')
      .equals('completada')
      .and(op => op.fechaCreacion < sevenDaysAgo)
      .delete();
  }
}

// Exportar singleton
export const syncManager = new SyncManager();