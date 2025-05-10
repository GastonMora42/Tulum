// src/components/pdv/BarcodeScanner.tsx - Versión mejorada
'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, Exception, Result } from '@zxing/library';
import { Camera, XCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function BarcodeScanner({ onScan, onClose, isModal = false }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  // Inicializar escáner
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    
    // Cargar dispositivos de video disponibles
    const loadDevices = async () => {
      try {
        // Solicitar permiso para usar la cámara
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const devices = await codeReader.listVideoInputDevices();
        setDeviceList(devices);
        
        if (devices.length > 0) {
          // Preferir cámara trasera si existe (por lo general mejor para códigos de barras)
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera')
          );
          
          setSelectedDeviceId(backCamera ? backCamera.deviceId : devices[0].deviceId);
          setIsInitialized(true);
        } else {
          setError('No se encontraron cámaras disponibles');
        }
      } catch (err) {
        console.error('Error al inicializar escáner:', err);
        setError('No se pudo acceder a la cámara. Verifique los permisos.');
      }
    };
    
    loadDevices();
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);
  
  // Iniciar escaneo cuando se selecciona dispositivo
  useEffect(() => {
    if (isInitialized && selectedDeviceId && videoRef.current) {
      startScanning();
    }
  }, [isInitialized, selectedDeviceId]);
  
  // Iniciar escaneo
  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current || !selectedDeviceId) return;
    
    try {
      setIsScanning(true);
      setError(null);
      
      // Comenzar a decodificar desde el dispositivo seleccionado
      codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId, 
        videoRef.current, 
        (result: Result | null, error?: Error) => {
          if (result) {
            // Agregar animación de éxito
            drawSuccessOverlay();
            
            // Pausa breve para mostrar animación de éxito
            setTimeout(() => {
              onScan(result.getText());
              
              // Si es modal, cerrar después de escanear
              if (isModal && onClose) {
                onClose();
              } else {
                // Si no es modal, reiniciar escaneo después de una pausa
                setTimeout(() => {
                  startScanning();
                }, 1500);
              }
            }, 500);
          }
          
          if (error && !(error instanceof Exception)) {
            console.error('Error durante escaneo:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error al iniciar escaneo:', err);
      setError('Error al iniciar el escaneo. Intente nuevamente.');
      setIsScanning(false);
    }
  };
  
  // Dibujar overlay de éxito
  const drawSuccessOverlay = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Dibujar rectángulo verde semi-transparente
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar texto "Escaneado"
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¡Código escaneado!', canvas.width / 2, canvas.height / 2);
    
    // Limpiar después de 1 segundo
    setTimeout(() => {
      if (canvasRef.current && ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, 1000);
  };
  
  // Cambiar dispositivo
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDeviceId(deviceId);
    
    // Detener escaneo actual
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    // Reiniciar con nuevo dispositivo
    setTimeout(startScanning, 100);
  };
  
  return (
    <div className={`barcode-scanner ${isModal ? 'fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center' : 'relative'}`}>
      <div className={`relative ${isModal ? 'max-w-md w-full bg-white rounded-lg overflow-hidden' : 'w-full'}`}>
        {isModal && (
          <div className="p-3 bg-[#311716] text-white flex justify-between items-center">
            <h3 className="font-medium">Escanear código de barras</h3>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}
        
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
            {error}
          </div>
        )}
        
        <div className={`relative ${isModal ? 'p-2' : ''}`}>
          <div className="aspect-video relative bg-black">
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain" 
              muted
              playsInline
            />
            <canvas 
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            
            {/* Guía de escaneo */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-[#eeb077] w-[80%] h-24 opacity-70">
                <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-[#eeb077]"></div>
                <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-[#eeb077]"></div>
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[#eeb077]"></div>
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#eeb077]"></div>
              </div>
            </div>
          </div>
          
          {deviceList.length > 1 && (
            <div className="mt-2">
              <select
                value={selectedDeviceId || ''}
                onChange={handleDeviceChange}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {deviceList.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${device.deviceId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mt-2 text-center text-sm text-gray-500">
            {isScanning ? 'Apunte la cámara al código de barras...' : 'Iniciando cámara...'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para botón de activación de escáner
export function BarcodeScannerButton({ onScan }: { onScan: (barcode: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center text-gray-700"
      >
        <Camera size={18} className="mr-2" />
        Escanear código
      </button>
      
      {isOpen && (
        <BarcodeScanner 
          onScan={(code) => {
            onScan(code);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
          isModal={true}
        />
      )}
    </>
  );
}