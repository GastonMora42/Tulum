// src/components/pdv/CierreCaja.tsx - VERSIÓN MEJORADA CON CONTADOR DE BILLETES
'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertCircle, CheckCircle, X, Calculator, DollarSign, Clock, 
  TrendingUp, AlertTriangle, Eye, EyeOff, FileText, 
  ChevronRight, RefreshCw, Zap, Target, PiggyBank,
  CreditCard, Banknote, Smartphone, Activity, Coins,
  ArrowDownLeft, ArrowUpRight, Info, ExternalLink, Check,
  XCircle, Settings, Loader
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { BillCounter } from './BillCounter';

interface CierreCajaProfesionalProps {
  id: string;
  onSuccess?: () => void;
}

interface MedioPagoConteo {
  nombre: string;
  icon: JSX.Element;
  color: string;
  ventas: number;
  conteo: number;
  diferencia: number;
  editable: boolean;
  isCorrect: boolean;
  canForce?: boolean; // 🆕 Para forzar cierre si está en rojo
}

interface EgresoInfo {
  id: string;
  monto: number;
  motivo: string;
  fecha: string;
  usuario: string;
  detalles?: string;
}

export function CierreCaja({ id, onSuccess }: CierreCajaProfesionalProps) {
  // Estados principales
  const [cierreCaja, setCierreCaja] = useState<any>(null);
  const [ventasResumen, setVentasResumen] = useState<any>(null);
  const [egresos, setEgresos] = useState<EgresoInfo[]>([]);
  
  // 🆕 Estados de conteos manuales SIMPLIFICADOS (sin transferencia)
  const [conteoEfectivo, setConteoEfectivo] = useState<string>('');
  const [conteoTarjetaCredito, setConteoTarjetaCredito] = useState<string>('');
  const [conteoTarjetaDebito, setConteoTarjetaDebito] = useState<string>('');
  const [conteoQR, setConteoQR] = useState<string>('');
  const [recuperoFondo, setRecuperoFondo] = useState<string>('');
  
  // 🆕 Estados para forzar cierre
  const [forcedMethods, setForcedMethods] = useState<Set<string>>(new Set());
  
  const [observaciones, setObservaciones] = useState<string>('');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEgresosDetail, setShowEgresosDetail] = useState(false);
  const [notification, setNotification] = useState<any>(null);
  
  const router = useRouter();
  
  // 🔄 CARGAR DATOS DE CIERRE
  const loadCierreCaja = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotification(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      const response = await authenticatedFetch(
        `/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al obtener datos del cierre de caja');
      }
      
      const data = await response.json();
      
      setCierreCaja(data.cierreCaja);
      setVentasResumen(data.ventasResumen);
      setEgresos(data.egresos || []);
      
      // 🆕 Pre-llenar conteos con valores esperados (SIN TRANSFERENCIA)
      const totales = data.ventasResumen.totalesPorMedioPago;
      setConteoEfectivo(data.ventasResumen.efectivoEsperado?.toFixed(2) || '0.00');
      setConteoTarjetaCredito(totales?.tarjeta_credito?.monto?.toFixed(2) || '0.00');
      setConteoTarjetaDebito(totales?.tarjeta_debito?.monto?.toFixed(2) || '0.00');
      setConteoQR(totales?.qr?.monto?.toFixed(2) || '0.00');
      
      // Configurar recupero de fondo si es necesario
      if (data.ventasResumen.saldoPendienteAnterior > 0) {
        setRecuperoFondo(data.ventasResumen.saldoPendienteAnterior.toFixed(2));
      }
      
    } catch (error) {
      console.error('Error al cargar cierre de caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar cierre de caja',
        details: 'Intenta recargar la página o contacta al administrador'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (id) {
      loadCierreCaja();
    }
  }, [id, loadCierreCaja]);
  
  // 🧮 CALCULAR MEDIOS DE PAGO SIMPLIFICADO (SIN TRANSFERENCIA)
  const calcularMediosPago = useCallback((): MedioPagoConteo[] => {
    if (!ventasResumen) return [];
    
    const totales = ventasResumen.totalesPorMedioPago || {};
    
    return [
      {
        nombre: 'Efectivo',
        icon: <Banknote className="w-5 h-5" />,
        color: 'text-green-600',
        ventas: ventasResumen.efectivoEsperado || 0,
        conteo: parseFloat(conteoEfectivo) || 0,
        diferencia: (parseFloat(conteoEfectivo) || 0) - (ventasResumen.efectivoEsperado || 0),
        editable: true,
        isCorrect: Math.abs((parseFloat(conteoEfectivo) || 0) - (ventasResumen.efectivoEsperado || 0)) < 0.01,
        canForce: true
      },
      {
        nombre: 'Tarjeta de Crédito',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-blue-600',
        ventas: totales.tarjeta_credito?.monto || 0,
        conteo: parseFloat(conteoTarjetaCredito) || 0,
        diferencia: (parseFloat(conteoTarjetaCredito) || 0) - (totales.tarjeta_credito?.monto || 0),
        editable: true,
        isCorrect: Math.abs((parseFloat(conteoTarjetaCredito) || 0) - (totales.tarjeta_credito?.monto || 0)) < 0.01,
        canForce: true
      },
      {
        nombre: 'Tarjeta de Débito',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-purple-600',
        ventas: totales.tarjeta_debito?.monto || 0,
        conteo: parseFloat(conteoTarjetaDebito) || 0,
        diferencia: (parseFloat(conteoTarjetaDebito) || 0) - (totales.tarjeta_debito?.monto || 0),
        editable: true,
        isCorrect: Math.abs((parseFloat(conteoTarjetaDebito) || 0) - (totales.tarjeta_debito?.monto || 0)) < 0.01,
        canForce: true
      },
      {
        nombre: 'QR / Digital',
        icon: <Smartphone className="w-5 h-5" />,
        color: 'text-orange-600',
        ventas: totales.qr?.monto || 0,
        conteo: parseFloat(conteoQR) || 0,
        diferencia: (parseFloat(conteoQR) || 0) - (totales.qr?.monto || 0),
        editable: true,
        isCorrect: Math.abs((parseFloat(conteoQR) || 0) - (totales.qr?.monto || 0)) < 0.01,
        canForce: true
      }
    ].filter(medio => medio.ventas > 0 || medio.conteo > 0); // Solo mostrar medios con movimiento
  }, [ventasResumen, conteoEfectivo, conteoTarjetaCredito, conteoTarjetaDebito, conteoQR]);
  
  // 🆕 FUNCIÓN PARA ACTUALIZAR CONTEO DE MEDIO ESPECÍFICO
  const updateMedioPagoConteo = (medioNombre: string, valor: string) => {
    switch (medioNombre) {
      case 'Efectivo':
        setConteoEfectivo(valor);
        break;
      case 'Tarjeta de Crédito':
        setConteoTarjetaCredito(valor);
        break;
      case 'Tarjeta de Débito':
        setConteoTarjetaDebito(valor);
        break;
      case 'QR / Digital':
        setConteoQR(valor);
        break;
    }
  };

  // 🆕 FUNCIÓN PARA FORZAR CIERRE DE UN MEDIO
  const toggleForceMethod = (medioNombre: string) => {
    const newForcedMethods = new Set(forcedMethods);
    if (newForcedMethods.has(medioNombre)) {
      newForcedMethods.delete(medioNombre);
    } else {
      newForcedMethods.add(medioNombre);
    }
    setForcedMethods(newForcedMethods);
  };

  // 🆕 FUNCIÓN PARA MANEJAR CAMBIO DEL CONTADOR DE BILLETES
  const handleBillCounterChange = (total: number) => {
    setConteoEfectivo(total.toFixed(2));
  };
  
  // 🔐 CERRAR CAJA CON NUEVA LÓGICA
  const handleCerrarCaja = async () => {
    try {
      setIsSaving(true);
      
      if (!cierreCaja) {
        throw new Error('No hay una caja para cerrar');
      }
      
      const mediosPago = calcularMediosPago();
      const mediosIncorrectos = mediosPago.filter(medio => !medio.isCorrect);
      const mediosForzados = mediosIncorrectos.filter(medio => forcedMethods.has(medio.nombre));
      const mediosSinForzar = mediosIncorrectos.filter(medio => !forcedMethods.has(medio.nombre));
      
      // Si hay medios incorrectos sin forzar, mostrar error
      if (mediosSinForzar.length > 0) {
        setNotification({
          type: 'error',
          message: 'Hay diferencias sin resolver',
          details: `Los siguientes medios tienen diferencias: ${mediosSinForzar.map(m => m.nombre).join(', ')}. Corrígelos o marca "Forzar cierre" si es necesario.`
        });
        return;
      }
      
      // Determinar si se genera contingencia
      const hayDiferenciasForzadas = mediosForzados.length > 0;
      const totalDiferencias = mediosPago.reduce((sum, medio) => sum + Math.abs(medio.diferencia), 0);
      
      if (hayDiferenciasForzadas || totalDiferencias > 200) {
        const confirmacion = confirm(
          `${hayDiferenciasForzadas ? 'Se forzará el cierre con diferencias.' : 'Las diferencias superan $200.'} Esto generará una contingencia para revisión. ¿Deseas continuar?`
        );
        if (!confirmacion) {
          setIsSaving(false);
          return;
        }
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          observaciones: observaciones + (hayDiferenciasForzadas ? `\n\nMedios forzados: ${mediosForzados.map(m => m.nombre).join(', ')}` : ''),
          conteoEfectivo: parseFloat(conteoEfectivo),
          conteoTarjetaCredito: parseFloat(conteoTarjetaCredito),
          conteoTarjetaDebito: parseFloat(conteoTarjetaDebito),
          conteoQR: parseFloat(conteoQR),
          conteoOtros: 0, // Ya no usamos transferencia
          recuperoFondo: parseFloat(recuperoFondo) || 0,
          forzarContingencia: hayDiferenciasForzadas
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cerrar la caja');
      }
      
      const data = await response.json();
      
      setNotification({
        type: 'success',
        message: '🎉 Caja cerrada correctamente',
        details: hayDiferenciasForzadas 
          ? 'Se generó una contingencia debido a las diferencias forzadas.'
          : totalDiferencias > 0 
          ? 'Diferencias menores registradas, sin contingencia.'
          : 'Cierre perfecto sin diferencias.',
        data: data
      });
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
      
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
  
  // 🖼️ RENDERIZADO
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <PiggyBank className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-2">Preparando Cierre de Caja</h2>
          <p className="text-gray-600">Cargando información de ventas y caja...</p>
        </div>
      </div>
    );
  }
  
  const mediosPago = calcularMediosPago();
  const allCorrect = mediosPago.every(medio => medio.isCorrect);
  const hasIncorrect = mediosPago.some(medio => !medio.isCorrect);
  const canClose = allCorrect || mediosPago.filter(m => !m.isCorrect).every(m => forcedMethods.has(m.nombre));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 🎯 HEADER COMPACTO */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <PiggyBank className="w-8 h-8 text-blue-600 mr-3" />
                Cierre de Caja
              </h1>
              <p className="text-gray-600 mt-1">
                Fecha: {format(new Date(cierreCaja?.fechaApertura), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            
            {/* 🆕 INDICADOR DE ESTADO GLOBAL */}
            <div className="flex items-center space-x-4">
              {allCorrect && (
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Todo correcto
                </div>
              )}
              
              {hasIncorrect && !canClose && (
                <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Diferencias pendientes
                </div>
              )}

              {hasIncorrect && canClose && (
                <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cierre forzado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📊 NOTIFICACIONES */}
        {notification && (
          <div className={`mb-6 p-6 rounded-2xl border transition-all ${
            notification.type === 'success' ? 'bg-green-50 border-green-200' :
            notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                {notification.type === 'success' ? 
                  <CheckCircle className="w-6 h-6 text-green-600" /> :
                  notification.type === 'info' ?
                  <Info className="w-6 h-6 text-blue-600" /> :
                  <AlertCircle className="w-6 h-6 text-red-600" />
                }
              </div>
              <div className="flex-1">
                <h3 className={`font-bold mb-1 ${
                  notification.type === 'success' ? 'text-green-800' : 
                  notification.type === 'info' ? 'text-blue-800' :
                  'text-red-800'
                }`}>
                  {notification.message}
                </h3>
                {notification.details && (
                  <p className={`text-sm ${
                    notification.type === 'success' ? 'text-green-700' : 
                    notification.type === 'info' ? 'text-blue-700' :
                    'text-red-700'
                  }`}>
                    {notification.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 📈 INFORMACIÓN DEL TURNO */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center mb-6">
                <Clock className="w-6 h-6 text-blue-600 mr-2" />
                Resumen del Turno
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Monto Inicial</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${cierreCaja?.montoInicial?.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Total Ventas</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${ventasResumen?.total?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{ventasResumen?.cantidadVentas} ventas</p>
                </div>
                
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-600 mb-1">Total Egresos</p>
                  <p className="text-2xl font-bold text-red-700">
                    ${ventasResumen?.totalEgresos?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{egresos.length} movimientos</p>
                </div>
              </div>
              
              {/* Detalle de egresos */}
              {egresos.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <ArrowDownLeft className="w-5 h-5 mr-2 text-red-600" />
                      Egresos del Turno
                    </h4>
                    <button
                      onClick={() => setShowEgresosDetail(!showEgresosDetail)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                    >
                      {showEgresosDetail ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      {showEgresosDetail ? 'Ocultar' : 'Ver'} detalle
                    </button>
                  </div>
                  
                  {showEgresosDetail && (
                    <div className="space-y-2">
                      {egresos.map((egreso) => (
                        <div key={egreso.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{egreso.motivo}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(egreso.fecha).toLocaleTimeString()} - {egreso.usuario}
                            </p>
                            {egreso.detalles && <p className="text-xs text-gray-500">{egreso.detalles}</p>}
                          </div>
                          <p className="text-lg font-bold text-red-600">
                            -${egreso.monto.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recupero de fondo */}
            {ventasResumen?.saldoPendienteAnterior > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                  <ArrowUpRight className="w-5 h-5 text-yellow-600 mr-2" />
                  Recupero de Fondo
                </h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Saldo pendiente del turno anterior:</strong>
                  </p>
                  <p className="text-2xl font-bold text-yellow-900">
                    ${ventasResumen.saldoPendienteAnterior.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a recuperar en este turno
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      value={recuperoFondo}
                      onChange={(e) => setRecuperoFondo(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-lg font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Se descontará del efectivo contado
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* 🆕 PANEL PRINCIPAL SIMPLIFICADO */}
          <div className="xl:col-span-2 space-y-6">
            {/* Contador de billetes para efectivo */}
            {mediosPago.find(m => m.nombre === 'Efectivo') && (
              <BillCounter
                expectedAmount={ventasResumen?.efectivoEsperado || 0}
                onTotalChange={handleBillCounterChange}
                className="shadow-lg"
              />
            )}
            
            {/* 🆕 CONTEO SIMPLIFICADO POR MEDIOS DE PAGO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Target className="w-6 h-6 text-orange-600 mr-2" />
                Verificación por Medio de Pago
              </h3>
              
              <div className="space-y-4">
                {mediosPago.filter(m => m.nombre !== 'Efectivo').map((medio, index) => (
                  <div key={index} className={`p-6 rounded-xl border-2 transition-all ${
                    medio.isCorrect || forcedMethods.has(medio.nombre)
                      ? 'border-green-300 bg-green-50' 
                      : 'border-red-300 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl bg-white ${medio.color}`}>
                          {medio.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{medio.nombre}</h4>
                          <p className="text-sm text-gray-600">Monto esperado: ${medio.ventas.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* 🆕 CONTEO MANUAL ÚNICO */}
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Conteo Manual:
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={
                              medio.nombre === 'Tarjeta de Crédito' ? conteoTarjetaCredito :
                              medio.nombre === 'Tarjeta de Débito' ? conteoTarjetaDebito :
                              medio.nombre === 'QR / Digital' ? conteoQR : '0.00'
                            }
                            onChange={(e) => updateMedioPagoConteo(medio.nombre, e.target.value)}
                            className={`w-32 p-3 text-center font-bold border-2 rounded-lg ${
                              medio.isCorrect
                                ? 'border-green-500 bg-green-50 text-green-900'
                                : 'border-red-500 bg-red-50 text-red-900'
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                        
                        {/* 🆕 INDICADOR DE ESTADO VISUAL */}
                        <div className="text-center">
                          {medio.isCorrect ? (
                            <div className="flex flex-col items-center text-green-700">
                              <CheckCircle className="w-8 h-8 mb-1" />
                              <span className="text-sm font-medium">Correcto</span>
                            </div>
                          ) : forcedMethods.has(medio.nombre) ? (
                            <div className="flex flex-col items-center text-amber-700">
                              <Settings className="w-8 h-8 mb-1" />
                              <span className="text-sm font-medium">Forzado</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-red-700">
                              <XCircle className="w-8 h-8 mb-1" />
                              <span className="text-sm font-medium">
                                Diferencia: ${Math.abs(medio.diferencia).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* 🆕 BOTÓN FORZAR CIERRE */}
                        {!medio.isCorrect && (
                          <button
                            onClick={() => toggleForceMethod(medio.nombre)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              forcedMethods.has(medio.nombre)
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {forcedMethods.has(medio.nombre) ? 'Cancelar Forzado' : 'Forzar Cierre'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer con observaciones y finalizar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cualquier observación sobre el cierre, diferencias encontradas, o situaciones especiales..."
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => router.push('/pdv')}
                    disabled={isSaving}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleCerrarCaja}
                    disabled={isSaving || !canClose}
                    className={`px-8 py-3 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 ${
                      canClose
                        ? allCorrect
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="animate-spin h-5 w-5" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>
                          {allCorrect ? 'Cerrar Caja' : hasIncorrect && canClose ? 'Forzar Cierre' : 'Resolver Diferencias'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* 🆕 INFORMACIÓN SOBRE EL CIERRE */}
                {hasIncorrect && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
                      <p className="font-medium text-amber-800">Estado del cierre</p>
                    </div>
                    <div className="text-sm text-amber-700 space-y-1">
                      {canClose ? (
                        <p>✅ Puedes cerrar la caja. Los medios forzados generarán una contingencia.</p>
                      ) : (
                        <p>⚠️ Hay diferencias sin resolver. Corrige los montos o marca "Forzar Cierre".</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}