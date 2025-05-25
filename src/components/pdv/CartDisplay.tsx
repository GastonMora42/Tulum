// src/components/pdv/CartDisplay.tsx - Versión mejorada y profesional
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { 
  Trash2, Minus, Plus, DollarSign, 
  CreditCard, ShoppingCart as CartIcon, Tag, X, Receipt 
} from 'lucide-react';

interface CartDisplayProps {
  onCheckout: () => void;
  className?: string;
}

export function CartDisplay({ onCheckout, className = '' }: CartDisplayProps) {
  const { 
    items, 
    removeItem, 
    updateItem, 
    getSubtotal, 
    getTotal, 
    descuentoGeneral, 
    clearCart 
  } = useCartStore();
  
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [animateItem, setAnimateItem] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Actualizar totales cuando cambia el carrito
  useEffect(() => {
    setSubtotal(getSubtotal());
    setTotal(getTotal());
  }, [items, descuentoGeneral, getSubtotal, getTotal]);
  
  // Animar cuando se agrega o actualiza un elemento
  const handleUpdateWithAnimation = (id: string, newQuantity: number) => {
    setAnimateItem(id);
    updateItem(id, newQuantity);
    
    setTimeout(() => {
      setAnimateItem(null);
    }, 300);
  };

  // En móviles, mostrar versión condensada por defecto
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className={`cart-display flex flex-col h-full bg-white ${className} ${
      isMobile ? 'shadow-xl border-t-4 border-[#311716]' : 'rounded-xl shadow-lg border border-gray-100'
    }`}>
      {/* Header mejorado */}
      <div className={`p-4 border-b border-gray-100 ${
        isMobile ? 'bg-gradient-to-r from-[#311716] to-[#462625] text-white' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${
              isMobile ? 'bg-white/20' : 'bg-[#311716]'
            }`}>
              <CartIcon className={`h-5 w-5 ${
                isMobile ? 'text-white' : 'text-white'
              }`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${
                isMobile ? 'text-white' : 'text-[#311716]'
              }`}>
                Carrito
              </h2>
              <p className={`text-sm ${
                isMobile ? 'text-white/80' : 'text-gray-600'
              }`}>
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>
          
          {/* Badge de total en móvil */}
          {isMobile && total > 0 && (
            <div className="bg-[#eeb077] text-[#311716] px-3 py-1 rounded-full">
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
            <CartIcon size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Carrito vacío</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Busca y agrega productos para comenzar tu venta
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-[#eeb077] to-[#9c7561] rounded-full mt-4 opacity-50"></div>
        </div>
      ) : (
        <>
          {/* Lista de productos mejorada */}
          <div className="flex-grow overflow-y-auto">
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`group bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-300 hover:shadow-md ${
                    animateItem === item.id ? 'ring-2 ring-[#eeb077] ring-opacity-50 bg-[#eeb077]/5' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideInUp 0.3s ease-out'
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
                        {item.nombre}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                          ${item.precio.toFixed(2)} c/u
                        </span>
                        {item.descuento > 0 && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            -{item.descuento}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-3">
                      <div className="font-bold text-[#311716] text-lg">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Controles de cantidad mejorados */}
                    <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                        className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={14} className="text-gray-600" />
                      </button>
                      
                      <div className="px-4 py-2 min-w-[3rem] text-center">
                        <span className="font-semibold text-gray-800">{item.cantidad}</span>
                      </div>
                      
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad + 1)}
                        className="p-2 hover:bg-gray-200 transition-colors"
                      >
                        <Plus size={14} className="text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Botón eliminar mejorado */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors group-hover:opacity-100 opacity-70"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer con totales mejorado */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            {/* Resumen de totales */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              
              {descuentoGeneral > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Tag className="h-3 w-3 mr-1" />
                    Descuento ({descuentoGeneral}%)
                  </span>
                  <span className="font-medium">-${(subtotal - total).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold text-[#311716] pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Botones de acción mejorados */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearCart}
                className="flex items-center justify-center py-3 px-4 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
                <span className="sm:hidden">Vaciar</span>
              </button>
              
              <button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-[#311716] to-[#462625] font-semibold text-white hover:from-[#462625] hover:to-[#311716] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Receipt className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Procesar Venta</span>
                <span className="sm:hidden">Cobrar</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}