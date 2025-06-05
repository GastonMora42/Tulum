// src/app/(pdv)/pdv/ventas/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Printer, Eye, Download, Search, Calendar, X, FileText, 
  ChevronLeft, ChevronRight, RefreshCw, Filter, CreditCard,
  DollarSign, QrCode, Smartphone, Check, AlertTriangle,
  TrendingUp, BarChart3, Clock, ArrowUpRight, Grid, List,
  ChevronDown, User, MapPin, Building, Receipt
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Venta {
  id: string;
  fecha: string;
  total: number;
  descuento: number;
  facturada: boolean;
  numeroFactura: string | null;
  clienteNombre: string | null;
  clienteCuit: string | null;
  tipoFactura: string | null;
  items: {
    id: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    producto: {
      id: string;
      nombre: string;
    };
  }[];
  pagos: {
    id: string;
    medioPago: string;
    monto: number;
    referencia?: string;
  }[];
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalFacturado, setTotalFacturado] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterFacturada, setFilterFacturada] = useState<string>('todas');
  const [medioPagoFilter, setMedioPagoFilter] = useState<string>('todos');
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [exportingPdf, setExportingPdf] = useState(false);
  
  // Formatear métodos de pago
  const formatMedioPago = (medioPago: string): string => {
    switch (medioPago) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta_credito': return 'Tarjeta de Crédito';
      case 'tarjeta_debito': return 'Tarjeta de Débito';
      case 'transferencia': return 'Transferencia';
      case 'qr': return 'Pago con QR';
      default: return medioPago;
    }
  };
  
  // Obtener ícono para método de pago
  const getMedioPagoIcon = (medioPago: string) => {
    switch (medioPago) {
      case 'efectivo': return <DollarSign size={16} className="text-green-500" />;
      case 'tarjeta_credito': return <CreditCard size={16} className="text-blue-500" />;
      case 'tarjeta_debito': return <CreditCard size={16} className="text-purple-500" />;
      case 'transferencia': return <Smartphone size={16} className="text-orange-500" />;
      case 'qr': return <QrCode size={16} className="text-indigo-500" />;
      default: return <DollarSign size={16} />;
    }
  };
  
  // Manejar clicks fuera del modal para cerrar
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (isDetalleOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsDetalleOpen(false);
      }
    }
    
    if (isDetalleOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDetalleOpen]);
  
  // Obtener métodos de pago únicos
  const getMediosPago = () => {
    const medios = new Set<string>();
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        medios.add(pago.medioPago);
      });
    });
    return Array.from(medios);
  };
  
  // 🔧 CARGAR VENTAS - CORREGIDO PARA MANEJAR LA RESPUESTA
  useEffect(() => {
    const loadVentas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const sucursalId = localStorage.getItem('sucursalId');
        let url = '/api/pdv/ventas';
        
        if (sucursalId) {
          url += `?sucursalId=${encodeURIComponent(sucursalId)}`;
        }
        
        console.log('🔄 Cargando ventas desde:', url);
        
        const response = await authenticatedFetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error en respuesta:', response.status, errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 Datos recibidos:', typeof data, data);
        
        // 🆕 VERIFICAR Y CORREGIR EL FORMATO DE RESPUESTA
        let ventasArray: Venta[] = [];
        
        if (Array.isArray(data)) {
          // Si es un array directo
          ventasArray = data;
        } else if (data && typeof data === 'object') {
          // Si es un objeto que contiene las ventas
          if (Array.isArray(data.ventas)) {
            ventasArray = data.ventas;
          } else if (Array.isArray(data.data)) {
            ventasArray = data.data;
          } else {
            console.warn('⚠️ Estructura de datos inesperada:', Object.keys(data));
            ventasArray = [];
          }
        } else {
          console.warn('⚠️ Datos no válidos recibidos:', data);
          ventasArray = [];
        }
        
        console.log(`✅ Ventas procesadas: ${ventasArray.length} elementos`);
        
        setVentas(ventasArray);
        
        // Calcular totales
        let total = 0;
        let totalFacturas = 0;
        
        ventasArray.forEach((venta: Venta) => {
          total += venta.total;
          if (venta.facturada) {
            totalFacturas += venta.total;
          }
        });
        
        setTotalVentas(total);
        setTotalFacturado(totalFacturas);
        
        // Aplicar filtros iniciales
        applyFilters(ventasArray);
        
      } catch (err) {
        console.error('❌ Error al cargar ventas:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar ventas');
        setVentas([]);
        setFilteredVentas([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVentas();
  }, []);
  
  // Aplicar filtros
  const applyFilters = (data = ventas) => {
    let filtered = [...data];
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      desde.setHours(0, 0, 0, 0);
      filtered = filtered.filter(venta => new Date(venta.fecha) >= desde);
    }
    
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter(venta => new Date(venta.fecha) <= hasta);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(venta => 
        venta.id.toLowerCase().includes(term) ||
        (venta.clienteNombre && venta.clienteNombre.toLowerCase().includes(term)) ||
        (venta.numeroFactura && venta.numeroFactura.toLowerCase().includes(term)) ||
        venta.items.some(item => item.producto.nombre.toLowerCase().includes(term))
      );
    }
    
    if (filterFacturada !== 'todas') {
      const facturada = filterFacturada === 'si';
      filtered = filtered.filter(venta => venta.facturada === facturada);
    }
    
    if (medioPagoFilter !== 'todos') {
      filtered = filtered.filter(venta => 
        venta.pagos.some(pago => pago.medioPago === medioPagoFilter)
      );
    }
    
    setFilteredVentas(filtered);
    setCurrentPage(1);
  };
  
  useEffect(() => {
    applyFilters();
  }, [fechaDesde, fechaHasta, searchTerm, filterFacturada, medioPagoFilter]);
  
  // Ver detalle de venta
  const handleVerDetalle = (venta: Venta) => {
    setSelectedVenta(venta);
    setIsDetalleOpen(true);
  };
  
