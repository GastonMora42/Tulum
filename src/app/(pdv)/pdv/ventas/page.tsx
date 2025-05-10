// src/app/(pdv)/pdv/ventas/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Printer, Eye, Download, Search, Calendar, X, FileText, 
  ChevronLeft, ChevronRight, RefreshCw, Filter, CreditCard,
  DollarSign, QrCode, Smartphone, Check, AlertTriangle
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Link from 'next/link';

interface Venta {
  id: string;
  fecha: string;
  total: number;
  descuento: number;
  facturada: boolean;
  numeroFactura: string | null;
  clienteNombre: string | null;
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
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterFacturada, setFilterFacturada] = useState<string>('todas');
  const [medioPagoFilter, setMedioPagoFilter] = useState<string>('todos');
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
  
  // Cargar ventas
  useEffect(() => {
    const loadVentas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Construir URL con filtros
        let url = '/api/pdv/ventas?';
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (sucursalId) {
          url += `sucursalId=${sucursalId}&`;
        }
        
        const response = await authenticatedFetch(url);
        
        if (!response.ok) {
          throw new Error('Error al cargar ventas');
        }
        
        const data = await response.json();
        setVentas(data);
        
        // Calcular totales
        let total = 0;
        let totalFacturas = 0;
        data.forEach((venta: Venta) => {
          total += venta.total;
          if (venta.facturada) {
            totalFacturas += venta.total;
          }
        });
        
        setTotalVentas(total);
        setTotalFacturado(totalFacturas);
        
        applyFilters(data);
      } catch (err) {
        console.error('Error al cargar ventas:', err);
        setError('Error al cargar el historial de ventas');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVentas();
  }, []);
  
  // Aplicar filtros
  const applyFilters = (data = ventas) => {
    let filtered = [...data];
    
    // Filtrar por fecha desde
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      desde.setHours(0, 0, 0, 0);
      filtered = filtered.filter(venta => new Date(venta.fecha) >= desde);
    }
    
    // Filtrar por fecha hasta
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter(venta => new Date(venta.fecha) <= hasta);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(venta => 
        venta.id.toLowerCase().includes(term) ||
        (venta.clienteNombre && venta.clienteNombre.toLowerCase().includes(term)) ||
        (venta.numeroFactura && venta.numeroFactura.toLowerCase().includes(term)) ||
        venta.items.some(item => item.producto.nombre.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por estado de facturación
    if (filterFacturada !== 'todas') {
      const facturada = filterFacturada === 'si';
      filtered = filtered.filter(venta => venta.facturada === facturada);
    }
    
    // Filtrar por medio de pago
    if (medioPagoFilter !== 'todos') {
      filtered = filtered.filter(venta => 
        venta.pagos.some(pago => pago.medioPago === medioPagoFilter)
      );
    }
    
    setFilteredVentas(filtered);
    setCurrentPage(1); // Resetear a primera página al filtrar
  };
  
  // Aplicar filtros cuando cambian
  useEffect(() => {
    applyFilters();
  }, [fechaDesde, fechaHasta, searchTerm, filterFacturada, medioPagoFilter]);
  
  // Ver detalle de venta
  const handleVerDetalle = (venta: Venta) => {
    setSelectedVenta(venta);
    setIsDetalleOpen(true);
  };
  
  // Exportar a PDF
  const handleExportPdf = async (venta: Venta) => {
    setExportingPdf(true);
    
    try {
      // Obtener factura si existe
      let facturaId = null;
      if (venta.facturada) {
        const facturaResp = await authenticatedFetch(`/api/pdv/facturas?ventaId=${venta.id}`);
        if (facturaResp.ok) {
          const facturas = await facturaResp.json();
          if (facturas && facturas.length > 0) {
            facturaId = facturas[0].id;
          }
        }
      }
      
      // Si hay factura, obtener PDF de factura
      if (facturaId) {
        window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank');
      } else {
        // Generar resumen de venta como respaldo
        const formattedItems = venta.items.map(item => ({
          producto: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: `$${item.precioUnitario.toFixed(2)}`,
          subtotal: `$${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}`
        }));
        
        // Este es un placeholder que deberías completar con tu lógica de generación de PDF
        // Puedes usar una biblioteca como jsPDF o pdfmake
        alert('Función de exportación sin factura disponible próximamente');
      }
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
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
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#311716]"></div>
        <span className="mt-4 text-gray-600">Cargando ventas...</span>
      </div>
    );
  }
  
  // Pantalla de error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg my-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
          <p>{error}</p>
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
  
  const paginationControls = (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{Math.min(filteredVentas.length, indexOfFirstItem + 1)}</span> a{' '}
            <span className="font-medium">{Math.min(filteredVentas.length, indexOfLastItem)}</span> de{' '}
            <span className="font-medium">{filteredVentas.length}</span> resultados
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Anterior</span>
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            {/* Mostrar páginas numeradas limitadas */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNumber: number;
              
              if (totalPages <= 5) {
                pageNumber = i + 1; // De 1 a 5
              } else if (currentPage <= 3) {
                pageNumber = i + 1; // De 1 a 5 si estamos al inicio
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i; // Las últimas 5 páginas
              } else {
                pageNumber = currentPage - 2 + i; // 2 páginas antes y 2 después de la actual
              }
              
              // Asegurarse de que pageNumber esté en rango
              if (pageNumber < 1 || pageNumber > totalPages) return null;
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:outline-offset-0 ${
                    currentPage === pageNumber
                      ? 'bg-[#311716] text-white focus-visible:outline-[#311716]'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Siguiente</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
      
      {/* Paginación móvil simplificada */}
      <div className="flex sm:hidden justify-between w-full items-center">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md px-3 py-1 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </button>
        
        <span className="text-sm text-gray-700">
          {currentPage} de {totalPages || 1}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="relative inline-flex items-center rounded-md px-3 py-1 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Historial de Ventas</h1>
        
        {/* Resumen de ventas */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-100">
            <p className="text-xs text-gray-500">Total ventas</p>
            <p className="text-lg font-bold">${totalVentas.toFixed(2)}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-100">
            <p className="text-xs text-gray-500">Facturadas</p>
            <p className="text-lg font-bold">${totalFacturado.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      {/* Filtros colapsables */}
      <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800 flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            Filtros
          </h2>
          <button 
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="text-gray-400 hover:text-gray-600"
          >
            {filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>
        
        {filtersVisible && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div>
                  <label htmlFor="fechaDesde" className="block text-sm font-medium text-gray-700 mb-1">
                    Desde:
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="fechaDesde"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] pl-9"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="fechaHasta" className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta:
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="fechaHasta"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] pl-9"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="searchTerm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cliente, producto, ID..."
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] pl-9"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="filterFacturada" className="block text-sm font-medium text-gray-700 mb-1">
                    Facturada:
                  </label>
                  <select
                    id="filterFacturada"
                    value={filterFacturada}
                    onChange={(e) => setFilterFacturada(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  >
                    <option value="todas">Todas</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label htmlFor="medioPagoFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Método de pago:
                  </label>
                  <select
                    id="medioPagoFilter"
                    value={medioPagoFilter}
                    onChange={(e) => setMedioPagoFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  >
                    <option value="todos">Todos</option>
                    {getMediosPago().map(medio => (
                      <option key={medio} value={medio}>
                        {formatMedioPago(medio)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4 flex items-end justify-end gap-2">
                  <button
                    onClick={handleResetFiltros}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Vista móvil en tarjetas */}
        <div className="block md:hidden">
          {filteredVentas.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron ventas</p>
              <p className="text-gray-400 text-sm mt-1">Prueba con otros filtros</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {currentItems.map(venta => (
                <div key={venta.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center text-sm text-gray-500 mb-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(venta.fecha), 'dd MMM yyyy, HH:mm', { locale: es })}
                      </span>
                      <p className="font-semibold">${venta.total.toFixed(2)}</p>
                      <div className="flex items-center text-sm mt-1 space-x-2">
                        {venta.pagos.map((pago, idx) => (
                          <span key={idx} className="flex items-center">
                            {getMedioPagoIcon(pago.medioPago)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs text-gray-500">#{venta.id.slice(-6)}</span>
                      {venta.facturada && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Facturada
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex mt-2 space-x-2">
                    <button
                      onClick={() => handleVerDetalle(venta)}
                      className="flex-1 text-xs py-1 px-2 border border-gray-200 rounded bg-gray-50 text-gray-700 flex items-center justify-center"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Detalle
                    </button>
                    
                    <button
                      onClick={() => handleExportPdf(venta)}
                      className="flex-1 text-xs py-1 px-2 border border-gray-200 rounded bg-gray-50 text-gray-700 flex items-center justify-center"
                      disabled={exportingPdf}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {venta.facturada ? 'Factura' : 'Comprobante'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Vista escritorio en tabla */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facturada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método de Pago
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVentas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No se encontraron ventas para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  currentItems.map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{venta.id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(venta.fecha), 'dd MMM yyyy, HH:mm', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${venta.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {venta.facturada ? (
                          <span className="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            {venta.numeroFactura || 'Sí'}
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[180px] truncate">
                        {venta.clienteNombre || 'Consumidor Final'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {venta.pagos.map((pago, idx) => (
                            <span key={idx} className="inline-flex items-center bg-gray-50 px-2 py-0.5 rounded text-xs">
                              {getMedioPagoIcon(pago.medioPago)}
                              <span className="ml-1">{formatMedioPago(pago.medioPago)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleVerDetalle(venta)}
                          className="text-[#311716] hover:text-[#462625] mr-3"
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleExportPdf(venta)}
                          className="text-gray-600 hover:text-gray-900"
                          title={venta.facturada ? "Descargar factura" : "Exportar comprobante"}
                          disabled={exportingPdf}
                        >
                          {exportingPdf ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Paginación */}
        {filteredVentas.length > 0 && paginationControls}
      </div>
      
      {/* Modal de detalle de venta */}
      {isDetalleOpen && selectedVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#9c7561]" />
                Venta #{selectedVenta.id.slice(-6)}
              </h2>
              <button 
                onClick={() => setIsDetalleOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-gray-700 font-medium mb-2">Información de la Venta</h3>
                  <p className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Fecha:</span>
                    <span>{format(new Date(selectedVenta.fecha), 'dd MMMM yyyy, HH:mm', { locale: es })}</span>
                  </p>
                  <p className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">${selectedVenta.total.toFixed(2)}</span>
                  </p>
                  {selectedVenta.descuento > 0 && (
                    <p className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Descuento:</span>
                      <span className="text-green-600">${selectedVenta.descuento.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-gray-700 font-medium mb-2">Información del Cliente</h3>
                  <p className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Cliente:</span>
                    <span>{selectedVenta.clienteNombre || 'Consumidor Final'}</span>
                  </p>
                  
                  <p className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Facturada:</span>
                    <span>
                      {selectedVenta.facturada ? (
                        <span className="inline-flex items-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          Sí
                        </span>
                      ) : 'No'}
                    </span>
                  </p>
                  
                  {selectedVenta.facturada && selectedVenta.numeroFactura && (
                    <p className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">N° Factura:</span>
                      <span>{selectedVenta.numeroFactura}</span>
                    </p>
                  )}
                </div>
              </div>
              
              <h3 className="text-gray-700 font-medium mb-2">Productos</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {selectedVenta.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.producto.nombre}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-center">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            ${item.precioUnitario.toFixed(2)}
                            {item.descuento > 0 && (
                              <span className="text-xs text-green-600 ml-1">(-{item.descuento}%)</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium text-right">
                            ${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">
                          Total:
                        </td>
                        <td className="px-4 py-2 text-right font-bold">
                          ${selectedVenta.total.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <h3 className="text-gray-700 font-medium mt-4 mb-2">Pagos</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Método de Pago
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {selectedVenta.pagos.map((pago) => (
                        <tr key={pago.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className="flex items-center">
                              {getMedioPagoIcon(pago.medioPago)}
                              <span className="ml-2">{formatMedioPago(pago.medioPago)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium text-right">
                            ${pago.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t sticky bottom-0 bg-white rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setIsDetalleOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              
              <button
                onClick={() => handleExportPdf(selectedVenta)}
                className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] flex items-center"
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <>
                    <RefreshCw size={18} className="animate-spin mr-2" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download size={18} className="mr-2" />
                    {selectedVenta.facturada ? 'Descargar Factura' : 'Exportar Comprobante'}
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