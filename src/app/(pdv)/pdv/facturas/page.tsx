// src/app/(pdv)/pdv/facturas/page.tsx - VERSIÓN ACTUALIZADA
'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Printer,
  Settings
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useSucursal } from '@/hooks/useSucursal';
import FacturasTable from '@/components/pdv/FacturasTable';

interface FacturasStats {
  total: number;
  completadas: number;
  pendientes: number;
  error: number;
}

interface ResumenMensual {
  mes: string;
  totalFacturado: number;
  cantidadFacturas: number;
  promedioPorFactura: number;
  tendencia: 'up' | 'down' | 'stable';
}

export default function FacturasPage() {
  const { sucursalId, sucursalNombre } = useSucursal();
  
  const [stats, setStats] = useState<FacturasStats>({
    total: 0,
    completadas: 0,
    pendientes: 0,
    error: 0
  });
  
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (sucursalId) {
      fetchStats();
      fetchResumenMensual();
    }
  }, [sucursalId, refreshTrigger]);

  const fetchStats = async () => {
    if (!sucursalId) return;
    
    try {
      const response = await authenticatedFetch(`/api/pdv/facturas/stats?sucursalId=${sucursalId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const fetchResumenMensual = async () => {
    if (!sucursalId) return;
    
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await authenticatedFetch(
        `/api/pdv/reportes/resumen-mensual?sucursalId=${sucursalId}&year=${year}&month=${month}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setResumenMensual(data);
      }
    } catch (error) {
      console.error('Error al cargar resumen mensual:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRetryFactura = async (facturaId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/pdv/facturas/retry/${facturaId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al reintentar factura');
      }
      
      // Refrescar datos
      handleRefresh();
      
      alert('✅ Factura reintentada correctamente');
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      alert(`❌ Error al reintentar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openPrinterConfig = () => {
    // Abrir configuración de impresora en nueva ventana/modal
    const newWindow = window.open('/admin/impresoras', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.focus();
    }
  };

  if (!sucursalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sin sucursal asignada</h1>
          <p className="text-gray-600">
            Debe tener una sucursal asignada para ver las facturas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#311716]">
            Facturas Electrónicas
          </h1>
          <p className="text-gray-600 mt-1">
            {sucursalNombre && `Sucursal: ${sucursalNombre}`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openPrinterConfig}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <Settings className="mr-2 h-4 w-4" />
            Config. Impresora
          </button>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Error global */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturas */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Facturas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="ml-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Completadas */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completadas}</p>
              {stats.total > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {((stats.completadas / stats.total) * 100).toFixed(1)}% del total
                </p>
              )}
            </div>
            <div className="ml-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Pendientes */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendientes}</p>
              {stats.pendientes > 0 && (
                <p className="text-xs text-amber-600 mt-1">Requieren atención</p>
              )}
            </div>
            <div className="ml-4">
              <div className="bg-amber-50 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Con Error */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Con Error</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.error}</p>
              {stats.error > 0 && (
                <p className="text-xs text-red-600 mt-1">Necesitan reintento</p>
              )}
            </div>
            <div className="ml-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen mensual */}
      {resumenMensual && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Resumen del Mes Actual
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              {resumenMensual.tendencia === 'up' && (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              )}
              {resumenMensual.tendencia === 'down' && (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className="capitalize">{resumenMensual.tendencia}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Facturado</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                ${resumenMensual.totalFacturado.toLocaleString('es-AR')}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Cantidad de Facturas</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {resumenMensual.cantidadFacturas}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Promedio por Factura</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                ${resumenMensual.promedioPorFactura.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alertas importantes */}
      {stats.error > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                Atención requerida
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Hay {stats.error} factura{stats.error > 1 ? 's' : ''} con errores que necesita{stats.error > 1 ? 'n' : ''} ser reintentada{stats.error > 1 ? 's' : ''}.
                Puede usar el botón de reintento en la tabla para procesarlas nuevamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Información de impresión */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
        <div className="flex">
          <Printer className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Sistema de Impresión
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Las facturas completadas pueden reimprimirse directamente desde la tabla. 
              Si no tiene impresora configurada, se abrirá automáticamente el PDF para descarga.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabla de facturas */}
      <FacturasTable 
        sucursalId={sucursalId}
        onRetryFactura={handleRetryFactura}
        refreshKey={refreshTrigger}
      />
    </div>
  );
}