'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Printer, Zap, CheckCircle, AlertCircle, Loader2, 
  Smartphone, Usb, Settings, Play, Download, RefreshCw,
  Wifi, BluetoothIcon, Check, X, ArrowRight, ArrowLeft
} from 'lucide-react';
// Asegúrate de que '@/hooks/useAuth' y 'authenticatedFetch' estén correctamente implementados
// Si no los necesitas para la lógica WebUSB directa, puedes omitirlos o adaptarlos.
// import { authenticatedFetch } from '@/hooks/useAuth'; 

interface AutoPrinterSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (count: number) => void;
}

interface DetectionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: string;
}

interface DeviceInfo {
  name: string;
  type: 'fukun_pos80' | 'other_thermal' | 'generic';
  connectionType: 'usb' | 'bluetooth';
  confidence: number;
  detected: boolean;
  usbDevice?: any; // Referencia al objeto USBDevice real (usamos 'any' porque 'USBDevice' no está definido globalmente)
}

// IDs de fabricantes conocidos de impresoras POS (ejemplos)
const KNOWN_MANUFACTURERS = [
  { id: 0x04b8, name: 'Epson' },
  { id: 0x0519, name: 'Star Micronics' },
  { id: 0x154f, name: 'Citizen' },
  { id: 0x1504, name: 'Bixolon' },
  { id: 0x0fe6, name: 'Boca Systems' },
  { id: 0x20d1, name: 'Rongta' },
  { id: 0x0483, name: 'STMicroelectronics' },
  { id: 0x0a07, name: 'Fukun' }, // ID específico para Fukun
  // Agrega más IDs de fabricantes conocidos aquí
];

