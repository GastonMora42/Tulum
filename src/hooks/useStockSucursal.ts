// src/hooks/useStockSucursales.ts - HOOK CORREGIDO
import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';

// ✅ INTERFACES CORREGIDAS
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

export function useStockSucursales() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [configs, setConfigs] = useState<StockConfig[]>([]);
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);

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

      const response = await authenticatedFetch(`/api/admin/stock-config?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar configuraciones');
      }
      
      const data = await response.json();
      setConfigs(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar configuraciones';
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

      return savedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar configuración';
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

      const response = await authenticatedFetch(`/api/admin/stock-config/dashboard?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar dashboard');
      }
      
      const data = await response.json();
      setDashboardData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar dashboard';
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
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en carga masiva';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
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

      const response = await authenticatedFetch(`/api/admin/stock-config/alertas?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar alertas');
      }
      
      const data: AlertasResponse = await response.json();
      setAlertas(data.alertas);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar alertas';
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

  // ============= UTILIDADES =============
  
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

  // Auto-cargar datos iniciales
  useEffect(() => {
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
    
    // Configuraciones
    loadConfigs,
    saveConfig,
    
    // Dashboard
    loadDashboard,
    
    // Carga masiva
    bulkLoad,
    loadBulkHistory,
    
    // Alertas
    loadAlertas,
    marcarAlertaVista,
    verificarAlertas,
    
    // Utilidades
    getConfigForProduct,
    getAlertasActivas,
    getAlertasCriticas,
    clearError,
    
    // Acciones de estado
    setError,
    setLoading
  };
}