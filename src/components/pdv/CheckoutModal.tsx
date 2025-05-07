// src/components/pdv/CheckoutModal.tsx (versión mejorada)
'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { CreditCard, DollarSign, QrCode, Smartphone, X, Check, Loader } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: { success: boolean; message?: string; ventaId?: string }) => void;
}

export function CheckoutModal({ isOpen, onClose, onComplete }: CheckoutModalProps) {
  const { items, getTotal, clearCart } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facturar, setFacturar] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  const [referencia, setReferencia] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [facturacionObligatoria, setFacturacionObligatoria] = useState(false);
  // Métodos de pago disponibles
  const paymentMethods: PaymentMethod[] = [
    { id: 'efectivo', name: 'Efectivo', icon: <DollarSign size={24} className="text-green-600" /> },
    { id: 'tarjeta_credito', name: 'Tarjeta de Crédito', icon: <CreditCard size={24} className="text-blue-600" /> },
    { id: 'tarjeta_debito', name: 'Tarjeta de Débito', icon: <CreditCard size={24} className="text-purple-600" /> },
    { id: 'qr', name: 'Pago con QR', icon: <QrCode size={24} className="text-indigo-600" /> },
    { id: 'transferencia', name: 'Transferencia', icon: <Smartphone size={24} className="text-orange-600" /> }
  ];
  
  useEffect(() => {
    // Lock body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  useEffect(() => {
    // Verificar si el método seleccionado requiere factura obligatoria
    const esObligatoria = selectedMethod ? ['tarjeta_credito', 'tarjeta_debito', 'qr'].includes(selectedMethod) : false;
    setFacturacionObligatoria(esObligatoria);
    
    // Si el pago es electrónico, establecer facturar a true
    if (esObligatoria) {
      setFacturar(true);
    }
  }, [selectedMethod]);

  // Actualizar monto cuando cambia el carrito
  useEffect(() => {
    const total = getTotal();
    setAmount(total);
    // Pre-llenar el monto exacto para efectivo
    if (selectedMethod === 'efectivo') {
      setAmountTendered(total.toFixed(2));
    }
  }, [getTotal, selectedMethod]);
  
  // Calcular cambio cuando cambia el monto entregado
  useEffect(() => {
    if (selectedMethod === 'efectivo' && amountTendered !== '') {
      const tendered = parseFloat(amountTendered);
      if (!isNaN(tendered)) {
        setChange(Math.max(0, tendered - amount));
      } else {
        setChange(0);
      }
    } else {
      setChange(0);
    }
  }, [amount, amountTendered, selectedMethod]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedMethod(null);
        setAmountTendered('');
        setFacturar(false);
        setClienteNombre('');
        setClienteCuit('');
        setReferencia('');
        setCurrentStep(1);
      }, 300);
    }
  }, [isOpen]);
  
  // Ir al siguiente paso
  const goToNextStep = () => {
    if (currentStep === 1 && !selectedMethod) {
      return; // No avanzar si no se seleccionó método de pago
    }
    
    setCurrentStep(currentStep + 1);
  };
  
  // Volver al paso anterior
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Procesar pago
  const handleProcessPayment = async () => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    
    try {
      // Validaciones específicas según método de pago
      if (selectedMethod === 'efectivo') {
        const tendered = parseFloat(amountTendered);
        if (isNaN(tendered) || tendered < amount) {
          throw new Error('El monto entregado debe ser igual o mayor al total');
        }
      } else if (selectedMethod === 'tarjeta_credito' || selectedMethod === 'tarjeta_debito') {
        if (!referencia) {
          throw new Error('Ingrese el número de referencia de la tarjeta');
        }
      }
      
      // Validar facturación
      if (facturar) {
        if (!clienteNombre) {
          throw new Error('Ingrese el nombre del cliente para facturar');
        }
        if (!clienteCuit) {
          throw new Error('Ingrese el CUIT/DNI del cliente para facturar');
        }
      }
      
      // Crear datos de pago
      const pagos = [{
        medioPago: selectedMethod,
        monto: amount,
        referencia: referencia || undefined,
        datosPago: selectedMethod === 'efectivo' 
          ? { entregado: parseFloat(amountTendered), cambio: change } 
          : {}
      }];
      
      // Obtener sucursalId
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // Preparar datos para la venta
      const ventaData = {
        sucursalId,
        items: items.map(item => ({
          productoId: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          descuento: item.descuento
        })),
        total: amount,
        descuento: 0, // Actualizar si hay descuento general
        facturar,
        clienteNombre: facturar ? clienteNombre : null,
        clienteCuit: facturar ? clienteCuit : null,
        pagos
      };
      
      // Enviar la venta al servidor
      const response = await authenticatedFetch('/api/pdv/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ventaData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el pago');
      }
      
      const result = await response.json();
      
      // Informar resultado
      onComplete({
        success: true,
        message: facturar 
          ? 'Venta completada. Generando factura...' 
          : 'Venta completada correctamente',
        ventaId: result.id
      });
      
      // Limpiar carrito
      clearCart();
      
      // Cerrar modal
      onClose();
    } catch (error) {
      onComplete({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error al procesar el pago' 
      });
      setIsProcessing(false);
    }
  };
  
  // Si el modal no está abierto, no renderizar
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#311716] text-white rounded-t-xl">
          <h2 className="text-xl font-bold">Procesar Pago</h2>
          <button 
            onClick={onClose}
            className="text-gray-100 hover:text-white"
            aria-label="Cerrar"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          {/* Pasos de la venta */}
          <div className="flex mb-6">
            <div 
              className={`flex-1 border-b-2 pb-2 text-center ${
                currentStep >= 1 ? 'border-[#9c7561] text-[#311716] font-medium' : 'border-gray-200 text-gray-400'
              }`}
            >
              Método de Pago
            </div>
            <div className="flex items-center mb-4">
  <input
    id="facturar"
    type="checkbox"
    checked={facturar || facturacionObligatoria}
    onChange={(e) => setFacturar(e.target.checked)}
    disabled={facturacionObligatoria}
    className="h-4 w-4 text-[#311716] focus:ring-[#9c7561] border-gray-300 rounded"
  />
  <label htmlFor="facturar" className="ml-2 block text-gray-700">
    {facturacionObligatoria 
      ? 'Facturación obligatoria para pagos electrónicos' 
      : 'Generar factura'
    }
  </label>
