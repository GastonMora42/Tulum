// src/components/pdv/CheckoutModal.tsx - Actualizado para múltiples métodos de pago
'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { CreditCard, DollarSign, QrCode, Smartphone, X, Check, Loader, Plus, Trash } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface Payment {
  method: string;
  amount: number;
  reference?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: { success: boolean; message?: string; ventaId?: string }) => void;
}

export function CheckoutModal({ isOpen, onClose, onComplete }: CheckoutModalProps) {
  const { items, getTotal, clearCart } = useCartStore();
  const [payments, setPayments] = useState<Payment[]>([{ method: 'efectivo', amount: 0, reference: '' }]);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facturar, setFacturar] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [facturacionObligatoria, setFacturacionObligatoria] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);

  // Métodos de pago disponibles
  const paymentMethods: PaymentMethod[] = [
    { id: 'efectivo', name: 'Efectivo', icon: <DollarSign size={24} className="text-green-600" /> },
    { id: 'tarjeta_credito', name: 'Tarjeta de Crédito', icon: <CreditCard size={24} className="text-blue-600" /> },
    { id: 'tarjeta_debito', name: 'Tarjeta de Débito', icon: <CreditCard size={24} className="text-purple-600" /> },
    { id: 'qr', name: 'Pago con QR', icon: <QrCode size={24} className="text-indigo-600" /> },
    { id: 'transferencia', name: 'Transferencia', icon: <Smartphone size={24} className="text-orange-600" /> }
  ];
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Inicializar el primer método de pago con el total
      const total = getTotal();
      setPayments([{ method: 'efectivo', amount: total, reference: '' }]);
      setAmountTendered(total.toFixed(2));
      setRemainingAmount(0);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, getTotal]);
  
  // Actualizar monto cuando cambia el carrito
  useEffect(() => {
    const total = getTotal();
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, total - paidAmount);
    setRemainingAmount(remaining);

    // Si solo hay un método de pago, actualizar automáticamente su cantidad al total
    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: total }]);
      if (payments[0].method === 'efectivo') {
        setAmountTendered(total.toFixed(2));
      }
    }
  }, [getTotal, payments.length]);
  
  // Calcular cambio cuando cambia el monto entregado
  useEffect(() => {
    if (payments.some(p => p.method === 'efectivo') && amountTendered !== '') {
      const effectivePayment = payments.find(p => p.method === 'efectivo');
      if (effectivePayment) {
        const tendered = parseFloat(amountTendered);
        if (!isNaN(tendered)) {
          setChange(Math.max(0, tendered - effectivePayment.amount));
        } else {
          setChange(0);
        }
      }
    } else {
      setChange(0);
    }
  }, [amountTendered, payments]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPayments([{ method: 'efectivo', amount: 0, reference: '' }]);
        setAmountTendered('');
        setFacturar(false);
        setClienteNombre('');
        setClienteCuit('');
        setCurrentStep(1);
        setRemainingAmount(0);
      }, 300);
    }
  }, [isOpen]);

  // Manejar cambio en método de pago
  const handlePaymentMethodChange = (index: number, methodId: string) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], method: methodId, reference: '' };
    setPayments(newPayments);
    
    // Verificar si hay facturación obligatoria
    const requiresInvoice = ['tarjeta_credito', 'tarjeta_debito', 'qr'].includes(methodId);
    setFacturacionObligatoria(requiresInvoice);
    if (requiresInvoice) setFacturar(true);
  };

  // Manejar cambio en monto de pago
  const handlePaymentAmountChange = (index: number, value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    
    const total = getTotal();
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], amount };
    
    // Calcular restante
    const paidAmount = newPayments.reduce((sum, payment, i) => i !== index ? sum + payment.amount : sum + amount, 0);
    const remaining = Math.max(0, total - paidAmount);
    
    setRemainingAmount(remaining);
    setPayments(newPayments);
    
    // Si es efectivo, actualizar también el monto entregado
    if (newPayments[index].method === 'efectivo') {
      setAmountTendered(amount.toFixed(2));
    }
  };

  // Agregar método de pago adicional
  const addPaymentMethod = () => {
    if (payments.length < 2 && remainingAmount > 0) {
      // Evitar duplicar el mismo método
      const availableMethods = paymentMethods.filter(method => 
        !payments.some(p => p.method === method.id)
      );
      
      if (availableMethods.length > 0) {
        const newPayments = [...payments];
        newPayments.push({ 
          method: availableMethods[0].id, 
          amount: remainingAmount,
          reference: '' 
        });
        setPayments(newPayments);
        setRemainingAmount(0);
      }
    }
  };

  // Eliminar método de pago
  const removePaymentMethod = (index: number) => {
    if (payments.length > 1) {
      const removedPayment = payments[index];
      const newPayments = payments.filter((_, i) => i !== index);
      
      // Recalcular restante
      const newRemainingAmount = remainingAmount + removedPayment.amount;
      
      setPayments(newPayments);
      setRemainingAmount(newRemainingAmount);
      
      // Si el único pago restante es efectivo, actualizar su monto
      if (newPayments.length === 1 && newPayments[0].method === 'efectivo') {
        const totalAmount = getTotal();
        newPayments[0].amount = totalAmount;
        setAmountTendered(totalAmount.toFixed(2));
        setRemainingAmount(0);
      }
    }
  };

  // Manejar cambio en referencia de pago
  const handleReferenceChange = (index: number, value: string) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], reference: value };
    setPayments(newPayments);
  };
  
  // Ir al siguiente paso
  const goToNextStep = () => {
    if (currentStep === 1) {
      // Validar que se han seleccionado métodos de pago
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const total = getTotal();
      
      if (Math.abs(totalPaid - total) > 0.01) {
        alert('El monto total de los pagos debe ser igual al total de la venta.');
        return;
      }
      
      // Validar que los pagos en efectivo tienen monto entregado
      const effectivePayment = payments.find(p => p.method === 'efectivo');
      if (effectivePayment) {
        const tendered = parseFloat(amountTendered);
        if (isNaN(tendered) || tendered < effectivePayment.amount) {
          alert('El monto entregado en efectivo debe ser igual o mayor al monto a pagar.');
          return;
        }
      }
      
      // Validar que los pagos con tarjeta tienen referencia
      const cardPayments = payments.filter(p => 
        p.method === 'tarjeta_credito' || p.method === 'tarjeta_debito'
      );
      
      if (cardPayments.some(p => !p.reference)) {
        alert('Debe ingresar un número de referencia para los pagos con tarjeta.');
        return;
      }
    }
    
    if (currentStep === 2 && facturar) {
      // Validar datos de facturación
      if (!clienteNombre) {
        alert('Debe ingresar el nombre del cliente para facturar.');
        return;
      }
      
      if (!clienteCuit) {
        alert('Debe ingresar el CUIT/DNI del cliente para facturar.');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };
  
  // Volver al paso anterior
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Procesar pago
  const handleProcessPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Verificar montos de pago
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const total = getTotal();
      
      if (Math.abs(totalPaid - total) > 0.01) {
        throw new Error('El monto total de los pagos debe ser igual al total de la venta.');
      }
      
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
        total,
        descuento: 0, // Actualizar si hay descuento general
        facturar,
        clienteNombre: facturar ? clienteNombre : null,
        clienteCuit: facturar ? clienteCuit : null,
        pagos: payments.map(payment => ({
          medioPago: payment.method,
          monto: payment.amount,
          referencia: payment.reference || undefined,
          datosPago: payment.method === 'efectivo' 
            ? { entregado: parseFloat(amountTendered), cambio: change } 
            : {}
        }))
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
    } finally {
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
            <div 
              className={`flex-1 border-b-2 pb-2 text-center ${
                currentStep >= 2 ? 'border-[#9c7561] text-[#311716] font-medium' : 'border-gray-200 text-gray-400'
              }`}
            >
              Datos Cliente
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
                <div className="text-3xl font-bold text-[#311716]">${getTotal().toFixed(2)}</div>
              </div>
              
              {/* Mostrar métodos de pago seleccionados */}
              <div className="space-y-4 mb-4">
                {payments.map((payment, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium text-gray-700">
                        {index === 0 ? 'Método de pago' : 'Método adicional'}
                      </div>
                      
                      {index > 0 && (
                        <button 
                          onClick={() => removePaymentMethod(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handlePaymentMethodChange(index, method.id)}
                          className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                            payment.method === method.id
                              ? 'border-[#9c7561] bg-[#eeb077]/10 text-[#311716]'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                          disabled={payments.some((p, i) => i !== index && p.method === method.id)}
                        >
                          {method.icon}
                          <span className="font-medium text-sm">{method.name}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monto a pagar con este método:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payment.amount}
                          onChange={(e) => handlePaymentAmountChange(index, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                        />
                      </div>
                      
                      {payment.method === 'efectivo' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monto entregado:
                          </label>
                          <input
                            type="text"
                            value={amountTendered}
                            onChange={(e) => setAmountTendered(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                          />
                          
                          {change > 0 && (
                            <div className="mt-2 p-2 bg-green-50 text-green-800 rounded-lg flex items-center justify-between">
                              <span className="font-medium">Cambio a devolver:</span>
                              <span className="text-lg font-bold">${change.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {(payment.method === 'tarjeta_credito' || payment.method === 'tarjeta_debito') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de referencia:
                          </label>
                          <input
                            type="text"
                            value={payment.reference}
                            onChange={(e) => handleReferenceChange(index, e.target.value)}
                            placeholder="Número de operación"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                          />
                        </div>
                      )}
                      
                      {payment.method === 'transferencia' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de transferencia:
                          </label>
                          <input
                            type="text"
                            value={payment.reference}
                            onChange={(e) => handleReferenceChange(index, e.target.value)}
                            placeholder="Número de operación"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Mostrar botón para agregar método adicional */}
              {payments.length < 2 && remainingAmount > 0 && (
                <button
                  onClick={addPaymentMethod}
                  className="w-full py-2 px-4 border border-[#9c7561] text-[#311716] rounded-lg flex items-center justify-center hover:bg-[#eeb077]/10"
                >
                  <Plus size={18} className="mr-2" />
                  Agregar método de pago adicional
                </button>
              )}
              
              {/* Opción de facturación */}
              <div className="flex items-center mt-4 mb-4">
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
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={goToNextStep}
                  disabled={
                    payments.reduce((sum, p) => sum + p.amount, 0) !== getTotal() ||
                    (payments.some(p => p.method === 'efectivo') && 
                      (parseFloat(amountTendered) < payments.find(p => p.method === 'efectivo')?.amount || 0)) ||
                    (payments.some(p => ['tarjeta_credito', 'tarjeta_debito'].includes(p.method)) && 
                      payments.filter(p => ['tarjeta_credito', 'tarjeta_debito'].includes(p.method))
                        .some(p => !p.reference))
                  }
                  className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-50 disabled:hover:bg-[#311716]"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
          
          {/* Paso 2: Datos de cliente para facturación */}
          {currentStep === 2 && (
            <>
              {facturar ? (
                <div className="space-y-4">
                  <p className="text-gray-700">Por favor ingrese los datos del cliente para la facturación:</p>
                  
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
              ) : (
                <div className="py-8 text-center">
                  <p className="text-lg font-medium text-gray-700 mb-2">No se requiere facturación</p>
                  <p className="text-gray-500">Haga clic en Continuar para proceder al pago.</p>
                </div>
              )}
              
              <div className="flex justify-between gap-3 mt-6">
                <button
                  onClick={goToPreviousStep}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
                >
                  Atrás
                </button>
                
                <button
                  onClick={goToNextStep}
                  disabled={facturar && (!clienteNombre || !clienteCuit)}
                  className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] w-full sm:w-auto disabled:opacity-50"
                >
                  Continuar
                </button>
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
                  
                  {payments.map((payment, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {paymentMethods.find(m => m.id === payment.method)?.name || payment.method}:
                      </span>
                      <span>${payment.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {payments.some(p => p.method === 'efectivo') && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monto entregado (efectivo):</span>
                        <span>${amountTendered}</span>
                      </div>
                      
                      {change > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cambio:</span>
                          <span>${change.toFixed(2)}</span>
                        </div>
                      )}
                    </>
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
                    <span className="text-[#311716]">${getTotal().toFixed(2)}</span>
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