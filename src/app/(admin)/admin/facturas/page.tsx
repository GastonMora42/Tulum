'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { FacturaViewer } from '@/components/pdv/FacturaViewer';
import { FacturaReintentoHistorial } from '@/components/admin/FacturaReintentoHistorial';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Printer, Eye, Download, Search, Calendar, X, FileText, 
  ChevronLeft, ChevronRight, RefreshCw, Filter, CreditCard,
  DollarSign, QrCode, Smartphone, Check, AlertTriangle,
  BarChart2, PieChart, ArrowDownToLine, UploadCloud,
  CheckCircle, History,
  Clock
} from 'lucide-react';

export default function AdminFacturasPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
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
    sucursalId: '',
    search: ''
  });
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selectedFacturaId, setSelectedFacturaId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [tabActiva, setTabActiva] = useState('todas'); // 'todas', 'pendientes', 'error'
  
  // Nuevos estados para funcionalidades de reintento
  const [retryingFacturaId, setRetryingFacturaId] = useState<string | null>(null);
  const [showHistorialFacturaId, setShowHistorialFacturaId] = useState<string | null>(null);
  
  // Estado para el diálogo modal
  const [dialogData, setDialogData] = useState<{
    title: string;
    content: React.ReactNode;
    isOpen: boolean;
    actions?: React.ReactNode;
  }>({
    title: '',
    content: null,
    isOpen: false,
    actions: null
  });
  
  // Cargar sucursales para filtro
  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/ubicaciones?tipo=sucursal');
        if (response.ok) {
          const data = await response.json();
          setSucursales(data);
        }
      } catch (error) {
        console.error('Error al cargar sucursales:', error);
      }
    };
    
    fetchSucursales();
  }, []);
  
  // Cargar estadísticas generales
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/facturas/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    };
    
    fetchStats();
  }, []);
  
  // Cargar facturas con filtros
  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL con parámetros
        let url = `/api/admin/facturas?page=${page}&limit=${limit}`;
        
        // Filtro por tab activa
        if (tabActiva === 'pendientes') {
          url += '&estado=pendiente,procesando';
        } else if (tabActiva === 'error') {
          url += '&estado=error';
        }
        
        // Añadir filtros adicionales
        if (filtros.sucursalId) url += `&sucursalId=${filtros.sucursalId}`;
        if (filtros.desde) url += `&desde=${filtros.desde}`;
        if (filtros.hasta) url += `&hasta=${filtros.hasta}`;
        if (filtros.estado && tabActiva === 'todas') url += `&estado=${filtros.estado}`;
        if (filtros.search) url += `&search=${encodeURIComponent(filtros.search)}`;
        
        const response = await authenticatedFetch(url);
        
        if (!response.ok) {
          throw new Error('Error al cargar facturas');
        }
        
        const data = await response.json();
        setFacturas(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        console.error('Error al cargar facturas:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar facturas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFacturas();
  }, [page, filtros, tabActiva]);
  
  // Función mejorada para reintentar factura
  const handleRetryFactura = async (facturaId: string) => {
    if (!confirm('¿Desea reintentar la factura? El proceso se ejecutará en segundo plano.')) {
      return;
    }

    try {
      setRetryingFacturaId(facturaId);
      
      // Mostrar diálogo de reintento avanzado
      setDialogData({
        title: 'Reintentando Factura',
        content: (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="animate-spin h-5 w-5 text-blue-600" />
              <p>Iniciando reintento de factura...</p>
            </div>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono h-32 overflow-auto">
              <p>[LOG] Iniciando proceso de reintento para factura {facturaId}</p>
              <p>[LOG] Enviando solicitud al servidor...</p>
            </div>
          </div>
        ),
        isOpen: true
      });
      
      const response = await authenticatedFetch(`/api/pdv/facturas/retry/${facturaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          motivo: 'Reintento manual desde panel de administración'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reintentar factura');
      }
      
      const result = await response.json();
      
      // Actualizar diálogo con resultado
      setDialogData({
        title: result.success ? 'Reintento Exitoso' : 'Reintento Fallido',
        content: (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <p>{result.message || (result.success ? 'Factura generada correctamente' : 'Error al generar factura')}</p>
            </div>
            {result.success && result.cae && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="font-medium">CAE obtenido: {result.cae}</p>
              </div>
            )}
            <div className="bg-gray-100 p-3 rounded text-xs font-mono h-48 overflow-auto">
              <p>[LOG] Reintento {result.success ? 'exitoso' : 'fallido'} para factura {facturaId}</p>
              {result.success ? (
                <p>[LOG] CAE obtenido: {result.cae}</p>
              ) : (
                <>
                  <p>[LOG] Error: {result.error || 'Error desconocido'}</p>
                  {result.details && <p>[LOG] Detalles: {result.details}</p>}
                </>
              )}
              <p>[LOG] ID de reintento: {result.reintentoId || 'No disponible'}</p>
              <p>[LOG] Fecha: {new Date().toISOString()}</p>
              <p>[LOG] Para ver logs completos, consulte la consola del servidor</p>
            </div>
          </div>
        ),
        isOpen: true,
        actions: (
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setDialogData({ ...dialogData, isOpen: false })}
              className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
            >
              Cerrar
            </button>
            {result.success && (
              <button
                onClick={() => window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Ver Factura
              </button>
            )}
          </div>
        )
      });
      
      // Actualizar la lista después de un momento
      const updatedFacturas = [...facturas];
      const index = updatedFacturas.findIndex(f => f.id === facturaId);
      if (index !== -1) {
        updatedFacturas[index].estado = result.success ? 'completada' : 'error';
        setFacturas(updatedFacturas);
      }
      
    } catch (err) {
      console.error('Error al reintentar factura:', err);
      
      setDialogData({
        title: 'Error en Reintento',
        content: (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p>{err instanceof Error ? err.message : 'Error desconocido al reintentar factura'}</p>
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200 text-xs font-mono h-32 overflow-auto">
              <p>[LOG] Error en reintento para factura {facturaId}</p>
              <p>[LOG] {err instanceof Error ? err.message : 'Error desconocido'}</p>
              <p>[LOG] Fecha: {new Date().toISOString()}</p>
            </div>
          </div>
        ),
        isOpen: true,
        actions: (
          <button
            onClick={() => setDialogData({ ...dialogData, isOpen: false })}
            className="px-4 py-2 bg-gray-200 rounded-md text-gray-800"
          >
            Cerrar
          </button>
        )
      });
    } finally {
      setRetryingFacturaId(null);
    }
  };
  
  // Regenerar todas las facturas pendientes
  const handleRegenerarPendientes = async () => {
    if (!confirm('¿Está seguro de regenerar todas las facturas pendientes? Este proceso puede tardar varios minutos.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await authenticatedFetch('/api/admin/facturas/regenerar-pendientes', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al regenerar facturas pendientes');
      }
      
      const result = await response.json();
      alert(`Proceso iniciado. ${result.count} facturas en procesamiento.`);
      
      // Refrescar después de un momento
      setTimeout(() => {
        setPage(1); // Volver a la primera página
        // Forzar recarga
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };
  
  // Ver detalle de factura
  const handleVerDetalle = (facturaId: string) => {
    setSelectedFacturaId(facturaId);
    setIsViewerOpen(true);
  };
  
  // Generar reporte de facturas
  const handleGenerarReporte = async () => {
    try {
      setLoading(true);
      
      // Construir URL con filtros actuales
      let url = '/api/admin/facturas/reporte?format=excel';
      if (filtros.sucursalId) url += `&sucursalId=${filtros.sucursalId}`;
      if (filtros.desde) url += `&desde=${filtros.desde}`;
      if (filtros.hasta) url += `&hasta=${filtros.hasta}`;
      if (filtros.estado) url += `&estado=${filtros.estado}`;
      
      // Descargar archivo
      window.open(url, '_blank');
      
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };
  
  // Aplicar filtros
  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Volver a la primera página
  };
  
  // Resetear filtros
  const handleLimpiarFiltros = () => {
    setFiltros({
      desde: '',
      hasta: '',
      estado: '',
      sucursalId: '',
      search: ''
    });
    setPage(1);
  };
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Administración de Facturas Electrónicas</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <Filter size={16} className="mr-1" />
            Filtros
          </button>
          
          <button
            onClick={handleGenerarReporte}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            disabled={loading}
          >
            <ArrowDownToLine size={16} className="mr-1" />
            Exportar
          </button>
          
          <button
            onClick={handleRegenerarPendientes}
            className="px-3 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] flex items-center"
            disabled={loading}
          >
            <UploadCloud size={16} className="mr-1" />
            Regenerar Pendientes
          </button>
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Facturas</p>
              <p className="text-2xl font-bold">{stats.total || 0}</p>
            </div>
            <BarChart2 className="text-blue-500 h-8 w-8" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Completadas</p>
              <p className="text-2xl font-bold">{stats.completadas || 0}</p>
            </div>
            <Check className="text-green-500 h-8 w-8" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pendientes</p>
              <p className="text-2xl font-bold">{stats.pendientes || 0}</p>
            </div>
            <FileText className="text-amber-500 h-8 w-8" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Con Error</p>
              <p className="text-2xl font-bold">{stats.error || 0}</p>
            </div>
            <AlertTriangle className="text-red-500 h-8 w-8" />
          </div>
        </div>
      </div>
      
      {/* Pestañas para filtrar por estado */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTabActiva('todas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'todas'
                ? 'border-[#311716] text-[#311716]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Todas
          </button>
          
          <button
            onClick={() => setTabActiva('pendientes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'pendientes'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pendientes
          </button>
          
          <button
            onClick={() => setTabActiva('error')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'error'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Con Error
          </button>
        </nav>
      </div>
      
      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <form onSubmit={handleFiltrar} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({...filtros, desde: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({...filtros, hasta: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sucursal
              </label>
              <select
                value={filtros.sucursalId}
                onChange={(e) => setFiltros({...filtros, sucursalId: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
              >
                <option value="">Todas</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                disabled={tabActiva !== 'todas'}
              >
                <option value="">Todos</option>
                <option value="completada">Completada</option>
                <option value="pendiente">Pendiente</option>
                <option value="procesando">Procesando</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Búsqueda
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filtros.search}
                  onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                  placeholder="Cliente, número..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] pl-9"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
            
            <div className="col-span-full flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Limpiar
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 bg-[#311716] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#462625]"
              >
                Aplicar Filtros
              </button>
            </div>
          </form>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Tabla de facturas */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading && facturas.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-[#311716] mr-2" />
            <p className="text-gray-600">Cargando facturas...</p>
          </div>
        ) : facturas.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No se encontraron facturas</p>
            <p className="text-gray-400 text-sm">Prueba con otros filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {factura.tipoComprobante} {factura.puntoVenta.toString().padStart(5, '0')}-{factura.numeroFactura.toString().padStart(8, '0')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {factura.cae ? `CAE: ${factura.cae}` : 'Sin CAE'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(factura.fechaEmision), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {factura.venta?.clienteNombre || 'Consumidor Final'}
                      </div>
                      {factura.venta?.clienteCuit && (
                        <div className="text-xs text-gray-500">
                          CUIT: {factura.venta.clienteCuit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      ${factura.venta?.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {factura.estado === 'completada' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Completada
                        </span>
                      ) : factura.estado === 'error' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {factura.estado === 'pendiente' ? 'Pendiente' : 'Procesando'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {factura.sucursal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleVerDetalle(factura.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {factura.estado === 'completada' && (
                          <button
                            onClick={() => window.open(`/api/pdv/facturas/${factura.id}/pdf`, '_blank')}
                            className="text-green-600 hover:text-green-900"
                            title="Ver PDF"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        
                        {(factura.estado === 'error' || factura.estado === 'pendiente') && (
                          <button
                            onClick={() => handleRetryFactura(factura.id)}
                            className="text-amber-600 hover:text-amber-900"
                            disabled={retryingFacturaId === factura.id}
                            title="Reintentar generación"
                          >
                            <RefreshCw size={18} className={retryingFacturaId === factura.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowHistorialFacturaId(factura.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver historial de reintentos"
                        >
                          <History size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> de{' '}
                  <span className="font-medium">{total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Páginas */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-[#311716] border-[#311716] text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Visor de factura */}
      {isViewerOpen && selectedFacturaId && (
        <FacturaViewer 
          facturaId={selectedFacturaId} 
          onClose={() => setIsViewerOpen(false)} 
        />
      )}
      
      {/* Historial de reintentos */}
      {showHistorialFacturaId && (
        <FacturaReintentoHistorial 
          facturaId={showHistorialFacturaId}
          onClose={() => setShowHistorialFacturaId(null)}
        />
      )}
      
      {/* Diálogo Modal */}
      {dialogData.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{dialogData.title}</h3>
            </div>
            <div className="p-6">
              {dialogData.content}
            </div>
            {dialogData.actions && (
              <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
                {dialogData.actions}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}