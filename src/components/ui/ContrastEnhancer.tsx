// src/components/ui/ContrastEnhancer.tsx
'use client';

import { ReactNode, useEffect } from 'react';

interface ContrastEnhancerProps {
  children: ReactNode;
  className?: string;
}

export function ContrastEnhancer({ children, className = '' }: ContrastEnhancerProps) {
  useEffect(() => {
    const isWindows = navigator.userAgent.indexOf('Windows') !== -1;
    if (!isWindows) return;
    
    // Obtener contenedor
    const container = document.querySelector('.contrast-enhanced-container');
    if (!container) return;
    
    // Mejorar elementos específicos
    container.querySelectorAll('th').forEach(el => {
      const element = el as HTMLElement;
      element.style.backgroundColor = '#e6e2df';
      element.style.color = '#000000';
      element.style.fontWeight = '600';
    });
    
    container.querySelectorAll('td').forEach(el => {
      const element = el as HTMLElement;
      element.style.color = '#000000';
    });
    
    container.querySelectorAll('input, select, textarea').forEach(el => {
      const element = el as HTMLElement;
      element.style.borderColor = 'rgba(0, 0, 0, 0.3)';
      element.style.color = '#000000';
    });
    
    container.querySelectorAll('h1, h2, h3, label, span:not(.text-white)').forEach(el => {
      const element = el as HTMLElement;
      // Solo cambiar si el color no es específico
      const currentColor = window.getComputedStyle(element).color;
      if (currentColor === 'rgba(0, 0, 0, 0)' || currentColor === 'transparent') {
        element.style.color = '#000000';
      }
    });

    // Mejorar textos en general
    container.querySelectorAll('p, div:not(.bg-indigo-600):not(.bg-red-600):not(.bg-green-600):not(.bg-yellow-600):not(.bg-blue-600)').forEach(el => {
      const element = el as HTMLElement;
      const currentColor = window.getComputedStyle(element).color;
      // Solo cambiar colores grises o transparentes
      if (currentColor.includes('rgb(75,') || currentColor.includes('rgb(156,') || 
          currentColor.includes('rgb(107,') || currentColor === 'rgba(0, 0, 0, 0)' || 
          currentColor === 'transparent') {
        element.style.color = '#000000';
      }
    });

    // Mejorar botones y enlaces
    container.querySelectorAll('button:not(.bg-indigo-600):not(.bg-red-600):not(.text-white), a:not(.text-white)').forEach(el => {
      const element = el as HTMLElement;
      const bgColor = window.getComputedStyle(element).backgroundColor;
      // No modificar botones con fondos de color específicos
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent' || bgColor.includes('rgb(255,')) {
        element.style.color = '#000000';
      }
    });
  }, []);
  
  return (
    <div className={`contrast-enhanced-container ${className}`}>
      {children}
    </div>
  );
}