</div>
            <div 
              className={`flex-1 border-b-2 pb-2 text-center ${
                currentStep >= 3 ? 'border-[#9c7561] text-[#311716] font-medium' : 'border-gray-200 text-gray-400'
              }`}
            >
              Confirmación
            </div>
          </div>
          
          {/* Paso 1: Método de pago */}
          {currentStep === 1 && (
            <>
              <div className="mb-6">
                <div className="font-medium text-gray-700 mb-2">Total a pagar:</div>
                <div className="text-3xl font-bold text-[#311716]">${amount.toFixed(2)}</div>
              </div>
              
              <div className="mb-6">
                <div className="font-medium text-gray-700 mb-2">Seleccione método de pago:</div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${
                        selectedMethod === method.id
                          ? 'border-[#9c7561] bg-[#eeb077]/10 text-[#311716]'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {method.icon}
                      <span className="font-medium">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  id="facturar"
                  type="checkbox"
                  checked={facturar}
                  onChange={(e) => setFacturar(e.target.checked)}
                  className="h-4 w-4 text-[#311716] focus:ring-[#9c7561] border-gray-300 rounded"
                />
                <label htmlFor="facturar" className="ml-2 block text-gray-700">
                  Generar factura
                </label>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={goToNextStep}
                  disabled={!selectedMethod}
                  className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-50 disabled:hover:bg-[#311716]"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
          
          {/* Paso 2: Detalles según método o facturación */}
          {currentStep === 2 && (
            <>
              {selectedMethod === 'efectivo' && (
                <div className="mb-6">
                  <div className="font-medium text-gray-700 mb-2">Monto entregado:</div>
                  <input
                    type="text"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  />
                  
                  {change > 0 && (
                    <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg flex items-center justify-between">
                      <span className="font-medium">Cambio a devolver:</span>
                      <span className="text-xl font-bold">${change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {(selectedMethod === 'tarjeta_credito' || selectedMethod === 'tarjeta_debito') && (
                <div className="mb-6">
                  <div className="font-medium text-gray-700 mb-2">Número de referencia:</div>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Número de operación"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  />
                </div>
              )}
              
              {facturar && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Nombre/Razón Social:</label>
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">CUIT/DNI:</label>
                    <input
                      type="text"
                      value={clienteCuit}
                      onChange={(e) => setClienteCuit(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                    />
                  </div>
                </div>
              )}
              
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
    {/* Modal content... */}
    
    {/* Make buttons full width on mobile */}
    <div className="flex flex-col sm:flex-row gap-3 mt-6">
      <button
        onClick={goToPreviousStep}
        className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
      >
        Atrás
      </button>
      
      <button
        onClick={goToNextStep}
        className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] w-full sm:w-auto"
      >
        Continuar
      </button>
    </div>
  </div>
</div>
            </>
          )}
          
          {/* Paso 3: Confirmación */}
          {currentStep === 3 && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-[#311716] mb-3">Resumen de la venta</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Productos:</span>
                    <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Método de pago:</span>
                    <span>{paymentMethods.find(m => m.id === selectedMethod)?.name || selectedMethod}</span>
                  </div>
                  
                  {selectedMethod === 'efectivo' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monto entregado:</span>
                        <span>${amountTendered}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cambio:</span>
                        <span>${change.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {(selectedMethod === 'tarjeta_credito' || selectedMethod === 'tarjeta_debito') && referencia && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Referencia:</span>
                      <span>{referencia}</span>
                    </div>
                  )}
                  
                  {facturar && (
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Facturar a:</span>
                        <span>{clienteNombre}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">CUIT/DNI:</span>
                        <span>{clienteCuit}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-[#311716]">${amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between gap-3">
                <button
                  onClick={goToPreviousStep}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  disabled={isProcessing}
                >
                  Atrás
                </button>
                
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-70 flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2" size={18} />
                      Confirmar Pago
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}