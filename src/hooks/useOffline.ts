// src/hooks/useOffline.ts
import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '@/lib/offline/syncManager';
import db, { IProductoCache, IStockLocal } from '@/lib/offline/indexedDB';

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingOperations, setPendingOperations] = useState<number>(0);
  
  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Iniciar sincronización cuando está online
  useEffect(() => {
    if (isOnline) {
      syncManager.startSync();
    } else {
      syncManager.stopSync();
    }
    
    return () => {
      syncManager.stopSync();
    };
  }, [isOnline]);
  
  // Contar operaciones pendientes
  const countPendingOperations = useCallback(async () => {
    try {
      setIsSyncing(true);
      
      const ventasPendientes = await db.ventasPendientes
        .where('estado')
        .equals('pendiente')
        .count();
      
      const operacionesPendientes = await db.operacionesPendientes
        .where('estado')
        .equals('pendiente')
        .count();
      
      setPendingOperations(ventasPendientes + operacionesPendientes);
    } catch (error) {
      console.error('Error al contar operaciones pendientes:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);
  
  // Contar operaciones pendientes periódicamente
  useEffect(() => {
    countPendingOperations();
    
    const interval = setInterval(() => {
      countPendingOperations();
    }, 10000); // Cada 10 segundos
    
    return () => {
      clearInterval(interval);
    };
  }, [countPendingOperations]);
  
  // Obtener producto del caché local
  const getProductoFromCache = useCallback(async (productoId: string): Promise<IProductoCache | null> => {
    try {
      const producto = await db.productosCache
        .where('id')
        .equals(productoId)
        .first();
      return producto || null;
    } catch (error) {
      console.error('Error al obtener producto del caché:', error);
      return null;
    }
  }, []);
  
  // Obtener stock local
  const getStockLocal = useCallback(async (productoId: string): Promise<number> => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return 0;
      
      const stockItem = await db.stockLocal
        .where('productoId')
        .equals(productoId)
        .and(item => item.ubicacionId === sucursalId)
        .first();
      
      return stockItem?.cantidad || 0;
    } catch (error) {
      console.error('Error al obtener stock local:', error);
      return 0;
    }
  }, []);
  
  // Buscar productos en caché local
  const searchProductosCache = useCallback(async (query: string): Promise<IProductoCache[]> => {
    try {
      // Normalizar búsqueda
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {
        return await db.productosCache.limit(20).toArray();
      }
      
      // Buscar en nombre, descripción y código de barras
      return await db.productosCache
        .filter(producto => {
          const matchesNombre = producto.nombre.toLowerCase().includes(searchTerm);
          const matchesDescripcion = producto.descripcion?.toLowerCase().includes(searchTerm) || false;
          const matchesCodigoBarras = producto.codigoBarras?.includes(searchTerm) || false;
          
          return matchesNombre || matchesDescripcion || matchesCodigoBarras;
        })
        .limit(20)
        .toArray();
    } catch (error) {
      console.error('Error al buscar productos en caché:', error);
      return [];
    }
  }, []);
  
  // Sincronizar ahora (forzar)
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return { success: false, message: 'No hay conexión a internet' };
    }
    
    try {
      setIsSyncing(true);
      
      // Iniciar sincronización inmediata
      syncManager.startSync();
      
      // Esperar un poco
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar contador
      await countPendingOperations();
      
      return { success: true };
    } catch (error) {
      console.error('Error al sincronizar:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, countPendingOperations]);
  
  return {
    isOnline,
    isSyncing,
    pendingOperations,
    getProductoFromCache,
    getStockLocal,
    searchProductosCache,
    syncNow,
    // Exponer métodos del syncManager
    registrarVentaOffline: syncManager.registrarVentaOffline.bind(syncManager),
    registrarAjusteStockOffline: syncManager.registrarAjusteStockOffline.bind(syncManager),
    registrarRecepcionEnvioOffline: syncManager.registrarRecepcionEnvioOffline.bind(syncManager)
  };
}