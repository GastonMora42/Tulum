// src/app/(admin)/admin/stock-insumos-pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Building2, Package, AlertTriangle, TrendingDown, RefreshCw, Eye } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { Button } from '@/components/ui/Button';

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface StockInsumo {
  id: string;
  cantidad: number;
  ultimaActualizacion: string;
  insumoPdv: {
    id: string;
    nombre: string;
    unidadMedida: string;
    stockMinimo: number;
  };
  ubicacion: {
    id: string;
    nombre: string;
    tipo: string;
  };
}

interface DashboardData {
  stockTotal: number;
  stockBajo: number;
  solicitudesPendientes: number;
  enviosPendientes: number;
  insumosStockBajo: StockInsumo[];
}

export default function StockInsumosPdvPage() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [selectedUbicacion, setSelectedUbicacion] = useState<string>('');
  const [stockData, setStockData] = useState<StockInsumo[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'overview' | 'detail'>('overview');

  useEffect(() => {
    fetchUbicaciones();
  }, []);

  useEffect(() => {
    if (selectedUbicacion) {
      fetchStockData();
      fetchDashboardData();
    }
  }, [selectedUbicacion]);

  const fetchUbicaciones = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/ubicaciones');
      const data = await response.json();
      setUbicaciones(data.filter((u: Ubicacion) => u.activo));
      
      // Seleccionar primera ubicación por defecto
      if (data.length > 0) {
        setSelectedUbicacion(data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  const fetchStockData = async () => {
    if (!selectedUbicacion) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/stock-insumos-pdv?ubicacionId=${selectedUbicacion}`
      );
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error al cargar stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!selectedUbicacion) return;
    
    try {
      const response = await authenticatedFetch(
        `/api/admin/insumos-pdv/dashboard?ubicacionId=${selectedUbicacion}`
      );
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    }
  };

  const selectedUbicacionData = ubicaciones.find(u => u.id === selectedUbicacion);
  const stockBajo = stockData.filter(s => s.cantidad <= s.insumoPdv.stockMinimo);
  const stockCritico = stockData.filter(s => s.cantidad === 0);

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Stock de Insumos PDV</h1>
              <p className="text-white/80">Monitoreo de stock por ubicación</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant={view === 'overview' ? 'primary' : 'outline'}
                onClick={() => setView('overview')}
                className={view === 'overview' ? 'bg-[#eeb077] text-[#311716]' : 'text-white border-white'}
              >
                Vista General
              </Button>
              <Button
                variant={view === 'detail' ? 'primary' : 'outline'}
                onClick={() => setView('detail')}
                className={view === 'detail' ? 'bg-[#eeb077] text-[#311716]' : 'text-white border-white'}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Detalle
              </Button>
            </div>
          </div>
        </div>

        {/* Location Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="h-6 w-6 text-[#9c7561]" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Ubicación
                </label>
                <select
                  value={selectedUbicacion}
                  onChange={(e) => setSelectedUbicacion(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077] min-w-[200px]"
                >
                  <option value="">Seleccionar...</option>
                  {ubicaciones.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedUbicacion && (
              <Button
                onClick={() => {
                  fetchStockData();
                  fetchDashboardData();
                }}
                variant="outline"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                disabled={isLoading}
              >
                Actualizar
              </Button>
            )}
          </div>
        </div>

        {selectedUbicacion && selectedUbicacionData && (
          <>
            {/* Dashboard Cards */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.stockTotal}
                      </p>
                      <p className="text-sm text-gray-600">Total Insumos</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.stockBajo}
                      </p>
                      <p className="text-sm text-gray-600">Stock Bajo</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {stockCritico.length}
                      </p>
                      <p className="text-sm text-gray-600">Stock Crítico</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.enviosPendientes}
                      </p>
                      <p className="text-sm text-gray-600">Envíos Pendientes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Stock en {selectedUbicacionData.nombre}
                </h3>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
                </div>
              ) : stockData.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay stock registrado en esta ubicación</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Insumo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Actual
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Mínimo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Última Actualización
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockData
                        .sort((a, b) => {
                          // Priorizar stock crítico y bajo
                          const aEsCritico = a.cantidad === 0;
                          const bEsCritico = b.cantidad === 0;
                          const aEsBajo = a.cantidad <= a.insumoPdv.stockMinimo;
                          const bEsBajo = b.cantidad <= b.insumoPdv.stockMinimo;
                          
                          if (aEsCritico && !bEsCritico) return -1;
                          if (!aEsCritico && bEsCritico) return 1;
                          if (aEsBajo && !bEsBajo) return -1;
                          if (!aEsBajo && bEsBajo) return 1;
                          
                          return a.insumoPdv.nombre.localeCompare(b.insumoPdv.nombre);
                        })
                        .map((stock) => {
                          const esCritico = stock.cantidad === 0;
                          const esBajo = stock.cantidad <= stock.insumoPdv.stockMinimo;
                          
                          return (
                            <tr
                              key={stock.id}
                              className={`hover:bg-gray-50 ${
                                esCritico ? 'bg-red-50' : esBajo ? 'bg-amber-50' : ''
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <Package className="h-5 w-5 text-gray-400 mr-3" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {stock.insumoPdv.nombre}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-medium ${
                                  esCritico ? 'text-red-600' : esBajo ? 'text-amber-600' : 'text-gray-900'
                                }`}>
                                  {stock.cantidad} {stock.insumoPdv.unidadMedida}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {stock.insumoPdv.stockMinimo} {stock.insumoPdv.unidadMedida}
                              </td>
                              <td className="px-6 py-4">
                                {esCritico ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    Crítico
                                  </span>
                                ) : esBajo ? (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                    Stock Bajo
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Normal
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(stock.ultimaActualizacion).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}