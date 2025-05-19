'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, QrCode, Box, Slash, RefreshCw, Zap, ShieldAlert } from 'lucide-react';

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
  const [debugInfo, setDebugInfo] = useState<string>("No se ha iniciado");
  
  // Referencias
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Actualizar información de debug
  const updateDebug = (message: string) => {
    console.log(`[BarcodeScanner] ${message}`);
    setDebugInfo(prev => `${message}\n${prev}`.slice(0, 500));
  };
  
  // Inicializar escáner
  useEffect(() => {
    updateDebug("Inicializando componente");
    
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
    updateDebug("Scanner ZXing inicializado");
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
        updateDebug("Scanner liberado");
      }
    };
  }, []);
  
  // Verificar y enumerar cámaras disponibles
  useEffect(() => {
    if (!isScanning) return;
    
    const checkCameras = async () => {
      try {
        updateDebug("Verificando cámaras disponibles...");
        setIsLoading(true);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          updateDebug("❌ API MediaDevices no disponible");
          setCameraError("Este navegador no soporta acceso a la cámara");
          setHasPermission(false);
          return;
        }
        
        // Enumerar dispositivos disponibles
        const devices = await navigator.mediaDevices.enumerateDevices();
        updateDebug(`Dispositivos encontrados: ${devices.length}`);
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        updateDebug(`Cámaras encontradas: ${videoDevices.length}`);
        
        if (videoDevices.length === 0) {
          updateDebug("❌ No se encontraron cámaras");
          setCameraError('No se detectaron cámaras en este dispositivo');
          setHasPermission(false);
          return;
        }
        
        setCameraDevices(videoDevices);
        
        // Verificar si tenemos etiquetas (indica que ya tenemos permiso)
        const hasLabels = videoDevices.some(device => !!device.label);
        updateDebug(`Cámaras con etiquetas: ${hasLabels ? 'Sí' : 'No'}`);
        
        if (hasLabels) {
          setHasPermission(true);
          
          // Seleccionar cámara preferida
          const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera') ||
            device.label.toLowerCase().includes('rear')
          );
          
          setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
          updateDebug(`Cámara seleccionada: ${backCamera?.label || videoDevices[0].label || 'Sin nombre'}`);
        } else {
          // No tenemos permisos aún
          updateDebug("Se necesita solicitar permisos de cámara");
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error al verificar cámaras:', error);
        updateDebug(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setCameraError('Error al acceder a las cámaras');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCameras();
  }, [isScanning]);
  
  // Iniciar cámara cuando se activa
  useEffect(() => {
    if (!isScanning || !isCameraOn) return;
    
    const startCamera = async () => {
      try {
        updateDebug("Iniciando cámara...");
        setIsLoading(true);
        
        // Si no tenemos permiso o ID de dispositivo, intentar obtenerlos
        if (!hasPermission || !selectedDeviceId) {
          updateDebug("Solicitando permisos de cámara...");
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
          
          // Obtener nuevamente los dispositivos ahora que tenemos permiso
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          setCameraDevices(videoDevices);
          updateDebug(`Cámaras disponibles después de permiso: ${videoDevices.length}`);
          
          // Seleccionar la primera cámara
          if (videoDevices.length > 0) {
            setSelectedDeviceId(videoDevices[0].deviceId);
            updateDebug(`Cámara seleccionada: ${videoDevices[0].label || 'Sin nombre'}`);
          }
          
          // Liberar stream de prueba
          stream.getTracks().forEach(track => track.stop());
          
          setHasPermission(true);
          setCameraError(null);
        }
        
        updateDebug("✅ Permisos de cámara concedidos");
      } catch (error) {
        console.error('Error al iniciar cámara:', error);
        updateDebug(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setHasPermission(false);
        setCameraError('Error al iniciar la cámara. Verifica los permisos.');
        setIsCameraOn(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    startCamera();
  }, [isScanning, isCameraOn, hasPermission, selectedDeviceId]);
  
  // Iniciar/detener escáner de cámara
  useEffect(() => {
    if (!isScanning || !isCameraOn || !hasPermission || !selectedDeviceId || !videoRef.current || !scannerRef.current) {
      return;
    }
    
    updateDebug("Iniciando escáner de cámara...");
    let isActive = true;
    
    const startDecoding = async () => {
      try {
        await scannerRef.current?.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (!isActive) return;
            
            if (result) {
              const code = result.getText();
              updateDebug(`✅ Código escaneado: ${code}`);
              setLastScanned(code);
              onScan(code);
            }
          }
        );
        
        updateDebug("Escáner de cámara iniciado correctamente");
        setCameraError(null);
      } catch (err) {
        console.error('Error iniciando escáner:', err);
        updateDebug(`❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        setCameraError(err instanceof Error ? err.message : 'Error al iniciar la cámara');
        
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    };
    
    startDecoding();
    
    return () => {
      isActive = false;
      if (scannerRef.current) {
        updateDebug("Deteniendo escáner de cámara");
        scannerRef.current.reset();
      }
    };
  }, [isScanning, isCameraOn, hasPermission, selectedDeviceId, onScan, onError]);
  
  // Escuchar entrada de escáner físico (entrada rápida de teclado)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    const TIMEOUT = 50; // Tiempo entre teclas en ms
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo procesar si no estamos en un input de texto
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      const currentTime = new Date().getTime();
      
      if (currentTime - lastKeyTime > TIMEOUT && buffer.length > 0) {
        // Si ha pasado mucho tiempo, reiniciar buffer
        buffer = '';
      }
      
      // Actualizar tiempo de última tecla
      lastKeyTime = currentTime;
      
      // Enter normalmente marca el final de un escaneo
      if (e.key === 'Enter' && buffer.length > 3) {
        updateDebug(`✅ Código escaneado por escáner físico: ${buffer}`);
        setLastScanned(buffer);
        onScan(buffer);
        buffer = '';
        e.preventDefault();
      } else if (e.key.length === 1 || e.key === '-') {
        // Agregar al buffer si es un carácter o guión
        buffer += e.key;
      }
    };
    
    if (isScanning && !isCameraOn) {
      updateDebug("Escuchando entrada de escáner físico");
      document.addEventListener('keydown', handleKeyPress);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isScanning, isCameraOn, onScan]);
  
  // Cambiar entre modos de escáner
  const toggleCamera = () => {
    if (isCameraOn) {
      updateDebug("Desactivando cámara");
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      updateDebug("Activando cámara");
      setIsCameraOn(true);
    }
  };
  
  // Iniciar/detener escáner
  const toggleScanner = () => {
    if (isScanning) {
      updateDebug("Deteniendo escáner");
      setIsScanning(false);
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      updateDebug("Iniciando escáner");
      setIsScanning(true);
    }
  };
  
  // Cambiar dispositivo de cámara
  const changeCamera = (deviceId: string) => {
    updateDebug(`Cambiando a cámara: ${deviceId}`);
    if (scannerRef.current) {
      scannerRef.current.reset();
    }
    setSelectedDeviceId(deviceId);
  };
  
  // Solicitar permisos de cámara
  const requestCameraPermission = async () => {
    try {
      updateDebug("Solicitando permisos de cámara manualmente");
      setIsLoading(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Obtener dispositivos después de obtener permisos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setCameraDevices(videoDevices);
      updateDebug(`Cámaras disponibles después de permiso: ${videoDevices.length}`);
      
      // Seleccionar la primera cámara
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
        updateDebug(`Cámara seleccionada: ${videoDevices[0].label || 'Sin nombre'}`);
      }
      
      // Liberar stream de prueba
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setCameraError(null);
      
      // Activar la cámara automáticamente después de obtener permisos
      setIsCameraOn(true);
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      updateDebug(`❌ Error de permisos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setHasPermission(false);
      setCameraError('No se pudo obtener acceso a la cámara');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Escaneo manual
  const handleManualInput = () => {
    if (manualInputRef.current?.value) {
      const code = manualInputRef.current.value.trim();
      if (code) {
        updateDebug(`Código ingresado manualmente: ${code}`);
        setLastScanned(code);
        onScan(code);
        manualInputRef.current.value = '';
      }
    }
  };

  return (
    <div ref={containerRef} className={`border border-gray-200 rounded-lg bg-white shadow-sm p-4 ${className}`}>
      {/* Cabecera con controles */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          <Box className="mr-2 h-5 w-5 text-[#9c7561]" />
          Escáner de productos
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Botón principal: Iniciar/Detener */}
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
          
          {/* Botón de cámara (solo visible cuando está escaneando) */}
          {isScanning && (
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-lg ${
                isCameraOn 
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              aria-label={isCameraOn ? 'Usar escáner físico' : 'Usar cámara'}
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Estado actual */}
      {isLoading ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cámara...</p>
        </div>
      ) : isScanning ? (
        <>
          {/* Modo cámara activo */}
          {isCameraOn ? (
            <div className="space-y-3">
              {/* Selector de cámara (si hay múltiples) */}
              {cameraDevices.length > 1 && (
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => changeCamera(e.target.value)}
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
                      if (scannerRef.current) {
                        scannerRef.current.reset();
                        setTimeout(() => {
                          if (scannerRef.current && videoRef.current && selectedDeviceId) {
                            scannerRef.current.decodeFromVideoDevice(
                              selectedDeviceId,
                              videoRef.current,
                              (result) => {
                                if (result) {
                                  const code = result.getText();
                                  setLastScanned(code);
                                  onScan(code);
                                }
                              }
                            );
                          }
                        }, 500);
                      }
                    }}
                    className="p-1 rounded bg-gray-100"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            
              {/* Vista previa de la cámara */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {hasPermission === false ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <div className="text-center p-4">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm mb-2">Se requiere permiso para acceder a la cámara</p>
                      <button 
                        onClick={requestCameraPermission}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                      >
                        Permitir acceso
                      </button>
                    </div>
                  </div>
                ) : cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <div className="text-center p-4">
                      <QrCode className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                      <button 
                        onClick={() => {
                          if (scannerRef.current) {
                            scannerRef.current.reset();
                          }
                          setCameraError(null);
                          setTimeout(() => setIsCameraOn(true), 500);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
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
                <p className="text-gray-600">Esperando escáner de código de barras físico...</p>
                <p className="text-sm text-gray-500 mt-1">
                  O haga clic en el botón <Camera className="inline h-4 w-4"/> para usar la cámara de su dispositivo
                </p>
                <button
                  onClick={toggleCamera}
                  className="mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Camera className="inline h-5 w-5 mr-1"/> Usar cámara
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
      
      {/* Resultado del último escaneo */}
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
      
      {/* Panel de diagnóstico (solo en desarrollo) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <details>
            <summary className="text-sm text-gray-700 cursor-pointer">Diagnóstico</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono whitespace-pre-line h-32 overflow-y-auto">
              {debugInfo}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}