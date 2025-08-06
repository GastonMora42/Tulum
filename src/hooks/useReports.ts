
// src/hooks/useReportes.ts - HOOK PERSONALIZADO COMPLETO
import { useState, useEffect, useCallback, useMemo } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

export interface FiltrosReporte {
  fechaInicio: string;
  fechaFin: string;
  sucursalId: string;
  tipoReporte: string;
  agruparPor: 'hora' | 'dia' | 'semana' | 'mes';
  vendedorId: string;
  productoId: string;
  categoriaId: string;
  mediosPago: string[];
  incluirFacturadas: boolean;
  incluirNoFacturadas: boolean;
  tipoFactura: string[];
}

export interface ConfiguracionReporte {
  id: string;
  nombre: string;
  descripcion: string;
  filtros: FiltrosReporte;
  visualizaciones: any[];
  layout: 'grid' | 'list' | 'dashboard';
  colores: string[];
  fechaCreacion: Date;
  fechaModificacion: Date;
  esPublica: boolean;
  creadoPor: string;
}

export interface DatosComparacion {
  actual: any;
  anterior: any;
  cambios: Record<string, {
    valor: number;
    porcentaje: number;
    tendencia: 'up' | 'down' | 'stable';
  }>;
}

export function useReportes() {
  // Estados principales
  const [datos, setDatos] = useState<any>(null);
  const [datosComparacion, setDatosComparacion] = useState<DatosComparacion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de configuración
  const [configuracionesGuardadas, setConfiguracionesGuardadas] = useState<ConfiguracionReporte[]>([]);
  const [configuracionActiva, setConfiguracionActiva] = useState<ConfiguracionReporte | null>(null);
  
  // Cache de datos
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  
  // Función principal para cargar datos
  const cargarDatos = useCallback(async (
    tipoReporte: string, 
    filtros: FiltrosReporte, 
    incluirComparacion: boolean = false,
    forzarRecarga: boolean = false
  ) => {
    const cacheKey = `${tipoReporte}-${JSON.stringify(filtros)}`;
    const cached = cache.get(cacheKey);
    
    // Verificar cache si no es recarga forzada
    if (!forzarRecarga && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Usando datos en cache para ${tipoReporte}`);
      setDatos(cached.data);
      
      if (incluirComparacion) {
        await cargarDatosComparacion(tipoReporte, filtros, cached.data);
      }
      return cached.data;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = obtenerEndpoint(tipoReporte, filtros);
      console.log(`Cargando datos desde: ${endpoint}`);
      
      const response = await authenticatedFetch(endpoint);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Actualizar cache
      setCache(prev => new Map(prev).set(cacheKey, { data, timestamp: Date.now() }));
      setDatos(data);
      
      // Cargar comparación si es necesario
      if (incluirComparacion) {
        await cargarDatosComparacion(tipoReporte, filtros, data);
      }
      
      console.log(`Datos cargados exitosamente para ${tipoReporte}`);
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error al cargar datos:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cache]);
  
  // Función para cargar datos de comparación
  const cargarDatosComparacion = useCallback(async (
    tipoReporte: string, 
    filtros: FiltrosReporte, 
    datosActuales: any
  ) => {
    try {
      // Calcular período anterior
      const diasDiferencia = Math.abs(
        new Date(filtros.fechaFin).getTime() - new Date(filtros.fechaInicio).getTime()
      ) / (1000 * 60 * 60 * 24);
      
      const fechaInicioComparacion = new Date(filtros.fechaInicio);
      fechaInicioComparacion.setDate(fechaInicioComparacion.getDate() - diasDiferencia);
      const fechaFinComparacion = new Date(filtros.fechaInicio);
      fechaFinComparacion.setDate(fechaFinComparacion.getDate() - 1);

      const filtrosComparacion = {
        ...filtros,
        fechaInicio: format(fechaInicioComparacion, 'yyyy-MM-dd'),
        fechaFin: format(fechaFinComparacion, 'yyyy-MM-dd')
      };

      const endpoint = obtenerEndpoint(tipoReporte, filtrosComparacion);
      const response = await authenticatedFetch(endpoint);
      
      if (response.ok) {
        const dataComparacion = await response.json();
        const cambios = calcularCambios(datosActuales, dataComparacion);
        
        setDatosComparacion({
          actual: datosActuales,
          anterior: dataComparacion,
          cambios
        });
      }
    } catch (error) {
      console.error('Error al cargar datos de comparación:', error);
    }
  }, []);
  
  // Función para obtener endpoint según tipo de reporte
  const obtenerEndpoint = useCallback((tipoReporte: string, filtros: FiltrosReporte): string => {
    const params = new URLSearchParams({
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      agruparPor: filtros.agruparPor
    });

    // Agregar filtros opcionales
    if (filtros.sucursalId) params.append('sucursalId', filtros.sucursalId);
    if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);
    if (filtros.productoId) params.append('productoId', filtros.productoId);
    if (filtros.categoriaId) params.append('categoriaId', filtros.categoriaId);
    if (filtros.tipoFactura.length > 0) {
      filtros.tipoFactura.forEach(tipo => params.append('tipoFactura', tipo));
    }

    const endpoints = {
      'ventas_generales': `/api/reportes/ventas-detallado?${params}`,
      'ventas_sucursales': `/api/reportes/ventas-por-sucursal?${params}`,
      'punto_equilibrio': `/api/admin/punto-equilibrio?${params}`,
      'productos_rendimiento': `/api/reportes/productos-rendimiento?${params}`,
      'vendedores_performance': `/api/reportes/vendedores-performance?${params}`,
      'facturacion_detallada': `/api/reportes/facturacion-detallada?${params}`,
      'horarios_ventas': `/api/reportes/horarios-ventas?${params}`,
      'medios_pago': `/api/reportes/medios-pago?${params}`
    };

    return endpoints[tipoReporte as keyof typeof endpoints] || endpoints['ventas_generales'];
  }, []);
  
  // Función para calcular cambios entre períodos
  const calcularCambios = useCallback((actual: any, anterior: any) => {
    const cambios: Record<string, any> = {};
    
    // Definir métricas a comparar según el tipo de datos
    const metricas = [
      'ventasTotales', 'cantidadVentas', 'ticketPromedio', 
      'ingresosTotales', 'totalVendedores', 'totalProductos'
    ];
    
    metricas.forEach(metrica => {
      const valorActual = obtenerValorMetrica(actual, metrica);
      const valorAnterior = obtenerValorMetrica(anterior, metrica);
      
      if (valorAnterior > 0) {
        const cambio = ((valorActual - valorAnterior) / valorAnterior) * 100;
        cambios[metrica] = {
          valor: valorActual - valorAnterior,
          porcentaje: cambio,
          tendencia: cambio > 0 ? 'up' : cambio < 0 ? 'down' : 'stable'
        };
      } else {
        cambios[metrica] = {
          valor: valorActual,
          porcentaje: valorActual > 0 ? 100 : 0,
          tendencia: valorActual > 0 ? 'up' : 'stable'
        };
      }
    });
    
    return cambios;
  }, []);
  
  // Función auxiliar para obtener valor de métrica
  const obtenerValorMetrica = useCallback((datos: any, metrica: string): number => {
    if (!datos) return 0;
    
    // Buscar en diferentes estructuras de datos
    if (datos.resumen && datos.resumen[metrica] !== undefined) {
      return Number(datos.resumen[metrica]) || 0;
    }
    
    if (datos.estadisticas && datos.estadisticas[metrica] !== undefined) {
      return Number(datos.estadisticas[metrica]) || 0;
    }
    
    if (datos[metrica] !== undefined) {
      return Number(datos[metrica]) || 0;
    }
    
    return 0;
  }, []);
  
  // Función para exportar datos
  const exportarDatos = useCallback(async (
    formato: 'pdf' | 'excel' | 'csv',
    tipoReporte: string,
    filtros: FiltrosReporte,
    configuracion: any
  ) => {
    if (!datos) {
      throw new Error('No hay datos para exportar');
    }
    
    setIsLoading(true);
    try {
      let endpoint = '';
      const body = {
        tipoReporte,
        filtros,
        datos,
        configuracion
      };
      
      switch (formato) {
        case 'pdf':
          endpoint = '/api/reportes/export/pdf';
          break;
        case 'excel':
          endpoint = '/api/reportes/export/excel';
          break;
        case 'csv':
          endpoint = '/api/reportes/export/csv';
          break;
        default:
          throw new Error('Formato no soportado');
      }
      
      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${tipoReporte}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${formato}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return true;
      } else {
        throw new Error('Error al generar exportación');
      }
    } catch (error) {
      console.error('Error en exportación:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [datos]);
  
  // Funciones de configuración
  const guardarConfiguracion = useCallback(async (configuracion: Omit<ConfiguracionReporte, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    const nuevaConfiguracion: ConfiguracionReporte = {
      ...configuracion,
      id: `config-${Date.now()}`,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
    
    // Simular guardado (implementar con API real según necesidad)
    setConfiguracionesGuardadas(prev => [...prev, nuevaConfiguracion]);
    
    // TODO: Implementar guardado en base de datos
    // const response = await authenticatedFetch('/api/reportes/configuraciones', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(nuevaConfiguracion)
    // });
    
    return nuevaConfiguracion;
  }, []);
  
  const cargarConfiguracion = useCallback(async (configId: string) => {
    const config = configuracionesGuardadas.find(c => c.id === configId);
    if (config) {
      setConfiguracionActiva(config);
      return config;
    }
    throw new Error('Configuración no encontrada');
  }, [configuracionesGuardadas]);
  
  const eliminarConfiguracion = useCallback(async (configId: string) => {
    setConfiguracionesGuardadas(prev => prev.filter(c => c.id !== configId));
    if (configuracionActiva?.id === configId) {
      setConfiguracionActiva(null);
    }
  }, [configuracionActiva]);
  
  // Limpiar cache periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (now - value.timestamp < CACHE_DURATION) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    }, CACHE_DURATION);
    
    return () => clearInterval(interval);
  }, [CACHE_DURATION]);
  
  // Estadísticas del cache
  const estadisticasCache = useMemo(() => ({
    entradas: cache.size,
    ultimaLimpieza: Date.now(),
    ratioHit: 0 // TODO: implementar tracking de hits
  }), [cache]);
  
  return {
    // Estados principales
    datos,
    datosComparacion,
    isLoading,
    error,
    
    // Configuraciones
    configuracionesGuardadas,
    configuracionActiva,
    
    // Funciones principales
    cargarDatos,
    cargarDatosComparacion,
    exportarDatos,
    
    // Gestión de configuraciones
    guardarConfiguracion,
    cargarConfiguracion,
    eliminarConfiguracion,
    setConfiguracionActiva,
    
    // Utilidades
    clearCache: () => setCache(new Map()),
    clearError: () => setError(null),
    estadisticasCache,
    
    // Control manual
    setDatos,
    setError,
    refrescar: (tipoReporte: string, filtros: FiltrosReporte, incluirComparacion: boolean = false) => 
      cargarDatos(tipoReporte, filtros, incluirComparacion, true)
  };
}

