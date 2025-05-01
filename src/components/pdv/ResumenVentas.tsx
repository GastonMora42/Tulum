// src/components/pdv/ResumenVentas.tsx
import { useState, useEffect } from 'react';
import { BarChart2, DollarSign, CreditCard, QrCode, ArrowRight } from 'lucide-react';

interface ResumenVentasProps {
  cajaId: string;
}

export function ResumenVentas({ cajaId }: ResumenVentasProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        setIsLoading(true);
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha configurado una sucursal');
        }
        
        const response = await fetch(`/api/pdv/cierre/resumen?sucursalId=${sucursalId}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el resumen de ventas');
        }
        
        const data = await response.json();
        setResumen(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    cargarResumen();
  }, [cajaId]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error || !resumen) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600">
        <p>{error || 'No se pudo cargar el resumen'}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-blue-50 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <BarChart2 className="mr-2 h-5 w-5 text-blue-600" />
          Resumen de Ventas
        </h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-gray-700 font-medium">Efectivo</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">${resumen.ventasEfectivo?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-1">{resumen.cantidadEfectivo || 0} transacciones</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-gray-700 font-medium">Tarjetas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">${resumen.ventasTarjeta?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-1">{resumen.cantidadTarjeta || 0} transacciones</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <QrCode className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-gray-700 font-medium">Otros</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">${resumen.ventasOtros?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-1">{resumen.cantidadOtros || 0} transacciones</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 font-medium">Monto Inicial:</p>
              <p className="text-lg font-bold text-gray-800">${resumen.montoInicial?.toFixed(2) || '0.00'}</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
            <div>
              <p className="text-gray-700 font-medium">Efectivo Esperado:</p>
              <p className="text-lg font-bold text-gray-800">${resumen.efectivoEsperado?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Total Ventas:</span>
            <span className="text-2xl font-bold text-blue-600">${resumen.totalVentas?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Total de {resumen.cantidadVentas || 0} ventas desde la apertura de caja
          </p>
        </div>
      </div>
    </div>
  );
}