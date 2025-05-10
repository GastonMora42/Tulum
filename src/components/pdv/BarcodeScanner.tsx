// src/components/pdv/BarcodeScanner.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, QrScanner, Box, Slash, RefreshCw, Zap } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

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
  const [isScanning, setIsScanning] = useState(autoStart);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [usedCamera, setUsedCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    
    // Enumerar cámaras disponibles
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        
        // Seleccionar cámara predeterminada (preferimos cámaras traseras)
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('trasera') ||
          device.label.toLowerCase().includes('rear')
        );
        
        setSelectedDeviceId(backCamera?.deviceId || (videoDevices.length > 0 ? videoDevices[0].deviceId : null));
      })
      .catch(err => {
        console.error('Error enumerando dispositivos:', err);
        setCameraError('No se pudieron detectar cámaras');
      });
      
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);
  
  // Iniciar/detener escáner de cámara
  useEffect(() => {
    if (!isScanning || !isCameraOn || !videoRef.current || !scannerRef.current || !selectedDeviceId) {
      return;
    }
    
    const startScanner = async () => {
      try {
        await scannerRef.current?.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result) => {
            if (result) {
              const code = result.getText();
              setLastScanned(code);
              onScan(code);
              
              // Opcionalmente detener el escáner después de una lectura exitosa
              // Aquí lo mantenemos activo para escaneos continuos
            }
          }
        );
        setCameraError(null);
      } catch (err) {
        console.error('Error iniciando escáner:', err);
        setCameraError(err instanceof Error ? err.message : 'Error al iniciar la cámara');
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    };
    
    startScanner();
    
    return () => {
      scannerRef.current?.reset();
    };
  }, [isScanning, isCameraOn, selectedDeviceId, onScan, onError]);
  
  // Escuchar entrada de escáner físico (entrada rápida de teclado)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    const TIMEOUT = 50; // Tiempo entre teclas en ms (los escáneres suelen ser muy rápidos)
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo procesar si no estamos en un input de texto (excepto nuestro input oculto)
      if (
        document.activeElement instanceof HTMLInputElement && 
        document.activeElement !== keyboardInputRef.current
      ) {
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
      // Enfocar el input oculto para capturar entrada
      keyboardInputRef.current?.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isScanning, isCameraOn, onScan]);
  
  // Cambiar entre modos de escáner
  const toggleCamera = () => {
    if (isCameraOn) {
      setIsCameraOn(false);
      scannerRef.current?.reset();
    } else {
      setIsCameraOn(true);
      setUsedCamera(true);
    }
  };
  
  // Iniciar/detener escáner
  const toggleScanner = () => {
    if (isScanning) {
      setIsScanning(false);
      setIsCameraOn(false);
      scannerRef.current?.reset();
    } else {
      setIsScanning(true);
      // Si ya se ha usado la cámara antes, reactivarla
      if (usedCamera) {
        setIsCameraOn(true);
      }
    }
  };
  
  // Cambiar dispositivo de cámara
  const changeCamera = (deviceId: string) => {
    scannerRef.current?.reset();
    setSelectedDeviceId(deviceId);
  };
  
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
    <div ref={containerRef} className={`border border-gray-200 rounded-lg bg-white p-4 ${className}`}>
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
      
      {isScanning ? (
        <>
          {isCameraOn ? (
            <div className="space-y-3">
              {/* Selector de cámara */}
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
                    onClick={() => scannerRef.current?.reset()}
                    className="p-1 rounded bg-gray-100"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            
              {/* Vista previa de la cámara */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                    <div className="text-center p-4">
                      <QrScanner className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                      <button 
                        onClick={() => {
                          scannerRef.current?.reset();
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
                    <div className="absolute inset-0 border-2 border-[#eeb077] border-dashed pointer-events-none opacity-60"></div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="flex flex-col items-center justify-center p-4">
                <Box className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-600">Esperando escaneo...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Use un escáner de códigos de barras o ingrese manualmente abajo
                </p>
              </div>
              
              <input 
                ref={keyboardInputRef}
                type="text" 
                className="opacity-0 position-absolute h-0 w-0"
                aria-hidden="true"
              />
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
          <QrScanner className="h-12 w-12 text-gray-400 mx-auto mb-3" />
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
    </div>
  );
}