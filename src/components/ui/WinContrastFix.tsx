// src/components/ui/WinContrastFix.tsx
'use client';

import { useEffect, ReactNode } from 'react';

interface WinContrastFixProps {
  children: ReactNode;
}

export function WinContrastFix({ children }: WinContrastFixProps) {
  useEffect(() => {
    // Detectar si estamos en Windows
    const isWindows = navigator.userAgent.indexOf('Windows') !== -1;
    
    if (isWindows) {
      // Agregar clase a nivel de documento para aplicar correcciones específicas
      document.documentElement.classList.add('windows-platform');
    }
  }, []);
  
  return <>{children}</>;
}