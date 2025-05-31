'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, QrCode, Box, Slash, RefreshCw, Zap, ShieldAlert, Scan, AlertTriangle, Volume2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
  className?: string;
}

export function BarcodeScanner({ 
  onScan, 
  onError, 
  autoStart = false,
  className = ''
}: BarcodeScannerProps) {
  // Estados
  const [isScanning, setIsScanning] = useState(autoStart);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Estados específicos para escáner físico
  const [scannerMode, setScannerMode] = useState<'camera' | 'physical' | 'manual'>('physical');
  const [physicalScannerStatus, setPhysicalScannerStatus] = useState<'waiting' | 'active' | 'testing' | 'error'>('waiting');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [scannerBuffer, setScannerBuffer] = useState<string>('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Referencias
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  
  // Referencias para escáner físico
  const bufferRef = useRef<string>('');
  const lastKeypressTimeRef = useRef<number>(0);
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPhysicalScannerActiveRef = useRef<boolean>(false);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🆕 Configuración mejorada para escáner 3nstar
  const SCANNER_CONFIG = {
    TIMEOUT: 150, // Tiempo entre teclas en ms (aumentado para 3nstar)
    MIN_LENGTH: 3, // Longitud mínima del código
    MAX_LENGTH: 50, // Longitud máxima del código
    SCANNER_SPEED_THRESHOLD: 50, // Velocidad máxima entre teclas para considerar escáner
    VALID_CHARS: /^[a-zA-Z0-9\-_./\\+*#@$%&()[\]{}|;:,<>?=!~`'"^\s]+$/, // Caracteres válidos
    TEST_DURATION: 10000 // 10 segundos para el modo test
  };

  // 🆕 Sistema de sonido mejorado
  const playSuccessSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Crear contexto de audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Crear oscilador para el beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Conectar nodos
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar el sonido (beep agradable)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frecuencia del beep
      oscillator.type = 'sine';
      
      // Configurar volumen con fade
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      // Reproducir
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Limpiar después de reproducir
      setTimeout(() => {
        try {
          audioContext.close();
        } catch (e) {
          console.log('Audio context already closed');
        }
      }, 500);
      
    } catch (error) {
      console.warn('No se pudo reproducir el sonido:', error);
      
      // Fallback: usar HTMLAudioElement con data URL
      try {
        const audio = new Audio();
        // Beep corto en base64
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBDWByfDBeyYFI3nN7+OTSA0PVqzn77BdGAg+ltryxnkpBSl+zPLaizsIGGS57OihUgwLUKXh8bllHgg2jdz0unQpBSl/y/LEl0ALDk2o5O68XBoGPJPY88p9KwUme8rx3I4+CRZiturqpVQMCU+l4PK8aB4GM4nU8cBXOBJAogAAoAAOAAgAAADAAAAAwAAAAMAAAAAA';
        audio.volume = 0.3;
        audio.play().catch(() => {
          console.log('Fallback audio también falló');
        });
      } catch (fallbackError) {
        console.warn('Fallback de audio también falló:', fallbackError);
      }
    }
  }, [soundEnabled]);

  // Función para agregar información de debug
  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 14)]);
  }, []);

  // Inicializar escáner
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF
    ]);
    
    scannerRef.current = new BrowserMultiFormatReader(hints);
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

  // Función mejorada para validar código de barras
  const isValidBarcode = useCallback((code: string): boolean => {
    // Verificar longitud
    if (code.length < SCANNER_CONFIG.MIN_LENGTH || code.length > SCANNER_CONFIG.MAX_LENGTH) {
      return false;
    }
    
    // Verificar caracteres válidos
    if (!SCANNER_CONFIG.VALID_CHARS.test(code)) {
      return false;
    }
    
    // Verificar que no sea solo espacios o caracteres especiales
    if (code.trim().length === 0) {
      return false;
    }
    
    // Verificar patrones comunes de códigos de barras
    const commonPatterns = [
      /^TULUM-/, // Códigos propios
      /^\d{12,13}$/, // EAN-13, UPC
      /^\d{8}$/, // EAN-8
      /^[A-Z0-9\-]+$/, // Códigos alfanuméricos
      /^\d+$/, // Solo números
    ];
    
    return commonPatterns.some(pattern => pattern.test(code));
  }, []);

  // Función mejorada para procesar entrada de escáner físico
  const processPhysicalScannerInput = useCallback((code: string) => {
    addDebugInfo(`📦 Procesando código: "${code}" (${code.length} chars)`);
    
    if (isValidBarcode(code)) {
      setLastScanned(code);
      setPhysicalScannerStatus('active');
      
      // 🔊 Reproducir sonido de éxito
      playSuccessSound();
      
      // Ejecutar callback
      onScan(code);
      addDebugInfo(`✅ Código válido enviado: ${code}`);
      
      // Reset después de envío exitoso
      setTimeout(() => {
        if (!isTestMode) {
          setPhysicalScannerStatus('waiting');
        }
      }, 1500);
    } else {
      addDebugInfo(`❌ Código inválido rechazado: "${code}"`);
      setPhysicalScannerStatus('error');
      
      setTimeout(() => {
        setPhysicalScannerStatus(isTestMode ? 'testing' : 'waiting');
      }, 2000);
    }
  }, [isValidBarcode, addDebugInfo, playSuccessSound, onScan, isTestMode]);

  // 🆕 Función mejorada para testear el escáner físico
  const testPhysicalScanner = useCallback(() => {
    addDebugInfo('🧪 Iniciando test del escáner físico...');
    setIsTestMode(true);
    setPhysicalScannerStatus('testing');
    bufferRef.current = '';
    setScannerBuffer('');
    
    addDebugInfo('👀 Modo test activado - Escanee cualquier código ahora');
    addDebugInfo('⏰ El test durará 10 segundos');
    
    // Test automático que termina después de 10 segundos
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
    
    testTimeoutRef.current = setTimeout(() => {
      setIsTestMode(false);
      setPhysicalScannerStatus('waiting');
      addDebugInfo('⏰ Test terminado por timeout');
    }, SCANNER_CONFIG.TEST_DURATION);
  }, [addDebugInfo]);

  // Función para finalizar el test
  const finishTest = useCallback(() => {
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
    setIsTestMode(false);
    setPhysicalScannerStatus('waiting');
    addDebugInfo('✅ Test finalizado manualmente');
  }, [addDebugInfo]);

  // Manejo mejorado de eventos de teclado para escáner físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeypressTimeRef.current;
      
      // Solo procesar si estamos en modo escáner físico y escaneando
      if (!isScanning || scannerMode !== 'physical') return;
      
      // No procesar si estamos en un input (excepto nuestro input manual cuando no está enfocado)
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        if (activeElement !== manualInputRef.current || activeElement === document.activeElement) {
          return;
        }
      }

      // Limpiar timeout anterior
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }

      addDebugInfo(`⌨️ Tecla: "${e.key}" | ⏱️ Tiempo: ${timeDiff}ms | 📄 Buffer: "${bufferRef.current}"`);

      // Detectar si es entrada de escáner (teclas rápidas)
      if (bufferRef.current.length === 0 || timeDiff < SCANNER_CONFIG.SCANNER_SPEED_THRESHOLD) {
        isPhysicalScannerActiveRef.current = true;
        setPhysicalScannerStatus(isTestMode ? 'testing' : 'active');
        addDebugInfo(`🎯 Escáner físico detectado (velocidad: ${timeDiff}ms)`);
      }

      // Reset del buffer si ha pasado mucho tiempo
      if (timeDiff > SCANNER_CONFIG.TIMEOUT && bufferRef.current.length > 0) {
        addDebugInfo(`🔄 Buffer reseteado por timeout (${timeDiff}ms > ${SCANNER_CONFIG.TIMEOUT}ms)`);
        bufferRef.current = '';
        setScannerBuffer('');
      }

      lastKeypressTimeRef.current = currentTime;

      // Manejar tecla Enter (fin de escaneo)
      if (e.key === 'Enter') {
        e.preventDefault();
        
        const currentBuffer = bufferRef.current.trim();
        addDebugInfo(`🔚 Enter detectado con buffer: "${currentBuffer}" (${currentBuffer.length} chars)`);
        
        if (currentBuffer.length >= SCANNER_CONFIG.MIN_LENGTH && isPhysicalScannerActiveRef.current) {
          processPhysicalScannerInput(currentBuffer);
        } else {
          addDebugInfo(`❌ Enter ignorado - Buffer muy corto o entrada manual`);
        }
        
        // Reset
        bufferRef.current = '';
        setScannerBuffer('');
        isPhysicalScannerActiveRef.current = false;
        return;
      }

      // Manejar tecla Tab (algunos escáneres usan Tab)
      if (e.key === 'Tab' && bufferRef.current.length > 0) {
        e.preventDefault();
        const currentBuffer = bufferRef.current.trim();
        addDebugInfo(`📑 Tab detectado con buffer: "${currentBuffer}"`);
        
        if (isPhysicalScannerActiveRef.current && currentBuffer.length >= SCANNER_CONFIG.MIN_LENGTH) {
          processPhysicalScannerInput(currentBuffer);
        }
        
        bufferRef.current = '';
        setScannerBuffer('');
        isPhysicalScannerActiveRef.current = false;
        return;
      }

      // Agregar caracteres al buffer (solo caracteres imprimibles y algunos especiales)
      if (e.key.length === 1 || ['-', '_', '.', '/', '\\', '+', '*', '#', '@', '$', '%', '&'].includes(e.key)) {
        bufferRef.current += e.key;
        setScannerBuffer(bufferRef.current);
        addDebugInfo(`➕ Carácter agregado: "${e.key}" | Buffer actual: "${bufferRef.current}"`);
        
        // Timeout para auto-procesar si no llega Enter (para escáneres que no envían Enter)
        scannerTimeoutRef.current = setTimeout(() => {
          const finalBuffer = bufferRef.current.trim();
          if (finalBuffer.length >= SCANNER_CONFIG.MIN_LENGTH && isPhysicalScannerActiveRef.current) {
            addDebugInfo(`⏰ Auto-procesando por timeout: "${finalBuffer}"`);
            processPhysicalScannerInput(finalBuffer);
          }
          
          bufferRef.current = '';
          setScannerBuffer('');
          isPhysicalScannerActiveRef.current = false;
          setPhysicalScannerStatus(isTestMode ? 'testing' : 'waiting');
        }, SCANNER_CONFIG.TIMEOUT * 2);
      }
    };

    // Solo agregar listener si estamos escaneando en modo físico
    if (isScanning && scannerMode === 'physical') {
      document.addEventListener('keydown', handleKeyDown);
      addDebugInfo('🎯 Listener de escáner físico ACTIVADO');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [isScanning, scannerMode, addDebugInfo, processPhysicalScannerInput, isTestMode]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current);
      }
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, []);

  // Función para verificar si estamos en Chrome
  const isChrome = () => {
    return navigator.userAgent.indexOf("Chrome") !== -1;
  };
  
  // Función específica para solicitar permisos en Chrome
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setPermissionDenied(false);
      setCameraError(null);
      
      console.log("Solicitando permisos de cámara...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      setHasPermission(true);
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No se detectaron cámaras');
      }
      
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('trasera') ||
        device.label.toLowerCase().includes('rear')
      );
      
      setCameraDevices(videoDevices);
      setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      
      stream.getTracks().forEach(track => track.stop());
      
      if (videoRef.current && scannerRef.current) {
        const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
        
        await scannerRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const code = result.getText();
              setLastScanned(code);
              playSuccessSound(); // 🔊 Sonido también para cámara
              onScan(code);
            }
          }
        );
      }
      
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setPermissionDenied(true);
          setCameraError("Permiso denegado para acceder a la cámara");
        } else if (error.name === 'NotFoundError') {
          setCameraError("No se encontró ninguna cámara en tu dispositivo");
        } else {
          setCameraError(`Error de cámara: ${error.message}`);
        }
      } else {
        setCameraError('No se pudo acceder a la cámara');
      }
      
      setHasPermission(false);
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle para la cámara
  const toggleCamera = () => {
    if (isCameraOn) {
      setIsCameraOn(false);
      setScannerMode('physical');
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      setIsCameraOn(true);
      setScannerMode('camera');
      requestCameraPermission();
    }
  };
  
  // Toggle para el escáner principal
  const toggleScanner = () => {
    if (isScanning) {
      setIsScanning(false);
      setIsCameraOn(false);
      setScannerMode('physical');
      setIsTestMode(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
      // Reset estados del escáner físico
      bufferRef.current = '';
      setScannerBuffer('');
      setPhysicalScannerStatus('waiting');
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current);
      }
      addDebugInfo('🛑 Escáner DETENIDO');
    } else {
      setIsScanning(true);
      setScannerMode('physical'); // Iniciar en modo físico por defecto
      setPhysicalScannerStatus('waiting');
      addDebugInfo('🚀 Escáner INICIADO en modo físico');
    }
  };
  
  // Escaneo manual
  const handleManualInput = () => {
    if (manualInputRef.current?.value) {
      const code = manualInputRef.current.value.trim();
      if (code) {
        addDebugInfo(`✍️ Entrada manual: "${code}"`);
        setLastScanned(code);
        playSuccessSound(); // 🔊 Sonido también para entrada manual
        onScan(code);
        manualInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white shadow-sm p-4 ${className}`}>
<div className="flex justify-between items-center mb-2"> {/* Cambiar de mb-4 a mb-2 */}
  <h3 className="text-lg font-medium text-gray-800 flex items-center">
    <Box className="mr-2 h-5 w-5 text-[#9c7561]" />
    Escáner de productos
    {soundEnabled && <Volume2 className="ml-2 h-4 w-4 text-green-600" />}
  </h3>
        
        <div className="flex items-center gap-2">
          {/* 🆕 Toggle de sonido */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg ${
              soundEnabled 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={toggleScanner}
            className={`p-2 rounded-lg ${
              isScanning 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-[#311716] text-white hover:bg-[#462625]'
            }`}
            aria-label={isScanning ? 'Detener' : 'Iniciar'} 
          >
            {isScanning ? (
              <Slash className="h-5 w-5" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Selector de modo de escáner */}
      {isScanning && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Modo de escáner:</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setScannerMode('physical');
                  setIsCameraOn(false);
                  setIsTestMode(false);
                  if (scannerRef.current) scannerRef.current.reset();
                  addDebugInfo('🔄 Cambiado a modo FÍSICO');
                }}
                className={`px-3 py-1 text-xs rounded ${
                  scannerMode === 'physical' 
                    ? 'bg-[#311716] text-white' 
                    : 'bg-white text-gray-600'
                }`}
              >
                <Scan className="h-3 w-3 inline mr-1" />
                Pistola USB
              </button>
              <button
                onClick={toggleCamera}
                className={`px-3 py-1 text-xs rounded ${
                  scannerMode === 'camera' 
                    ? 'bg-[#311716] text-white' 
                    : 'bg-white text-gray-600'
                }`}
              >
                <Camera className="h-3 w-3 inline mr-1" />
                Cámara
              </button>
            </div>
          </div>

          {/* Estado del escáner físico */}
          {scannerMode === 'physical' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Estado:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  physicalScannerStatus === 'waiting' ? 'bg-blue-400' :
                  physicalScannerStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
                  physicalScannerStatus === 'active' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className={`${
                  physicalScannerStatus === 'waiting' ? 'text-blue-700' :
                  physicalScannerStatus === 'testing' ? 'text-yellow-700' :
                  physicalScannerStatus === 'active' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {physicalScannerStatus === 'waiting' ? 'Esperando escáner...' :
                   physicalScannerStatus === 'testing' ? 'MODO TEST ACTIVO' :
                   physicalScannerStatus === 'active' ? 'Escáner activo' : 'Error en lectura'}
                </span>
                {scannerBuffer && (
                  <span className="ml-2 text-gray-500 font-mono text-xs bg-white px-1 rounded">
                    "{scannerBuffer}"
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {isLoading ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Solicitando acceso a la cámara...</p>
        </div>
      ) : isScanning ? (
        <>
          {scannerMode === 'camera' && isCameraOn ? (
            <div className="space-y-3">
              {/* Selección de cámara */}
              {cameraDevices.length > 1 && hasPermission && (
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      if (scannerRef.current && videoRef.current) {
                        scannerRef.current.reset();
                        scannerRef.current.decodeFromVideoDevice(
                          e.target.value,
                          videoRef.current,
                          (result) => {
                            if (result) {
                              const code = result.getText();
                              setLastScanned(code);
                              playSuccessSound();
                              onScan(code);
                            }
                          }
                        );
                      }
                    }}
                    className="text-sm p-1 border border-gray-300 rounded flex-grow"
                  >
                    {cameraDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Cámara ${device.deviceId.slice(0, 4)}`}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      if (scannerRef.current && videoRef.current && selectedDeviceId) {
                        scannerRef.current.reset();
                        scannerRef.current.decodeFromVideoDevice(
                          selectedDeviceId,
                          videoRef.current,
                          (result) => {
                            if (result) {
                              const code = result.getText();
                              setLastScanned(code);
                              playSuccessSound();
                              onScan(code);
                            }
                          }
                        );
                      }
                    }}
                    className="p-1 rounded bg-gray-100"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            
              {/* Vista de la cámara */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {permissionDenied ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <div className="text-center p-4">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm mb-2">Permiso denegado para la cámara</p>
                      <div className="mt-2 text-xs max-w-xs mx-auto">
                        {isChrome() ? (
                          <div>
                            <p className="font-bold text-yellow-300 mb-1">Para Chrome:</p>
                            <ol className="text-left text-gray-200 pl-4 space-y-1">
                              <li>1. Haz clic en el icono 🔒 en la barra de direcciones</li>
                              <li>2. Haz clic en "Permisos del sitio"</li>
                              <li>3. Cambia "Cámara" a "Permitir"</li>
                              <li>4. Recarga la página</li>
                            </ol>
                          </div>
                        ) : (
                          <p>Debes permitir el acceso a la cámara en la configuración de tu navegador</p>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setPermissionDenied(false);
                          requestCameraPermission();
                        }}
                        className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                      >
                        Intentar nuevamente
                      </button>
                    </div>
                  </div>
                ) : cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <div className="text-center p-4">
                      <QrCode className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                      <button 
                        onClick={requestCameraPermission}
                        className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain"
                      autoPlay
                      playsInline
                      muted
                    ></video>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2/3 h-1/2 border-2 border-[#eeb077] border-dashed opacity-70"></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Vista mejorada para escáner físico
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col items-center justify-center p-4">
                <div className="flex items-center mb-4">
                  <Scan className={`h-12 w-12 mr-3 ${
                    physicalScannerStatus === 'waiting' ? 'text-blue-500' :
                    physicalScannerStatus === 'testing' ? 'text-yellow-500 animate-pulse' :
                    physicalScannerStatus === 'active' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <div>
                    <p className="text-gray-700 font-medium">
                      {isTestMode ? 'MODO TEST ACTIVO' : 'Escáner físico USB'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {physicalScannerStatus === 'waiting' ? 'Listo para escanear...' :
                       physicalScannerStatus === 'testing' ? 'Esperando código de prueba...' :
                       physicalScannerStatus === 'active' ? 'Procesando código...' : 'Error en la lectura'}
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-md space-y-3">
                  {/* Indicador visual del buffer */}
                  {scannerBuffer && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs text-blue-700 mb-1">Código detectado:</p>
                      <p className="font-mono text-sm text-blue-900 break-all">{scannerBuffer}</p>
                    </div>
                  )}

                  {/* 🆕 Contador para modo test */}
                  {isTestMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                      <p className="text-sm text-yellow-700 font-medium">
                        🧪 MODO TEST ACTIVO
                      </p>
                      <p className="text-xs text-yellow-600">
                        Escanee cualquier código para probar la conexión
                      </p>
                    </div>
                  )}

                  {/* Botones de control */}
                  <div className="flex gap-2 justify-center">
                    {!isTestMode ? (
                      <>
                        <button
                          onClick={testPhysicalScanner}
                          className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center"
                        >
                          <AlertTriangle className="h-4 w-4 mr-1"/>
                          Test Escáner
                        </button>
                        <button
                          onClick={toggleCamera}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center"
                        >
                          <Camera className="h-4 w-4 mr-1"/>
                          Usar Cámara
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={finishTest}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center"
                      >
                        <Slash className="h-4 w-4 mr-1"/>
                        Finalizar Test
                      </button>
                    )}
                  </div>

                  {/* Instrucciones */}
                  <div className="text-xs text-gray-600 text-center space-y-1">
                    {!isTestMode ? (
                      <>
                        <p>• Apunte el escáner al código de barras</p>
                        <p>• Presione el gatillo para escanear</p>
                        <p>• El código aparecerá automáticamente</p>
                        <p>• Use "Test Escáner" si no funciona</p>
                      </>
                    ) : (
                      <>
                        <p>• El test está ACTIVO por 10 segundos</p>
                        <p>• Escanee cualquier código ahora</p>
                        <p>• Verá el resultado en el panel de debug</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Entrada manual */}
          <div className="mt-4 flex gap-2">
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Ingresar código manualmente"
              className="flex-grow p-2 border border-gray-300 rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleManualInput()}
            />
            <button
              onClick={handleManualInput}
              className="px-3 py-2 bg-[#9c7561] text-white rounded-lg hover:bg-[#8a6550]"
            >
              Buscar
            </button>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Escáner inactivo</p>
          <p className="text-sm text-gray-500 mt-1">
            Presione el botón para iniciar el escáner
          </p>
          <button
            onClick={toggleScanner}
            className="mt-4 px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625]"
          >
            Iniciar escáner
          </button>
        </div>
      )}
      
      {/* Último código escaneado */}
      {lastScanned && (
        <div className="mt-4 bg-green-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-green-700 font-medium">Último código escaneado:</span>
            <span className="bg-white px-2 py-1 rounded border border-green-200 font-mono text-sm">
              {lastScanned}
            </span>
          </div>
        </div>
      )}

      {/* Panel de debug mejorado */}
      {debugInfo.length > 0 && (
        <div className="mt-4 bg-gray-800 text-green-400 rounded-lg p-3 font-mono text-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-300 font-bold">🔍 DEBUG CONSOLE</span>
            <button
              onClick={() => setDebugInfo([])}
              className="text-green-400 hover:text-green-200 text-xs bg-gray-700 px-2 py-1 rounded"
            >
              Limpiar
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {debugInfo.map((info, index) => (
              <div key={index} className="text-green-400">
                {info}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Información de ayuda específica para 3nstar */}
      <div className="mt-4 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
        <p className="font-semibold mb-2">💡 Guía de solución de problemas 3nstar USB:</p>
        <div className="ml-2 space-y-1">
          <p><strong>1.</strong> Verifique que el escáner está conectado por USB y encendido</p>
          <p><strong>2.</strong> Asegúrese de que el escáner está configurado para enviar Enter después del código</p>
          <p><strong>3.</strong> Presione "Test Escáner" para verificar la comunicación</p>
          <p><strong>4.</strong> Durante el test, escanee cualquier código y vea el debug console</p>
          <p><strong>5.</strong> Si ve actividad en el debug pero no funciona, el escáner necesita configuración</p>
          <p><strong>6.</strong> No debe estar escribiendo en ningún campo de texto al escanear</p>
          <p><strong>7.</strong> El sonido {soundEnabled ? '🔊 está activado' : '🔇 está desactivado'}</p>
        </div>
      </div>
    </div>
  );
}