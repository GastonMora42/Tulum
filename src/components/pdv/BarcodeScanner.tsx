// src/components/pdv/BarcodeScanner.tsx - VERSIÓN CORREGIDA CON SONIDOS
'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, QrCode, Box, Slash, RefreshCw, Zap, ShieldAlert, Volume2, VolumeX, Loader } from 'lucide-react';

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
  // Estados existentes
  const [isScanning, setIsScanning] = useState(autoStart);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // NUEVOS: Estados para sonido y pistola scanner
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Referencias
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  
  // NUEVOS: Referencias para audio y pistola scanner
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scanBufferRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const keySequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NUEVO: Inicializar audio al montar componente
  useEffect(() => {
    // Crear elemento de audio para el sonido de beep
    audioRef.current = new Audio();
    // Usar un sonido beep simple generado por código
    audioRef.current.src = createBeepSound();
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // NUEVA: Función para crear sonido beep
  const createBeepSound = (): string => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frecuencia del beep
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Crear un blob de audio y retornar URL
      const mediaRecorder = new MediaRecorder(audioContext.createMediaStreamDestination().stream);
      return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOAgSaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+bzu2EbBzaG0O/XeSsFJHC98NyKOA==';
    } catch (error) {
      console.warn('No se pudo crear sonido beep:', error);
      return '';
    }
  };

  // NUEVA: Función para reproducir sonido
  const playBeepSound = () => {
    if (soundEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.warn('No se pudo reproducir sonido:', e));
      } catch (error) {
        console.warn('Error reproduciendo sonido:', error);
      }
    }
  };

  // CORREGIDA: Función para manejar escaneo exitoso
  const handleSuccessfulScan = async (code: string) => {
    if (isProcessing) return; // Evitar doble procesamiento
    
    setIsProcessing(true);
    setLastScanned(code);
    
    try {
      // Reproducir sonido de éxito
      playBeepSound();
      
      // Llamar callback
      await onScan(code);
      
      console.log(`[SCANNER] Código escaneado exitosamente: ${code}`);
    } catch (error) {
      console.error(`[SCANNER] Error procesando código ${code}:`, error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Error procesando código'));
      }
    } finally {
      // Pequeña pausa antes de permitir próximo escaneo
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  // Inicializar escáner (sin cambios)
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE
    ]);
    
    scannerRef.current = new BrowserMultiFormatReader(hints);
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

  // CORREGIDA: Escuchar entrada de pistola scanner con mejor detección
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo procesar si no estamos en un input de texto
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Solo si el scanner está activo pero no la cámara (para pistola)
      if (!isScanning || isCameraOn) {
        return;
      }
      
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastScanTimeRef.current;
      
      // Si es Enter y tenemos un buffer válido
      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (scanBufferRef.current.length >= 3) { // Mínimo 3 caracteres para ser válido
          console.log(`[PISTOLA-SCANNER] Código detectado: ${scanBufferRef.current}`);
          handleSuccessfulScan(scanBufferRef.current);
        }
        
        // Limpiar buffer
        scanBufferRef.current = '';
        return;
      }
      
      // Si ha pasado mucho tiempo desde la última tecla, reiniciar buffer
      if (timeSinceLastKey > 100) { // 100ms timeout entre teclas
        scanBufferRef.current = '';
      }
      
      // Solo agregar caracteres válidos para códigos
      if (e.key.length === 1 || e.key === '-') {
        scanBufferRef.current += e.key;
        lastScanTimeRef.current = currentTime;
        
        // Limpiar buffer automáticamente después de cierto tiempo
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current);
        }
        
        keySequenceTimeoutRef.current = setTimeout(() => {
          if (scanBufferRef.current.length > 0) {
            console.log(`[PISTOLA-SCANNER] Buffer timeout, descartando: ${scanBufferRef.current}`);
            scanBufferRef.current = '';
          }
        }, 500); // 500ms timeout para secuencia completa
      }
    };
    
    if (isScanning && !isCameraOn) {
      document.addEventListener('keydown', handleKeyPress);
      console.log('[PISTOLA-SCANNER] Listener activado para pistola scanner');
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (keySequenceTimeoutRef.current) {
        clearTimeout(keySequenceTimeoutRef.current);
      }
    };
  }, [isScanning, isCameraOn]);

  // CORREGIDA: Función para solicitar permisos de cámara
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setPermissionDenied(false);
      setCameraError(null);
      
      console.log("[CAMARA-SCANNER] Solicitando permisos de cámara...");
      
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
            if (result && !isProcessing) {
              const code = result.getText();
              console.log(`[CAMARA-SCANNER] Código detectado: ${code}`);
              handleSuccessfulScan(code);
            }
          }
        );
      }
      
    } catch (error) {
      console.error('[CAMARA-SCANNER] Error:', error);
      
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

  // Resto de las funciones sin cambios
  const toggleCamera = () => {
    if (isCameraOn) {
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      setIsCameraOn(true);
      requestCameraPermission();
    }
  };
  
  const toggleScanner = () => {
    if (isScanning) {
      setIsScanning(false);
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
      // Limpiar buffer de pistola
      scanBufferRef.current = '';
    } else {
      setIsScanning(true);
    }
  };
  
  const handleManualInput = async () => {
    if (manualInputRef.current?.value) {
      const code = manualInputRef.current.value.trim();
      if (code) {
        await handleSuccessfulScan(code);
        manualInputRef.current.value = '';
      }
    }
  };

  const isChrome = () => {
    return navigator.userAgent.indexOf("Chrome") !== -1;
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white shadow-sm p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          <Box className="mr-2 h-5 w-5 text-[#9c7561]" />
          Escáner de productos
        </h3>
        
        <div className="flex items-center gap-2">
          {/* NUEVO: Control de sonido */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg ${
              soundEnabled 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
          
          {isScanning && (
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-lg ${
                isCameraOn 
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              aria-label={isCameraOn ? 'Usar pistola scanner' : 'Usar cámara'}
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Indicator de procesamiento */}
      {isProcessing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex items-center text-blue-800">
            <Loader className="animate-spin h-4 w-4 mr-2" />
            <span className="text-sm">Procesando código...</span>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Solicitando acceso a la cámara...</p>
        </div>
      ) : isScanning ? (
        <>
          {isCameraOn ? (
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
                            if (result && !isProcessing) {
                              const code = result.getText();
                              handleSuccessfulScan(code);
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
                            if (result && !isProcessing) {
                              const code = result.getText();
                              handleSuccessfulScan(code);
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
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="flex flex-col items-center justify-center p-4">
                <Box className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-600">
                  {scanBufferRef.current.length > 0 
                    ? `Leyendo código... (${scanBufferRef.current.length} caracteres)`
                    : 'Esperando pistola scanner...'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  O usa la cámara de tu dispositivo para escanear
                </p>
                <button
                  onClick={toggleCamera}
                  className="mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Camera className="inline h-4 w-4 mr-1"/> Activar cámara
                </button>
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
      
      {/* Información de ayuda */}
      <div className="mt-4 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
        <p className="font-semibold mb-1">💡 Consejos de uso:</p>
        <div className="ml-2 space-y-1">
          <p>• <strong>Pistola scanner:</strong> Conecte por USB y escanee directamente</p>
          <p>• <strong>Cámara:</strong> Apunte hacia el código de barras</p>
          <p>• <strong>Sonido:</strong> Un beep confirma que se agregó al carrito</p>
          <p>• Si hay problemas, use la entrada manual</p>
        </div>
      </div>
    </div>
  );
}