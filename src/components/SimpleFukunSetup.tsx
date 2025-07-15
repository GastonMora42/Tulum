import React, { useState } from 'react';
import { 
  Printer, CheckCircle, AlertCircle, Loader2, 
  Usb, Play, X, ArrowRight, Zap, Settings
} from 'lucide-react';
import { printManager } from '@/services/print/integratedPrintManager';

interface SimpleFukunSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (success: boolean) => void;
}

export function SimpleFukunSetup({ isOpen, onClose, onComplete }: SimpleFukunSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const steps = [
    { title: 'Preparación', icon: Settings },
    { title: 'Conexión', icon: Usb },
    { title: 'Prueba', icon: Play },
    { title: 'Finalización', icon: CheckCircle }
  ];

  const connectToFukun = async () => {
    setIsConnecting(true);
    setConnectionResult(null);

    try {
      console.log('🔌 Conectando a Fukun...');
      
      const result = await printManager.setupPrinter();
      
      setConnectionResult(result);
      
      if (result.success) {
        setCurrentStep(2); // Ir a prueba
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const runPrintTest = async () => {
    setIsTestingPrint(true);
    setTestResult(null);

    try {
      console.log('🧪 Ejecutando test...');
      
      const result = await printManager.testPrint();
      
      setTestResult(result);
      
      if (result.success) {
        setCurrentStep(3); // Ir a finalización
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error en test'
      });
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handleComplete = () => {
    const success = connectionResult?.success && testResult?.success;
    onComplete(success || false);
    onClose();
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setConnectionResult(null);
    setTestResult(null);
    setIsConnecting(false);
    setIsTestingPrint(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Configurar Fukun 80 POS</h2>
                <p className="text-blue-100">Conexión USB OTG para Tablet Samsung</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep || (index === 3 && testResult?.success);
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="ml-2">
                    <p className={`text-xs font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Paso 0: Preparación */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Preparar Conexión</h3>
                <p className="text-gray-600 mb-6">
                  Verifique que su impresora Fukun 80 POS esté correctamente conectada
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-blue-800 mb-3">Lista de Verificación:</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Impresora Fukun 80 POS encendida</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Usb className="w-4 h-4" />
                    <span>Cable USB conectado via adaptador OTG</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Papel térmico 80mm instalado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Drivers "Star" instalados en tablet</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Zap className="w-5 h-5" />
                <span>Continuar</span>
              </button>
            </div>
          )}

          {/* Paso 1: Conexión */}
          {currentStep === 1 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Usb className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Conectar Impresora</h3>
                <p className="text-gray-600">
                  Estableciendo comunicación con la impresora Fukun via WebUSB
                </p>
              </div>

              {/* Resultado de conexión */}
              {connectionResult && (
                <div className={`p-4 rounded-lg border ${
                  connectionResult.success 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    {connectionResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {connectionResult.success ? 'Conexión Exitosa' : 'Error de Conexión'}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{connectionResult.message}</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={connectToFukun}
                  disabled={isConnecting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Usb className="w-5 h-5" />
                  )}
                  <span>{isConnecting ? 'Conectando...' : 'Conectar Fukun'}</span>
                </button>

                {connectionResult && !connectionResult.success && (
                  <button
                    onClick={() => {
                      setConnectionResult(null);
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Paso 2: Prueba */}
          {currentStep === 2 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Play className="w-8 h-8 text-orange-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Probar Impresión</h3>
                <p className="text-gray-600">
                  Verificando que la impresora funciona correctamente
                </p>
              </div>

              {/* Resultado del test */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {testResult.success ? 'Test Exitoso' : 'Error en Test'}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{testResult.message}</p>
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">
                <p className="font-medium mb-1">¿La impresora imprimió una página de test?</p>
                <p>Si no imprimió, verifique la conexión USB y que tenga papel térmico.</p>
              </div>

              <button
                onClick={runPrintTest}
                disabled={isTestingPrint}
                className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center space-x-2 mx-auto"
              >
                {isTestingPrint ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{isTestingPrint ? 'Probando...' : 'Ejecutar Test'}</span>
              </button>
            </div>
          )}

          {/* Paso 3: Finalización */}
          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">¡Configuración Completada!</h3>
                <p className="text-gray-600">
                  Su impresora Fukun 80 POS está lista para usar
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Sistema Configurado:</h4>
                <div className="text-sm text-green-700 space-y-1 text-left">
                  <p>✅ Impresora conectada via WebUSB</p>
                  <p>✅ Test de impresión exitoso</p>
                  <p>✅ Integración con sistema de ventas</p>
                  <p>✅ Apertura automática de cajón</p>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="border-t p-4 bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-500">
            Paso {currentStep + 1} de {steps.length}
          </div>
          
          <div className="flex space-x-3">
            {(connectionResult && !connectionResult.success) || (testResult && !testResult.success) ? (
              <button
                onClick={resetWizard}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Comenzar de Nuevo
              </button>
            ) : null}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}