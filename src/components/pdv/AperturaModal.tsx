// src/components/pdv/AperturaModal.tsx - VERSIÓN MEJORADA MÁS FLEXIBLE
'use client';

import { useState, useEffect } from 'react';
import { 
  X, DollarSign, AlertTriangle, CheckCircle, Calculator, 
  Clock, PiggyBank, Coins, TrendingUp, Info, Zap, AlertCircle,
  Shield, Settings, Target, Lightbulb, CheckSquare, XSquare
} from 'lucide-react';

interface AperturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { montoInicial: number; aplicarRecupero: boolean; observaciones?: string }) => Promise<void>;
  aperturaInfo: {
    sugerenciaApertura: number;
    requiereRecupero: boolean;
    saldoPendiente: number;
    montoFijo: number;
    alertaMontoInsuficiente?: string;
    ultimoCierre?: any;
  } | null;
}

export function AperturaModal({ isOpen, onClose, onComplete, aperturaInfo }: AperturaModalProps) {
  const [montoInicial, setMontoInicial] = useState<string>('');
  const [aplicarRecupero, setAplicarRecupero] = useState(false);
  const [observaciones, setObservaciones] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Pre-llenar con la sugerencia al abrir el modal
  useEffect(() => {
    if (isOpen && aperturaInfo) {
      // Usar el monto fijo como valor por defecto (más conservador)
      setMontoInicial(aperturaInfo.montoFijo.toFixed(2));
      setAplicarRecupero(aperturaInfo.requiereRecupero);
      setError(null);
      setObservaciones('');
      setShowAdvancedMode(false);
    }
  }, [isOpen, aperturaInfo]);

  // Función de validación básica (solo verificar que sea un número válido)
  const validateForm = (): boolean => {
    const monto = parseFloat(montoInicial);
    
    if (isNaN(monto)) {
      setError('Debe ingresar un monto válido');
      return false;
    }
    
    if (monto < 0) {
      setError('El monto no puede ser negativo');
      return false;
    }
    
    if (monto > 1000000) {
      setError('El monto es excesivamente alto. Verifique el valor ingresado.');
      return false;
    }

    setError(null);
    return true;
  };

  // Analizar el monto ingresado vs configuración
  const analyzeAmount = () => {
    if (!aperturaInfo) return null;
    
    const monto = parseFloat(montoInicial || '0');
    const montoFijo = aperturaInfo.montoFijo;
    const sugerencia = aperturaInfo.sugerenciaApertura;
    
    if (monto === montoFijo) {
      return {
        type: 'perfect',
        message: 'Perfecto! Cumple exactamente con el monto fijo configurado',
        icon: CheckSquare,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    
    if (monto === sugerencia && sugerencia !== montoFijo) {
      return {
        type: 'suggested',
        message: 'Usando el monto sugerido basado en el cierre anterior',
        icon: Lightbulb,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    if (monto > montoFijo) {
      const exceso = monto - montoFijo;
      return {
        type: 'above',
        message: `$${exceso.toFixed(2)} por encima del monto fijo. El exceso quedará disponible para egresos o para sobre al cierre.`,
        icon: TrendingUp,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
      };
    }
    
    if (monto < montoFijo) {
      const deficit = montoFijo - monto;
      return {
        type: 'below',
        message: `$${deficit.toFixed(2)} por debajo del monto fijo. Durante el turno, si hay ventas en efectivo, se habilitará recupero de fondo.`,
        icon: Target,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Enviando datos de apertura:', { montoInicial, aplicarRecupero, observaciones });
    
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    const monto = parseFloat(montoInicial);
    
    setIsProcessing(true);
    
    try {
      await onComplete({
        montoInicial: monto,
        aplicarRecupero,
        observaciones: observaciones.trim() || undefined
      });
      
      console.log('✅ Apertura completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en apertura:', error);
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error desconocido al abrir la caja');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculadora (mantener la funcionalidad existente)
  const calculatorButtons = [
    '7', '8', '9', 'C',
    '4', '5', '6', '⌫',
    '1', '2', '3', '+',
    '0', '.', '=', '-'
  ];

  const handleCalculatorInput = (value: string) => {
    switch (value) {
      case 'C':
        setMontoInicial('0');
        break;
      case '⌫':
        setMontoInicial(prev => prev.slice(0, -1) || '0');
        break;
      case '=':
        try {
          const result = eval(montoInicial);
          setMontoInicial(result.toFixed(2));
        } catch {
          setError('Operación de calculadora inválida');
        }
        break;
      case '+':
      case '-':
        setMontoInicial(prev => prev + value);
        break;
      case '.':
        if (!montoInicial.includes('.')) {
          setMontoInicial(prev => prev + value);
        }
        break;
      default:
        setMontoInicial(prev => {
          if (prev === '0') return value;
          return prev + value;
        });
    }
  };

  if (!isOpen) return null;

  const analysis = analyzeAmount();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#311716] to-[#462625] px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <PiggyBank className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Apertura de Caja</h3>
                  <p className="text-white/80">
                    {new Date().toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                disabled={isProcessing}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            
            {/* CONFIGURACIÓN DE SUCURSAL */}
            {aperturaInfo && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <Settings className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-800">Configuración de Sucursal</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-600 mb-1">Monto Fijo Configurado:</p>
                    <p className="text-xl font-bold text-blue-700">${aperturaInfo.montoFijo.toFixed(2)}</p>
                    <p className="text-xs text-blue-600 mt-1">Recomendado para operación normal</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-gray-600 mb-1">Monto Sugerido Hoy:</p>
                    <p className="text-xl font-bold text-green-700">${aperturaInfo.sugerenciaApertura.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {aperturaInfo.sugerenciaApertura === aperturaInfo.montoFijo 
                        ? 'Igual al monto fijo' 
                        : 'Basado en cierre anterior'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* MOSTRAR ERRORES */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}
            
            {/* INFORMACIÓN DE RECUPERO MEJORADA */}
            {aperturaInfo?.alertaMontoInsuficiente && (
              <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-600 mr-3" />
                  <h4 className="text-lg font-semibold text-yellow-800">Situación del Turno Anterior</h4>
                </div>
                
                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Información del sistema:</strong>
                  </p>
                  <p className="text-yellow-700">{aperturaInfo.alertaMontoInsuficiente}</p>
                </div>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarRecupero}
                    onChange={(e) => setAplicarRecupero(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 border-gray-300"
                    disabled={isProcessing}
                  />
                  <span className="text-yellow-800 font-medium">
                    Confirmar que se aplicará recupero durante este turno
                  </span>
                </label>
              </div>
            )}

            {/* Input de monto inicial */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Monto Inicial de Caja
              </label>
              
              <div className="relative mb-4">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                <input
                  type="number"
                  step="0.01"
                  value={montoInicial}
                  onChange={(e) => {
                    setMontoInicial(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-14 pr-6 py-4 text-2xl font-bold border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#311716] focus:border-[#311716] text-center bg-gray-50"
                  placeholder="0.00"
                  required
                  disabled={isProcessing}
                />
              </div>

              {/* Botones de monto rápido */}
              {aperturaInfo && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setMontoInicial(aperturaInfo.montoFijo.toFixed(2))}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    disabled={isProcessing}
                  >
                    💡 Monto Fijo (${aperturaInfo.montoFijo.toFixed(2)})
                  </button>
                  
                  {aperturaInfo.sugerenciaApertura !== aperturaInfo.montoFijo && (
                    <button
                      type="button"
                      onClick={() => setMontoInicial(aperturaInfo.sugerenciaApertura.toFixed(2))}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      disabled={isProcessing}
                    >
                      ⭐ Sugerido (${aperturaInfo.sugerenciaApertura.toFixed(2)})
                    </button>
                  )}
                </div>
              )}

              {/* Análisis del monto */}
              {analysis && parseFloat(montoInicial || '0') > 0 && (
                <div className={`p-4 rounded-xl border ${analysis.borderColor} ${analysis.bgColor} mb-4`}>
                  <div className="flex items-center mb-2">
                    <analysis.icon className={`w-5 h-5 ${analysis.color} mr-2`} />
                    <span className={`font-medium ${analysis.color}`}>
                      {analysis.type === 'perfect' && '✅ Monto Perfecto'}
                      {analysis.type === 'suggested' && '💡 Monto Sugerido'}
                      {analysis.type === 'above' && '📈 Por Encima del Monto Fijo'}
                      {analysis.type === 'below' && '⚡ Por Debajo del Monto Fijo'}
                    </span>
                  </div>
                  <p className={`text-sm ${analysis.color.replace('600', '700')}`}>
                    {analysis.message}
                  </p>
                </div>
              )}
            </div>

            {/* Modo Avanzado Toggle */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvancedMode(!showAdvancedMode)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              >
                {showAdvancedMode ? '🔽' : '▶️'} Opciones avanzadas
              </button>
            </div>

            {/* Opciones Avanzadas */}
            {showAdvancedMode && (
              <div className="mb-8 space-y-6">
                
                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#311716] focus:border-[#311716] text-sm"
                    placeholder="Ej: Apertura con monto diferente debido a situación especial..."
                    disabled={isProcessing}
                  />
                </div>

                {/* Calculadora */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Calculadora</h4>
                    <button
                      type="button"
                      onClick={() => setShowCalculator(!showCalculator)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      disabled={isProcessing}
                    >
                      {showCalculator ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  {showCalculator && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <div className="grid grid-cols-4 gap-3">
                        {calculatorButtons.map((btn) => (
                          <button
                            key={btn}
                            type="button"
                            onClick={() => handleCalculatorInput(btn)}
                            className={`p-4 rounded-xl font-semibold transition-colors ${
                              ['C', '⌫', '+', '-', '='].includes(btn)
                                ? 'bg-[#311716] text-white hover:bg-[#462625]'
                                : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                            }`}
                            disabled={isProcessing}
                          >
                            {btn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen final */}
            <div className="mb-8 bg-gray-50 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Coins className="w-5 h-5 mr-2" />
                Resumen de Apertura
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Monto que se abrirá:</span>
                  <span className="font-bold text-lg">${parseFloat(montoInicial || '0').toFixed(2)}</span>
                </div>
                
                {aperturaInfo && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monto fijo configurado:</span>
                      <span className="font-bold text-blue-600">${aperturaInfo.montoFijo.toFixed(2)}</span>
                    </div>
                    
                    {parseFloat(montoInicial || '0') !== aperturaInfo.montoFijo && (
                      <div className="flex justify-between items-center text-yellow-700">
                        <span>Diferencia:</span>
                        <span className="font-bold">
                          {parseFloat(montoInicial || '0') > aperturaInfo.montoFijo ? '+' : ''}
                          ${(parseFloat(montoInicial || '0') - aperturaInfo.montoFijo).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Durante el turno:</p>
                  {aperturaInfo && parseFloat(montoInicial || '0') < aperturaInfo.montoFijo ? (
                    <p className="text-yellow-700 font-medium text-sm">
                      ⚡ Si hay ventas en efectivo, se habilitará recupero de fondo automáticamente
                    </p>
                  ) : (
                    <p className="text-green-700 font-medium text-sm">
                      ✅ Operación normal - cumple con el monto fijo configurado
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-4 px-6 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 disabled:opacity-50 transition-all font-semibold"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isProcessing || !montoInicial || parseFloat(montoInicial || '0') < 0}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl hover:from-[#462625] hover:to-[#311716] disabled:opacity-50 transition-all font-semibold flex items-center justify-center space-x-3"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Abriendo Caja...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Abrir Caja</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}