// src/app/(pdv)/pdv/page.tsx (actualización)
'use client';

import { useState, useEffect } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { OfflineStatus } from '@/components/ui/OfflineStatus';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';

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
          // Si no hay sucursal, mostrar modal de configuración
          setShowSucursalModal(true);
          return;
        }
        
        if (!isOnline) {
          // Si estamos offline, asumimos que hay caja abierta
          // Esto se sincronizará cuando volvamos a estar online
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
      // Recargar la página para aplicar la nueva configuración
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
            className="py-3 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Productos</h2>
          <ProductSearch onProductSelect={handleProductSelect} className="mt-3" />
        </div>

        <SucursalSetupModal
        isOpen={showSucursalModal}
        onClose={handleSucursalSetup}
      />
        
        <div className="flex-grow p-4 overflow-y-auto">
          {/* Aquí puedes agregar secciones de productos populares o categorías */}
          {/* Por ejemplo, un grid de categorías o productos frecuentes */}
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Productos Populares</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Aquí irían los productos populares, este es un ejemplo */}
            <button 
              className="bg-white border border-gray-200 p-3 rounded-lg hover:shadow-md flex flex-col items-center text-center"
              onClick={() => handleProductSelect({
                id: 'popular1',
                nombre: 'Difusor Premium',
                precio: 450
              })}
            >
              <div className="h-20 w-20 bg-gray-100 rounded-full mb-2 flex items-center justify-center">
                {/* Icono o imagen del producto */}
                <span className="text-gray-400">Img</span>
              </div>
              <span className="font-medium">Difusor Premium</span>
              <span className="text-indigo-600 font-bold">$450</span>
            </button>
            
            {/* Más productos populares aquí */}
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
      
      {/* Indicador de estado offline */}
      <OfflineStatus />
    </div>
  );
}