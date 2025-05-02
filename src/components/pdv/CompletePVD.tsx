// src/components/pdv/CompletePDV.tsx
'use client';

import { useState, useEffect } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { ResponsiveLayout } from '@/components/pdv/ResponsiveLayout';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { MobileNavBar } from '@/components/pdv/MobileNavBar';
import { AlertCircle, CheckCircle, X, Package, ShoppingCart } from 'lucide-react';
import { Producto } from '@/types/models/producto';
import { OfflineIndicator } from '../ui/OfflineIndicator';

export function CompletePDV() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addItem } = useCartStore();
  const { isOnline } = useOffline();

  // Load categories and products
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const categoriesResp = await fetch('/api/admin/categorias');
        const categoriesData = await categoriesResp.json();
        setCategories(categoriesData);
        
        // Load products
        const sucursalId = localStorage.getItem('sucursalId');
        const productsResp = await fetch(`/api/pdv/productos-disponibles?sucursalId=${sucursalId}`);
        const productsData = await productsResp.json();
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Filter products when category changes
  useEffect(() => {
    if (activeCategory) {
      setFilteredProducts(products.filter(p => p.categoriaId === activeCategory));
    } else {
      setFilteredProducts(products);
    }
  }, [activeCategory, products]);
  
  // Handle product selection
  const handleProductSelect = (product: Producto) => {
    addItem(product);
    
    setNotification({
      type: 'success',
      message: `"${product.nombre}" agregado al carrito`
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 1500);
  };
  
  // Handle checkout
  const handleCheckout = () => {
    setIsCheckoutOpen(true);
  };
  
  // Handle checkout result
  const handleCheckoutComplete = (result: { success: boolean; message?: string }) => {
    if (result.message) {
      setNotification({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  return (
    <>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="mr-2" size={20} />
            ) : (
              <AlertCircle className="mr-2" size={20} />
            )}
            <p>{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <ResponsiveLayout
        sidebar={
          <CartDisplay 
            onCheckout={handleCheckout} 
            className="h-full bg-white rounded-xl shadow-sm"
          />
        }
        content={
          <div className="h-full bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-[#311716] mb-3">Productos</h2>
              <ProductSearch onProductSelect={handleProductSelect} />
            </div>
            
            <div className="p-4 border-b overflow-x-auto">
              <div className="flex space-x-2 min-w-max">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    !activeCategory 
                      ? 'bg-[#311716] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      activeCategory === category.id 
                        ? 'bg-[#311716] text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.nombre}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="bg-white border border-gray-100 p-4 rounded-lg hover:shadow-md transition-all flex flex-col items-center text-center group"
                    >
                      <div className="h-24 w-24 bg-gray-50 rounded-lg mb-2 flex items-center justify-center">
                        {product.imagen ? (
                          <img src={product.imagen} alt={product.nombre} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <Package className="h-12 w-12 text-gray-300" />
                        )}
                      </div>
                      <span className="font-medium text-gray-800 mb-1 line-clamp-2 h-10">{product.nombre}</span>
                      <span className="text-[#9c7561] font-bold">${product.precio.toFixed(2)}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 bg-[#311716] text-white text-xs rounded-full px-3 py-1">
                        Agregar
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Package className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No se encontraron productos</p>
                  <p className="text-gray-400 mt-1">Intenta con otra categoría o búsqueda</p>
                </div>
              )}
            </div>
          </div>
        }
      />
      
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
      
      <OfflineIndicator />
      <MobileNavBar />
    </>
  );
}