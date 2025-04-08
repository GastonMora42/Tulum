// src/app/(pdv)/pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string | null;
  codigoBarras: string | null;
}

export default function PDVPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { items, addItem, removeItem, updateItem, getSubtotal, getTotal, checkout, clearCart } = useCartStore();
  const { isOnline, searchProductosCache, pendingOperations } = useOffline();
  
  // Cargar productos (de caché si offline, o del servidor si online)
  useEffect(() => {
    const loadProductos = async () => {
      try {
        setIsLoading(true);
        
        let productosData: Producto[];
        
        if (isOnline) {
          // En un entorno real, cargaríamos del servidor
          // Por ahora, simulamos datos
          await new Promise(resolve => setTimeout(resolve, 800));
          
          productosData = [
            { id: '1', nombre: 'Difusor Bambú', precio: 450, descripcion: 'Difusor aromático de bambú', codigoBarras: '1001' },
            { id: '2', nombre: 'Vela Lavanda', precio: 350, descripcion: 'Vela aromática de lavanda', codigoBarras: '1002' },
            { id: '3', nombre: 'Aceite Esencial Limón', precio: 280, descripcion: 'Aceite esencial 100% puro de limón', codigoBarras: '1003' }
          ];
        } else {
          // Cargar de caché local
          const cachedProductos = await searchProductosCache('');
          productosData = cachedProductos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            descripcion: p.descripcion || null,
            codigoBarras: p.codigoBarras || null
          }));
        }
        
        setProductos(productosData);
        setFilteredProductos(productosData);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        setError('No se pudieron cargar los productos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProductos();
  }, [isOnline, searchProductosCache]);
  
  // Filtrar productos al buscar
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProductos(productos);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = productos.filter(
      producto => 
        producto.nombre.toLowerCase().includes(query) ||
        (producto.descripcion?.toLowerCase().includes(query)) ||
        (producto.codigoBarras?.includes(query))
    );
    
    setFilteredProductos(filtered);
  }, [searchQuery, productos]);
  
  // Manejar cambios en la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Agregar producto al carrito
  const handleAddToCart = (producto: Producto) => {
    addItem(producto);
  };
  
  // Procesar compra
  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      setError(null);
      
      const result = await checkout({
        facturar: false, // Por ahora, sin factura
        metodoPago: 'efectivo',
      });
      
      if (result.success) {
        setCheckoutSuccess(true);
        setCheckoutMessage(result.message || 'Venta realizada con éxito');
        // Limpiar después de 3 segundos
        setTimeout(() => {
          setCheckoutSuccess(false);
          setCheckoutMessage('');
        }, 3000);
      } else {
        setError(result.message || 'Error al procesar la venta');
      }
    } catch (err) {
      console.error('Error en checkout:', err);
      setError('Error al procesar la venta');
    } finally {
      setIsCheckingOut(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {/* Catálogo de productos */}
      <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar producto por nombre, descripción o código"
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Cargando productos...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center h-64 flex items-center justify-center">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {filteredProductos.map(producto => (
              <div 
                key={producto.id}
                className="border rounded-lg p-3 hover:shadow-md cursor-pointer"
                onClick={() => handleAddToCart(producto)}
              >
                <h3 className="font-semibold">{producto.nombre}</h3>
                <p className="text-sm text-gray-600 truncate">{producto.descripcion}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-lg">${producto.precio.toFixed(2)}</span>
                  <button
                    className="bg-indigo-600 text-white p-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(producto);
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Carrito de compra */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col h-full">
        <h2 className="text-xl font-bold mb-4">Carrito de Compra</h2>
        
        {!isOnline && (
          <div className="bg-amber-100 text-amber-800 p-2 rounded-md mb-3 text-sm">
            Modo fuera de línea. {pendingOperations} operación(es) pendiente(s) de sincronizar.
          </div>
        )}
        
        {checkoutSuccess && (
          <div className="bg-green-100 text-green-800 p-2 rounded-md mb-3 text-sm">
            {checkoutMessage}
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              El carrito está vacío
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(item => (
                <li key={item.id} className="py-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.nombre}</span>
                    <span>${item.precio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center">
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => updateItem(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="mx-2">{item.cantidad}</span>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => updateItem(item.id, item.cantidad + 1)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeItem(item.id)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="border-t pt-4 mt-2">
          <div className="flex justify-between mb-2">
            <span className="font-medium">Subtotal:</span>
            <span>${getSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${getTotal().toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={clearCart}
              disabled={items.length === 0 || isCheckingOut}
              className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || isCheckingOut}
              className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}