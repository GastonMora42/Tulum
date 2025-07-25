// src/hooks/useStockSucursales.ts - VERSIÓN MEJORADA CON CARGA MANUAL
import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';

// ✅ INTERFACES CORREGIDAS Y AMPLIADAS
export interface StockConfig {
  id: string;
  productoId: string;
  sucursalId: string;
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
  activo: boolean;
  producto: {
    id: string;
    nombre: string;
    codigoBarras?: string;
  };
  sucursal: {
    id: string;
    nombre: string;
    tipo: string;
  };
  stockActual?: {
    cantidad: number;
    diferencia: number;
    porcentajeUso: number;
    estado: 'critico' | 'bajo' | 'normal' | 'exceso';
    acciones: {
      necesitaReposicion: boolean;
      puedeCargar: boolean;
      cantidadSugerida: number;
      tieneExceso: boolean;
      excesoActual: number;
    };
  };
}

export interface DashboardData {
  estadisticas: {
    total: number;
    conConfiguracion: number;
    sinConfiguracion: number;
    criticos: number;
    bajos: number;
    normales: number;
    excesos: number;
    necesitanReposicion: number;
    conExceso: number;
  };
  analisisCompleto: Array<{
    id: string;
    producto: {
      id: string;
      nombre: string;
      codigoBarras?: string;
    };
    sucursal: {
      id: string;
      nombre: string;
      tipo: string;
    };
    configuracion: {
      stockMaximo: number;
      stockMinimo: number;
      puntoReposicion: number;
    };
    stockActual: number;
    diferencia: number;
    porcentajeUso: number;
    estado: string;
    prioridad: number;
    tieneConfiguracion: boolean;
    requiereConfiguracion?: boolean;
    acciones: {
      necesitaReposicion: boolean;
      puedeCargar: boolean;
      cantidadSugerida: number;
      tieneExceso: boolean;
      excesoActual: number;
    };
  }>;
  resumenSucursales: any[];
  topDeficit: any[];
  topExceso: any[];
  ultimaActualizacion: Date;
}

export interface AlertaStock {
  id: string;
  productoId: string;
  sucursalId: string;
  tipoAlerta: 'critico' | 'bajo' | 'exceso' | 'reposicion';
  mensaje: string;
  stockActual: number;
  stockReferencia: number;
  activa: boolean;
  vistaPor?: string;
  fechaVista?: Date;
  createdAt: Date;
  producto: {
    nombre: string;
  };
  sucursal: {
    nombre: string;
  };
}

export interface BulkLoadItem {
  productoId?: string;
  codigoBarras?: string;
  nombreProducto?: string;
  cantidad: number;
}

export interface BulkLoadRequest {
  sucursalId: string;
  nombre: string;
  descripcion?: string;
  modo: 'incrementar' | 'establecer' | 'decrementar';
  items: BulkLoadItem[];
}

// 🆕 NUEVA INTERFAZ PARA CARGA MANUAL
export interface CargaManualRequest {
  productoId: string;
  sucursalId: string;
  cantidad: number;
  observaciones?: string;
  modo?: 'incrementar' | 'establecer' | 'decrementar';
}

export interface CargaManualResponse {
  success: boolean;
  mensaje: string;
  detalles: {
    producto: {
      id: string;
      nombre: string;
      codigoBarras?: string;
      categoria?: string;
    };
    sucursal: {
      id: string;
      nombre: string;
      tipo: string;
    };
    ajuste: {
      modo: string;
      cantidadAnterior: number;
      cantidadAjuste: number;
      cantidadFinal: number;
      observaciones?: string;
    };
    movimiento?: {
      id: string;
      tipo: string;
      cantidad: number;
      fecha: string;
    };
  };
  timestamp: string;
}

export interface AlertasResponse {
  alertas: AlertaStock[];
  estadisticas: {
    total: number;
    criticas: number;
    bajas: number;
    excesos: number;
    reposicion: number;
    noVistas: number;
  };
}

// 🆕 NUEVA INTERFAZ PARA HISTORIAL DE CARGAS MANUALES
export interface HistorialCargaManual {
  id: string;
  fecha: string;
  tipoMovimiento: string;
  cantidad: number;
  motivo: string;
  producto?: {
    id: string;
    nombre: string;
    codigoBarras?: string;
  };
  sucursal: {
    id: string;
    nombre: string;
    tipo: string;
  };
  usuario?: {
    nombre: string;
    email: string;
  };
  stockResultante: number;
}

