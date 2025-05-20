// src/components/pdv/CierreCaja.tsx - Parte relevante

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, X, Printer } from 'lucide-react';
import { exportToPdf } from '@/lib/utils/pdfExport';

interface CierreCajaProps {
  id: string;
  onSuccess?: () => void;
}

export function CierreCaja({ id, onSuccess }: CierreCajaProps) {
  const [cierreCaja, setCierreCaja] = useState<any>(null);
  const [ventasResumen, setVentasResumen] = useState<any>(null);
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const router = useRouter();
  
  // Cargar datos del cierre
  useEffect(() => {
    const loadCierreCaja = async () => {
      try {
        setIsLoading(true);
        
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          throw new Error('No se ha definido una sucursal para este punto de venta');
        }
        
        const response = await fetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No hay una caja abierta actualmente');
          }
          const data = await response.json();
          throw new Error(data.error || 'Error al obtener datos del cierre de caja');
        }
        
        const data = await response.json();
        
        // Verificar que la respuesta contiene los datos esperados
        if (!data.cierreCaja) {
          throw new Error('Datos de cierre de caja incompletos o inválidos');
        }
        
        setCierreCaja(data.cierreCaja);
        
        if (data.ventasResumen) {
          setVentasResumen(data.ventasResumen);
          
          // Buscar el monto en efectivo para pre-llenarlo
          const efectivo = data.ventasResumen.detallesPorMedioPago.find(
            (item: any) => item.medioPago === 'efectivo'
          );
          
          if (efectivo) {
            // Sumar monto inicial + ventas en efectivo
            const montoEfectivoEsperado = data.cierreCaja.montoInicial + efectivo.monto;
            setMontoFinal(montoEfectivoEsperado.toFixed(2));
          } else {
            setMontoFinal(data.cierreCaja.montoInicial.toFixed(2));
          }
        } else {
          setVentasResumen({
            detallesPorMedioPago: [],
            total: 0,
            cantidadVentas: 0,
            ventasEfectivo: 0,
            ventasDigital: 0
          });
          setMontoFinal(data.cierreCaja.montoInicial.toFixed(2));
        }
      } catch (error) {
        console.error('Error al cargar cierre de caja:', error);
        setNotification({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error al cargar cierre de caja'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCierreCaja();
  }, [id]);
  
  // Cerrar la caja
  const handleCerrarCaja = async () => {
    try {
      setIsSaving(true);
      
      if (!cierreCaja) {
        throw new Error('No hay una caja para cerrar');
      }
      
      const montoFinalNum = parseFloat(montoFinal);
      
      if (isNaN(montoFinalNum) || montoFinalNum < 0) {
        throw new Error('El monto final debe ser un número válido mayor o igual a cero');
      }
      
      const response = await fetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          montoFinal: montoFinalNum,
          observaciones
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cerrar la caja');
      }
      
      const data = await response.json();
      
      setNotification({
        type: 'success',
        message: 'Caja cerrada correctamente'
      });
      
      // Si hay diferencia, mostrar mensaje
      if (data.diferencia !== 0) {
        setTimeout(() => {
          setNotification({
            type: 'error',
            message: `Se detectó una diferencia de ${Math.abs(data.diferencia).toFixed(2)} ${data.diferencia > 0 ? 'sobrante' : 'faltante'} en la caja.`
          });
        }, 3000);
      }
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cerrar caja'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Imprimir reporte
  const handlePrintReport = () => {
    if (!cierreCaja || !ventasResumen) return;
    
    const fechaApertura = new Date(cierreCaja.fechaApertura);
    
    // Preparar datos para el reporte
    const ventasDetalles = ventasResumen.detallesPorMedioPago.map((item: any) => ({
      medioPago: formatMedioPago(item.medioPago),
      cantidad: item.cantidad,
      monto: `$${item.monto.toFixed(2)}`
    }));
    
    exportToPdf({
      title: 'Reporte de Cierre de Caja',
      subtitle: `Caja #${cierreCaja.id} - ${format(fechaApertura, 'dd/MM/yyyy HH:mm')}`,
      fileName: `cierre-caja-${cierreCaja.id}`,
      columns: [
        { header: 'Medio de Pago', dataKey: 'medioPago' },
        { header: 'Cantidad', dataKey: 'cantidad' },
        { header: 'Monto', dataKey: 'monto' }
      ],
      data: ventasDetalles
    });
  };
  
  // Formatear nombre de medio de pago
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
  
  // Cerrar notificación
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Calcular diferencia
  const calcularDiferencia = (): number => {
    if (!cierreCaja || !ventasResumen) return 0;
    
    // Buscar el monto en efectivo
    const efectivo = ventasResumen.detallesPorMedioPago.find(
      (item: any) => item.medioPago === 'efectivo'
    );
    
    // Sumar monto inicial + ventas en efectivo
    const montoEsperado = cierreCaja.montoInicial + (efectivo ? efectivo.monto : 0);
    return parseFloat(montoFinal) - montoEsperado;
  };
  
  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg">Cargando...</span>
      </div>
    );
  }
  
  // Si no hay caja abierta
  if (!cierreCaja) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay una caja abierta</h2>
        <p className="text-gray-600 mb-6">Debe abrir una caja antes de realizar un cierre</p>
        
        <button
          onClick={() => router.push('/pdv')}
          className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Volver al PDV
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Notificación */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="mr-2" size={20} />
            ) : (
              <AlertCircle className="mr-2" size={20} />
            )}
            <p>{notification.message}</p>
            <button 
              onClick={handleCloseNotification}
              className="ml-auto text-gray-500 hover:text-gray-700"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Cierre de Caja</h2>
        
        <button
          onClick={handlePrintReport}
          className="flex items-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Printer size={18} className="mr-2" />
          Imprimir Reporte
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de apertura */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Información de Apertura</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de Apertura:</span>
              <span className="font-medium">
                {format(new Date(cierreCaja.fechaApertura), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Inicial:</span>
              <span className="font-medium">${cierreCaja.montoInicial.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Resumen de ventas */}
        {ventasResumen && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Resumen de Ventas</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Ventas:</span>
                <span className="font-medium">${ventasResumen.total.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Cantidad de Ventas:</span>
                <span className="font-medium">{ventasResumen.cantidadVentas}</span>
              </div>
            </div>
            
            <h4 className="text-md font-medium text-gray-700 mt-4 mb-2">Detalle por Medio de Pago</h4>
            
            <div className="space-y-1">
              {ventasResumen.detallesPorMedioPago.map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{formatMedioPago(item.medioPago)}:</span>
                  <span className="font-medium">${item.monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Formulario de cierre */}
      <div className="mt-8 bg-white p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Realizar Cierre de Caja</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="montoFinal" className="block text-gray-700 mb-1">
              Monto Final en Efectivo (conteo físico):
            </label>
            <input
              type="text"
              id="montoFinal"
              value={montoFinal}
              onChange={(e) => setMontoFinal(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            
            {/* Mostrar diferencia */}
            {montoFinal && (
              <div className={`mt-2 p-2 rounded ${
                Math.abs(calcularDiferencia()) < 0.01 
                  ? 'bg-green-100 text-green-800' 
                  : calcularDiferencia() > 0 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                <p className="text-sm font-medium">
                  {Math.abs(calcularDiferencia()) < 0.01 
                    ? 'El monto coincide exactamente.' 
                    : calcularDiferencia() > 0 
                      ? `Hay un sobrante de $${calcularDiferencia().toFixed(2)}.` 
                      : `Hay un faltante de $${Math.abs(calcularDiferencia()).toFixed(2)}.`}
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="observaciones" className="block text-gray-700 mb-1">
              Observaciones:
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ingrese cualquier observación relevante..."
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => router.push('/pdv')}
            className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 mr-3"
            disabled={isSaving}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleCerrarCaja}
            disabled={isSaving}
            className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Procesando...' : 'Cerrar Caja'}
          </button>
        </div>
      </div>
    </div>
  );
}