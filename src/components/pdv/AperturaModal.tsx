// src/components/pdv/AperturaModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, DollarSign, AlertTriangle, CheckCircle, Calculator, 
  Clock, PiggyBank, Coins, TrendingUp, Info, Zap 
} from 'lucide-react';

interface AperturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { montoInicial: number; recuperarSaldo: boolean }) => void;
  aperturaInfo: {
    sugerenciaApertura: number;
    requiereRecupero: boolean;
    saldoPendiente: number;
    ultimoCierre?: any;
  } | null;
}

export function AperturaModal({ isOpen, onClose, onComplete, aperturaInfo }: AperturaModalProps) {
  const [montoInicial, setMontoInicial] = useState<string>('');
  const [recuperarSaldo, setRecuperarSaldo] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-llenar con la sugerencia al abrir el modal
  useEffect(() => {
    if (isOpen && aperturaInfo) {
      setMontoInicial(aperturaInfo.sugerenciaApertura.toFixed(2));
      setRecuperarSaldo(aperturaInfo.requiereRecupero);
    }
  }, [isOpen, aperturaInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const monto = parseFloat(montoInicial);
    
    if (isNaN(monto) || monto < 0) {
      alert('Debe ingresar un monto válido mayor o igual a cero');
      return;
    }

    // Validación de recupero
    if (aperturaInfo?.requiereRecupero && recuperarSaldo) {
      if (monto < aperturaInfo.saldoPendiente) {
        const confirmacion = confirm(
          `El monto ingresado ($${monto.toFixed(2)}) es menor al saldo pendiente ($${aperturaInfo.saldoPendiente.toFixed(2)}). ¿Desea continuar con un recupero parcial?`
        );
        if (!confirmacion) return;
      }
    }

    setIsProcessing(true);
    
    try {
      await onComplete({
        montoInicial: monto,
        recuperarSaldo
      });
    } catch (error) {
      console.error('Error en apertura:', error);
    } finally {
      setIsProcessing(false);
    }
  };

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
          alert('Operación inválida');
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        />

        {/* Modal */}
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
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            
            {/* Información de recupero si es necesario */}
            {aperturaInfo?.requiereRecupero && (
              <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
                  <h4 className="text-lg font-semibold text-yellow-800">Recupero de Saldo Pendiente</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Saldo del turno anterior</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      ${aperturaInfo.saldoPendiente.toFixed(2)}
                    </p>
                  </div>
                  
                  {aperturaInfo.ultimoCierre && (
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-1">Cierre anterior</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(aperturaInfo.ultimoCierre.fechaCierre).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(aperturaInfo.ultimoCierre.fechaCierre).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recuperarSaldo}
                    onChange={(e) => setRecuperarSaldo(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 border-gray-300"
                  />
                  <span className="text-yellow-800 font-medium">
                    Aplicar recupero de ${aperturaInfo.saldoPendiente.toFixed(2)} en este turno
                  </span>
                </label>
                
                <p className="text-yellow-700 text-sm mt-2">
                  {recuperarSaldo 
                    ? 'Se descontará del efectivo al momento del cierre'
                    : 'El saldo permanecerá pendiente para turnos posteriores'
                  }
                </p>
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
                  onChange={(e) => setMontoInicial(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 text-2xl font-bold border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#311716] focus:border-[#311716] text-center bg-gray-50"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Sugerencia */}
              {aperturaInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Info className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Monto Sugerido</span>
                  </div>
                  <p className="text-blue-700">
                    ${aperturaInfo.sugerenciaApertura.toFixed(2)}
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    {aperturaInfo.requiereRecupero 
                      ? `Incluye $${aperturaInfo.saldoPendiente.toFixed(2)} de recupero + cambio suficiente`
                      : 'Monto recomendado para tener cambio suficiente durante el día'
                    }
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => setMontoInicial(aperturaInfo.sugerenciaApertura.toFixed(2))}
                    className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Usar monto sugerido
                  </button>
                </div>
              )}
            </div>

            {/* Calculadora */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Herramientas</h4>
                <button
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{showCalculator ? 'Ocultar' : 'Mostrar'} Calculadora</span>
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
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="mb-8 bg-gray-50 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Coins className="w-5 h-5 mr-2" />
                Resumen de Apertura
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Monto inicial:</span>
                  <span className="font-bold text-lg">${parseFloat(montoInicial || '0').toFixed(2)}</span>
                </div>
                
                {aperturaInfo?.requiereRecupero && recuperarSaldo && (
                  <div className="flex justify-between items-center text-yellow-700">
                    <span>Recupero a aplicar:</span>
                    <span className="font-bold">-${aperturaInfo.saldoPendiente.toFixed(2)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Efectivo disponible al inicio:</span>
                  <span className="font-bold text-xl text-[#311716]">
                    ${(parseFloat(montoInicial || '0') - (aperturaInfo?.requiereRecupero && recuperarSaldo ? aperturaInfo.saldoPendiente : 0)).toFixed(2)}
                  </span>
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
                disabled={isProcessing || !montoInicial}
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