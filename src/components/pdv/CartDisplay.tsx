// src/components/pdv/CartDisplay.tsx (versión mejorada)
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { 
  Trash2, Minus, Plus, DollarSign, 
  CreditCard, ShoppingCart as CartIcon, Tag 
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
  
  // Actualizar totales cuando cambia el carrito
  useEffect(() => {
    setSubtotal(getSubtotal());
    setTotal(getTotal());
  }, [items, descuentoGeneral, getSubtotal, getTotal]);
  
  // Animar cuando se agrega o actualiza un elemento
  const handleUpdateWithAnimation = (id: string, newQuantity: number) => {
    setAnimateItem(id);
    updateItem(id, newQuantity);
    
    // Quitar la animación después de 300ms
    setTimeout(() => {
      setAnimateItem(null);
    }, 300);
  };

  return (
    <div className={`cart-display flex flex-col h-full ${className}`}>
      <div className="bg-white p-4 border-b sticky top-0 z-10">
        <h2 className="text-xl font-bold text-[#311716] flex items-center">
          <CartIcon className="mr-2 h-5 w-5 text-[#9c7561]" />
          Carrito de Compra
          <span className="ml-2 bg-[#eeb077] text-[#311716] text-xs px-2 py-1 rounded-full">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </h2>
      </div>
      
      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-gray-100 p-5 rounded-full mb-4">
            <CartIcon size={48} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium mb-2">El carrito está vacío</p>
          <p className="text-gray-400 text-sm mb-6">Busca y agrega productos para comenzar</p>
          <div className="w-16 h-1 bg-[#eeb077] rounded-full opacity-50"></div>
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-y-auto p-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li 
                  key={item.id} 
                  className={`bg-white rounded-lg shadow-sm border border-gray-100 p-3 transition-all ${
                    animateItem === item.id ? 'bg-[#eeb077]/10 border-[#eeb077]/30' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-4">
                      <h3 className="font-medium text-gray-900 text-base leading-tight">{item.nombre}</h3>
                      <p className="text-sm text-gray-500 mt-1">${item.precio.toFixed(2)} × {item.cantidad}</p>
                    </div>
                    <span className="font-bold text-[#311716]">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                        className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={16} className="text-gray-600" />
                      </button>
                      
                      <span className="w-10 text-center font-medium text-gray-800">{item.cantidad}</span>
                      
                      <button
                        onClick={() => handleUpdateWithAnimation(item.id, item.cantidad + 1)}
                        className="p-2 hover:bg-gray-200"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={16} className="text-gray-600" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-full text-red-500 hover:bg-red-50"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {item.descuento > 0 && (
                    <div className="mt-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                      <Tag className="inline h-3 w-3 mr-1" />
                      Descuento: {item.descuento}%
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-4 bg-gray-50 border-t sticky bottom-0">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              
              {descuentoGeneral > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento ({descuentoGeneral}%):</span>
                  <span>-${(subtotal - total).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                <span className="text-[#311716]">Total:</span>
                <span className="text-[#311716]">${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={clearCart}
                className="py-3 px-4 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancelar
              </button>
              
              <button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="py-3 px-4 rounded-lg bg-[#311716] font-medium text-white hover:bg-[#462625] transition-colors disabled:opacity-50 disabled:hover:bg-[#311716] flex items-center justify-center"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Cobrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}