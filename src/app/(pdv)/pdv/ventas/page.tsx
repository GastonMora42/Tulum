// src/app/(pdv)/pdv/ventas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, Search, FileText, Printer, Download, ArrowLeft,
  ChevronLeft, ChevronRight, Filter, X, CreditCard, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/hooks/useOffline';
import React from 'react';

interface Venta {
  id: string;
  fecha: string;
  total: number;
  descuento: number;
  facturada: boolean;
  clienteNombre: string | null;
  clienteCuit: string | null;
  items: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    producto: {
      nombre: string;
    }
  }>;
  pagos: Array<{
    id: string;
    medioPago: string;
    monto: number;
  }>;
}

export default function VentasHistorialPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isOnline } = useOffline();
  
  // State
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filter states
  const [fechaInicio, setFechaInicio] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [fechaFin, setFechaFin] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [soloFacturadas, setSoloFacturadas] = useState(false);
  const [metodoPago, setMetodoPago] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Load sales data
  useEffect(() => {
    const fetchVentas = async () => {
      try {
        setIsLoading(true);
        
        if (!isOnline) {
          setError('Necesita conexión a internet para ver el historial de ventas');
          setIsLoading(false);
          return;
        }
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          setError('No se ha configurado la sucursal para este usuario');
          setIsLoading(false);
          return;
        }
        
        const response = await authenticatedFetch(
          `/api/pdv/ventas?sucursalId=${sucursalId}&desde=${fechaInicio}&hasta=${fechaFin}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar las ventas');
        }
        
        const data = await response.json();
        setVentas(data);
        applyFilters(data);
      } catch (err) {
        console.error('Error al cargar ventas:', err);
        setError('Error al cargar el historial de ventas');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVentas();
  }, [isOnline, fechaInicio, fechaFin]);
  
  // Apply filters
  const applyFilters = (data = ventas) => {
    let filtered = [...data];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((venta) => {
        return (
          venta.id.toLowerCase().includes(query) ||
          venta.clienteNombre?.toLowerCase().includes(query) ||
          venta.clienteCuit?.toLowerCase().includes(query) ||
          venta.items.some((item) =>
            item.producto.nombre.toLowerCase().includes(query)
          )
        );
      });
    }
    
    // Filter by invoice status
    if (soloFacturadas) {
      filtered = filtered.filter((venta) => venta.facturada);
    }
    
    // Filter by payment method
    if (metodoPago) {
      filtered = filtered.filter((venta) =>
        venta.pagos.some((pago) => pago.medioPago === metodoPago)
      );
    }
    
    // Calculate total pages
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // Reset to first page
    
    setFilteredVentas(filtered);
  };
  
  // Handle filter changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, soloFacturadas, metodoPago]);
  
  // Get paginated data
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredVentas.slice(startIndex, endIndex);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };
  
  // View sale details
  const viewDetails = (venta: Venta) => {
    setSelectedVenta(venta);
    setShowDetailModal(true);
  };
  
  // Handle print receipt
  const handlePrintReceipt = (ventaId: string) => {
    if (!isOnline) {
      setError('Necesita conexión a internet para imprimir comprobantes');
      return;
    }
    
    window.open(`/api/pdv/ventas/${ventaId}/comprobante`, '_blank');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
        <Link
          href="/pdv"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          Volver al PDV
        </Link>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <label className="mr-2 text-gray-700">Desde:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="p-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-700">Hasta:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="p-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() => applyFilters()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg"
            >
              <Calendar size={18} className="mr-1 inline-block" />
              Filtrar
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, cliente o producto"
                className="p-2 pl-9 border rounded-lg w-full"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search size={18} />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg border flex items-center ${
                showFilters || soloFacturadas || metodoPago
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <Filter size={18} className="mr-1" />
              Filtros
              {(soloFacturadas || metodoPago) && (
                <span className="ml-1 bg-white text-blue-600 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">
                  {(soloFacturadas ? 1 : 0) + (metodoPago ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Advanced filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="soloFacturadas"
                checked={soloFacturadas}
                onChange={(e) => setSoloFacturadas(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="soloFacturadas" className="text-gray-700">
                Solo ventas facturadas
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="mr-2 text-gray-700">Método de pago:</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="p-2 border rounded-lg"
              >
                <option value="">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setSoloFacturadas(false);
                setMetodoPago('');
                setSearchQuery('');
                applyFilters();
              }}
              className="text-blue-600 hover:underline flex items-center"
            >
              <X size={16} className="mr-1" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      
      {/* Sales table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando ventas...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">
            <p>{error}</p>
            {!isOnline && (
              <p className="mt-2 text-sm">
                Esta funcionalidad requiere conexión a internet.
              </p>
            )}
          </div>
        ) : filteredVentas.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="mb-2">No se encontraron ventas con los filtros seleccionados.</p>
            <button
              onClick={() => {
                setSoloFacturadas(false);
                setMetodoPago('');
                setSearchQuery('');
                applyFilters();
              }}
              className="text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">ID Venta</th>
                    <th className="py-3 px-4 text-left">Fecha</th>
                    <th className="py-3 px-4 text-left">Cliente</th>
                    <th className="py-3 px-4 text-left">Método Pago</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Tipo</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getPaginatedData().map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-blue-600">
                          #{venta.id.slice(-6)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(venta.fecha)}
                      </td>
                      <td className="py-3 px-4">
                        {venta.clienteNombre || 'Consumidor Final'}
                        {venta.clienteCuit && (
                          <div className="text-xs text-gray-500">
                            CUIT: {venta.clienteCuit}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {venta.pagos.map(pago => (
                          <div key={pago.id} className="flex items-center mb-1">
                            {pago.medioPago === 'efectivo' ? (
                              <DollarSign size={14} className="mr-1 text-green-600" />
                            ) : pago.medioPago === 'tarjeta' ? (
                              <CreditCard size={14} className="mr-1 text-blue-600" />
                            ) : (
                              '💸'
                            )}
                            <span className="text-sm">
                              {pago.medioPago.charAt(0).toUpperCase() + pago.medioPago.slice(1)}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold">{formatCurrency(venta.total)}</div>
                        {venta.descuento > 0 && (
                          <div className="text-xs text-green-600">
                            Descuento: {venta.descuento}%
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {venta.facturada ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Factura
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                            Ticket
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => viewDetails(venta)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Ver detalles"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(venta.id)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Imprimir comprobante"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredVentas.length)} de{' '}
                  {filteredVentas.length} resultados
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border bg-white text-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, i, array) => (
                      <React.Fragment key={page}>
                        {i > 0 && array[i - 1] !== page - 1 && (
                          <span className="px-2 py-1">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border bg-white text-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Sale detail modal */}
      {showDetailModal && selectedVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Detalle de Venta #{selectedVenta.id.slice(-6)}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha</h3>
                  <p>{formatDate(selectedVenta.fecha)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total</h3>
                  <p className="font-bold">{formatCurrency(selectedVenta.total)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
                  <p>
                    {selectedVenta.clienteNombre || 'Consumidor Final'}
                    {selectedVenta.clienteCuit && (
                      <span className="block text-sm text-gray-500">
                        CUIT: {selectedVenta.clienteCuit}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tipo</h3>
                  <p>
                    {selectedVenta.facturada ? 'Factura' : 'Ticket Simple'}
                  </p>
                </div>
              </div>
              
              <h3 className="font-medium text-gray-800 mb-2">Productos</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Cantidad
                      </th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Precio Unit.
                      </th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedVenta.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3">{item.producto.nombre}</td>
                        <td className="py-2 px-3 text-right">{item.cantidad}</td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(item.precioUnitario)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(item.cantidad * item.precioUnitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    {selectedVenta.descuento > 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-2 px-3 text-right font-medium"
                        >
                          Descuento ({selectedVenta.descuento}%)
                        </td>
                        <td className="py-2 px-3 text-right">
                          -{formatCurrency(
                            (selectedVenta.total * selectedVenta.descuento) /
                              (100 - selectedVenta.descuento)
                          )}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td
                        colSpan={3}
                        className="py-2 px-3 text-right font-bold"
                      >
                        Total
                      </td>
                      <td className="py-2 px-3 text-right font-bold">
                        {formatCurrency(selectedVenta.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <h3 className="font-medium text-gray-800 mt-4 mb-2">Pagos</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Método
                      </th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedVenta.pagos.map((pago) => (
                      <tr key={pago.id}>
                        <td className="py-2 px-3 capitalize">
                          {pago.medioPago}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(pago.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => handlePrintReceipt(selectedVenta.id)}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg flex items-center"
                >
                  <Printer size={18} className="mr-2" />
                  Imprimir Comprobante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}