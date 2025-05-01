// src/components/pdv/CartDisplay.tsx
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { Trash2, Minus, Plus, DollarSign, CreditCard } from 'lucide-react';

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
  
  // Actualizar totales cuando cambia el carrito
  useEffect(() => {
    setSubtotal(getSubtotal());
    setTotal(getTotal());
  }, [items, descuentoGeneral, getSubtotal, getTotal]);
  
  return (
    <div className={`cart-display flex flex-col h-full ${className}`}>
      <div className="bg-white p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">Carrito de Compra</h2>
      </div>
      
      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <div className="text-gray-400 mb-2">
            <ShoppingCart size={48} />
          </div>
          <p className="text-gray-500 text-lg">El carrito está vacío</p>
          <p className="text-gray-400 text-sm mt-1">Busca y agrega productos para comenzar</p>
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-y-auto p-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.nombre}</h3>
                      <p className="text-gray-700">${item.precio.toFixed(2)} x {item.cantidad}</p>
                    </div>
                    <span className="font-bold text-gray-900">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => updateItem(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={18} className="text-gray-600" />
                      </button>
                      
                      <span className="w-8 text-center font-medium">{item.cantidad}</span>
                      
                      <button
                        onClick={() => updateItem(item.id, item.cantidad + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={18} className="text-gray-600" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-full text-red-500 hover:bg-red-50"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {item.descuento > 0 && (
                    <div className="mt-1 text-sm text-green-600">
                      Descuento: {item.descuento}%
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-4 bg-gray-50 border-t">
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
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={clearCart}
                className="btn-secondary py-3 px-4 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="btn-primary py-3 px-4 rounded-lg bg-indigo-600 font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
              >
                Cobrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Icono de carrito para el estado vacío
function ShoppingCart({ size = 24 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
}