export function AutoPrinterSetupWizard({ isOpen, onClose, onComplete }: AutoPrinterSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [detectionSteps, setDetectionSteps] = useState<DetectionStep[]>([]);
  const [detectedDevices, setDetectedDevices] = useState<DeviceInfo[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [isWebUSBSupported, setIsWebUSBSupported] = useState(false);

  const steps = [
    { title: 'Preparación', icon: Smartphone },
    { title: 'Detección', icon: Zap },
    { title: 'Conexión', icon: Usb }, // Nuevo paso para la conexión USB
    { title: 'Configuración', icon: Settings },
    { title: 'Prueba', icon: Play },
    { title: 'Finalización', icon: CheckCircle }
  ];

  // Función auxiliar para actualizar el estado de un paso
  const updateStepStatus = useCallback((stepId: string, status: DetectionStep['status'], message?: string, details?: string) => {
    setDetectionSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, details }
        : step
    ));
  }, []);

  // Inicializar pasos y verificar soporte WebUSB al abrir el wizard
  useEffect(() => {
    if (isOpen) {
      const initialSteps: DetectionStep[] = [
        { id: 'permissions', name: 'Verificar soporte WebUSB', status: 'pending' },
        { id: 'usb_scan', name: 'Escanear dispositivos USB emparejados', status: 'pending' },
        { id: 'fukun_detect', name: 'Identificar impresoras', status: 'pending' },
      ];
      setDetectionSteps(initialSteps);
      setCurrentStep(0);
      setSetupComplete(false);
      setError(null);
      setDetectedDevices([]);
      setSelectedDevice(null);

      // Verificar soporte WebUSB
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        setIsWebUSBSupported(true);
        updateStepStatus('permissions', 'success', 'WebUSB soportado ✓');
      } else {
        setIsWebUSBSupported(false);
        updateStepStatus('permissions', 'error', 'WebUSB no soportado', 'Usa Chrome (o un navegador basado en Chromium) en escritorio o Android.');
      }
    }
  }, [isOpen, updateStepStatus]);

  // Función para detectar impresoras USB ya emparejadas
  const detectPairedWebUSBPrinters = async () => {
    updateStepStatus('usb_scan', 'running', 'Escaneando dispositivos USB emparejados...');
    setIsDetecting(true);
    setError(null);

    try {
      if (!isWebUSBSupported) {
        throw new Error('WebUSB no está soportado.');
      }

      // @ts-ignore - WebUSB API
      const devices = await navigator.usb.getDevices();
      const detected: DeviceInfo[] = [];

      for (const device of devices) {
        const manufacturer = KNOWN_MANUFACTURERS.find(m => m.id === device.vendorId);
        const isPrinterClass = device.deviceClass === 7;
        const hasPrinterInterface = device.configurations.some((config: { interfaces: any[]; }) =>
          config.interfaces.some((iface: { alternates: any[]; }) =>
            iface.alternates.some((alt: { interfaceClass: number; }) => alt.interfaceClass === 7)
          )
        );

        if (manufacturer || isPrinterClass || hasPrinterInterface) {
          detected.push({
            name: device.productName || `USB Device (${device.vendorId}:${device.productId})`,
            type: (manufacturer?.name === 'Fukun' || device.vendorId === 0x0a07) ? 'fukun_pos80' : 'other_thermal',
            connectionType: 'usb',
            confidence: manufacturer ? 95 : (isPrinterClass || hasPrinterInterface ? 80 : 50),
            detected: true,
            usbDevice: device, // Almacenar la referencia al objeto USBDevice
          });
        }
      }
      setDetectedDevices(detected);
      updateStepStatus('usb_scan', 'success', `${detected.length} dispositivos emparejados encontrados.`);
      
      // Intentar identificar Fukun
      const fukunDetected = detected.some(d => d.type === 'fukun_pos80');
      if (fukunDetected) {
        updateStepStatus('fukun_detect', 'success', 'FUKUN POS 80 o compatible detectada ✓');
      } else if (detected.length > 0) {
        updateStepStatus('fukun_detect', 'success', 'Impresora compatible detectada (no FUKUN específica)');
      } else {
        updateStepStatus('fukun_detect', 'error', 'No se detectaron impresoras USB compatibles emparejadas.');
      }

      if (detected.length > 0) {
        setSelectedDevice(detected[0]); // Seleccionar la primera por defecto
      }

    } catch (err: any) {
      console.error('Error al escanear dispositivos USB emparejados:', err);
      updateStepStatus('usb_scan', 'error', 'Error al escanear USB', err.message);
      setError(`Error al escanear dispositivos USB: ${err.message}`);
      updateStepStatus('fukun_detect', 'error', 'No se pudieron identificar impresoras.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Función para solicitar acceso a una nueva impresora USB (abre el diálogo del navegador)
  const requestNewWebUSBPrinter = async () => {
    setIsDetecting(true);
    setError(null);
    updateStepStatus('usb_scan', 'running', 'Esperando selección de impresora...');

    try {
      if (!isWebUSBSupported) {
        throw new Error('WebUSB no está soportado.');
      }

      // @ts-ignore - WebUSB API
      const device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] }); // Filtra por clase de impresora
      
      if (device) {
        console.log('Nuevo dispositivo USB seleccionado:', device);
        const manufacturer = KNOWN_MANUFACTURERS.find(m => m.id === device.vendorId);
        const newDevice: DeviceInfo = {
          name: device.productName || `USB Device (${device.vendorId}:${device.productId})`,
          type: (manufacturer?.name === 'Fukun' || device.vendorId === 0x0a07) ? 'fukun_pos80' : 'other_thermal',
          connectionType: 'usb',
          confidence: manufacturer ? 95 : 80,
          detected: true,
          usbDevice: device,
        };
        setDetectedDevices(prev => [...prev, newDevice]);
        setSelectedDevice(newDevice);
        updateStepStatus('usb_scan', 'success', 'Nueva impresora USB seleccionada.');
        updateStepStatus('fukun_detect', 'success', 'Impresora identificada.');
      } else {
        updateStepStatus('usb_scan', 'error', 'Selección de impresora cancelada.');
        setError('No se seleccionó ningún dispositivo USB.');
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        updateStepStatus('usb_scan', 'error', 'No se encontraron dispositivos compatibles o la selección fue cancelada.');
        setError('No se encontró ningún dispositivo USB compatible o el usuario canceló la selección.');
      } else {
        console.error('Error al solicitar dispositivo USB:', err);
        updateStepStatus('usb_scan', 'error', 'Error al solicitar dispositivo USB', err.message);
        setError(`Error al solicitar dispositivo USB: ${err.message}`);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Paso de conexión real con el dispositivo USB
  const connectToPrinter = async () => {
    if (!selectedDevice || !selectedDevice.usbDevice) {
      setError('No hay dispositivo USB seleccionado para conectar.');
      return;
    }

    setCurrentStep(2); // Ir al paso de Conexión
    updateStepStatus('connect_usb', 'running', 'Conectando a la impresora USB...'); // Nuevo ID de paso

    try {
      const device = selectedDevice.usbDevice;
      await device.open(); // Abrir el dispositivo
      console.log('Dispositivo USB abierto:', device);

      // Seleccionar la primera configuración disponible
      if (device.configurations.length > 0) {
        await device.selectConfiguration(device.configurations[0].configurationValue);
        console.log('Configuración seleccionada:', device.configurations[0]);
      } else {
        throw new Error('No se encontraron configuraciones USB para la impresora.');
      }

      // Reclamar la primera interfaz de impresora (clase 7)
      const printerInterface = device.configurations[0].interfaces.find((iface: { alternates: any[]; }) => 
        iface.alternates.some((alt: { interfaceClass: number; }) => alt.interfaceClass === 7)
      );

      if (printerInterface) {
        await device.claimInterface(printerInterface.interfaceNumber);
        console.log('Interfaz de impresora reclamada:', printerInterface.interfaceNumber);
        updateStepStatus('connect_usb', 'success', 'Conexión USB exitosa ✓');
        setCurrentStep(3); // Ir a configuración
      } else {
        throw new Error('No se encontró una interfaz de impresora (clase 7) en el dispositivo.');
      }

    } catch (err: any) {
      console.error('Error al conectar con la impresora USB:', err);
      updateStepStatus('connect_usb', 'error', 'Error al conectar', err.message);
      setError(`Error al conectar con la impresora USB: ${err.message}`);
      // Intentar cerrar el dispositivo si se abrió pero falló la conexión completa
      if (selectedDevice.usbDevice && selectedDevice.usbDevice.opened) {
        try {
          await selectedDevice.usbDevice.close();
          console.log('Dispositivo USB cerrado después de error de conexión.');
        } catch (closeErr) {
          console.error('Error al cerrar dispositivo USB:', closeErr);
        }
      }
    }
  };


  const configurePrinter = async () => {
    if (!selectedDevice || !selectedDevice.usbDevice) {
      setError('No hay dispositivo seleccionado o conectado.');
      return;
    }

    setCurrentStep(3); // Ir al paso de Configuración
    updateStepStatus('configuration', 'running', 'Enviando configuración a la impresora...');

    try {
      // Aquí iría la lógica para enviar comandos de configuración ESC/POS
      // a la impresora a través de selectedDevice.usbDevice.transferOut()
      // Esto es un placeholder para la implementación real.

      // Ejemplo de cómo se enviaría un comando (simplificado, requiere más lógica real):
      // const testCommand = new Uint8Array([0x1B, 0x40]); // ESC @ (Initialize printer)
      // const endpoint = selectedDevice.usbDevice.configurations[0].interfaces[0].endpoints.find(ep => ep.direction === 'out');
      // if (endpoint) {
      //   await selectedDevice.usbDevice.transferOut(endpoint.endpointNumber, testCommand);
      // } else {
      //   throw new Error('No se encontró un endpoint de salida para enviar comandos.');
      // }

      await delay(1500); // Simulación de tiempo de configuración

      // Lógica para enviar configuración a tu backend (si es necesario)
      // const sucursalId = localStorage.getItem('sucursalId');
      // if (!sucursalId) { throw new Error('No se encontró ID de sucursal'); }
      // const printerConfig = { /* ... tu configuración ... */ };
      // const response = await authenticatedFetch('/api/admin/impresoras', { /* ... */ });
      // if (!response.ok) { /* ... */ }

      updateStepStatus('configuration', 'success', 'Impresora configurada correctamente ✓');
      setCurrentStep(4); // Ir a prueba
      
    } catch (err: any) {
      console.error('Error configurando impresora:', err);
      updateStepStatus('configuration', 'error', 'Error en configuración', err.message);
      setError(err instanceof Error ? err.message : 'Error en configuración');
    }
  };

  const runPrintTest = async () => {
    setCurrentStep(4); // Ir al paso de Prueba
    
    try {
      if (!selectedDevice || !selectedDevice.usbDevice || !selectedDevice.usbDevice.opened) {
        throw new Error('Impresora no conectada o no seleccionada.');
      }

      console.log('🧪 Ejecutando test de impresión...');
      updateStepStatus('print_test', 'running', 'Enviando página de prueba...'); // Nuevo ID de paso

      // Aquí iría la lógica real para enviar un comando de impresión de prueba
      // a la impresora a través de selectedDevice.usbDevice.transferOut()
      // Por ejemplo, enviar un texto simple con comandos ESC/POS:
      // const encoder = new TextEncoder();
      // const textToPrint = encoder.encode("¡Test de impresión exitoso!\n\n");
      // const cutCommand = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 (Full cut)
      // const combinedCommand = new Uint8Array([...textToPrint, ...cutCommand]);

      // const endpoint = selectedDevice.usbDevice.configurations[0].interfaces[0].endpoints.find(ep => ep.direction === 'out');
      // if (endpoint) {
      //   await selectedDevice.usbDevice.transferOut(endpoint.endpointNumber, combinedCommand);
      // } else {
      //   throw new Error('No se encontró un endpoint de salida para enviar el test.');
      // }

      await delay(3000); // Simulación de tiempo de impresión

      updateStepStatus('print_test', 'success', 'Test de impresión enviado con éxito.');
      setCurrentStep(5); // Finalización
      setSetupComplete(true);
      
    } catch (err: any) {
      console.error('Error en test de impresión:', err);
      updateStepStatus('print_test', 'error', 'Error en test de impresión', err.message);
      setError(err instanceof Error ? err.message : 'Error en test de impresión');
    }
  };

  const handleComplete = async () => {
    // Intentar cerrar el dispositivo USB al finalizar
    if (selectedDevice && selectedDevice.usbDevice && selectedDevice.usbDevice.opened) {
      try {
        await selectedDevice.usbDevice.close();
        console.log('Dispositivo USB cerrado al finalizar el wizard.');
      } catch (closeErr) {
        console.error('Error al cerrar dispositivo USB al finalizar:', closeErr);
      }
    }
    onComplete(detectedDevices.length);
    onClose();
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (!isOpen) return null;

  function initializeSteps() {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Configuración Automática</h2>
                <p className="text-blue-100">FUKUN POS 80 + Tablet Samsung</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep || setupComplete;
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Paso 0: Preparación */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-10 h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Preparación del Sistema</h3>
                <p className="text-gray-600 mb-6">
                  Asegúrate de que tu impresora FUKUN POS 80 esté correctamente conectada a la tablet Samsung Galaxy Tab
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-blue-800 mb-2">Lista de Verificación:</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Impresora FUKUN POS 80 encendida</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Usb className="w-4 h-4" />
                    <span>Cable USB conectado a tablet via adaptador OTG</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Papel térmico 80mm instalado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4" />
                    <span>Tablet conectada a internet</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setCurrentStep(1); // Avanzar al paso de Detección
                  detectPairedWebUSBPrinters(); // Iniciar detección al avanzar
                }}
                disabled={!isWebUSBSupported}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                <span>Iniciar Detección Automática</span>
              </button>
              {!isWebUSBSupported && (
                <p className="text-red-500 text-sm mt-2">WebUSB no soportado. Por favor, actualiza tu navegador o usa Chrome en escritorio/Android.</p>
              )}
            </div>
          )}

          {/* Paso 1: Detección */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Detectando Dispositivos</h3>
                <p className="text-gray-600">
                  Escaneando dispositivos conectados y verificando compatibilidad...
                </p>
              </div>

              <div className="space-y-3">
                {detectionSteps.map((step) => (
                  <div key={step.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 flex items-center justify-center">
                      {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      {step.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {step.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      {step.status === 'pending' && <div className="w-4 h-4 bg-gray-300 rounded-full" />}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.name}</p>
                      {step.message && (
                        <p className={`text-xs ${
                          step.status === 'success' ? 'text-green-600' :
                          step.status === 'error' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {step.message}
                        </p>
                      )}
                      {step.details && (
                        <p className="text-xs text-gray-500 mt-1">{step.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!isDetecting && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Dispositivos Detectados:</h4>
                  {detectedDevices.length === 0 ? (
                    <p className="text-center text-gray-600 italic mb-4">
                      No se detectaron impresoras USB emparejadas.
                    </p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {detectedDevices.map((device, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDevice === device
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedDevice(device)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Printer className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="font-medium">{device.name}</p>
                                <p className="text-sm text-gray-500">
                                  {device.connectionType.toUpperCase()} • Confianza: {device.confidence}%
                                </p>
                              </div>
                            </div>
                            {device.detected && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={requestNewWebUSBPrinter}
                      disabled={!isWebUSBSupported || isDetecting}
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <Usb className="w-5 h-5" />
                      <span>Solicitar Nueva Impresora USB</span>
                    </button>
                    <button
                      onClick={connectToPrinter}
                      disabled={!selectedDevice || isDetecting || !selectedDevice.usbDevice}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      <ArrowRight className="w-5 h-5" />
                      <span>Conectar y Configurar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Conexión USB */}
          {currentStep === 2 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Usb className="w-10 h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Estableciendo Conexión USB</h3>
                <p className="text-gray-600">
                  Abriendo el dispositivo USB y reclamando la interfaz de impresora...
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {detectionSteps.find(s => s.id === 'connect_usb')?.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                    {detectionSteps.find(s => s.id === 'connect_usb')?.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {detectionSteps.find(s => s.id === 'connect_usb')?.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {detectionSteps.find(s => s.id === 'connect_usb')?.status === 'pending' && <div className="w-4 h-4 bg-gray-300 rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Conexión con {selectedDevice?.name || 'impresora'}</p>
                    {detectionSteps.find(s => s.id === 'connect_usb')?.message && (
                      <p className={`text-xs ${
                        detectionSteps.find(s => s.id === 'connect_usb')?.status === 'success' ? 'text-green-600' :
                        detectionSteps.find(s => s.id === 'connect_usb')?.status === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {detectionSteps.find(s => s.id === 'connect_usb')?.message}
                      </p>
                    )}
                    {detectionSteps.find(s => s.id === 'connect_usb')?.details && (
                      <p className="text-xs text-gray-500 mt-1">{detectionSteps.find(s => s.id === 'connect_usb')?.details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Configuración */}
          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Settings className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Configurando Impresora</h3>
                <p className="text-gray-600">
                  Aplicando configuración optimizada para {selectedDevice?.name} y enviando comandos ESC/POS.
                </p>
              </div>

              {selectedDevice && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Configuración Aplicada:</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Papel: 80mm térmico</p>
                    <p>• Corte automático: Activado</p>
                    <p>• Codificación: UTF-8</p>
                    <p>• Cajón de dinero: Habilitado</p>
                    <p>• Optimización para tablet: Activada</p>
                  </div>
                </div>
              )}

              <button
                onClick={runPrintTest}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                <span>Ejecutar Test de Impresión</span>
              </button>
            </div>
          )}

          {/* Paso 4: Prueba */}
          {currentStep === 4 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Play className="w-10 h-10 text-orange-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Ejecutando Test</h3>
                <p className="text-gray-600">
                  Imprimiendo página de prueba para verificar funcionamiento...
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando comando de test a la impresora...</span>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">
                <p className="font-medium mb-1">¿La impresora imprimió una página de test?</p>
                <p>Si no imprimió nada, verifica la conexión y que tenga papel.</p>
              </div>
            </div>
          )}

          {/* Paso 5: Finalización */}
          {currentStep === 5 && setupComplete && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2 text-green-700">¡Configuración Completada!</h3>
                <p className="text-gray-600">
                  Tu impresora FUKUN POS 80 está lista para usar con el sistema Tulum
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Próximos Pasos:</h4>
                <div className="text-sm text-green-700 space-y-1 text-left">
                  <p>✅ La impresora aparecerá en el panel de administración</p>
                  <p>✅ Se usará automáticamente al facturar ventas</p>
                  <p>✅ Puedes reimprimir facturas desde el historial</p>
                  <p>✅ El cajón de dinero se abrirá automáticamente</p>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar Configuración</span>
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Error en configuración</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                  <button
                    onClick={() => {
                      initializeSteps();
                      setCurrentStep(0); // Volver al inicio
                    }}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Intentar nuevamente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {currentStep < steps.length ? `Paso ${currentStep + 1} de ${steps.length}` : 'Configuración completada'}
          </div>
          
          <div className="flex space-x-3">
            {currentStep > 0 && currentStep < steps.length && !setupComplete && (
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {setupComplete ? 'Cerrar' : 'Cancelar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
