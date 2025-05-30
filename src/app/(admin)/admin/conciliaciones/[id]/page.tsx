// src/app/(admin)/admin/conciliaciones/[id]/page.tsx - NUEVA VISTA DETALLADA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft, CheckCircle, Clock, AlertTriangle, User, Calendar, 
  MapPin, FileText, Package, TrendingUp, TrendingDown, 
  Target, AlertCircle, Check, X, RefreshCw, Eye
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface DetalleConciliacion {
  productoId: string;
  stockTeorico: number;
  stockFisico: number;
  diferencia: number;
  producto?: {
    nombre: string;
    codigoBarras?: string;
    categoria?: { nombre: string };
  };
}

interface ConciliacionDetallada {
  id: string;
  fecha: string;
  estado: string;
  observaciones?: string;
  detalles: DetalleConciliacion[];
  sucursal: {
    nombre: string;
    tipo: string;
  };
  usuario: {
    name: string;
    email: string;
  };
  contingencias: Array<{
    id: string;
    titulo: string;
    estado: string;
    fechaCreacion: string;
    urgente: boolean;
  }>;
}

export default function ConciliacionDetalladaPage({ params }: { params: { id: string } }) {
  const [conciliacion, setConciliacion] = useState<ConciliacionDetallada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingConciliacion, setCompletingConciliacion] = useState(false);
  const [filtroProductos, setFiltroProductos] = useState<'todos' | 'diferencias' | 'correctos'>('todos');
  const router = useRouter();

  useEffect(() => {
    fetchConciliacionDetalle();
  }, [params.id]);

  const fetchConciliacionDetalle = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch(`/api/admin/conciliaciones/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar detalles de la conciliación');
      }
      
      const data = await response.json();
      
      // Procesar detalles si vienen como JSON string
      let detallesProcessed = data.detalles;
      if (typeof detallesProcessed === 'string') {
        detallesProcessed = JSON.parse(detallesProcessed);
      }
      
      // Enriquecer detalles con información de productos
      if (Array.isArray(detallesProcessed)) {
        const productosEnriquecidos = await Promise.all(
          detallesProcessed.map(async (detalle: any) => {
            try {
              const prodResponse = await authenticatedFetch(`/api/admin/productos/${detalle.productoId}`);
              if (prodResponse.ok) {
                const producto = await prodResponse.json();
                return {
                  ...detalle,
                  diferencia: detalle.stockFisico - detalle.stockTeorico,
                  producto: {
                    nombre: producto.nombre,
                    codigoBarras: producto.codigoBarras,
                    categoria: producto.categoria
                  }
                };
              }
            } catch (error) {
              console.error(`Error cargando producto ${detalle.productoId}:`, error);
            }
            
            return {
              ...detalle,
              diferencia: detalle.stockFisico - detalle.stockTeorico,
              producto: {
                nombre: `Producto ${detalle.productoId}`,
                codigoBarras: null,
                categoria: null
              }
            };
          })
        );
        
        setConciliacion({
          ...data,
          detalles: productosEnriquecidos
        });
      } else {
        setConciliacion({
          ...data,
          detalles: []
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletarConciliacion = async () => {
    if (!conciliacion) return;
    
    if (conciliacion.contingencias.some(c => c.estado === 'pendiente')) {
      alert('No se puede completar la conciliación mientras haya contingencias pendientes');
      return;
    }
    
    try {
      setCompletingConciliacion(true);
      
      const response = await authenticatedFetch(`/api/admin/conciliaciones/${params.id}/completar`, {
        method: 'POST',
        body: JSON.stringify({
          observaciones: 'Completada desde administración'
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al completar conciliación');
      }
      
      await fetchConciliacionDetalle();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al completar conciliación');
    } finally {
      setCompletingConciliacion(false);
    }
  };

  const getEstadoConfig = (estado: string) => {
    const configs = {
      pendiente: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock, 
        label: 'Pendiente' 
      },
      completada: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle, 
        label: 'Completada' 
      },
      con_contingencia: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: AlertTriangle, 
        label: 'Con Contingencia' 
      }
    };
    
    return configs[estado as keyof typeof configs] || configs.pendiente;
  };

  const calcularEstadisticas = () => {
    if (!conciliacion) return null;
    
    const total = conciliacion.detalles.length;
    const conDiferencias = conciliacion.detalles.filter(d => d.diferencia !== 0).length;
    const excesos = conciliacion.detalles.filter(d => d.diferencia > 0).length;
    const faltantes = conciliacion.detalles.filter(d => d.diferencia < 0).length;
    const correctos = total - conDiferencias;
    
    const totalDiferenciaValor = conciliacion.detalles.reduce((sum, d) => {
      // Aquí podrías calcular el valor monetario si tuvieras precios
      return sum + Math.abs(d.diferencia);
    }, 0);
    
    return {
      total,
      conDiferencias,
      excesos,
      faltantes,
      correctos,
      totalDiferenciaValor,
      porcentajeExactitud: total > 0 ? ((correctos / total) * 100).toFixed(1) : '0'
    };
  };

  const productosFiltrados = conciliacion?.detalles.filter(detalle => {
    switch (filtroProductos) {
      case 'diferencias':
        return detalle.diferencia !== 0;
      case 'correctos':
        return detalle.diferencia === 0;
      default:
        return true;
    }
  }) || [];

  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-[#311716] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando detalles de conciliación...</p>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error || !conciliacion) {
    return (
      <ContrastEnhancer>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar conciliación</h2>
              <p className="text-gray-600 mb-4">{error || 'Conciliación no encontrada'}</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625]"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  const estadoConfig = getEstadoConfig(conciliacion.estado);
  const IconoEstado = estadoConfig.icon;
  const stats = calcularEstadisticas();

  return (
    <ContrastEnhancer>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Conciliación #{conciliacion.id.slice(-8)}
                  </h1>
                  <p className="text-gray-600">
                    {conciliacion.sucursal.nombre} • {format(new Date(conciliacion.fecha), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`px-4 py-2 rounded-full border ${estadoConfig.color}`}>
                  <div className="flex items-center space-x-2">
                    <IconoEstado className="h-4 w-4" />
                    <span className="font-medium">{estadoConfig.label}</span>
                  </div>
                </div>
                
                {conciliacion.estado === 'con_contingencia' && 
                 conciliacion.contingencias.every(c => c.estado !== 'pendiente') && (
                  <button
                    onClick={handleCompletarConciliacion}
                    disabled={completingConciliacion}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {completingConciliacion ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Completar Conciliación</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Estadísticas de la conciliación */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Exactitud</p>
                    <p className="text-2xl font-bold text-green-600">{stats.porcentajeExactitud}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Faltantes</p>
                    <p className="text-2xl font-bold text-red-600">{stats.faltantes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Excesos</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.excesos}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información general */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Filtros de productos */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Productos Contados</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFiltroProductos('todos')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        filtroProductos === 'todos'
                          ? 'bg-[#311716] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Todos ({stats?.total})
                    </button>
                    <button
                      onClick={() => setFiltroProductos('diferencias')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        filtroProductos === 'diferencias'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Con Diferencias ({stats?.conDiferencias})
                    </button>
                    <button
                      onClick={() => setFiltroProductos('correctos')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        filtroProductos === 'correctos'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Correctos ({stats?.correctos})
                    </button>
                  </div>
                </div>

                {/* Lista de productos */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {productosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay productos en esta categoría</p>
                    </div>
                  ) : (
                    productosFiltrados.map((detalle, index) => (
                      <div
                        key={`${detalle.productoId}-${index}`}
                        className={`p-4 rounded-lg border-2 ${
                          detalle.diferencia === 0
                            ? 'border-green-200 bg-green-50'
                            : detalle.diferencia > 0
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                detalle.diferencia === 0
                                  ? 'bg-green-500 text-white'
                                  : detalle.diferencia > 0
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {detalle.diferencia === 0 ? (
                                  <Check className="h-4 w-4" />
                                ) : detalle.diferencia > 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {detalle.producto?.nombre || `Producto ${detalle.productoId}`}
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  {detalle.producto?.codigoBarras && (
                                    <span>Código: {detalle.producto.codigoBarras}</span>
                                  )}
                                  {detalle.producto?.categoria && (
                                    <span>Categoría: {detalle.producto.categoria.nombre}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-center">
                              <p className="text-gray-600">Sistema</p>
                              <p className="font-bold text-gray-900">{detalle.stockTeorico}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600">Contado</p>
                              <p className="font-bold text-gray-900">{detalle.stockFisico}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600">Diferencia</p>
                              <p className={`font-bold ${
                                detalle.diferencia === 0
                                  ? 'text-green-600'
                                  : detalle.diferencia > 0
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                              }`}>
                                {detalle.diferencia > 0 ? '+' : ''}{detalle.diferencia}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Panel lateral de información */}
            <div className="space-y-6">
              {/* Información básica */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Sucursal</p>
                      <p className="font-medium text-gray-900">{conciliacion.sucursal.nombre}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Realizada por</p>
                      <p className="font-medium text-gray-900">{conciliacion.usuario.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Fecha</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(conciliacion.fecha), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contingencias relacionadas */}
              {conciliacion.contingencias.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                    Contingencias
                  </h3>
                  <div className="space-y-3">
                    {conciliacion.contingencias.map((contingencia) => (
                      <div key={contingencia.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {contingencia.titulo}
                          </h4>
                          {contingencia.urgente && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                              Urgente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            contingencia.estado === 'pendiente'
                              ? 'bg-yellow-100 text-yellow-700'
                              : contingencia.estado === 'resuelto'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {contingencia.estado}
                          </span>
                          <button
                            onClick={() => router.push(`/admin/contingencias/${contingencia.id}`)}
                            className="text-[#311716] hover:text-[#462625] text-sm flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {conciliacion.observaciones && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    Observaciones
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {conciliacion.observaciones}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}