// 🆕 FUNCIÓN MEJORADA PARA REIMPRIMIR FACTURA/TICKET
const handleReimprimirFactura = async (venta: Venta) => {
  setExportingPdf(true);
  
  try {
    if (venta.facturada && venta.numeroFactura) {
      // Buscar la factura electrónica
      const facturaResp = await authenticatedFetch(`/api/pdv/facturas?ventaId=${venta.id}`);
      if (facturaResp.ok) {
        const facturas = await facturaResp.json();
        if (facturas && facturas.length > 0) {
          const facturaId = facturas[0].id;
          
          // Intentar imprimir directamente si hay servicio de impresión disponible
          if (reprintFactura && availablePrinters.length > 0) {
            console.log('🖨️ Reimprimiendo factura:', facturaId);
            
            const printResult = await reprintFactura(facturaId);
            
            if (printResult.success) {
              alert('✅ Factura reimpresa correctamente');
              return;
            } else {
              console.warn('Impresión falló, abriendo PDF:', printResult.message);
            }
          }
          
          // Fallback: abrir PDF
          window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank');
          return;
        }
      }
    }
    
    // Si no hay factura, generar ticket de venta usando el servicio de impresión
    if (reprintFactura && availablePrinters.length > 0) {
      try {
        // Crear ticket temporal para la venta
        const ticketResp = await authenticatedFetch('/api/pdv/tickets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ventaId: venta.id })
        });
        
        if (ticketResp.ok) {
          const ticket = await ticketResp.json();
          alert('✅ Ticket de venta impreso');
          return;
        }
      } catch (ticketError) {
        console.warn('Error generando ticket:', ticketError);
      }
    }
    
    // Fallback final: mostrar información de la venta
    alert(`Venta #${venta.id.slice(-6)}\nTotal: $${venta.total.toFixed(2)}\nFecha: ${new Date(venta.fecha).toLocaleString()}`);
    
  } catch (error) {
    console.error('Error al reimprimir:', error);
    alert('Error al generar el comprobante');
  } finally {
    setExportingPdf(false);
  }
};
  
  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVentas.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };
  
  // Resetear filtros
  const handleResetFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setSearchTerm('');
    setFilterFacturada('todas');
    setMedioPagoFilter('todos');
  };
  
  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#311716] border-t-transparent mx-auto"></div>
          <span className="mt-4 text-lg text-gray-700 font-medium block">Cargando historial...</span>
        </div>
      </div>
    );
  }
  
  // Pantalla de error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
          <div>
            <p className="font-medium">Error al cargar ventas</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Historial de Ventas</h1>
            <p className="text-gray-600">Gestiona y consulta todas las ventas del turno actual</p>
          </div>
          
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 md:p-4 rounded-xl text-center">
              <p className="text-xl md:text-2xl font-bold text-blue-700">{filteredVentas.length}</p>
              <p className="text-xs md:text-sm text-blue-600">Ventas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setFiltersVisible(!filtersVisible)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersVisible ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Búsqueda rápida */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-[#311716] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-[#311716] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {filtersVisible && (
          <div className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Desde:</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hasta:</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facturada:</label>
                <select
                  value={filterFacturada}
                  onChange={(e) => setFilterFacturada(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                >
                  <option value="todas">Todas</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago:</label>
                <select
                  value={medioPagoFilter}
                  onChange={(e) => setMedioPagoFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  {getMediosPago().map(medio => (
                    <option key={medio} value={medio}>
                      {formatMedioPago(medio)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleResetFiltros}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de ventas */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 overflow-hidden">
        {filteredVentas.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron ventas</h3>
            <p className="text-gray-500">
              {ventas.length === 0 
                ? 'No hay ventas registradas en este turno' 
                : 'Prueba con otros filtros o realiza una nueva venta'
              }
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto">
                {currentItems.map(venta => (
                  <div key={venta.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-[#eeb077] transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(venta.fecha), 'dd MMM, HH:mm', { locale: es })}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">#{venta.id.slice(-6)}</p>
                      </div>
                      
                      {venta.facturada && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Facturada
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-2xl font-bold text-gray-900">${venta.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{venta.items.length} productos</p>
                      {venta.clienteNombre && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <User className="w-3 h-3 mr-1" />
                          <span className="truncate">{venta.clienteNombre}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        {venta.pagos.slice(0, 2).map((pago, idx) => (
                          <div key={idx} className="flex items-center space-x-1" title={formatMedioPago(pago.medioPago)}>
                            {getMedioPagoIcon(pago.medioPago)}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleVerDetalle(venta)}
                          className="p-1 text-gray-600 hover:text-[#311716] transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleReimprimirFactura(venta)}
                          disabled={exportingPdf}
                          className="p-1 text-gray-600 hover:text-[#311716] transition-colors disabled:opacity-50"
                          title={venta.facturada ? "Reimprimir factura" : "Imprimir ticket"}
                        >
                          {exportingPdf ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : venta.facturada ? (
                            <Receipt size={16} />
                          ) : (
                            <Printer size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="space-y-2">
                  {currentItems.map((venta) => (
                    <div key={venta.id} className="group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#eeb077] transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">#{venta.id.slice(-6)}</p>
                          <p className="text-xs text-gray-400">{format(new Date(venta.fecha), 'dd MMM', { locale: es })}</p>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-gray-900">${venta.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{venta.items.length} productos</p>
                          {venta.clienteNombre && (
                            <div className="flex items-center text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              <span>{venta.clienteNombre}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {venta.pagos.map((pago, idx) => (
                            <span key={idx} className="flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded">
                              {getMedioPagoIcon(pago.medioPago)}
                              <span>{formatMedioPago(pago.medioPago)}</span>
                            </span>
                          ))}
                        </div>
                        
                        {venta.facturada && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Facturada
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleVerDetalle(venta)}
                          className="p-2 text-gray-600 hover:text-[#311716] hover:bg-white rounded-lg transition-all"
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleReimprimirFactura(venta)}
                          disabled={exportingPdf}
                          className="p-2 text-gray-600 hover:text-[#311716] hover:bg-white rounded-lg transition-all disabled:opacity-50"
                          title={venta.facturada ? "Reimprimir factura" : "Imprimir ticket"}
                        >
                          {exportingPdf ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : venta.facturada ? (
                            <Receipt size={18} />
                          ) : (
                            <Printer size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
                <div className="text-sm text-gray-700">
                  Mostrando {Math.min(filteredVentas.length, indexOfFirstItem + 1)} a{' '}
                  {Math.min(filteredVentas.length, indexOfLastItem)} de{' '}
                  {filteredVentas.length} resultados
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNumber: number;
                      
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      if (pageNumber < 1 || pageNumber > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-2 text-sm rounded-lg transition-all ${
                            currentPage === pageNumber
                              ? 'bg-[#311716] text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modal de detalle de venta - MEJORADO */}
      {isDetalleOpen && selectedVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-3 text-[#9c7561]" />
                  Venta #{selectedVenta.id.slice(-6)}
                </h2>
                <p className="text-gray-600 mt-1">
                  {format(new Date(selectedVenta.fecha), 'dd MMMM yyyy, HH:mm', { locale: es })}
                </p>
              </div>
              
              <button 
                onClick={() => setIsDetalleOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-[#9c7561]" />
                    Información de la Venta
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-gray-900">${selectedVenta.total.toFixed(2)}</span>
                    </div>
                    {selectedVenta.descuento > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Descuento:</span>
                        <span className="text-green-600 font-semibold">${selectedVenta.descuento.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Productos:</span>
                      <span className="font-semibold">{selectedVenta.items.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Estado:</span>
                      <span>
                        {selectedVenta.facturada ? (
                          <span className="inline-flex items-center text-green-600 font-semibold">
                            <Check className="w-4 h-4 mr-1" />
                            Facturada
                          </span>
                        ) : (
                          <span className="text-gray-600">Sin facturar</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-[#9c7561]" />
                    Cliente y Facturación
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-semibold">{selectedVenta.clienteNombre || 'Consumidor Final'}</span>
                    </div>
                    
                    {selectedVenta.clienteCuit && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">CUIT:</span>
                        <span className="font-semibold">{selectedVenta.clienteCuit}</span>
                      </div>
                    )}
                    
                    {selectedVenta.facturada && selectedVenta.numeroFactura && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">N° Factura:</span>
                        <span className="font-semibold">{selectedVenta.numeroFactura}</span>
                      </div>
                    )}
                    
                    {selectedVenta.tipoFactura && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-semibold">Factura {selectedVenta.tipoFactura}</span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Métodos de Pago:</h4>
                      <div className="space-y-2">
                        {selectedVenta.pagos.map((pago) => (
                          <div key={pago.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                            <span className="flex items-center space-x-2">
                              {getMedioPagoIcon(pago.medioPago)}
                              <span className="text-sm">{formatMedioPago(pago.medioPago)}</span>
                            </span>
                            <span className="font-semibold">${pago.monto.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Cantidad</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Precio Unit.</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedVenta.items.map((item) => (
                        <tr key={item.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.producto.nombre}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            ${item.precioUnitario.toFixed(2)}
                            {item.descuento > 0 && (
                              <span className="text-xs text-green-600 ml-1">(-{item.descuento}%)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                            ${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-white border-t-2 border-gray-300">
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg text-gray-900">
                          ${selectedVenta.total.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setIsDetalleOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cerrar
              </button>
              
              <button
                onClick={() => handleReimprimirFactura(selectedVenta)}
                className="px-6 py-2 bg-[#311716] text-white rounded-xl hover:bg-[#462625] flex items-center space-x-2 transition-all"
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : selectedVenta.facturada ? (
                  <>
                    <Receipt size={18} />
                    <span>Reimprimir Factura</span>
                  </>
                ) : (
                  <>
                    <Printer size={18} />
                    <span>Imprimir Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}