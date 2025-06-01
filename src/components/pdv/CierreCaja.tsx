// src/components/pdv/CierreCaja.tsx - VERSIÓN COMPLETAMENTE REDISEÑADA
'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertCircle, CheckCircle, X, Calculator, DollarSign, Clock, 
  TrendingUp, AlertTriangle, Eye, EyeOff, FileText, 
  ChevronRight, RefreshCw, Zap, Target, PiggyBank,
  CreditCard, Banknote, Smartphone, Activity, Coins,
  ArrowDownLeft, ArrowUpRight, Info, ExternalLink
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

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
  editable: boolean; // 🆕 Ahora todos son editables
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
  
  // 🆕 Estados de conteos manuales para TODOS los medios
  const [conteoEfectivo, setConteoEfectivo] = useState<string>('');
  const [conteoTarjetaCredito, setConteoTarjetaCredito] = useState<string>('');
  const [conteoTarjetaDebito, setConteoTarjetaDebito] = useState<string>('');
  const [conteoTransferencia, setConteoTransferencia] = useState<string>('');
  const [conteoQR, setConteoQR] = useState<string>('');
  const [conteoOtros, setConteoOtros] = useState<string>('');
  const [recuperoFondo, setRecuperoFondo] = useState<string>('');
  
  const [observaciones, setObservaciones] = useState<string>('');
  
  // Estados de UI - 🆕 SIN STEPS, DIRECTO A CONTEO
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
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
      
      // 🆕 Pre-llenar TODOS los conteos con valores esperados
      const totales = data.ventasResumen.totalesPorMedioPago;
      setConteoEfectivo(data.ventasResumen.efectivoEsperado?.toFixed(2) || '0.00');
      setConteoTarjetaCredito(totales?.tarjeta_credito?.monto?.toFixed(2) || '0.00');
      setConteoTarjetaDebito(totales?.tarjeta_debito?.monto?.toFixed(2) || '0.00');
      setConteoTransferencia(totales?.transferencia?.monto?.toFixed(2) || '0.00');
      setConteoQR(totales?.qr?.monto?.toFixed(2) || '0.00');
      setConteoOtros('0.00');
      
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
  
  // 🧮 CALCULAR DIFERENCIAS EN TIEMPO REAL - 🆕 TODOS EDITABLES
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
        editable: true
      },
      {
        nombre: 'Tarjeta de Crédito',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-blue-600',
        ventas: totales.tarjeta_credito?.monto || 0,
        conteo: parseFloat(conteoTarjetaCredito) || 0,
        diferencia: (parseFloat(conteoTarjetaCredito) || 0) - (totales.tarjeta_credito?.monto || 0),
        editable: true // 🆕 Ahora editable
      },
      {
        nombre: 'Tarjeta de Débito',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-purple-600',
        ventas: totales.tarjeta_debito?.monto || 0,
        conteo: parseFloat(conteoTarjetaDebito) || 0,
        diferencia: (parseFloat(conteoTarjetaDebito) || 0) - (totales.tarjeta_debito?.monto || 0),
        editable: true // 🆕 Ahora editable
      },
      {
        nombre: 'Transferencia',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-indigo-600',
        ventas: totales.transferencia?.monto || 0,
        conteo: parseFloat(conteoTransferencia) || 0,
        diferencia: (parseFloat(conteoTransferencia) || 0) - (totales.transferencia?.monto || 0),
        editable: true // 🆕 Ahora editable
      },
      {
        nombre: 'QR / Digital',
        icon: <Smartphone className="w-5 h-5" />,
        color: 'text-orange-600',
        ventas: totales.qr?.monto || 0,
        conteo: parseFloat(conteoQR) || 0,
        diferencia: (parseFloat(conteoQR) || 0) - (totales.qr?.monto || 0),
        editable: true // 🆕 Ahora editable
      }
    ];
  }, [ventasResumen, conteoEfectivo, conteoTarjetaCredito, conteoTarjetaDebito, conteoTransferencia, conteoQR]);
  
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
      case 'Transferencia':
        setConteoTransferencia(valor);
        break;
      case 'QR / Digital':
        setConteoQR(valor);
        break;
    }
  };
  
  // 🔐 CERRAR CAJA - 🆕 NUEVA LÓGICA DE CONTINGENCIAS
  const handleCerrarCaja = async () => {
    try {
      setIsSaving(true);
      
      if (!cierreCaja) {
        throw new Error('No hay una caja para cerrar');
      }
      
      // 🆕 VALIDAR DIFERENCIAS ANTES DE ENVIAR
      const mediosPago = calcularMediosPago();
      const totalDiferencias = mediosPago.reduce((sum, medio) => sum + Math.abs(medio.diferencia), 0);
      
      // 🆕 NUEVA LÓGICA: Solo contingencia si diferencia > $200
      const diferenciaSignificativa = totalDiferencias > 200;
      
      if (diferenciaSignificativa) {
        const confirmacion = confirm(
          `Se detectaron diferencias significativas por $${totalDiferencias.toFixed(2)}. Esto generará una contingencia para revisión. ¿Deseas continuar?`
        );
        if (!confirmacion) {
          setIsSaving(false);
          return;
        }
      } else if (totalDiferencias > 0) {
        // 🆕 Para diferencias menores, solo mostrar info
        setNotification({
          type: 'info',
          message: `Diferencias menores detectadas: $${totalDiferencias.toFixed(2)}`,
          details: 'Diferencia aceptable, no se generará contingencia.'
        });
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          observaciones,
          conteoEfectivo: parseFloat(conteoEfectivo),
          conteoTarjetaCredito: parseFloat(conteoTarjetaCredito),
          conteoTarjetaDebito: parseFloat(conteoTarjetaDebito),
          conteoTransferencia: parseFloat(conteoTransferencia),
          conteoQR: parseFloat(conteoQR),
          conteoOtros: parseFloat(conteoOtros),
          recuperoFondo: parseFloat(recuperoFondo) || 0
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
        details: diferenciaSignificativa 
          ? 'Se generó una contingencia debido a las diferencias encontradas.'
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
  
  // 🖼️ RENDERIZADO - 🆕 SIN STEPS, DIRECTO AL CONTEO
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
  const totalDiferencias = mediosPago.reduce((sum, medio) => sum + Math.abs(medio.diferencia), 0);
  
  // 🆕 NUEVA LÓGICA DE ALERTAS
  const diferenciaSignificativa = totalDiferencias > 200;
  const hayDiferenciasMenores = totalDiferencias > 0 && totalDiferencias <= 200;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 🎯 HEADER SIMPLIFICADO */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <PiggyBank className="w-8 h-8 text-blue-600 mr-3" />
                Cierre de Caja
              </h1>
              <p className="text-gray-600 mt-1">
                Fecha: {format(new Date(cierreCaja?.fechaApertura), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            
            {/* 🆕 INDICADOR DE DIFERENCIAS SIMPLIFICADO */}
            <div className="flex items-center space-x-4">
              {diferenciaSignificativa && (
                <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  ⚠️ Diferencias significativas: ${totalDiferencias.toFixed(2)}
                </div>
              )}
              
              {hayDiferenciasMenores && (
                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  ✓ Diferencias aceptables: ${totalDiferencias.toFixed(2)}
                </div>
              )}
              
              {totalDiferencias === 0 && (
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✅ Cierre perfecto
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 📈 PANEL PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de apertura y egresos */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Clock className="w-6 h-6 text-blue-600 mr-2" />
                  Información del Turno
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Caja Abierta
                  </span>
                  {ventasResumen?.saldoPendienteAnterior > 0 && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Requiere Recupero
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Monto Inicial</p>
                  <p className="text-xl font-bold text-blue-700">
                    ${cierreCaja?.montoInicial?.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Total Ventas</p>
                  <p className="text-xl font-bold text-green-700">
                    ${ventasResumen?.total?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{ventasResumen?.cantidadVentas} ventas</p>
                </div>
                
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-600 mb-1">Total Egresos</p>
                  <p className="text-xl font-bold text-red-700">
                    ${ventasResumen?.totalEgresos?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{egresos.length} movimientos</p>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-purple-600 mb-1">Efectivo Esperado</p>
                  <p className="text-xl font-bold text-purple-700">
                    ${ventasResumen?.efectivoEsperado?.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Detalle de egresos */}
              {egresos.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
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
            
            {/* 🆕 CONTEO POR MEDIOS DE PAGO - TODOS EDITABLES */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Target className="w-6 h-6 text-orange-600 mr-2" />
                  Conteo Manual por Medio de Pago
                </h3>
                
                {/* 🆕 INDICADOR DE ESTADO SIMPLIFICADO */}
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total diferencias:</p>
                  <p className={`text-xl font-bold ${
                    diferenciaSignificativa ? 'text-red-600' :
                    hayDiferenciasMenores ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    ${totalDiferencias.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {mediosPago.map((medio, index) => (
                  <div key={index} className={`p-6 rounded-xl border-2 transition-all ${
                    Math.abs(medio.diferencia) > 200 ? 'border-red-300 bg-red-50' :
                    Math.abs(medio.diferencia) > 0 ? 'border-yellow-300 bg-yellow-50' :
                    'border-green-300 bg-green-50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-xl bg-white ${medio.color}`}>
                          {medio.icon}
                        </div>
                        <h4 className="ml-4 font-semibold text-gray-900 text-lg">{medio.nombre}</h4>
                      </div>
                      
                      {/* 🆕 INDICADOR DE DIFERENCIA MÁS CLARO */}
                      {Math.abs(medio.diferencia) > 0 && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                          Math.abs(medio.diferencia) > 200 ? 'bg-red-200 text-red-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {medio.diferencia > 0 ? '+' : ''}${medio.diferencia.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-2 font-medium">Sistema registra:</p>
                        <p className="text-xl font-bold text-gray-900">${medio.ventas.toFixed(2)}</p>
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-2 font-medium">Conteo manual:</p>
                        {/* 🆕 TODOS LOS MEDIOS SON EDITABLES AHORA */}
                        <input
                          type="number"
                          step="0.01"
                          value={
                            medio.nombre === 'Efectivo' ? conteoEfectivo : 
                            medio.nombre === 'Tarjeta de Crédito' ? conteoTarjetaCredito :
                            medio.nombre === 'Tarjeta de Débito' ? conteoTarjetaDebito :
                            medio.nombre === 'Transferencia' ? conteoTransferencia :
                            medio.nombre === 'QR / Digital' ? conteoQR : '0.00'
                          }
                          onChange={(e) => updateMedioPagoConteo(medio.nombre, e.target.value)}
                          className="w-full text-xl font-bold border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded-lg p-2 text-center"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-2 font-medium">Diferencia:</p>
                        <p className={`text-xl font-bold ${
                          Math.abs(medio.diferencia) > 200 ? 'text-red-600' :
                          Math.abs(medio.diferencia) > 0 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {medio.diferencia > 0 ? '+' : ''}${medio.diferencia.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 🔧 PANEL DE CONTROL */}
          <div className="space-y-6">
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
            
            {/* Calculadora */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Calculator className="w-5 h-5 text-orange-600 mr-2" />
                  Herramientas
                </h3>
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                >
                  {showCalculator ? 'Ocultar' : 'Mostrar'} Calculadora
                </button>
              </div>
              
              {showCalculator && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {['7', '8', '9', 'C', '4', '5', '6', '÷', '1', '2', '3', '×', '0', '.', '=', '+'].map((btn) => (
                      <button
                        key={btn}
                        className={`p-3 rounded-lg font-semibold transition-colors ${
                          ['C', '÷', '×', '+', '='].includes(btn)
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Observaciones */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                <FileText className="w-5 h-5 text-gray-600 mr-2" />
                Observaciones
              </h3>
              
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Agregar observaciones sobre el cierre, diferencias encontradas, o cualquier situación especial del turno..."
              />
            </div>
            
            {/* 🆕 BOTÓN DE CIERRE SIMPLIFICADO */}
            <div className="space-y-4">
              <button
                onClick={handleCerrarCaja}
                disabled={isSaving}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-center space-x-3 transition-all shadow-lg hover:shadow-xl ${
                  diferenciaSignificativa 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    <span>Procesando Cierre...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    <span>
                      {diferenciaSignificativa 
                        ? 'Cerrar con Contingencia' 
                        : 'Cerrar Caja'}
                    </span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => router.push('/pdv')}
                disabled={isSaving}
                className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
            
            {/* 🆕 INFORMACIÓN SOBRE CONTINGENCIAS */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <Info className="w-5 h-5 text-blue-600 mr-2" />
                <p className="font-medium text-blue-800">Información sobre diferencias</p>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Diferencias ≤ $200:</strong> Se registran como aceptables</p>
                <p>• <strong>Diferencias {'>'} $200:</strong> Se genera contingencia para revisión</p>
                <p>• <strong>Sin diferencias:</strong> Cierre perfecto ✅</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}