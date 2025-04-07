// src/stores/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { syncManager } from '@/lib/offline/syncManager';

interface ProductoCart {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  descuento: number;
}

interface CartState {
  items: ProductoCart[];
  descuentoGeneral: number;
  codigoDescuento: string | null;
  clienteNombre: string | null;
  clienteCuit: string | null;
  sucursalId: string | null;
  
  // Acciones
  addItem: (producto: { id: string; nombre: string; precio: number }, cantidad?: number) => void;
  updateItem: (productoId: string, cantidad: number) => void;
  removeItem: (productoId: string) => void;
  applyDiscount: (productoId: string, descuento: number) => void;
  applyGeneralDiscount: (descuento: number) => void;
  applyDiscountCode: (codigo: string, descuento: number) => void;
  setCliente: (nombre: string, cuit: string) => void;
  clearCart: () => void;
  
  // Cálculos
  getSubtotal: () => number;
  getTotal: () => number;
  
  // Checkout
  checkout: (datos: {
    facturar: boolean;
    metodoPago: string;
    datosAdicionales?: Record<string, any>;
  }) => Promise<{ success: boolean; message?: string; ventaId?: string }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      descuentoGeneral: 0,
      codigoDescuento: null,
      clienteNombre: null,
      clienteCuit: null,
      sucursalId: typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalId') : null,
      
      // Añadir item al carrito
      addItem: (producto, cantidad = 1) => {
        set(state => {
          const existingItem = state.items.find(item => item.id === producto.id);
          
          if (existingItem) {
            return {
              items: state.items.map(item => 
                item.id === producto.id 
                  ? { ...item, cantidad: item.cantidad + cantidad } 
                  : item
              )
            };
          } else {
            return {
              items: [...state.items, { 
                id: producto.id, 
                nombre: producto.nombre, 
                precio: producto.precio,
                cantidad,
                descuento: 0
              }]
            };
          }
        });
      },
      
      // Actualizar cantidad de un item
      updateItem: (productoId, cantidad) => {
        set(state => ({
          items: state.items.map(item => 
            item.id === productoId 
              ? { ...item, cantidad: Math.max(1, cantidad) } 
              : item
          )
        }));
      },
      
      // Eliminar item del carrito
      removeItem: (productoId) => {
        set(state => ({
          items: state.items.filter(item => item.id !== productoId)
        }));
      },
      
      // Aplicar descuento a un producto
      applyDiscount: (productoId, descuento) => {
        set(state => ({
          items: state.items.map(item => 
            item.id === productoId 
              ? { ...item, descuento } 
              : item
          )
        }));
      },
      
      // Aplicar descuento general
      applyGeneralDiscount: (descuento) => {
        set({ descuentoGeneral: descuento });
      },
      
      // Aplicar código de descuento
      applyDiscountCode: (codigo, descuento) => {
        set({ 
          codigoDescuento: codigo,
          descuentoGeneral: descuento
        });
      },
      
      // Establecer datos del cliente
      setCliente: (nombre, cuit) => {
        set({ 
          clienteNombre: nombre,
          clienteCuit: cuit
        });
      },
      
      // Limpiar carrito
      clearCart: () => {
        set({
          items: [],
          descuentoGeneral: 0,
          codigoDescuento: null,
          clienteNombre: null,
          clienteCuit: null
        });
      },
      
      // Calcular subtotal (sin descuentos)
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => 
          total + (item.precio * item.cantidad), 0);
      },
      
      // Calcular total (con descuentos)
      getTotal: () => {
        const { items, descuentoGeneral } = get();
        
        // Calcular total con descuentos por item
        const totalConDescuentosIndividuales = items.reduce((total, item) => {
          const precioConDescuento = item.precio * (1 - item.descuento / 100);
          return total + (precioConDescuento * item.cantidad);
        }, 0);
        
        // Aplicar descuento general
        return totalConDescuentosIndividuales * (1 - descuentoGeneral / 100);
      },
      
      // Procesar compra
      checkout: async (datos) => {
        const { items, codigoDescuento, clienteNombre, clienteCuit, getTotal } = get();
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          return { success: false, message: 'No se ha definido una sucursal' };
        }
        
        if (items.length === 0) {
          return { success: false, message: 'El carrito está vacío' };
        }
        
        try {
          // Preparar datos de la venta
          const ventaData = {
            items: items.map(item => ({
              productoId: item.id,
              cantidad: item.cantidad,
              precioUnitario: item.precio,
              descuento: item.descuento
            })),
            total: getTotal(),
            codigoDescuento,
            facturar: datos.facturar,
            clienteNombre: datos.facturar ? clienteNombre : null,
            clienteCuit: datos.facturar ? clienteCuit : null,
            metodoPago: datos.metodoPago,
            datosAdicionales: datos.datosAdicionales
          };
          
          // Verificar si estamos online
          if (navigator.onLine) {
            // Enviar directamente al servidor
            // Código para envío online (en una implementación real)
            // ...
            
            // Simular éxito en desarrollo
            const ventaId = uuidv4();
            
            // Limpiar carrito
            get().clearCart();
            
            return { success: true, ventaId };
          } else {
            // Registrar venta offline
            const ventaId = await syncManager.registrarVentaOffline({
              items: ventaData.items,
              total: ventaData.total,
              // Otros campos relevantes
            });
            
            // Limpiar carrito
            get().clearCart();
            
            return { 
              success: true, 
              ventaId,
              message: 'Venta registrada en modo offline. Se sincronizará cuando haya conexión.' 
            };
          }
        } catch (error) {
          console.error('Error al procesar la venta:', error);
          return { 
            success: false, 
            message: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
      }
    }),
    {
      name: 'cart-storage',
      // Solo almacenar items, descuentos y datos de cliente
      partialize: (state) => ({
        items: state.items,
        descuentoGeneral: state.descuentoGeneral,
        codigoDescuento: state.codigoDescuento,
        clienteNombre: state.clienteNombre,
        clienteCuit: state.clienteCuit
      })
    }
  )
);