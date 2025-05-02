// src/components/pdv/ResponsiveLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export function ResponsiveLayout({ sidebar, content }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkSize();
    
    // Set up listener
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return (
    <div className="h-full flex flex-col md:flex-row">
      {isMobile && (
        <div className="bg-white p-2 border-b flex justify-between items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-medium">Punto de Venta</span>
        </div>
      )}
      
      {/* Sidebar - fixed on mobile, always visible on desktop */}
      <div className={`
        ${isMobile ? 
          `fixed inset-0 z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}` : 
          'w-1/3 max-w-md'
        }
      `}>
        {isMobile && sidebarOpen && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
        
        <div className={`
          ${isMobile ? 'w-3/4 h-full bg-white relative z-10' : 'h-full'}
        `}>
          {sidebar}
        </div>
      </div>
      
      {/* Main content */}
      <div className={`${isMobile ? 'w-full' : 'flex-1'} overflow-auto`}>
        {content}
      </div>
    </div>
  );
}