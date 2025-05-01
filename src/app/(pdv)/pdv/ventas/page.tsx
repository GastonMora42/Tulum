// src/app/(pdv)/pdv/ventas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Printer, Eye, Download, Search, Calendar, X } from 'lucide-react';
import { exportToPdf } from '@/lib/utils/pdfExport';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
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
        
        if (fechaDesde) {
          url += `desde=${fechaDesde}T00:00:00&`;
        }
        
        if (fechaHasta) {
          url += `hasta=${fechaHasta}T23:59:59&`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Error al cargar ventas');
        }
        
        let data = await response.json();
        
        // Filtrar por término de búsqueda si existe
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          data = data.filter((venta: Venta) => 
            venta.id.toLowerCase().includes(term) ||
            (venta.clienteNombre && venta.clienteNombre.toLowerCase().includes(term)) ||
            (venta.numeroFactura && venta.numeroFactura.toLowerCase().includes(term))
          );
        }
        
        setVentas(data);
      } catch (err) {
        console.error('Error al cargar ventas:', err);
        setError('Error al cargar el historial de ventas');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVentas();
  }, [fechaDesde, fechaHasta, searchTerm]);
  
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
  
  // Ver detalle de venta
  const handleVerDetalle = (venta: Venta) => {
    setSelectedVenta(venta);
    setIsDetalleOpen(true);
  };
  
  // Exportar a PDF
  const handleExportPdf = (venta: Venta) => {
    const itemsFormateados = venta.items.map(item => ({
      producto: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnitario: `$${item.precioUnitario.toFixed(2)}`,
      subtotal: `$${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}`
    }));
    
    exportToPdf({
      title: `Detalle de Venta #${venta.id.slice(-6)}`,
      subtitle: `Fecha: ${format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}`,
      fileName: `venta-${venta.id.slice(-6)}`,
      columns: [
        { header: 'Producto', dataKey: 'producto' },
        { header: 'Cantidad', dataKey: 'cantidad' },
        { header: 'Precio Unit.', dataKey: 'precioUnitario' },
        { header: 'Subtotal', dataKey: 'subtotal' }
      ],
      data: itemsFormateados
    });
  };
  
  // Aplicar filtros
  const handleAplicarFiltros = () => {
    // Los filtros se aplican automáticamente en el useEffect
  };
  
  // Resetear filtros
  const handleResetFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setSearchTerm('');
  };
  
  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg">Cargando ventas...</span>
      </div>
    );
  }
  
  // Pantalla de error
  if (error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Historial de Ventas</h1>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="fechaDesde" className="block text-gray-700 mb-1">
              Desde:
            </label>
            <div className="relative">
              <input
                type="date"
                id="fechaDesde"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-10"
              />
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
          
          <div>
            <label htmlFor="fechaHasta" className="block text-gray-700 mb-1">
              Hasta:
            </label>
            <div className="relative">
              <input
                type="date"
                id="fechaHasta"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-10"
              />
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
          
          <div>
            <label htmlFor="searchTerm" className="block text-gray-700 mb-1">
              Buscar:
            </label>
            <div className="relative">
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID, cliente..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-10"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={handleAplicarFiltros}
              className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Aplicar
            </button>
            
            <button
              onClick={handleResetFiltros}
              className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Resetear
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No se encontraron ventas para los filtros seleccionados
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {venta.id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${venta.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {venta.facturada ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {venta.numeroFactura || 'Sí'}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {venta.clienteNombre || 'Consumidor Final'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {venta.pagos.map(pago => formatMedioPago(pago.medioPago)).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleVerDetalle(venta)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleExportPdf(venta)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Exportar a PDF"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal de detalle de venta */}
      {isDetalleOpen && selectedVenta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Detalle de Venta #{selectedVenta.id.slice(-6)}
              </h2>
              <button 
                onClick={() => setIsDetalleOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-gray-700 font-medium mb-2">Información de la Venta</h3>
                  <p><span className="text-gray-600">Fecha:</span> {format(new Date(selectedVenta.fecha), 'dd/MM/yyyy HH:mm')}</p>
                  <p><span className="text-gray-600">Total:</span> ${selectedVenta.total.toFixed(2)}</p>
                  {selectedVenta.descuento > 0 && (
                    <p><span className="text-gray-600">Descuento:</span> ${selectedVenta.descuento.toFixed(2)}</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-gray-700 font-medium mb-2">Información del Cliente</h3>
                  <p><span className="text-gray-600">Cliente:</span> {selectedVenta.clienteNombre || 'Consumidor Final'}</p>
                  
                  {selectedVenta.facturada && (
                    <>
                      <p><span className="text-gray-600">Facturada:</span> Sí</p>
                      {selectedVenta.numeroFactura && (
                        <p><span className="text-gray-600">N° Factura:</span> {selectedVenta.numeroFactura}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <h3 className="text-gray-700 font-medium mb-2">Productos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descuento
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedVenta.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {item.producto.nombre}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ${item.precioUnitario.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.descuento > 0 ? `${item.descuento}%` : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <h3 className="text-gray-700 font-medium mt-4 mb-2">Pagos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Método de Pago
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedVenta.pagos.map((pago) => (
                      <tr key={pago.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatMedioPago(pago.medioPago)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${pago.monto.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsDetalleOpen(false)}
                  className="mr-3 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cerrar
                </button>
                
                <button
                  onClick={() => handleExportPdf(selectedVenta)}
                  className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                >
                  <Printer size={18} className="mr-2" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}