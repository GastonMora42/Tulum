// src/app/(pdv)/pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, 
  CheckCircle, 
  X, 
  ShoppingCart, 
  Tag, 
  Search,
  CreditCard,
  DollarSign,
  QrCode,
  Package,
  Layers
} from 'lucide-react';
import { Producto } from '@/types/models/producto';

export default function PDVPage() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hayCajaAbierta, setHayCajaAbierta] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [categoriasProductos, setCategoriasProductos] = useState<any[]>([]);
  const [productosPopulares, setProductosPopulares] = useState<Producto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  
  const { addItem } = useCartStore();
  const { isOnline } = useOffline();
  
  // Verificar si hay caja abierta
  useEffect(() => {
    const checkCajaAbierta = async () => {
      try {
        setIsLoading(true);
        
        // Verificar si hay sucursal configurada
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          setShowSucursalModal(true);
          return;
        }
        
        if (!isOnline) {
          // Si estamos offline, asumimos que hay caja abierta
          setHayCajaAbierta(true);
          return;
        }
        
        // Usar authenticatedFetch en lugar de fetch
        const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        
        if (response.status === 404) {
          setHayCajaAbierta(false);
        } else if (response.ok) {
          setHayCajaAbierta(true);
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Error al verificar el estado de la caja');
        }

        // Cargar categorías de productos
        const categoriasResponse = await authenticatedFetch('/api/admin/categorias');
        if (categoriasResponse.ok) {
          const categoriasData = await categoriasResponse.json();
          setCategoriasProductos(categoriasData);
        }

        // Cargar productos populares
        const popularesResponse = await authenticatedFetch(`/api/pdv/productos-disponibles?popular=true&sucursalId=${sucursalId}`);
        if (popularesResponse.ok) {
          const popularesData = await popularesResponse.json();
          setProductosPopulares(popularesData.slice(0, 8));
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        setNotification({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error al verificar el estado de la caja'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCajaAbierta();
  }, [isOnline]);

  const handleSucursalSetup = (sucursalId?: string) => {
    setShowSucursalModal(false);
    
    if (sucursalId) {
      window.location.reload();
    }
  };
  
  // Función para abrir caja
  const handleAbrirCaja = async () => {
    try {
      setIsLoading(true);
      
      const sucursalId = localStorage.getItem('sucursalId');
      
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      // Solicitar monto inicial
      const montoInicial = prompt('Ingrese el monto inicial de la caja:');
      
      if (montoInicial === null) return; // Usuario canceló
      
      const montoInicialNum = parseFloat(montoInicial);
      
      if (isNaN(montoInicialNum) || montoInicialNum < 0) {
        throw new Error('El monto inicial debe ser un número válido mayor o igual a cero');
      }
      
      // Crear caja usando authenticatedFetch
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sucursalId,
          montoInicial: montoInicialNum
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al abrir la caja');
      }
      
      setHayCajaAbierta(true);
      setNotification({
        type: 'success',
        message: 'Caja abierta correctamente'
      });
    } catch (error) {
      console.error('Error al abrir caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al abrir la caja'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar selección de producto
  const handleProductSelect = (producto: Producto) => {
    addItem(producto);

    setNotification({
      type: 'success',
      message: `"${producto.nombre}" agregado al carrito`
    });
    
    // Auto-limpiar notificación después de 1.5 segundos
    setTimeout(() => {
      setNotification(null);
    }, 1500);
  };
  
  // Manejar checkout
  const handleCheckout = () => {
    if (!hayCajaAbierta) {
      setNotification({
        type: 'error',
        message: 'No hay una caja abierta. Debe abrir la caja antes de realizar ventas.'
      });
      return;
    }
    
    setIsCheckoutOpen(true);
  };
  
  // Manejar resultado del checkout
  const handleCheckoutComplete = (result: { success: boolean; message?: string }) => {
    if (result.message) {
      setNotification({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
    }
    
    // Auto-limpiar notificación después de 5 segundos
    if (result.message) {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Cerrar notificación
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Filtrar productos por categoría
  const filteredProducts = activeCategory === 'todos' 
    ? productosPopulares
    : productosPopulares.filter(p => p.categoriaId === activeCategory);
  
  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#311716]"></div>
        <span className="ml-3 text-lg text-gray-700">Cargando...</span>
      </div>
    );
  }
  
  // Mostrar pantalla de abrir caja si no hay caja abierta
  if (hayCajaAbierta === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        {notification && (
          <div className={`mb-6 w-full max-w-md p-4 rounded-lg ${
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
                onClick={handleCloseNotification}
                className="ml-auto text-gray-500 hover:text-gray-700"
                aria-label="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="bg-[#eeb077]/20 p-4 rounded-full inline-flex mb-6">
            <DollarSign size={32} className="text-[#311716]" />
          </div>
          <h2 className="text-2xl font-bold text-[#311716] mb-4">No hay una caja abierta</h2>
          <p className="text-gray-600 mb-8">Debe abrir una caja antes de realizar ventas</p>
          
          <button
            onClick={handleAbrirCaja}
            className="w-full py-3 px-6 bg-[#311716] text-white rounded-lg hover:bg-[#462625] transition-colors"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 w-full max-w-md p-4 rounded-lg shadow-lg ${
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
              onClick={handleCloseNotification}
              className="ml-auto text-gray-500 hover:text-gray-700"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Área de productos */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-[#311716] mb-3">Productos</h2>
          <ProductSearch onProductSelect={handleProductSelect} className="mt-3" />
        </div>

        <SucursalSetupModal
          isOpen={showSucursalModal}
          onClose={handleSucursalSetup}
        />
        
        <div className="flex-grow p-4 overflow-y-auto">
          {/* Categorías */}
          {categoriasProductos.length > 0 && (
            <div className="mb-6 overflow-x-auto pb-2">
              <div className="flex space-x-2 min-w-max">
                <button
                  onClick={() => setActiveCategory('todos')}
                  className={`${
                    activeCategory === 'todos' 
                      ? 'bg-[#311716] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150`}
                >
                  Todos
                </button>
                
                {categoriasProductos.map(categoria => (
                  <button
                    key={categoria.id}
                    onClick={() => setActiveCategory(categoria.id)}
                    className={`${
                      activeCategory === categoria.id 
                        ? 'bg-[#311716] text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center`}
                  >
                    <Tag size={14} className="mr-1" />
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Productos */}
          <div>
            <h3 className="text-lg font-semibold text-[#311716] mb-4">
              {activeCategory === 'todos' ? 'Productos Destacados' : 'Productos de la Categoría'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((producto) => (
                  <button 
                    key={producto.id}
                    className="bg-white border border-gray-100 p-4 rounded-xl hover:shadow-md flex flex-col items-center text-center transition-all group"
                    onClick={() => handleProductSelect(producto)}
                  >
                    <div className="h-24 w-24 bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      {producto.imagen ? (
                        <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-12 w-12 text-gray-300 group-hover:text-[#9c7561] transition-colors" />
                      )}
                    </div>
                    <span className="font-medium text-gray-800 mb-1 group-hover:text-[#311716] transition-colors line-clamp-2 h-10">{producto.nombre}</span>
                    <span className="text-[#9c7561] font-bold group-hover:text-[#eeb077] transition-colors">${producto.precio.toFixed(2)}</span>
                    <div className="bg-[#311716] text-white text-xs rounded-full px-3 py-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Agregar
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No hay productos disponibles en esta categoría</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Formas de pago - Información visual */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Métodos de pago aceptados</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg text-gray-600">
                <DollarSign size={16} className="mr-1 text-[#9c7561]" />
                <span className="text-sm">Efectivo</span>
              </div>
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg text-gray-600">
                <CreditCard size={16} className="mr-1 text-[#9c7561]" />
                <span className="text-sm">Tarjeta</span>
              </div>
              <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg text-gray-600">
                <QrCode size={16} className="mr-1 text-[#9c7561]" />
                <span className="text-sm">QR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Carrito */}
      <div className="h-full">
        <CartDisplay onCheckout={handleCheckout} className="h-full bg-white rounded-xl shadow-sm" />
      </div>
      
      {/* Modal de checkout */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
    </div>
  );
}