// src/components/pdv/FacturasTable.tsx - VERSIÓN MEJORADA
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter,
  FileText,
  Eye,
  Printer,
  Download,
  ExternalLink
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Factura {
  id: string;
  tipoComprobante: string;
  puntoVenta: number;
  numeroFactura: number;
  fechaEmision: string;
  cae: string;
  vencimientoCae: string;
  estado: string;
  venta: {
    id: string;
    total: number;
    clienteNombre: string | null;
    clienteCuit: string | null;
  };
  sucursal: string;
  usuario: string;
}

interface FacturasTableProps {
  sucursalId?: string;
  onViewFactura?: (facturaId: string) => void;
  onRetryFactura?: (facturaId: string) => void;
  refreshKey?: number;
}

export default function FacturasTable({ 
  sucursalId, 
  onViewFactura, 
  onRetryFactura, 
  refreshKey 
}: FacturasTableProps) {
  const router = useRouter();
  
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(20);
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    estado: '',
    search: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  useEffect(() => {
    fetchFacturas();
  }, [page, sucursalId, refreshKey]);
  
  const fetchFacturas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir URL con parámetros
      let url = `/api/pdv/facturas?page=${page}&limit=${limit}`;
      if (sucursalId) {
        url += `&sucursalId=${sucursalId}`;
      }
      
      // Añadir filtros
      if (filtros.desde) url += `&desde=${filtros.desde}`;
      if (filtros.hasta) url += `&hasta=${filtros.hasta}`;
      if (filtros.estado) url += `&estado=${filtros.estado}`;
      if (filtros.search) url += `&search=${encodeURIComponent(filtros.search)}`;
      
      const response = await authenticatedFetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar facturas');
      }
      
      setFacturas(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerDetalle = (facturaId: string) => {
    // Navegar a la página de detalle
    router.push(`/pdv/facturas/${facturaId}`);
  };
  
  const handleVerPdf = (facturaId: string) => {
    window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank');
  };

  const handleReimprimir = async (facturaId: string) => {
    try {
      // Importar dinámicamente el hook de impresión
      const { printManager } = await import('@/services/print/integratedPrintManager');
      
      const result = await printManager.printFactura(facturaId, {
        auto: false,
        copies: 1
      });
      
      if (result.success) {
        alert('✅ Factura enviada a impresora');
      } else {
        alert(`❌ Error: ${result.message}`);
        // Fallback a PDF
        handleVerPdf(facturaId);
      }
    } catch (error) {
      console.error('Error reimprimiendo:', error);
      alert('❌ Error de impresión. Se abrirá PDF como alternativa.');
      handleVerPdf(facturaId);
    }
  };
  
  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reiniciar a primera página
    fetchFacturas();
  };
  
  const handleLimpiarFiltros = () => {
    setFiltros({
      desde: '',
      hasta: '',
      estado: '',
      search: ''
    });
    setPage(1);
    fetchFacturas();
  };
  
  const getEstadoTag = (estado: string) => {
    switch (estado) {
      case 'completada':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Completada
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            Error
          </span>
        );
      case 'procesando':
      case 'pendiente':
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
            <Clock size={12} className="mr-1" />
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        );
    }
  };
  
  const formatNumeroFactura = (puntoVenta: number, numeroFactura: number) => {
    return `${String(puntoVenta).padStart(5, '0')}-${String(numeroFactura).padStart(8, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar facturas</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFacturas}
            className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625]"
          >
            <RefreshCw size={16} className="inline mr-2" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Facturas Electrónicas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {total > 0 ? `${total} facturas encontradas` : 'No hay facturas'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`px-3 py-2 text-sm border rounded-md transition-colors ${
              mostrarFiltros 
                ? 'bg-[#311716] text-white border-[#311716]' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} className="inline mr-1" />
            Filtros
          </button>
          <button
            onClick={() => fetchFacturas()}
            disabled={loading}
            className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>
      
      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="p-4 bg-gray-50 border-b">
          <form onSubmit={handleFiltrar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({...filtros, desde: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#311716] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({...filtros, hasta: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#311716] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#311716] focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="completada">Completada</option>
                <option value="procesando">Procesando</option>
                <option value="pendiente">Pendiente</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cliente, número..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#311716] focus:border-transparent"
                />
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* Botones de filtro */}
            <div className="lg:col-span-4 flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Limpiar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-[#311716] text-white rounded-md hover:bg-[#462625]"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Tabla de facturas */}
      {loading && facturas.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#311716] mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando facturas...</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comprobante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
                    <p className="text-gray-600">
                      {filtros.desde || filtros.hasta || filtros.estado || filtros.search
                        ? 'No se encontraron facturas con los filtros aplicados'
                        : 'Aún no se han generado facturas en esta sucursal'
                      }
                    </p>
                    {(filtros.desde || filtros.hasta || filtros.estado || filtros.search) && (
                      <button
                        onClick={handleLimpiarFiltros}
                        className="mt-3 px-4 py-2 text-sm bg-[#311716] text-white rounded-md hover:bg-[#462625]"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Factura {factura.tipoComprobante}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatNumeroFactura(factura.puntoVenta, factura.numeroFactura)}
                        </div>
                        {factura.cae && (
                          <div className="text-xs text-gray-400">
                            CAE: {factura.cae.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(factura.fechaEmision), 'dd/MM/yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(factura.fechaEmision), 'HH:mm')}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {factura.venta.clienteNombre || 'Consumidor Final'}
                      </div>
                      {factura.venta.clienteCuit && (
                        <div className="text-sm text-gray-500">
                          {factura.venta.clienteCuit}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        por {factura.usuario}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${factura.venta.total.toFixed(2)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getEstadoTag(factura.estado)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Botón Ver Detalle */}
                        <button
                          onClick={() => handleVerDetalle(factura.id)}
                          className="p-2 text-gray-400 hover:text-[#311716] hover:bg-gray-100 rounded-md transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {/* Botón Ver PDF - solo si está completada */}
                        {factura.estado === 'completada' && (
                          <button
                            onClick={() => handleVerPdf(factura.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver PDF"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        
                        {/* Botón Reimprimir - solo si está completada */}
                        {factura.estado === 'completada' && (
                          <button
                            onClick={() => handleReimprimir(factura.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Reimprimir"
                          >
                            <Printer size={16} />
                          </button>
                        )}
                        
                        {/* Botón Reintentar - solo si hay error */}
                        {factura.estado === 'error' && onRetryFactura && (
                          <button
                            onClick={() => onRetryFactura(factura.id)}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                            title="Reintentar"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        
                        {/* Botón Abrir en nueva pestaña */}
                        <button
                          onClick={() => window.open(`/pdv/facturas/${factura.id}`, '_blank')}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                          title="Abrir en nueva pestaña"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t bg-gray-50">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a{' '}
            <span className="font-medium">
              {Math.min(page * limit, total)}
            </span>{' '}
            de <span className="font-medium">{total}</span> facturas
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isCurrentPage = pageNum === page;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      isCurrentPage
                        ? 'bg-[#311716] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  {page < totalPages - 2 && <span className="text-gray-500">...</span>}
                  <button
                    onClick={() => setPage(totalPages)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      totalPages === page
                        ? 'bg-[#311716] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}