export function useStockSucursales() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [configs, setConfigs] = useState<StockConfig[]>([]);
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ============= CONFIGURACIONES =============
  
  const loadConfigs = useCallback(async (filtros?: {
    sucursalId?: string;
    productoId?: string;
    includeStats?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filtros?.sucursalId) params.append('sucursalId', filtros.sucursalId);
      if (filtros?.productoId) params.append('productoId', filtros.productoId);
      if (filtros?.includeStats) params.append('includeStats', 'true');

      console.log(`[Hook] Cargando configuraciones con filtros:`, filtros);

      const response = await authenticatedFetch(`/api/admin/stock-config?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar configuraciones');
      }
      
      const data = await response.json();
      setConfigs(data);
      setLastUpdate(new Date());
      
      console.log(`[Hook] ✅ Configuraciones cargadas: ${data.length} items`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar configuraciones';
      console.error(`[Hook] ❌ Error cargando configuraciones:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (configData: {
    productoId: string;
    sucursalId: string;
    stockMaximo: number;
    stockMinimo: number;
    puntoReposicion: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[Hook] Guardando configuración:`, configData);

      const response = await authenticatedFetch('/api/admin/stock-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }

      const savedConfig = await response.json();
      
      // Actualizar lista de configuraciones
      setConfigs(prev => {
        const index = prev.findIndex(c => 
          c.productoId === savedConfig.productoId && 
          c.sucursalId === savedConfig.sucursalId
        );
        
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedConfig;
          return updated;
        } else {
          return [...prev, savedConfig];
        }
      });

      setLastUpdate(new Date());
      console.log(`[Hook] ✅ Configuración guardada para producto ${savedConfig.producto?.nombre}`);

      return savedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar configuración';
      console.error(`[Hook] ❌ Error guardando configuración:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============= DASHBOARD =============
  
  const loadDashboard = useCallback(async (sucursalId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (sucursalId) params.append('sucursalId', sucursalId);

      console.log(`[Hook] Cargando dashboard para sucursal: ${sucursalId || 'todas'}`);

      const response = await authenticatedFetch(`/api/admin/stock-config/dashboard?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar dashboard');
      }
      
      const data = await response.json();
      setDashboardData(data);
      setLastUpdate(new Date());

      console.log(`[Hook] ✅ Dashboard cargado: ${data.estadisticas?.total || 0} productos`);
      console.log(`[Hook] Estadísticas:`, data.estadisticas);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar dashboard';
      console.error(`[Hook] ❌ Error cargando dashboard:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============= CARGA MASIVA =============
  
  const bulkLoad = useCallback(async (bulkData: BulkLoadRequest) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[Hook] Iniciando carga masiva: ${bulkData.nombre} con ${bulkData.items.length} items`);

      const response = await authenticatedFetch('/api/admin/stock-config/bulk-load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en carga masiva');
      }

      const result = await response.json();
      setLastUpdate(new Date());

      console.log(`[Hook] ✅ Carga masiva completada: ${result.resumen?.itemsProcesados || 0} procesados`);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en carga masiva';
      console.error(`[Hook] ❌ Error en carga masiva:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🆕 ============= CARGA MANUAL =============
  
  const cargaManual = useCallback(async (cargaData: CargaManualRequest): Promise<CargaManualResponse> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[Hook] Iniciando carga manual:`, cargaData);

      const response = await authenticatedFetch('/api/admin/stock-config/carga-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cargaData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en carga manual');
      }

      const result: CargaManualResponse = await response.json();
      setLastUpdate(new Date());

      console.log(`[Hook] ✅ Carga manual completada:`, result.mensaje);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en carga manual';
      console.error(`[Hook] ❌ Error en carga manual:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🆕 Obtener historial de cargas manuales
  const loadHistorialCargaManual = useCallback(async (filtros?: {
    sucursalId?: string;
    productoId?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filtros?.sucursalId) params.append('sucursalId', filtros.sucursalId);
      if (filtros?.productoId) params.append('productoId', filtros.productoId);
      if (filtros?.limit) params.append('limit', filtros.limit.toString());
      if (filtros?.offset) params.append('offset', filtros.offset.toString());

      console.log(`[Hook] Cargando historial de cargas manuales:`, filtros);

      const response = await authenticatedFetch(`/api/admin/stock-config/carga-manual?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar historial');
      }
      
      const data = await response.json();
      console.log(`[Hook] ✅ Historial cargado: ${data.historial?.length || 0} movimientos`);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar historial';
      console.error(`[Hook] ❌ Error cargando historial:`, err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const loadBulkHistory = useCallback(async (filtros?: {
    sucursalId?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filtros?.sucursalId) params.append('sucursalId', filtros.sucursalId);
      if (filtros?.limit) params.append('limit', filtros.limit.toString());
      if (filtros?.offset) params.append('offset', filtros.offset.toString());

      const response = await authenticatedFetch(`/api/admin/stock-config/bulk-load?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar historial');
      }
      
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar historial';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // ============= ALERTAS =============
  
  const loadAlertas = useCallback(async (filtros?: {
    sucursalId?: string;
    tipoAlerta?: string;
    activa?: boolean;
  }) => {
    try {
      setError(null);
      
      const params = new URLSearchParams();
      if (filtros?.sucursalId) params.append('sucursalId', filtros.sucursalId);
      if (filtros?.tipoAlerta) params.append('tipoAlerta', filtros.tipoAlerta);
      if (filtros?.activa !== undefined) params.append('activa', filtros.activa.toString());

      console.log(`[Hook] Cargando alertas con filtros:`, filtros);

      const response = await authenticatedFetch(`/api/admin/stock-config/alertas?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar alertas');
      }
      
      const data: AlertasResponse = await response.json();
      setAlertas(data.alertas);

      console.log(`[Hook] ✅ Alertas cargadas: ${data.alertas.length} alertas`);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar alertas';
      console.error(`[Hook] ❌ Error cargando alertas:`, err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const marcarAlertaVista = useCallback(async (alertaId: string) => {
    try {
      const response = await authenticatedFetch('/api/admin/stock-config/alertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accion: 'marcar_vista',
          alertaId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al marcar alerta');
      }

      // Actualizar alerta en el estado local
      setAlertas(prev => prev.map(alerta => 
        alerta.id === alertaId 
          ? { ...alerta, vistaPor: 'current-user', fechaVista: new Date() }
          : alerta
      ));

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar alerta';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const verificarAlertas = useCallback(async (type: 'producto' | 'sucursal', params: {
    productoId?: string;
    sucursalId?: string;
  }) => {
    try {
      const response = await authenticatedFetch('/api/admin/stock-config/alertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accion: type === 'producto' ? 'verificar_producto' : 'verificar_sucursal',
          ...params
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al verificar alertas');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar alertas';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // ============= UTILIDADES Y FUNCIONES DE CONVENIENCIA =============
  
  const getConfigForProduct = useCallback((productoId: string, sucursalId: string) => {
    return configs.find(c => c.productoId === productoId && c.sucursalId === sucursalId);
  }, [configs]);

  const getAlertasActivas = useCallback(() => {
    return alertas.filter(a => a.activa);
  }, [alertas]);

  const getAlertasCriticas = useCallback(() => {
    return alertas.filter(a => a.activa && a.tipoAlerta === 'critico');
  }, [alertas]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async (sucursalId?: string) => {
    try {
      setError(null);
      console.log(`[Hook] 🔄 Refrescando todos los datos...`);
      
      // Recargar dashboard y alertas en paralelo
      await Promise.all([
        loadDashboard(sucursalId),
        loadAlertas({ activa: true })
      ]);
      
      console.log(`[Hook] ✅ Datos refrescados exitosamente`);
    } catch (err) {
      console.error(`[Hook] ❌ Error refrescando datos:`, err);
      setError('Error al refrescar datos');
    }
  }, [loadDashboard, loadAlertas]);

  // 🆕 Función utilitaria para hacer carga manual más simple
  const cargarStockRapido = useCallback(async (
    productoId: string, 
    sucursalId: string, 
    cantidad: number, 
    observaciones?: string
  ) => {
    return await cargaManual({
      productoId,
      sucursalId,
      cantidad,
      observaciones,
      modo: 'incrementar'
    });
  }, [cargaManual]);

  // Auto-cargar datos iniciales
  useEffect(() => {
    console.log(`[Hook] 🚀 Inicializando hook useStockSucursales`);
    loadDashboard();
    loadAlertas({ activa: true });
  }, [loadDashboard, loadAlertas]);

  return {
    // Estado
    loading,
    error,
    dashboardData,
    configs,
    alertas,
    lastUpdate,
    
    // Configuraciones
    loadConfigs,
    saveConfig,
    
    // Dashboard
    loadDashboard,
    
    // Carga masiva
    bulkLoad,
    loadBulkHistory,
    
    // 🆕 Carga manual
    cargaManual,
    cargarStockRapido,
    loadHistorialCargaManual,
    
    // Alertas
    loadAlertas,
    marcarAlertaVista,
    verificarAlertas,
    
    // Utilidades
    getConfigForProduct,
    getAlertasActivas,
    getAlertasCriticas,
    clearError,
    refreshData,
    
    // Acciones de estado
    setError,
    setLoading
  };
}