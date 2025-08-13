// src/app/(pdv)/pdv/facturas/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Printer, 
  Download, 
  RefreshCw,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Eye,
  Receipt
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { usePrint } from '@/hooks/usePrint';

interface FacturaDetalle {
  id: string;
  tipoComprobante: string;
  puntoVenta: number;
  numeroFactura: number;
  fechaEmision: string;
  cae: string;
  vencimientoCae: string;
  estado: string;
  qrData?: string;
  venta: {
    id: string;
    total: number;
    fecha: string;
    clienteNombre?: string;
    clienteCuit?: string;
    items: Array<{
      id: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      producto: {
        nombre: string;
        descripcion?: string;
        codigoBarras?: string;
      };
    }>;
    pagos: Array<{
      medioPago: string;
      monto: number;
      referencia?: string;
    }>;
    sucursal: {
      nombre: string;
      direccion?: string;
      telefono?: string;
    };
    usuario: {
      name: string;
      email: string;
    };
  };
  sucursal: {
    nombre: string;
  };
  cuit?: string;
}

export default function FacturaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const facturaId = params.id as string;
  
  const [factura, setFactura] = useState<FacturaDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Hook de impresión
  const { printFactura, isInitialized, currentPrinter } = usePrint();

  useEffect(() => {
    if (facturaId) {
      fetchFactura();
    }
  }, [facturaId]);

  const fetchFactura = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔍 Obteniendo factura: ${facturaId}`);
      
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Factura no encontrada');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      setFactura(data);
      
      console.log('✅ Factura obtenida:', data.id);
      
    } catch (err) {
      console.error('❌ Error obteniendo factura:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFactura();
    setIsRefreshing(false);
  };

  const handlePrint = async () => {
    if (!factura) return;
    
    try {
      console.log('🖨️ Iniciando impresión de factura...');
      
      const result = await printFactura(factura.id, {
        auto: false,
        copies: 1
      });
      
      if (result.success) {
        alert('✅ Factura enviada a impresora correctamente');
      } else {
        alert(`❌ Error de impresión: ${result.message}`);
      }
    } catch (error) {
      console.error('Error imprimiendo:', error);
      alert('❌ Error al enviar a impresora. Se abrirá PDF como alternativa.');
      handleDownloadPDF();
    }
  };

  const handleDownloadPDF = async () => {
    if (!factura) return;
    
    try {
      const response = await authenticatedFetch(`/api/pdv/facturas/${factura.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${factura.tipoComprobante}_${factura.numeroFactura}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('❌ Error al generar PDF');
    }
  };

  const handleViewPDF = async () => {
    if (!factura) return;
    
    const pdfUrl = `/api/pdv/facturas/${factura.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Completada
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle size={12} className="mr-1" />
            Error
          </span>
        );
      case 'procesando':
      case 'pendiente':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado al portapapeles`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#311716] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} className="inline mr-2" />
              Volver
            </button>
            <button
              onClick={handleRefresh}
              className="flex-1 px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625]"
            >
              <RefreshCw size={16} className="inline mr-2" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No se encontró la factura</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625]"
          >
            <ArrowLeft size={16} className="inline mr-2" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Factura {factura.tipoComprobante} {String(factura.puntoVenta).padStart(4, '0')}-{String(factura.numeroFactura).padStart(8, '0')}
                </h1>
                <p className="text-sm text-gray-500">
                  {format(new Date(factura.fechaEmision), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {getEstadoBadge(factura.estado)}
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Actualizar"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal - Detalles de la Factura */}
          <div className="lg:col-span-2">
            
            {/* Información General */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Datos del Comprobante</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tipo:</span>
                      <span className="text-sm font-medium">Factura {factura.tipoComprobante}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Punto de Venta:</span>
                      <span className="text-sm font-medium">{String(factura.puntoVenta).padStart(4, '0')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Número:</span>
                      <span className="text-sm font-medium">{String(factura.numeroFactura).padStart(8, '0')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fecha:</span>
                      <span className="text-sm font-medium">
                        {format(new Date(factura.fechaEmision), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nombre:</span>
                      <span className="text-sm font-medium">
                        {factura.venta.clienteNombre || 'Consumidor Final'}
                      </span>
                    </div>
                    {factura.venta.clienteCuit && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">CUIT/DNI:</span>
                        <span className="text-sm font-medium">{factura.venta.clienteCuit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Condición IVA:</span>
                      <span className="text-sm font-medium">
                        {factura.tipoComprobante === 'A' ? 'Responsable Inscripto' : 'Consumidor Final'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items de la Factura */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles de la Venta</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descuento
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {factura.venta.items.map((item) => {
                      const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100);
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.producto.nombre}
                              </div>
                              {item.producto.descripcion && (
                                <div className="text-sm text-gray-500">
                                  {item.producto.descripcion}
                                </div>
                              )}
                              {item.producto.codigoBarras && (
                                <div className="text-xs text-gray-400">
                                  Código: {item.producto.codigoBarras}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.cantidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ${item.precioUnitario.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.descuento > 0 ? `${item.descuento}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            ${subtotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Total:
                      </td>
                      <td className="px-6 py-4 text-lg font-bold text-gray-900 text-right">
                        ${factura.venta.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Métodos de Pago */}
            {factura.venta.pagos && factura.venta.pagos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h2>
                
                <div className="space-y-3">
                  {factura.venta.pagos.map((pago, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {pago.medioPago.replace('_', ' ').toUpperCase()}
                        </span>
                        {pago.referencia && (
                          <div className="text-xs text-gray-500">
                            Ref: {pago.referencia}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        ${pago.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Lateral - Acciones y Datos AFIP */}
          <div className="lg:col-span-1">
            
            {/* Acciones */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
              
              <div className="space-y-3">
                <button
                  onClick={handlePrint}
                  disabled={factura.estado !== 'completada'}
                  className="w-full flex items-center justify-center px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Printer size={16} className="mr-2" />
                  {isInitialized ? 'Reimprimir' : 'Imprimir'}
                </button>
                
                <button
                  onClick={handleViewPDF}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Eye size={16} className="mr-2" />
                  Ver PDF
                </button>
                
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <Download size={16} className="mr-2" />
                  Descargar PDF
                </button>
              </div>

              {currentPrinter && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">Impresora configurada:</div>
                  <div className="text-sm text-blue-800">{currentPrinter}</div>
                </div>
              )}
            </div>

            {/* Información AFIP */}
            {factura.cae && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos AFIP</h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">CAE</label>
                    <div className="flex items-center mt-1">
                      <code className="flex-1 text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {factura.cae}
                      </code>
                      <button
                        onClick={() => copyToClipboard(factura.cae, 'CAE')}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        title="Copiar CAE"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento CAE</label>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {format(new Date(factura.vencimientoCae), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</label>
                    <div className="mt-1">
                      {getEstadoBadge(factura.estado)}
                    </div>
                  </div>
                </div>

                {factura.qrData && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Código QR AFIP</label>
                    <div className="mt-2 flex justify-center">
                      <img 
                        src={factura.qrData} 
                        alt="QR AFIP" 
                        className="w-32 h-32 border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Información Adicional */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</label>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {factura.venta.sucursal.nombre}
                  </div>
                  {factura.venta.sucursal.direccion && (
                    <div className="text-sm text-gray-500">
                      {factura.venta.sucursal.direccion}
                    </div>
                  )}
                  {factura.venta.sucursal.telefono && (
                    <div className="text-sm text-gray-500">
                      Tel: {factura.venta.sucursal.telefono}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</label>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {factura.venta.usuario.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {factura.venta.usuario.email}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">ID de Venta</label>
                  <div className="flex items-center mt-1">
                    <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                      {factura.venta.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(factura.venta.id, 'ID de Venta')}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                      title="Copiar ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}