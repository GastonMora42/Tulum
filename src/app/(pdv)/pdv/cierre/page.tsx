// src/app/(pdv)/pdv/cierre/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BookCheck, DollarSign, CreditCard, ArrowLeft, Clock,
  CheckCircle, XCircle, AlignJustify, FileText, Printer
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/hooks/useOffline';

interface ResumenCaja {
  fechaApertura: string;
  montoInicial: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasOtros: number;
  totalVentas: number;
  cantidadVentas: number;
  efectivoEsperado: number;
  abierto: boolean;
}

export default function CierreCajaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isOnline } = useOffline();
  
  // State
  const [resumenCaja, setResumenCaja] = useState<ResumenCaja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [montoDeclarado, setMontoDeclarado] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isCerrando, setIsCerrando] = useState(false);
  const [cierreFinalizado, setCierreFinalizado] = useState(false);
  const [diferencia, setDiferencia] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Load cash register data
  useEffect(() => {
    const fetchResumenCaja = async () => {
      try {
        setIsLoading(true);
        
        if (!isOnline) {
          setError('Necesita conexión a internet para el cierre de caja');
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
          `/api/pdv/cierre/resumen?sucursalId=${sucursalId}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar el resumen de caja');
        }
        
        const data = await response.json();
        setResumenCaja(data);
        
        if (!data.abierto) {
          setCierreFinalizado(true);
        }
      } catch (err) {
        console.error('Error al cargar resumen de caja:', err);
        setError('Error al cargar el resumen de caja');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResumenCaja();
  }, [isOnline]);
  
  // Calculate difference when declared amount changes
  useEffect(() => {
    if (resumenCaja && montoDeclarado) {
      const monto = parseFloat(montoDeclarado);
      if (!isNaN(monto)) {
        setDiferencia(monto - resumenCaja.efectivoEsperado);
      } else {
        setDiferencia(null);
      }
    } else {
      setDiferencia(null);
    }
  }, [montoDeclarado, resumenCaja]);
  
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
  
  // Handle cash register closing
  const handleCierreCaja = async () => {
    try {
      if (!resumenCaja) return;
      
      setIsCerrando(true);
      setError(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setError('No se ha configurado la sucursal para este usuario');
        setIsCerrando(false);
        return;
      }
      
      const montoDeclaradoNum = parseFloat(montoDeclarado);
      if (isNaN(montoDeclaradoNum)) {
        setError('Debe ingresar un monto válido');
        setIsCerrando(false);
        return;
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId,
          montoFinal: montoDeclaradoNum,
          observaciones: observaciones || undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al realizar el cierre de caja');
      }
      
      const data = await response.json();
      setCierreFinalizado(true);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Error al cerrar caja:', err);
      setError(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setIsCerrando(false);
    }
  };
  
  // Handle print report
  const handlePrintReport = () => {
    if (!isOnline) {
      setError('Necesita conexión a internet para imprimir reportes');
      return;
    }
    
    const sucursalId = localStorage.getItem('sucursalId');
    window.open(`/api/pdv/cierre/reporte?sucursalId=${sucursalId}`, '_blank');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cierre de Caja</h1>
        <Link
          href="/pdv"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          Volver al PDV
        </Link>
      </div>
      
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando información de caja...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-red-600">
          <XCircle size={48} className="mx-auto mb-4" />
          <p className="mb-2">{error}</p>
          {!isOnline && (
            <p className="text-sm text-gray-600">
              Esta funcionalidad requiere conexión a internet.
            </p>
          )}
        </div>
      ) : cierreFinalizado ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
          <h2 className="text-xl font-bold mb-2">¡Cierre de caja realizado!</h2>
          <p className="mb-4 text-gray-600">
            La caja ha sido cerrada correctamente.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handlePrintReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-2"
            >
              <Printer size={18} className="mr-2" />
              Imprimir Reporte
            </button>
            <Link
              href="/pdv"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center mx-2"
            >
              <ArrowLeft size={18} className="mr-2" />
              Volver al PDV
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-xl font-bold flex items-center">
                  <BookCheck size={24} className="mr-2" />
                  Resumen del Día
                </h2>
                {resumenCaja && (
                  <p className="text-sm opacity-90">
                    Caja abierta desde: {formatDate(resumenCaja.fechaApertura)}
                  </p>
                )}
              </div>
              
              {resumenCaja && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">
                        Ventas del Día
                      </h3>
                      <div className="text-3xl font-bold text-blue-900">
                        {formatCurrency(resumenCaja.totalVentas)}
                      </div>
                      <div className="text-blue-700 text-sm mt-1">
                        {resumenCaja.cantidadVentas} transacciones
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-green-800 mb-2">
                        Efectivo Esperado
                      </h3>
                      <div className="text-3xl font-bold text-green-900">
                        {formatCurrency(resumenCaja.efectivoEsperado)}
                      </div>
                      <div className="text-green-700 text-sm mt-1">
                        Incluyendo monto inicial
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">
                      Desglose por Método de Pago
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <DollarSign size={20} className="mr-2 text-green-600" />
                          <span>Efectivo</span>
                        </div>
                        <div className="font-bold">
                          {formatCurrency(resumenCaja.ventasEfectivo)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <CreditCard size={20} className="mr-2 text-blue-600" />
                          <span>Tarjeta</span>
                        </div>
                        <div className="font-bold">
                          {formatCurrency(resumenCaja.ventasTarjeta)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Clock size={20} className="mr-2 text-purple-600" />
                          <span>Otros Métodos</span>
                        </div>
                        <div className="font-bold">
                          {formatCurrency(resumenCaja.ventasOtros)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Apertura de Caja:</span>
                      <span>{formatCurrency(resumenCaja.montoInicial)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-medium">+ Ventas en Efectivo:</span>
                      <span>{formatCurrency(resumenCaja.ventasEfectivo)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t border-gray-200 pt-1">
                      <span className="font-medium">= Efectivo Esperado:</span>
                      <span className="font-bold">
                        {formatCurrency(resumenCaja.efectivoEsperado)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column - Close form */}
          <div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-green-600 text-white p-4">
                <h2 className="text-xl font-bold">Cerrar Caja</h2>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Efectivo en Caja
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoDeclarado}
                    onChange={(e) => setMontoDeclarado(e.target.value)}
                    placeholder="Ingrese el monto total en caja"
                    className="w-full p-3 border rounded-lg"
                  />
                  
                  {diferencia !== null && (
                    <div
                      className={`mt-2 p-2 rounded-lg ${
                        diferencia === 0
                          ? 'bg-green-50 text-green-700'
                          : diferencia > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {diferencia === 0 ? (
                        <span>El monto coincide con lo esperado.</span>
                      ) : diferencia > 0 ? (
                        <span>
                          Sobrante: {formatCurrency(diferencia)} por encima de lo esperado.
                        </span>
                      ) : (
                        <span>
                          Faltante: {formatCurrency(Math.abs(diferencia))} por debajo de lo esperado.
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Añada observaciones sobre el cierre (opcional)"
                    className="w-full p-3 border rounded-lg h-24"
                  ></textarea>
                </div>
                
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center"
                  >
                    <FileText size={18} className="mr-2" />
                    Ver Reporte
                  </button>
                  
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!montoDeclarado || isNaN(parseFloat(montoDeclarado))}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Cerrar Caja
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tips and instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                <AlignJustify size={18} className="mr-2" />
                Instrucciones
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Cuente todo el efectivo presente en la caja.</li>
                <li>• Ingrese el monto total contado en el campo "Efectivo en Caja".</li>
                <li>• Si hay diferencias, indique el motivo en las observaciones.</li>
                <li>• Al cerrar la caja, se generará un reporte para su registro.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirmar Cierre de Caja</h3>
            <p className="mb-4">
              Está a punto de cerrar la caja con un monto final de{' '}
              <span className="font-bold">{formatCurrency(parseFloat(montoDeclarado))}</span>.
            </p>
            
            {diferencia !== null && diferencia !== 0 && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  diferencia > 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {diferencia > 0 ? (
                  <p>
                    <strong>Hay un sobrante</strong> de {formatCurrency(diferencia)}.
                    Asegúrese de registrar este excedente.
                  </p>
                ) : (
                  <p>
                    <strong>Hay un faltante</strong> de {formatCurrency(Math.abs(diferencia))}.
                    Por favor, verifique nuevamente el conteo e indique la razón del faltante.
                  </p>
                )}
              </div>
            )}
            
            <p className="mb-4">
              Esta acción no se puede deshacer. ¿Está seguro que desea continuar?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCierreCaja}
                disabled={isCerrando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center disabled:opacity-50"
              >
                {isCerrando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Confirmar
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