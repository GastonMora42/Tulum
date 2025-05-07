// src/components/pdv/FacturaViewer.tsx

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Printer, Download, X } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Image from 'next/image';

interface FacturaViewerProps {
  facturaId: string;
  onClose: () => void;
}

export function FacturaViewer({ facturaId, onClose }: FacturaViewerProps) {
  const [factura, setFactura] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFactura = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar la factura');
        }
        
        const data = await response.json();
        setFactura(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFactura();
  }, [facturaId]);
  
  const handlePrint = async () => {
    try {
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al generar PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.print();
      }
    } catch (err) {
      console.error('Error al imprimir:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  const handleDownload = async () => {
    try {
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al generar PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Crear link y simular clic para descargar
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${factura?.tipoComprobante || ''}_${factura?.numeroFactura || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#311716] mx-auto mb-4"></div>
          <p className="text-gray-700">Cargando factura...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#311716] text-white rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }
  
  if (!factura) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
          <p className="text-gray-700">No se pudo cargar la factura</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#311716] text-white rounded mt-4"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#311716]">
            Factura {factura.tipoComprobante} {String(factura.puntoVenta).padStart(4, '0')}-{String(factura.numeroFactura).padStart(8, '0')}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              title="Imprimir"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
              title="Descargar PDF"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-[#311716]">Información del Emisor</h3>
            <p className="text-gray-700">Tulum Aromaterapia</p>
            <p className="text-gray-700">CUIT: {factura.respuestaAFIP?.Auth?.Cuit || 'N/A'}</p>
            <p className="text-gray-700">
              Punto de Venta: {String(factura.puntoVenta).padStart(4, '0')}
            </p>
            <p className="text-gray-700">
              Fecha: {format(new Date(factura.fechaEmision), 'dd/MM/yyyy')}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 text-[#311716]">Información del Cliente</h3>
            <p className="text-gray-700">
              {factura.venta.clienteNombre || 'Consumidor Final'}
            </p>
            {factura.venta.clienteCuit && (
              <p className="text-gray-700">CUIT/DNI: {factura.venta.clienteCuit}</p>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-[#311716]">Detalles de la Factura</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factura.venta.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.producto.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${item.precioUnitario.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${(item.cantidad * item.precioUnitario * (1 - item.descuento / 100)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {factura.venta.descuento > 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      Descuento:
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      -${factura.venta.descuento.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm text-gray-900 text-right font-bold">
                    Total:
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-bold">
                    ${factura.venta.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row items-center justify-between">
          <div>
            <div className="flex items-center">
              <span className="font-semibold">CAE:</span>
              <span className="ml-2">{factura.cae}</span>
            </div>
            <div className="mt-1">
              <span className="font-semibold">Vencimiento CAE:</span>
              <span className="ml-2">
                {factura.vencimientoCae ? format(new Date(factura.vencimientoCae), 'dd/MM/yyyy') : 'N/A'}
              </span>
            </div>
          </div>
          
          {factura.qrData && (
            <div className="mt-4 md:mt-0">
              {factura.qrData.startsWith('data:image') ? (
                <img 
                  src={factura.qrData} 
                  alt="Código QR AFIP" 
                  width={100} 
                  height={100} 
                />
              ) : (
                <div className="bg-gray-200 w-[100px] h-[100px] flex items-center justify-center text-xs text-gray-500">
                  QR no disponible
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}