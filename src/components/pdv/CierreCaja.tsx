// src/components/pdv/CierreCaja.tsx - VERSIÓN DRÁSTICAMENTE MEJORADA
'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertCircle, CheckCircle, X, Calculator, DollarSign, Clock, 
  TrendingUp, AlertTriangle, Eye, EyeOff, FileText, 
  ChevronRight, RefreshCw, Zap, Target, PiggyBank,
  CreditCard, Banknote, Smartphone, Activity
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface CierreCajaProps {
  id: string;
  onSuccess?: () => void;
}

interface PaymentMethod {
  medioPago: string;
  monto: number;
  cantidad: number;
}

interface CierreCajaData {
  id: string;
  fechaApertura: string;
  montoInicial: number;
  estado: string;
}

interface VentasResumen {
  total: number;
  cantidadVentas: number;
  ventasEfectivo: number;
  ventasDigital: number;
  efectivoEsperado: number;
  detallesPorMedioPago: PaymentMethod[];
}

export function CierreCaja({ id, onSuccess }: CierreCajaProps) {
  // Estados principales
  const [cierreCaja, setCierreCaja] = useState<CierreCajaData | null>(null);
  const [ventasResumen, setVentasResumen] = useState<VentasResumen | null>(null);
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBalanceDetails, setShowBalanceDetails] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string;
    details?: string;
  } | null>(null);
  
  const router = useRouter();
  
  // 🎯 CÁLCULOS MEJORADOS Y PRECISOS
  const calcularDiferencia = useCallback((): number => {
    if (!ventasResumen || !montoFinal) return 0;
    
    const montoFinalNum = parseFloat(montoFinal) || 0;
    const efectivoEsperado = ventasResumen.efectivoEsperado || 0;
    
    return montoFinalNum - efectivoEsperado;
  }, [ventasResumen, montoFinal]);
  
  const getDiferenciaType = useCallback(() => {
    const diferencia = calcularDiferencia();
    const absValue = Math.abs(diferencia);
    
    if (absValue === 0) return 'perfect';
    if (absValue <= 5) return 'minor';
    if (absValue <= 20) return 'moderate';
    return 'major';
  }, [calcularDiferencia]);
  
  const getDiferenciaColor = useCallback(() => {
    const type = getDiferenciaType();
    switch (type) {
      case 'perfect': return 'text-green-600 bg-green-50';
      case 'minor': return 'text-yellow-600 bg-yellow-50';
      case 'moderate': return 'text-orange-600 bg-orange-50';
      case 'major': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }, [getDiferenciaType]);
  
  // 🔄 CARGA DE DATOS MEJORADA
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
      
      if (!data.cierreCaja) {
        throw new Error('Datos de cierre de caja incompletos');
      }
      
      setCierreCaja(data.cierreCaja);
      setVentasResumen(data.ventasResumen || {
        total: 0,
        cantidadVentas: 0,
        ventasEfectivo: 0,
        ventasDigital: 0,
        efectivoEsperado: data.cierreCaja.montoInicial,
        detallesPorMedioPago: []
      });
      
      // Auto-completar con efectivo esperado
      const efectivoEsperado = data.ventasResumen?.efectivoEsperado || data.cierreCaja.montoInicial;
      setMontoFinal(efectivoEsperado.toFixed(2));
      
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
  
  // 💰 CALCULADORA INTEGRADA
  const calculatorButtons = [
    '7', '8', '9', 'C',
    '4', '5', '6', '⌫',
    '1', '2', '3', '+',
    '0', '.', '=', '-'
  ];
  
  const handleCalculatorInput = (value: string) => {
    switch (value) {
      case 'C':
        setMontoFinal('0');
        break;
      case '⌫':
        setMontoFinal(prev => prev.slice(0, -1) || '0');
        break;
      case '=':
        try {
          const result = eval(montoFinal);
          setMontoFinal(result.toFixed(2));
        } catch {
          setNotification({
            type: 'error',
            message: 'Operación inválida en la calculadora'
          });
        }
        break;
      case '+':
      case '-':
        setMontoFinal(prev => prev + value);
        break;
      case '.':
        if (!montoFinal.includes('.')) {
          setMontoFinal(prev => prev + value);
        }
        break;
      default:
        setMontoFinal(prev => {
          if (prev === '0') return value;
          return prev + value;
        });
    }
  };
  
  // 🎯 VALIDACIONES MEJORADAS
  const validateClosure = (): boolean => {
    const montoFinalNum = parseFloat(montoFinal);
    
    if (isNaN(montoFinalNum) || montoFinalNum < 0) {
      setNotification({
        type: 'error',
        message: 'El monto final debe ser un número válido mayor o igual a cero'
      });
      return false;
    }
    
    const diferencia = calcularDiferencia();
    const type = getDiferenciaType();
    
    if (type === 'major') {
      setNotification({
        type: 'warning',
        message: `Diferencia significativa detectada: $${Math.abs(diferencia).toFixed(2)}`,
        details: 'Se generará una contingencia automáticamente para revisión administrativa'
      });
    }
    
    return true;
  };
  
  // 🔐 CIERRE DE CAJA MEJORADO
  const handleCerrarCaja = async () => {
    if (!validateClosure()) return;
    
    try {
      setIsSaving(true);
      setCurrentStep(3);
      
      if (!cierreCaja) {
        throw new Error('No hay una caja para cerrar');
      }
      
      const montoFinalNum = parseFloat(montoFinal);
      const diferencia = calcularDiferencia();
      const shouldGenerateContingency = Math.abs(diferencia) > 5; // Umbral de $5
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          montoFinal: montoFinalNum,
          observaciones,
          generateContingency: shouldGenerateContingency
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
        details: data.contingenciaGenerada 
          ? 'Se ha generado una contingencia para revisión de diferencias'
          : 'Cierre completado sin diferencias'
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
      setCurrentStep(2);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 📱 FORMATEO DE MEDIOS DE PAGO
  const formatMedioPago = (medioPago: string): { name: string; icon: JSX.Element; color: string } => {
    switch (medioPago) {
      case 'efectivo':
        return { name: 'Efectivo', icon: <Banknote className="w-4 h-4" />, color: 'text-green-600' };
      case 'tarjeta_credito':
        return { name: 'Tarjeta de Crédito', icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-600' };
      case 'tarjeta_debito':
        return { name: 'Tarjeta de Débito', icon: <CreditCard className="w-4 h-4" />, color: 'text-purple-600' };
      case 'transferencia':
        return { name: 'Transferencia', icon: <Activity className="w-4 h-4" />, color: 'text-indigo-600' };
      case 'qr':
        return { name: 'Pago con QR', icon: <Smartphone className="w-4 h-4" />, color: 'text-orange-600' };
      default:
        return { name: medioPago, icon: <DollarSign className="w-4 h-4" />, color: 'text-gray-600' };
    }
  };
  
  // 🖼️ RENDERIZADO CONDICIONAL
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
  
  if (!cierreCaja || !ventasResumen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al Cargar Datos</h2>
          <p className="text-gray-600 mb-6">
            No se pudo obtener la información necesaria para el cierre de caja.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={loadCierreCaja}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reintentar</span>
            </button>
            
            <button
              onClick={() => router.push('/pdv')}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Volver al PDV
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 🎯 HEADER CON PROGRESO */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <PiggyBank className="w-8 h-8 text-blue-600 mr-3" />
                Cierre de Caja
              </h1>
              <p className="text-gray-600 mt-1">
                Fecha: {format(new Date(cierreCaja.fechaApertura), 'dd/MM/yyyy')}
              </p>
            </div>
            
            {/* Indicador de progreso */}
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
              ))}
            </div>
          </div>
          
          {/* Pasos del proceso */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className={currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}>
              <p className="font-semibold">Revisión</p>
              <p className="text-sm">Verificar datos</p>
            </div>
            <div className={currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}>
              <p className="font-semibold">Conteo</p>
              <p className="text-sm">Contar efectivo</p>
            </div>
            <div className={currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}>
              <p className="font-semibold">Cierre</p>
              <p className="text-sm">Finalizar caja</p>
            </div>
          </div>
        </div>
        
        {/* 📊 NOTIFICACIÓN MEJORADA */}
        {notification && (
          <div className={`mb-6 p-6 rounded-2xl border transition-all ${
            notification.type === 'success' ? 'bg-green-50 border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border-red-200' :
            notification.type === 'warning' ? 'bg-amber-50 border-amber-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                {notification.type === 'success' && <CheckCircle className="w-6 h-6 text-green-600" />}
                {notification.type === 'error' && <AlertCircle className="w-6 h-6 text-red-600" />}
                {notification.type === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                {notification.type === 'info' && <AlertCircle className="w-6 h-6 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h3 className={`font-bold mb-1 ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' :
                  notification.type === 'warning' ? 'text-amber-800' :
                  'text-blue-800'
                }`}>
                  {notification.message}
                </h3>
                {notification.details && (
                  <p className={`text-sm ${
                    notification.type === 'success' ? 'text-green-700' :
                    notification.type === 'error' ? 'text-red-700' :
                    notification.type === 'warning' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {notification.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`ml-4 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors ${
                  notification.type === 'success' ? 'text-green-600' :
                  notification.type === 'error' ? 'text-red-600' :
                  notification.type === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 📈 RESUMEN DE CAJA (2 columnas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de apertura */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Clock className="w-6 h-6 text-blue-600 mr-2" />
                  Información de Apertura
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Caja Abierta
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Fecha y Hora de Apertura</p>
                  <p className="text-xl font-bold text-gray-900">
                    {format(new Date(cierreCaja.fechaApertura), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 mb-1">Monto Inicial</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${cierreCaja.montoInicial.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Resumen de ventas */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
                  Resumen de Ventas
                </h3>
                <button
                  onClick={() => setShowBalanceDetails(!showBalanceDetails)}
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showBalanceDetails ? <EyeOff className="w-5 h-5 mr-1" /> : <Eye className="w-5 h-5 mr-1" />}
                  <span className="text-sm font-medium">
                    {showBalanceDetails ? 'Ocultar' : 'Mostrar'} detalles
                  </span>
                </button>
              </div>
              
              {showBalanceDetails && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-green-600 mb-1">Total Vendido</p>
                      <p className="text-xl font-bold text-green-700">
                        ${ventasResumen.total.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-purple-600 mb-1">Número de Ventas</p>
                      <p className="text-xl font-bold text-purple-700">
                        {ventasResumen.cantidadVentas}
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-yellow-600 mb-1">Venta Promedio</p>
                      <p className="text-xl font-bold text-yellow-700">
                        ${ventasResumen.cantidadVentas > 0 
                          ? (ventasResumen.total / ventasResumen.cantidadVentas).toFixed(2) 
                          : '0.00'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-blue-600 mb-1">Efectivo Esperado</p>
                      <p className="text-xl font-bold text-blue-700">
                        ${ventasResumen.efectivoEsperado.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Detalles por método de pago */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                      Detalles por Método de Pago
                    </h4>
                    
                    {ventasResumen.detallesPorMedioPago.length > 0 ? (
                      <div className="space-y-2">
                        {ventasResumen.detallesPorMedioPago.map((item, index) => {
                          const paymentInfo = formatMedioPago(item.medioPago);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg bg-white ${paymentInfo.color}`}>
                                  {paymentInfo.icon}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{paymentInfo.name}</p>
                                  <p className="text-sm text-gray-600">{item.cantidad} transacciones</p>
                                </div>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                ${item.monto.toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p>No hay ventas registradas</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* 🧮 PANEL DE CONTEO (1 columna) */}
          <div className="space-y-6">
            {/* Conteo de efectivo */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Target className="w-6 h-6 text-orange-600 mr-2" />
                  Conteo Final
                </h3>
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  <span className="text-sm font-medium">Calculadora</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto Final en Efectivo (conteo físico)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      value={montoFinal}
                      onChange={(e) => setMontoFinal(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {/* Calculadora */}
                {showCalculator && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {calculatorButtons.map((btn) => (
                        <button
                          key={btn}
                          onClick={() => handleCalculatorInput(btn)}
                          className={`p-3 rounded-lg font-semibold transition-colors ${
                            ['C', '⌫', '+', '-', '='].includes(btn)
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
                
                {/* Análisis de diferencia */}
                {montoFinal && (
                  <div className={`p-4 rounded-xl border-2 ${getDiferenciaColor()}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Análisis de Diferencia</span>
                      {getDiferenciaType() === 'perfect' && <CheckCircle className="w-5 h-5" />}
                      {getDiferenciaType() !== 'perfect' && <AlertTriangle className="w-5 h-5" />}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Efectivo esperado:</span>
                        <span className="font-mono">${ventasResumen.efectivoEsperado.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo contado:</span>
                        <span className="font-mono">${parseFloat(montoFinal).toFixed(2)}</span>
                      </div>
                      <hr className="border-current opacity-30" />
                      <div className="flex justify-between font-bold">
                        <span>Diferencia:</span>
                        <span className="font-mono">
                          {calcularDiferencia() > 0 ? '+' : ''}${calcularDiferencia().toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="mt-3 text-xs opacity-80">
                        {getDiferenciaType() === 'perfect' && '✅ Monto exacto - Sin diferencias'}
                        {getDiferenciaType() === 'minor' && '⚠️ Diferencia menor - Dentro del margen aceptable'}
                        {getDiferenciaType() === 'moderate' && '⚠️ Diferencia moderada - Revisar conteo'}
                        {getDiferenciaType() === 'major' && '🚨 Diferencia significativa - Se generará contingencia'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                placeholder="Agregar cualquier observación relevante sobre el cierre..."
              />
            </div>
            
            {/* Botón de cierre */}
            <div className="space-y-3">
              {currentStep < 3 && (
                <>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!montoFinal || currentStep >= 2}
                    className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <ChevronRight className="w-5 h-5" />
                    <span>Continuar al Conteo</span>
                  </button>
                  
                  {currentStep >= 2 && (
                    <button
                      onClick={handleCerrarCaja}
                      disabled={isSaving}
                      className="w-full py-4 px-6 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Procesando Cierre...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>Cerrar Caja</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={() => router.push('/pdv')}
                disabled={isSaving}
                className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}