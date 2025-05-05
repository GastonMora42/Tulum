// src/components/pdv/BarcodeScanner.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

export function BarcodeScanner({ onScan }: { onScan: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    
    // Iniciar escáner
    if (videoRef.current) {
      codeReader.decodeFromVideoDevice(
        null, 
        videoRef.current, 
        (result: { getText: () => string; }) => {
          if (result) {
            onScan(result.getText());
          }
        }
      );
    }
    
    return () => {
      codeReader.reset();
    };
  }, [onScan]);
  
  return (
    <div className="relative">
      <video ref={videoRef} className="w-full h-auto"></video>
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
        </div>
      )}
    </div>
  );
}