// src/app/(pdv)/pdv/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import Link from 'next/link';
import { 
  Search, ShoppingCart, Tag, BarChart2, AlertCircle, 
  PlusCircle, MinusCircle, Trash2, CreditCard, DollarSign,
  User, Receipt, Send, Clock, CheckCircle, X, Filter
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string | null;
  codigoBarras: string | null;
  categoriaId: string;
  categoria?: {
    nombre: string;
  };
  imagen?: string;
}

interface Categoria {
  id: string;
  nombre: string;
}

// Component for the Point of Sale main interface
export default function PDVPage() {
  // References
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('efectivo');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  const [facturar, setFacturar] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCartAlert, setShowCartAlert] = useState(false);
  
  // Access stores and hooks  
  const { 
    items, addItem, removeItem, updateItem, getSubtotal, getTotal, 
    checkout, clearCart, setCliente, applyGeneralDiscount
  } = useCartStore();
  const { isOnline, searchProductosCache, pendingOperations } = useOffline();
  const { user } = useAuthStore();
  
  // Focus on barcode input when component mounts
  useEffect(() => {
    // Focus barcode input on initial load
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
    
    // Listen for keydown events globally
    const handleKeyDown = (e: KeyboardEvent) => {
      // If F2 is pressed, focus the barcode input
      if (e.key === 'F2') {
        e.preventDefault();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
      
      // If F3 is pressed, show payment screen
      if (e.key === 'F3' && items.length > 0) {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      
      // If Escape is pressed, close any open modal
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setShowClientModal(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items]);
  
  // Load products and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load data based on connectivity state
        if (isOnline) {
          // Load categories
          const categoriasResponse = await authenticatedFetch('/api/admin/categorias');
          if (categoriasResponse.ok) {
            const categoriasData = await categoriasResponse.json();
            setCategorias(categoriasData);
          }
          
          // Load products with stock information
          const sucursalId = localStorage.getItem('sucursalId');
          if (!sucursalId) {
            setError('No se ha configurado la sucursal para este usuario');
            setIsLoading(false);
            return;
          }
          
          const productosResponse = await authenticatedFetch(
            `/api/pdv/productos-disponibles?sucursalId=${sucursalId}`
          );
          
          if (productosResponse.ok) {
            const productosData = await productosResponse.json();
            setProductos(productosData);
            setFilteredProductos(productosData);
          } else {
            throw new Error('Error al cargar los productos');
          }
        } else {
          // Load from local cache
          const cachedProductos = await searchProductosCache('');
          const mappedProductos = cachedProductos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            descripcion: p.descripcion || null,
            codigoBarras: p.codigoBarras || null,
            categoriaId: p.categoriaId
          }));
          
          setProductos(mappedProductos);
          setFilteredProductos(mappedProductos);
          
          // For categories in offline mode, we use tags from cached products
          const uniqueCategories = Array.from(
            new Set(cachedProductos.map(p => p.categoriaId))
          ).map(id => ({
            id,
            nombre: cachedProductos.find(p => p.categoriaId === id)?.tags?.[0] || 'Categoría'
          }));
          
          setCategorias(uniqueCategories);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los productos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isOnline, searchProductosCache]);
  
  // Filter products based on search query and selected category
  useEffect(() => {
    let filtered = [...productos];
    
    // Apply category filter
    if (categoriaSeleccionada) {
      filtered = filtered.filter(p => p.categoriaId === categoriaSeleccionada);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        producto => 
          producto.nombre.toLowerCase().includes(query) ||
          (producto.descripcion?.toLowerCase().includes(query)) ||
          (producto.codigoBarras?.includes(query))
      );
    }
    
    setFilteredProductos(filtered);
  }, [searchQuery, categoriaSeleccionada, productos]);
  
  // Handle barcode search
  const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = e.currentTarget.value.trim();
      if (barcode) {
        // Look for product with this barcode
        const producto = productos.find(p => p.codigoBarras === barcode);
        if (producto) {
          addItem(producto);
          // Show quick feedback
          setShowCartAlert(true);
          setTimeout(() => setShowCartAlert(false), 1500);
        } else {
          // Flash error
          setError('Producto no encontrado');
          setTimeout(() => setError(null), 2000);
        }
        
        // Clear the input for next scan
        e.currentTarget.value = '';
      }
    }
  };
  
  // Handle category selection
  const handleCategorySelect = (categoriaId: string) => {
    setCategoriaSeleccionada(prev => prev === categoriaId ? '' : categoriaId);
  };
  
  // Handle payment and checkout
  const handleCheckout = async () => {
    // First, apply client data if it's an invoice
    if (facturar) {
      setCliente(clienteNombre, clienteCuit);
    }
    
    try {
      setIsCheckingOut(true);
      setError(null);
      
      const result = await checkout({
        facturar,
        metodoPago: selectedPaymentMethod,
        datosAdicionales: {
          montoIngresado: parseFloat(paymentAmount) || getTotal()
        }
      });
      
      if (result.success) {
        setCheckoutSuccess(true);
        setCheckoutMessage(result.message || 'Venta realizada con éxito');
        setShowPaymentModal(false);
        
        // Show success message that automatically disappears
        setTimeout(() => {
          setCheckoutSuccess(false);
          setCheckoutMessage('');
          
          // Reset all states
          setSelectedPaymentMethod('efectivo');
          setPaymentAmount('');
          setClienteNombre('');
          setClienteCuit('');
          setFacturar(false);
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
  
  // Render helper: format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 2 
    }).format(amount);
  };
  
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left column - Product Catalog */}
      <div className="w-full md:w-2/3 flex flex-col h-full overflow-hidden bg-white shadow-md rounded-lg border border-gray-200">
        {/* Fixed header area with search */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-grow">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Escanear código de barras (F2)"
                className="w-full p-2 pl-10 border rounded-lg shadow-sm"
                onKeyDown={handleBarcodeSearch}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <BarChart2 size={20} />
              </div>
            </div>
            
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto"
                className="w-full p-2 pl-10 border rounded-lg shadow-sm"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search size={20} />
              </div>
            </div>
          </div>
          
          {/* Categories horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {categorias.map(categoria => (
              <button
                key={categoria.id}
                onClick={() => handleCategorySelect(categoria.id)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium ${
                  categoriaSeleccionada === categoria.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Tag size={14} className="inline mr-1" />
                {categoria.nombre}
              </button>
            ))}
          </div>
        </div>
        
        {/* Scrollable product grid */}
        <div className="flex-grow overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProductos.length === 0 ? (
            <div className="col-span-full flex flex-col justify-center items-center h-full text-gray-500">
              <Search size={48} className="mb-2" />
              <p>No se encontraron productos</p>
              {searchQuery && (
                <button 
                  className="mt-2 text-blue-600 hover:underline"
                  onClick={() => setSearchQuery('')}
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            filteredProductos.map(producto => (
              <div
                key={producto.id}
                onClick={() => {
                  addItem(producto);
                  setShowCartAlert(true);
                  setTimeout(() => setShowCartAlert(false), 1500);
                }}
                className="bg-white border rounded-lg p-3 shadow-sm hover:shadow transition cursor-pointer flex flex-col h-32"
              >
                <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2">
                  {producto.nombre}
                </h3>
                <p className="text-xs text-gray-500 flex-grow line-clamp-2">
                  {producto.descripcion || producto.codigoBarras || 'Sin descripción'}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-lg text-blue-600">
                    ${producto.precio.toFixed(2)}
                  </span>
                  <button
                    className="bg-blue-600 text-white p-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(producto);
                      setShowCartAlert(true);
                      setTimeout(() => setShowCartAlert(false), 1500);
                    }}
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Right column - Shopping Cart */}
      <div className="w-full md:w-1/3 flex flex-col h-full bg-gray-50 shadow-md rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <ShoppingCart size={20} className="mr-2 text-blue-600" />
            Carrito
            {items.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-sm bg-blue-600 text-white rounded-full">
                {items.length}
              </span>
            )}
          </h2>
        </div>
        
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 p-2 text-sm text-amber-800">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-1" />
              <span>Modo fuera de línea. {pendingOperations} operación(es) pendiente(s).</span>
            </div>
          </div>
        )}
        
        {checkoutSuccess && (
          <div className="bg-green-50 border-b border-green-200 p-2 text-sm text-green-800">
            <div className="flex items-center">
              <CheckCircle size={16} className="mr-1" />
              <span>{checkoutMessage}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-2 text-sm text-red-800">
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-1" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Cart items - scrollable */}
        <div className="flex-grow overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-gray-400">
              <ShoppingCart size={48} className="mb-2" />
              <p className="text-center">
                El carrito está vacío<br />
                Seleccione productos para agregar
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(item => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">{item.nombre}</span>
                    <span className="font-medium text-blue-600">${item.precio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center">
                      <button
                        className="text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full p-1"
                        onClick={() => updateItem(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1}
                      >
                        <MinusCircle size={18} />
                      </button>
                      <span className="mx-2 w-8 text-center">{item.cantidad}</span>
                      <button
                        className="text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full p-1"
                        onClick={() => updateItem(item.id, item.cantidad + 1)}
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2 text-gray-700">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </span>
                      <button
                        className="text-red-500 hover:text-red-700 bg-red-50 rounded-full p-1"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Cart totals and checkout */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(getSubtotal())}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mb-3">
            <span>Total:</span>
            <span className="text-blue-600">{formatCurrency(getTotal())}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={clearCart}
              disabled={items.length === 0 || isCheckingOut}
              className="py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={items.length === 0 || isCheckingOut}
              className="py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cobrar (F3)
            </button>
          </div>
          
          <div className="mt-3 flex justify-center">
            <Link href="/pdv/ventas" className="text-sm text-blue-600 hover:underline">
              Ver historial de ventas
            </Link>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Procesar Pago</h2>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total a pagar:</span>
                  <span className="text-blue-600">{formatCurrency(getTotal())}</span>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('efectivo')}
                      className={`py-3 px-4 rounded-lg flex items-center justify-center ${
                        selectedPaymentMethod === 'efectivo'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <DollarSign size={20} className="mr-2" />
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('tarjeta')}
                      className={`py-3 px-4 rounded-lg flex items-center justify-center ${
                        selectedPaymentMethod === 'tarjeta'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <CreditCard size={20} className="mr-2" />
                      Tarjeta
                    </button>
                  </div>
                </div>
                
                {selectedPaymentMethod === 'efectivo' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">
                      Monto recibido
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={getTotal().toFixed(2)}
                      className="w-full p-3 border rounded-lg"
                    />
                    
                    {paymentAmount && parseFloat(paymentAmount) >= getTotal() && (
                      <div className="mt-2 text-right">
                        <span className="text-gray-700">Cambio: </span>
                        <span className="font-bold">
                          {formatCurrency(parseFloat(paymentAmount) - getTotal())}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="facturar"
                      checked={facturar}
                      onChange={(e) => setFacturar(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="facturar" className="text-gray-700 font-medium">
                      Facturar esta venta
                    </label>
                  </div>
                  
                  {facturar && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="mb-2">
                        <label className="block text-gray-700 mb-1 text-sm">
                          Nombre/Razón Social
                        </label>
                        <input
                          type="text"
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 text-sm">
                          CUIT/DNI
                        </label>
                        <input
                          type="text"
                          value={clienteCuit}
                          onChange={(e) => setClienteCuit(e.target.value)}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={
                    isCheckingOut || 
                    (facturar && (!clienteNombre || !clienteCuit)) ||
                    (selectedPaymentMethod === 'efectivo' && 
                     paymentAmount && 
                     parseFloat(paymentAmount) < getTotal())
                  }
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </div>
                  ) : (
                    'Finalizar Venta'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick add feedback alert */}
      {showCartAlert && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg flex items-center animate-fade-in-out z-50">
          <CheckCircle size={20} className="mr-2" />
          <span>Producto agregado al carrito</span>
        </div>
      )}
    </div>
  );
}