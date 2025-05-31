// src/components/pdv/CartDisplay.tsx - VERSIÓN COMPLETAMENTE REDISEÑADA PARA TABLET
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { 
  Trash2, Minus, Plus, ShoppingCart as CartIcon, Tag, X, Receipt,
  Heart, Package, Star, AlertCircle, CheckCircle
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Actualizar totales
  useEffect(() => {
    setSubtotal(getSubtotal());
    setTotal(getTotal());
  }, [items, descuentoGeneral, getSubtotal, getTotal]);
  
  // Animación para cambios
  const handleUpdateWithAnimation = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    
    setAnimateItem(id);
    updateItem(id, newQuantity);
    
    setTimeout(() => setAnimateItem(null), 300);
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  return (
    <div className={`cart-display flex flex-col h-full bg-white ${className}`}>
      {/* Header mejorado */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#311716] to-[#462625] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <CartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Carrito de Compras</h2>
              <p className="text-white/80 text-sm">
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>
          
          {total > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">${total.toFixed(2)}</div>
              <div className="text-white/80 text-sm">{items.reduce((sum, item) => sum + item.cantidad, 0)} items</div>
            </div>
          )}
        </div>
      </div>
      
      {items.length === 0 ? (
        // Estado vacío mejorado
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-8">
            <CartIcon size={48} className="text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-4">Carrito vacío</h3>
          <p className="text-gray-500 text-lg max-w-xs leading-relaxed">
            Busca y agrega productos para comenzar tu venta
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-[#eeb077] to-[#9c7561] rounded-full mt-6 opacity-50"></div>
        </div>
      ) : (
        <>
          {/* Lista de productos optimizada para tablet */}
          <div className="flex-grow overflow-y-auto">
            <div className="p-6 space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`group bg-gray-50 rounded-2xl p-6 transition-all duration-300 hover:bg-gray-100 ${
                    animateItem === item.id ? 'ring-2 ring-[#eeb077] ring-opacity-50 bg-[#eeb077]/5 scale-[1.02]' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideInUp 0.3s ease-out'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    {/* Info del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2">
                            {item.nombre}
                          </h4>
                          <div className="flex items-center space-x-3 text-sm">
                            <span className="bg-white px-3 py-1 rounded-full border border-gray-200 font-medium">
                              ${item.precio.toFixed(2)} c/u
                            </span>
                            {item.descuento > 0 && (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center font-medium">
                                <Tag className="h-3 w-3 mr-1" />
                                -{item.descuento}%
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="font-bold text-[#311716] text-2xl">
                            ${(item.precio * item.cantidad).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Controles optimizados para touch */}
                  <div className="flex items-center justify-between">
                    {/* Controles de cantidad grandes para tablet */}
                    <div className="flex items-center bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad - 1)}
                        className="p-4 hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
                      >
                        <Minus size={20} />
                      </button>
                      
                      <div className="px-6 py-4 min-w-[4rem] text-center bg-gray-50">
                        <span className="font-bold text-gray-800 text-xl">{item.cantidad}</span>
                      </div>
                      
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad + 1)}
                        className="p-4 hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    
                    {/* Botón eliminar grande */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-4 rounded-2xl text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer con totales mejorado */}
          <div className="border-t border-gray-200 bg-white">
            {/* Resumen detallado */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-lg text-gray-600">
                  <span>Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                
                {descuentoGeneral > 0 && (
                  <div className="flex justify-between text-lg text-green-600">
                    <span className="flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Descuento ({descuentoGeneral}%)
                    </span>
                    <span className="font-semibold">-${(subtotal - total).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-2xl font-bold text-[#311716]">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botones de acción grandes para tablet */}
            <div className="p-6 pt-0 grid grid-cols-2 gap-4">
              <button
                onClick={handleClearCart}
                className="flex items-center justify-center py-4 px-6 rounded-2xl border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all text-lg"
              >
                <X className="mr-3 h-5 w-5" />
                Vaciar
              </button>
              
              <button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="flex items-center justify-center py-4 px-6 rounded-2xl bg-gradient-to-r from-[#311716] to-[#462625] font-bold text-white hover:from-[#462625] hover:to-[#311716] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                <Receipt className="mr-3 h-5 w-5" />
                Procesar Venta
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Modal de confirmación para limpiar carrito */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">¿Vaciar carrito?</h3>
              <p className="text-gray-600 text-lg mb-8">
                Se eliminarán todos los productos del carrito. Esta acción no se puede deshacer.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmClearCart}
                  className="py-3 px-6 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                >
                  Vaciar
                </button>
              </div>
            </div>
          </div>
        </div>
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