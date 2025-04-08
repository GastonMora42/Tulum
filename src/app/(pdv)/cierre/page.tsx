// src/app/(pdv)/cierre/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface ResumenVentas {
  total: number;
  cantidadVentas: number;
  detallesPorMedioPago: {
    medioPago: string;
    monto: number;
    cantidad: number;
  }[];
}

interface CierreCaja {
  id: string;
  fechaApertura: string;
  montoInicial: number;
  estado: string;
}

export default function CierreCajaPage() {
  const [cierreCajaActual, setCierreCajaActual] = useState<CierreCaja | null>(null);
  const [resumenVentas, setResumenVentas] = useState<ResumenVentas | null>(null);
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Cargar cierre de caja actual y resumen de ventas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // En producción, llamaríamos a una API real
        // Por ahora, simulamos datos
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simular cierre de caja actual
        const mockCierreCaja = {
          id: 'cierre-1',
          fechaApertura: new Date().toISOString(),
          montoInicial: 5000,
          estado: 'abierto'
        };
        
        // Simular resumen de ventas
        const mockResumenVentas = {
          total: 12500,
          cantidadVentas: 8,
          detallesPorMedioPago: [
            { medioPago: 'efectivo', monto: 5000, cantidad: 4 },
            { medioPago: 'tarjeta_credito', monto: 4500, cantidad: 2 },
            { medioPago: 'tarjeta_debito', monto: 3000, cantidad: 2 }
          ]
        };
        
        setCierreCajaActual(mockCierreCaja);
        setResumenVentas(mockResumenVentas);
        
        // Establecer monto de efectivo inicial para el conteo
        const efectivoInicial = mockResumenVentas.detallesPorMedioPago.find(
          item => item.medioPago === 'efectivo'
        )?.monto || 0;
        
        setMontoEfectivo(efectivoInicial);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('No se pudieron cargar los datos del cierre de caja');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Formatear monto
  const formatMonto = (monto: number) => {
    return monto.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS'
    });
  };
  
  // Mapeo de tipos de medios de pago a nombres legibles
  const getMedioPagoNombre = (medioPago: string) => {
    const mapping: Record<string, string> = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia',
      'qr': 'Pago con QR'
    };
    
    return mapping[medioPago] || medioPago;
  };
  
  // Calcular diferencia en caja
  const calcularDiferenciaCaja = () => {
    if (!resumenVentas) return 0;
    
    const efectivoEsperado = resumenVentas.detallesPorMedioPago.find(
      item => item.medioPago === 'efectivo'
    )?.monto || 0;
    
    return montoEfectivo - efectivoEsperado;
  };
  
  // Realizar cierre de caja
  const handleCierreCaja = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // En producción, llamaríamos a una API real
      // Por ahora, simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Cierre de caja realizado exitosamente');
      
      // Redirigir después de un breve tiempo
      setTimeout(() => {
        router.push('/pdv');
      }, 2000);
    } catch (err) {
      console.error('Error al cerrar caja:', err);
      setError('Error al realizar el cierre de caja');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-lg">Cargando datos del cierre de caja...</p>
      </div>
    );
  }
  
  if (!cierreCajaActual || !resumenVentas) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">No hay un cierre de caja abierto actualmente</p>
        <button
          onClick={() => router.push('/pdv/cierre/nuevo')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Abrir Caja
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cierre de Caja</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-blue-50">
          <h3 className="text-lg leading-6 font-medium text-blue-900">Información de Caja Actual</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Apertura</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(cierreCajaActual.fechaApertura)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Monto inicial</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatMonto(cierreCajaActual.montoInicial)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Responsable apertura</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user?.name}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-green-50">
          <h3 className="text-lg leading-6 font-medium text-green-900">Resumen de Ventas</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{formatMonto(resumenVentas.total)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Cantidad de Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{resumenVentas.cantidadVentas}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Total Efectivo</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMonto(resumenVentas.detallesPorMedioPago.find(item => item.medioPago === 'efectivo')?.monto || 0)}
              </p>
            </div>
          </div>
          
          <h4 className="text-md font-medium text-gray-900 mb-3">Detalle por Medio de Pago</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medio de Pago
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumenVentas.detallesPorMedioPago.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getMedioPagoNombre(item.medioPago)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMonto(item.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-yellow-50">
          <h3 className="text-lg leading-6 font-medium text-yellow-900">Realizar Cierre</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="montoEfectivo" className="block text-sm font-medium text-gray-700">
                Efectivo en Caja (conteo físico)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="montoEfectivo"
                  id="montoEfectivo"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="mt-4">
                <div className={`p-3 rounded-md ${
                  calcularDiferenciaCaja() === 0 
                    ? 'bg-green-50 text-green-700' 
                    : calcularDiferenciaCaja() > 0 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-red-50 text-red-700'
                }`}>
                  <p className="text-sm font-medium">
                    Diferencia: {formatMonto(calcularDiferenciaCaja())}
                  </p>
                  <p className="text-xs mt-1">
                    {calcularDiferenciaCaja() === 0 
                      ? 'La caja cuadra perfectamente.' 
                      : calcularDiferenciaCaja() > 0 
                        ? 'Hay más efectivo del esperado (sobrante).' 
                        : 'Hay menos efectivo del esperado (faltante).'}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">
                Observaciones
              </label>
              <div className="mt-1">
                <textarea
                  id="observaciones"
                  name="observaciones"
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Agregue cualquier observación relevante sobre el cierre de caja"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleCierreCaja}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isSaving ? 'Procesando...' : 'Realizar Cierre de Caja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
 }