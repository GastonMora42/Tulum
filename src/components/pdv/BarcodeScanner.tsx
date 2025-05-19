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
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Referencias
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  
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
      BarcodeFormat.QR_CODE
    ]);
    
    scannerRef.current = new BrowserMultiFormatReader(hints);
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
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
      
      // Solicitud de permisos que funciona mejor en Chrome
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // Si llegamos aquí, tenemos permiso
      setHasPermission(true);
      
      // Enumerar dispositivos después de obtener permisos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No se detectaron cámaras');
      }
      
      // Preferir cámara trasera
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('trasera') ||
        device.label.toLowerCase().includes('rear')
      );
      
      setCameraDevices(videoDevices);
      setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      
      // Detener el stream inicial
      stream.getTracks().forEach(track => track.stop());
      
      // Activar la cámara
      if (videoRef.current && scannerRef.current) {
        const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
        
        // Iniciar escaner con la cámara seleccionada
        await scannerRef.current.decodeFromVideoDevice(
          deviceId,
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
      
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      
      // Identificar tipo de error para mostrar mensaje adecuado
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
  
  // Toggle para la cámara (iniciar/detener)
  const toggleCamera = () => {
    if (isCameraOn) {
      // Si la cámara está activa, detenerla
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      // Si la cámara está inactiva, activarla y solicitar permisos
      setIsCameraOn(true);
      requestCameraPermission();
    }
  };
  
  // Toggle para el escáner principal
  const toggleScanner = () => {
    if (isScanning) {
      setIsScanning(false);
      setIsCameraOn(false);
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    } else {
      setIsScanning(true);
    }
  };
  
  // Escuchar entrada de escáner físico
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
      document.addEventListener('keydown', handleKeyPress);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isScanning, isCameraOn, onScan]);
  
  // Escaneo manual
  const handleManualInput = () => {
    if (manualInputRef.current?.value) {
      const code = manualInputRef.current.value.trim();
      if (code) {
        setLastScanned(code);
        onScan(code);
        manualInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white shadow-sm p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          <Box className="mr-2 h-5 w-5 text-[#9c7561]" />
          Escáner de productos
        </h3>
        
        <div className="flex items-center gap-2">
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
              aria-label={isCameraOn ? 'Usar escáner físico' : 'Usar cámara'}
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Solicitando acceso a la cámara...</p>
        </div>
      ) : isScanning ? (
        <>
          {isCameraOn ? (
            <div className="space-y-3">
              {/* Selección de cámara (cuando hay múltiples) */}
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
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="flex flex-col items-center justify-center p-4">
                <Box className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-600">Esperando escáner de código de barras físico...</p>
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
      {isChrome() && (
        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
          <p className="font-semibold mb-1">¿Problemas con la cámara en Chrome?</p>
          <div className="ml-2">
            <p>• Asegúrate de dar permisos cuando Chrome lo solicite</p>
            <p>• Si bloqueaste la cámara anteriormente: haz clic en el icono 🔒 en la barra de direcciones, luego en "Permisos del sitio" y cambia la configuración de la cámara a "Permitir"</p>
            <p>• Después de cambiar los permisos, recarga la página</p>
          </div>
        </div>
      )}
    </div>
  );
}