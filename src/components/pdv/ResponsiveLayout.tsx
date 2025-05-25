// src/components/pdv/ResponsiveLayout.tsx - Versión mejorada
'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export function ResponsiveLayout({ sidebar, content }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const { items } = useCartStore();
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar carrito al hacer clic fuera (solo en móvil)
  useEffect(() => {
    if (!isMobile || !showCart) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const cartElement = document.getElementById('mobile-cart');
      const buttonElement = document.getElementById('cart-toggle-button');
      
      if (cartElement && buttonElement && 
          !cartElement.contains(event.target as Node) && 
          !buttonElement.contains(event.target as Node)) {
        setShowCart(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, showCart]);

  if (isMobile) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col relative">
        {/* Contenido principal */}
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
        
        {/* Botón flotante del carrito */}
        <button
          id="cart-toggle-button"
          onClick={() => setShowCart(!showCart)}
          className={`fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-xl transition-all duration-300 ${
            showCart 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gradient-to-r from-[#311716] to-[#462625] hover:from-[#462625] hover:to-[#311716]'
          }`}
        >
          {showCart ? (
            <X className="h-6 w-6 text-white mx-auto" />
          ) : (
            <>
              <ShoppingCart className="h-6 w-6 text-white mx-auto" />
              {items.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-[#eeb077] text-[#311716] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                  {items.length}
                </div>
              )}
            </>
          )}
        </button>
        
        {/* Overlay del carrito en móvil */}
        {showCart && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-30" />
            
            {/* Panel del carrito */}
            <div 
              id="mobile-cart"
              className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] transform transition-transform duration-300"
              style={{
                transform: showCart ? 'translateY(0)' : 'translateY(100%)'
              }}
            >
              {/* Handle para arrastrar */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              <div className="h-full">
                {sidebar}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Versión de escritorio/tablet
  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Contenido principal */}
      <div className="flex-1 p-6">
        {content}
      </div>
      
      {/* Sidebar del carrito */}
      <div className="w-96 p-6">
        {sidebar}
      </div>
    </div>
  );
}