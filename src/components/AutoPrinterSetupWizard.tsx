import React, { useState, useEffect } from 'react';
import { 
  Search, Printer, CheckCircle, AlertTriangle, Zap, Settings,
  Wifi, Usb, Bluetooth, Clock, X, RefreshCw, Play, Download,
  ChevronRight, ChevronLeft, Award, Target
} from 'lucide-react';
import { printerDetectionService, DetectedPrinter } from '@/services/print/printerDetectionService';

interface AutoPrinterSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (configuredPrinters: number) => void;
}

type WizardStep = 'detection' | 'selection' | 'testing' | 'configuration' | 'completed';

export function AutoPrinterSetupWizard({ isOpen, onClose, onComplete }: AutoPrinterSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('detection');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedPrinters, setDetectedPrinters] = useState<DetectedPrinter[]>([]);
  const [selectedPrinters, setSelectedPrinters] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [configurationProgress, setConfigurationProgress] = useState<Map<string, any>>(new Map());
  const [configuredCount, setConfiguredCount] = useState(0);

  useEffect(() => {
    if (isOpen && currentStep === 'detection') {
      startDetection();
    }
  }, [isOpen, currentStep]);

  const startDetection = async () => {
    setIsDetecting(true);
    try {
      console.log('🔍 Iniciando detección automática...');
      const printers = await printerDetectionService.detectAllPrinters();
      setDetectedPrinters(printers);
      
      if (printers.length > 0) {
        setCurrentStep('selection');
      }
    } catch (error) {
      console.error('Error en detección:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const togglePrinterSelection = (systemName: string) => {
    const newSelection = new Set(selectedPrinters);
    if (newSelection.has(systemName)) {
      newSelection.delete(systemName);
    } else {
      newSelection.add(systemName);
    }
    setSelectedPrinters(newSelection);
  };

  const startTesting = async () => {
    setCurrentStep('testing');
    const results = new Map();
    
    const selectedPrinterList = detectedPrinters.filter(p => 
      selectedPrinters.has(p.systemName)
    );

    for (const printer of selectedPrinterList) {
      console.log(`🧪 Probando ${printer.displayName}...`);
      
      // Actualizar estado para mostrar progreso
      results.set(printer.systemName, { status: 'testing' });
      setTestResults(new Map(results));
      
      const testResult = await printerDetectionService.testPrinterConnectivity(printer);
      results.set(printer.systemName, {
        status: testResult.success ? 'success' : 'failed',
        ...testResult
      });
      setTestResults(new Map(results));
      
      // Pausa entre tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Auto-avanzar después de completar todos los tests
    setTimeout(() => {
      setCurrentStep('configuration');
      startConfiguration();
    }, 1500);
  };

  const startConfiguration = async () => {
    const sucursalId = localStorage.getItem('sucursalId');
    if (!sucursalId) {
      console.error('No se encontró ID de sucursal');
      return;
    }

    const progress = new Map();
    let configured = 0;
    
    const successfulPrinters = detectedPrinters.filter(p => 
      selectedPrinters.has(p.systemName) && 
      testResults.get(p.systemName)?.status === 'success'
    );

    for (let i = 0; i < successfulPrinters.length; i++) {
      const printer = successfulPrinters[i];
      
      progress.set(printer.systemName, { status: 'configuring' });
      setConfigurationProgress(new Map(progress));
      
      try {
        const makeDefault = i === 0; // Primera impresora como predeterminada
        const result = await printerDetectionService.autoConfigurePrinter(
          printer, 
          sucursalId, 
          makeDefault
        );
        
        if (result.success) {
          configured++;
          progress.set(printer.systemName, { 
            status: 'success', 
            message: result.message,
            printerId: result.printerId
          });
        } else {
          progress.set(printer.systemName, { 
            status: 'failed', 
            message: result.message 
          });
        }
      } catch (error) {
        progress.set(printer.systemName, { 
          status: 'failed', 
          message: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
      
      setConfigurationProgress(new Map(progress));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setConfiguredCount(configured);
    setCurrentStep('completed');
  };

  const handleComplete = () => {
    onComplete(configuredCount);
    onClose();
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'usb': return <Usb className="w-4 h-4" />;
      case 'network': return <Wifi className="w-4 h-4" />;
      case 'bluetooth': return <Bluetooth className="w-4 h-4" />;
      default: return <Printer className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'thermal': return 'bg-blue-100 text-blue-700';
      case 'laser': return 'bg-green-100 text-green-700';
      case 'inkjet': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configuración Automática de Impresoras</h2>
              <p className="text-blue-100">Detectar y configurar impresoras automáticamente</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[
              { key: 'detection', label: 'Detección', icon: Search },
              { key: 'selection', label: 'Selección', icon: Target },
              { key: 'testing', label: 'Pruebas', icon: Play },
              { key: 'configuration', label: 'Configuración', icon: Settings },
              { key: 'completed', label: 'Completado', icon: Award }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['detection', 'selection', 'testing', 'configuration', 'completed'].indexOf(currentStep) > 
                               ['detection', 'selection', 'testing', 'configuration', 'completed'].indexOf(step.key);
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-100 text-blue-700' :
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  {index < 4 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Paso 1: Detección */}
          {currentStep === 'detection' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {isDetecting ? (
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                ) : (
                  <Search className="w-10 h-10 text-blue-600" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {isDetecting ? 'Detectando Impresoras...' : 'Iniciar Detección'}
              </h3>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {isDetecting 
                  ? 'Escaneando el sistema en busca de impresoras conectadas. Esto puede tomar unos momentos.'
                  : 'Vamos a buscar automáticamente las impresoras disponibles en tu sistema.'
                }
              </p>
              
              {!isDetecting && (
                <button
                  onClick={startDetection}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Search className="w-5 h-5" />
                  <span>Detectar Impresoras</span>
                </button>
              )}
              
              {isDetecting && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✓ Verificando API del navegador...</p>
                  <p>✓ Consultando sistema operativo...</p>
                  <p>✓ Detectando dispositivos USB...</p>
                  <p>⏳ Identificando tipos de impresora...</p>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Selección */}
          {currentStep === 'selection' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {detectedPrinters.length} Impresoras Detectadas
                </h3>
                <p className="text-gray-600">
                  Selecciona las impresoras que quieres configurar
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {detectedPrinters.map((printer) => (
                  <div
                    key={printer.systemName}
                    onClick={() => togglePrinterSelection(printer.systemName)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedPrinters.has(printer.systemName)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Printer className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{printer.displayName}</h4>
                          <p className="text-sm text-gray-600">{printer.manufacturer || 'Fabricante desconocido'}</p>
                        </div>
                      </div>
                      
                      <input
                        type="checkbox"
                        checked={selectedPrinters.has(printer.systemName)}
                        readOnly
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(printer.type)}`}>
                          {printer.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        {getConnectionIcon(printer.connectionType)}
                        <span className="capitalize">{printer.connectionType}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        📄 {printer.recommendedSettings.paperWidth}mm
                      </div>
                      
                      <div className="flex items-center space-x-1 text-gray-600">
                        <div className={`w-2 h-2 rounded-full ${printer.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>{printer.isOnline ? 'En línea' : 'Fuera de línea'}</span>
                      </div>
                    </div>

                    {printer.capabilities.autocut && (
                      <div className="mt-2 flex items-center space-x-1 text-xs text-blue-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Corte automático</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('detection')}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
                
                <button
                  onClick={startTesting}
                  disabled={selectedPrinters.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Probar Seleccionadas ({selectedPrinters.size})
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Pruebas */}
          {currentStep === 'testing' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Probando Conectividad
                </h3>
                <p className="text-gray-600">
                  Verificando que las impresoras respondan correctamente
                </p>
              </div>

              <div className="space-y-4">
                {detectedPrinters
                  .filter(p => selectedPrinters.has(p.systemName))
                  .map((printer) => {
                    const result = testResults.get(printer.systemName);
                    return (
                      <div key={printer.systemName} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Printer className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{printer.displayName}</h4>
                              <p className="text-sm text-gray-600">{printer.connectionType}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!result && (
                              <div className="text-gray-500 text-sm">Esperando...</div>
                            )}
                            
                            {result?.status === 'testing' && (
                              <>
                                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                <span className="text-blue-600 text-sm">Probando...</span>
                              </>
                            )}
                            
                            {result?.status === 'success' && (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 text-sm">
                                  Exitoso ({result.responseTime}ms)
                                </span>
                              </>
                            )}
                            
                            {result?.status === 'failed' && (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 text-sm">Falló</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {result?.error && (
                          <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded-lg">
                            {result.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Paso 4: Configuración */}
          {currentStep === 'configuration' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Configurando Impresoras
                </h3>
                <p className="text-gray-600">
                  Aplicando configuración optimizada para cada impresora
                </p>
              </div>

              <div className="space-y-4">
                {detectedPrinters
                  .filter(p => selectedPrinters.has(p.systemName) && testResults.get(p.systemName)?.status === 'success')
                  .map((printer) => {
                    const progress = configurationProgress.get(printer.systemName);
                    return (
                      <div key={printer.systemName} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Printer className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{printer.displayName}</h4>
                              <p className="text-sm text-gray-600">
                                {printer.recommendedSettings.paperWidth}mm • {printer.connectionType}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!progress && (
                              <div className="text-gray-500 text-sm">En cola...</div>
                            )}
                            
                            {progress?.status === 'configuring' && (
                              <>
                                <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                                <span className="text-orange-600 text-sm">Configurando...</span>
                              </>
                            )}
                            
                            {progress?.status === 'success' && (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-600 text-sm">Configurada</span>
                              </>
                            )}
                            
                            {progress?.status === 'failed' && (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-red-600 text-sm">Error</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {progress?.message && (
                          <div className={`mt-2 p-2 text-sm rounded-lg ${
                            progress.status === 'success' ? 'bg-green-50 text-green-700' :
                            progress.status === 'failed' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {progress.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Paso 5: Completado */}
          {currentStep === 'completed' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¡Configuración Completada!
              </h3>
              
              <p className="text-gray-600 mb-8">
                Se configuraron exitosamente <strong>{configuredCount}</strong> impresoras.
                Ya puedes comenzar a imprimir facturas automáticamente.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 max-w-md mx-auto">
                <div className="space-y-2 text-sm text-green-700">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Impresión automática habilitada</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Configuración optimizada aplicada</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Reimpresión desde historial disponible</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}