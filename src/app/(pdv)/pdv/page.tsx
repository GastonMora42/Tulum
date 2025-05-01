// src/app/(pdv)/pdv/page.tsx - Versión mejorada
'use client';

import { useState, useEffect } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';
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

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  codigoBarras?: string;
  imagen?: string;
}

export default function PDVPage() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hayCajaAbierta, setHayCajaAbierta] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [categoriasProductos, setCategoriasProductos] = useState<any[]>([]);
  const [productosPopulares, setProductosPopulares] = useState<Producto[]>([]);
  
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
        
        const response = await fetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        
        if (response.status === 404) {
          setHayCajaAbierta(false);
        } else if (response.ok) {
          setHayCajaAbierta(true);
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Error al verificar el estado de la caja');
        }

        // Cargar categorías de productos
        const categoriasResponse = await fetch('/api/admin/categorias');
        if (categoriasResponse.ok) {
          const categoriasData = await categoriasResponse.json();
          setCategoriasProductos(categoriasData);
        }

        // Cargar productos populares (simulados por ahora)
        setProductosPopulares([
          {id: 'popular1', nombre: 'Difusor Premium', precio: 450, descripcion: 'Difusor aromático de bambú'},
          {id: 'popular2', nombre: 'Vela Aromática', precio: 350, descripcion: 'Vela aromática de lavanda'},
          {id: 'popular3', nombre: 'Aceite Esencial', precio: 280, descripcion: 'Aceite esencial de limón'},
          {id: 'popular4', nombre: 'Set de Velas', precio: 650, descripcion: 'Set de 3 velas aromáticas'},
        ]);
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
      
      // Crear caja
      const response = await fetch('/api/pdv/cierre', {
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
  
  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Cargando...</span>
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
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No hay una caja abierta</h2>
          <p className="text-gray-600 mb-6">Debe abrir una caja antes de realizar ventas</p>
          
          <button
            onClick={handleAbrirCaja}
            className="py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-blue-50">
          <h2 className="text-xl font-bold text-gray-800">Productos</h2>
          <ProductSearch onProductSelect={handleProductSelect} className="mt-3" />
        </div>

        <SucursalSetupModal
          isOpen={showSucursalModal}
          onClose={handleSucursalSetup}
        />
        
        <div className="flex-grow p-4 overflow-y-auto">
          {/* Categorías */}
          {categoriasProductos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Categorías</h3>
              <div className="flex flex-wrap gap-2">
                {categoriasProductos.map(categoria => (
                  <button
                    key={categoria.id}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Tag size={16} />
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Productos Populares */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Productos Populares</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {productosPopulares.map((producto) => (
                <button 
                  key={producto.id}
                  className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md flex flex-col items-center text-center transition-all"
                  onClick={() => handleProductSelect(producto)}
                >
                  <div className="h-20 w-20 bg-blue-50 rounded-full mb-3 flex items-center justify-center">
                    <Package className="h-10 w-10 text-blue-400" />
                  </div>
                  <span className="font-medium text-gray-800 mb-1">{producto.nombre}</span>
                  <span className="text-blue-600 font-bold">${producto.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Formas de pago - Información visual */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Métodos de pago aceptados</h3>
            <div className="flex space-x-4">
              <div className="flex items-center text-gray-500">
                <DollarSign size={20} className="mr-1" />
                <span className="text-sm">Efectivo</span>
              </div>
              <div className="flex items-center text-gray-500">
                <CreditCard size={20} className="mr-1" />
                <span className="text-sm">Tarjeta</span>
              </div>
              <div className="flex items-center text-gray-500">
                <QrCode size={20} className="mr-1" />
                <span className="text-sm">QR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Carrito */}
      <div className="h-full">
        <CartDisplay onCheckout={handleCheckout} className="h-full" />
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