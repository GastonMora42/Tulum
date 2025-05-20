'use client';

import { useState, useEffect } from 'react';
import { FacturaViewer } from '@/components/pdv/FacturaViewer';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  CheckCircle,
  Filter,
} from 'lucide-react';
import FacturasTable from '@/components/pdv/FacturasTable';

export default function FacturasPage() {
  const [selectedFacturaId, setSelectedFacturaId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<{
    total: number;
    completadas: number;
    pendientes: number;
    error: number;
  }>({
    total: 0,
    completadas: 0,
    pendientes: 0,
    error: 0
  });
  
  // Obtener estadísticas
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) return;
        
        const response = await authenticatedFetch(`/api/pdv/facturas/stats?sucursalId=${sucursalId}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    };
    
    fetchStats();
  }, [refreshTrigger]);
  
  // Ver detalle de factura
  const handleViewFactura = (facturaId: string) => {
    setSelectedFacturaId(facturaId);
    setIsViewerOpen(true);
  };
  
  // Reintentar factura con error
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
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#311716]">Facturas Electrónicas</h1>
        
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
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
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Facturas</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Completadas</p>
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
            <p className="text-2xl font-bold">{stats.completadas}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Pendientes</p>
          <div className="flex items-center">
            <FileText className="text-amber-500 mr-2 h-5 w-5" />
            <p className="text-2xl font-bold">{stats.pendientes}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Con Error</p>
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-2 h-5 w-5" />
            <p className="text-2xl font-bold">{stats.error}</p>
          </div>
        </div>
      </div>
      
      {/* Tabla de facturas */}
      <div className="bg-white rounded-lg shadow-sm">
        <FacturasTable 
          sucursalId={localStorage.getItem('sucursalId') || undefined}
          onViewFactura={handleViewFactura}
          onRetryFactura={handleRetryFactura}
          refreshKey={refreshTrigger}
        />
      </div>
      
      {/* Visor de factura */}
      {isViewerOpen && selectedFacturaId && (
        <FacturaViewer 
          facturaId={selectedFacturaId} 
          onClose={() => setIsViewerOpen(false)} 
        />
      )}
    </div>
  );
}