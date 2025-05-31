// src/components/pdv/CheckoutModal.tsx - VERSIÓN MEJORADA CON SELECCIÓN A/B
'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { 
  CreditCard, DollarSign, QrCode, Smartphone, X, Check, Loader, 
  Plus, Trash, ArrowLeft, Receipt, AlertCircle, Percent, User, FileText
} from 'lucide-react';
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
  
  // 🆕 ESTADOS PARA FACTURACIÓN MEJORADA
  const [facturar, setFacturar] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B'); // Por defecto factura B
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [facturacionObligatoria, setFacturacionObligatoria] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [generalDiscount, setGeneralDiscount] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    value: number;
    type: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  // Métodos de pago disponibles
  const paymentMethods: PaymentMethod[] = [
    { id: 'efectivo', name: 'Efectivo', icon: <DollarSign size={24} className="text-green-600" /> },
    { id: 'tarjeta_credito', name: 'Tarjeta de Crédito', icon: <CreditCard size={24} className="text-blue-600" /> },
    { id: 'tarjeta_debito', name: 'Tarjeta de Débito', icon: <CreditCard size={24} className="text-purple-600" /> },
    { id: 'qr', name: 'Pago con QR', icon: <QrCode size={24} className="text-indigo-600" /> },
    { id: 'transferencia', name: 'Transferencia', icon: <Smartphone size={24} className="text-orange-600" /> }
  ];
  
  // Inicializar al abrir modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Reset del estado
      setCurrentStep(1);
      setGeneralDiscount(0);
      setAppliedDiscount(null);
      setDiscountCode('');
      setValidationErrors({});
      setFacturar(false);
      setTipoFactura('B'); // 🆕 Resetear a factura B por defecto
      setClienteNombre('');
      setClienteCuit('');
      
      // Inicializar el primer método de pago con el total
      const total = getTotal();
      setPayments([{ method: 'efectivo', amount: total, reference: '' }]);
      setAmountTendered(total.toFixed(2));
      setRemainingAmount(0);
      
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, getTotal]);
  
  // 🆕 FUNCIÓN PARA VALIDAR LÍMITES DE FACTURAS B
  const validarLimiteFacturaB = () => {
    const total = getTotalWithDiscount();
    // Las facturas B tienen un límite para consumidores finales 
    const LIMITE_FACTURA_B = 15380; // Según el código de facturación
    
    if (tipoFactura === 'B' && total >= LIMITE_FACTURA_B && (!clienteCuit || clienteCuit.trim() === '')) {
      return `Para montos ≥ $${LIMITE_FACTURA_B.toLocaleString()} se requiere CUIT del cliente`;
    }
    return null;
  };

  // 🆕 FUNCIÓN PARA VALIDAR CUIT
  const validarCuit = (cuit: string): boolean => {
    // Eliminar guiones y espacios
    const cuitLimpio = cuit.replace(/[-\s]/g, '');
    
    // Verificar que tenga 11 dígitos
    if (cuitLimpio.length !== 11 || !/^\d{11}$/.test(cuitLimpio)) {
      return false;
    }
    
    // Algoritmo de validación de CUIT
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    
    for (let i = 0; i < 10; i++) {
      suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    return parseInt(cuitLimpio[10]) === digitoVerificador;
  };

  // Manejar cambio de método de pago
  const handlePaymentMethodChange = (index: number, methodId: string) => {
    if (payments.some(p => p.method === methodId) && methodId !== payments[index].method) {
      setValidationErrors({
        ...validationErrors,
        payment: `El método de pago ${paymentMethods.find(m => m.id === methodId)?.name} ya está en uso`
      });
      return;
    }
    
    setValidationErrors({ ...validationErrors, payment: '' });
    
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], method: methodId, reference: '' };
    setPayments(newPayments);
    
    // 🆕 VERIFICAR FACTURACIÓN OBLIGATORIA SEGÚN MEDIO DE PAGO
    const requiresInvoice = ['tarjeta_credito', 'tarjeta_debito', 'qr', 'transferencia'].includes(methodId);
    setFacturacionObligatoria(requiresInvoice);
    if (requiresInvoice) {
      setFacturar(true);
      // Para pagos electrónicos, sugerir factura A si el monto lo justifica
      if (getTotalWithDiscount() > 50000) {
        setTipoFactura('A');
      }
    }
  };

  // Calcular total final con descuento
  const getTotalWithDiscount = () => {
    const subtotal = getTotal();
    
    let discount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'porcentaje') {
        discount += subtotal * (appliedDiscount.value / 100);
      } else if (appliedDiscount.type === 'monto_fijo') {
        discount += appliedDiscount.value;
      }
    }
    
    if (generalDiscount > 0) {
      discount += subtotal * (generalDiscount / 100);
    }
    
    discount = Math.min(discount, subtotal);
    return subtotal - discount;
  };
  
  // Actualizar monto cuando cambia el carrito o descuentos
  useEffect(() => {
    const total = getTotalWithDiscount();
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, total - paidAmount);
    setRemainingAmount(remaining);

    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: total }]);
      if (payments[0].method === 'efectivo') {
        setAmountTendered(total.toFixed(2));
      }
    }
  }, [getTotal, payments.length, appliedDiscount, generalDiscount]);
  
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

  // Manejar cambio en monto de pago
  const handlePaymentAmountChange = (index: number, value: string) => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    
    const total = getTotalWithDiscount();
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], amount };
    
    const paidAmount = newPayments.reduce((sum, payment, i) => i !== index ? sum + payment.amount : sum + amount, 0);
    const remaining = Math.max(0, total - paidAmount);
    
    setRemainingAmount(remaining);
    setPayments(newPayments);
    
    if (newPayments[index].method === 'efectivo') {
      setAmountTendered(amount.toFixed(2));
    }
  };

  // Agregar método de pago adicional
  const addPaymentMethod = () => {
    if (payments.length >= 2) {
      setValidationErrors({
        ...validationErrors,
        payment: 'Máximo 2 métodos de pago permitidos'
      });
      return;
    }
    
    setValidationErrors({ ...validationErrors, payment: '' });
    
    if (remainingAmount > 0) {
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
      
      const newRemainingAmount = remainingAmount + removedPayment.amount;
      
      setPayments(newPayments);
      setRemainingAmount(newRemainingAmount);
      
      if (newPayments.length === 1 && newPayments[0].method === 'efectivo') {
        const totalAmount = getTotalWithDiscount();
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
    
    if (value && validationErrors.reference) {
      setValidationErrors({ ...validationErrors, reference: '' });
    }
  };
  
  // Verificar código de descuento
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    setIsApplyingDiscount(true);
    setValidationErrors({ ...validationErrors, discount: '' });
    
    try {
      const response = await authenticatedFetch(`/api/pdv/descuentos/verificar?codigo=${discountCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        setValidationErrors({ 
          ...validationErrors, 
          discount: data.error || 'Código inválido' 
        });
        return;
      }
      
      const data = await response.json();
      
      setAppliedDiscount({
        code: discountCode,
        value: data.valor,
        type: data.tipoDescuento
      });
      
      const newTotal = getTotalWithDiscount();
      if (payments.length === 1) {
        setPayments([{ ...payments[0], amount: newTotal }]);
        if (payments[0].method === 'efectivo') {
          setAmountTendered(newTotal.toFixed(2));
        }
      }
      
    } catch (error) {
      console.error('Error al verificar código de descuento:', error);
      setValidationErrors({ 
        ...validationErrors, 
        discount: 'Error al verificar código' 
      });
    } finally {
      setIsApplyingDiscount(false);
    }
  };
  
  // Ir al siguiente paso
  const goToNextStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      // Validar que se han seleccionado métodos de pago
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const total = getTotalWithDiscount();
      
      if (Math.abs(totalPaid - total) > 0.01) {
        newErrors.total = 'El monto total de los pagos debe ser igual al total de la venta';
      }
      
      // Validar que los pagos en efectivo tienen monto entregado
      const effectivePayment = payments.find(p => p.method === 'efectivo');
      if (effectivePayment) {
        const tendered = parseFloat(amountTendered);
        if (isNaN(tendered) || tendered < effectivePayment.amount) {
          newErrors.tendered = 'El monto entregado en efectivo debe ser igual o mayor al monto a pagar';
        }
      }
      
      // Validar que los pagos con tarjeta tienen referencia
      const cardPayments = payments.filter(p => 
        p.method === 'tarjeta_credito' || p.method === 'tarjeta_debito'
      );
      
      if (cardPayments.some(p => !p.reference)) {
        newErrors.reference = 'Debe ingresar un número de referencia para los pagos con tarjeta';
      }
      
      // 🆕 VALIDAR LÍMITES DE FACTURA B
      if (facturar && tipoFactura === 'B') {
        const errorLimite = validarLimiteFacturaB();
        if (errorLimite) {
          newErrors.facturaLimite = errorLimite;
        }
      }
      
      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        return;
      }
    }
    
    if (currentStep === 2 && facturar) {
      // 🆕 VALIDACIONES MEJORADAS SEGÚN TIPO DE FACTURA
      if (tipoFactura === 'A') {
        // Factura A: CUIT y Razón Social obligatorios
        if (!clienteNombre || clienteNombre.trim() === '') {
          newErrors.clienteNombre = 'La razón social es obligatoria para facturas A';
        }
        
        if (!clienteCuit || clienteCuit.trim() === '') {
          newErrors.clienteCuit = 'El CUIT es obligatorio para facturas A';
        } else if (!validarCuit(clienteCuit)) {
          newErrors.clienteCuit = 'El CUIT ingresado no es válido';
        }
      } else if (tipoFactura === 'B') {
        // Factura B: Validar límites y CUIT si es necesario
        const errorLimite = validarLimiteFacturaB();
        if (errorLimite) {
          newErrors.facturaLimite = errorLimite;
        }
        
        // Si se proporciona CUIT, validarlo
        if (clienteCuit && clienteCuit.trim() !== '' && !validarCuit(clienteCuit)) {
          newErrors.clienteCuit = 'El CUIT ingresado no es válido';
        }
        
        // Si no hay CUIT pero sí hay nombre, está bien (consumidor final con nombre)
        // Si no hay ninguno, será consumidor final genérico
      }
      
      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        return;
      }
    }
    
    setValidationErrors({});
    setCurrentStep(currentStep + 1);
  };
  
  // Volver al paso anterior
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Procesar pago
  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setValidationErrors({});
    
    try {
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const total = getTotalWithDiscount();
      
      if (Math.abs(totalPaid - total) > 0.01) {
        throw new Error('El monto total de los pagos debe ser igual al total de la venta');
      }
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      let descuentoTotal = 0;
      if (appliedDiscount) {
        if (appliedDiscount.type === 'porcentaje') {
          descuentoTotal += getTotal() * (appliedDiscount.value / 100);
        } else {
          descuentoTotal += appliedDiscount.value;
        }
      }
      
      if (generalDiscount > 0) {
        descuentoTotal += getTotal() * (generalDiscount / 100);
      }
      
      const ventaData = {
        sucursalId,
        items: items.map(item => ({
          productoId: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          descuento: item.descuento
        })),
        total: getTotalWithDiscount(),
        descuento: descuentoTotal,
        codigoDescuento: appliedDiscount?.code,
        // 🔧 CORRECCIÓN: Separar facturar del tipo
        facturar: facturar, // Boolean
        tipoFactura: facturar ? tipoFactura : null, // String o null
        clienteNombre: facturar ? (clienteNombre || null) : null,
        clienteCuit: facturar ? (clienteCuit || null) : null,
        pagos: payments.map(payment => ({
          medioPago: payment.method,
          monto: payment.amount,
          referencia: payment.reference || undefined,
          datosPago: payment.method === 'efectivo' 
            ? { entregado: parseFloat(amountTendered), cambio: change } 
            : {}
        }))
      };
      
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
      
      onComplete({
        success: true,
        message: facturar 
          ? `Venta completada con factura ${tipoFactura}. ${result.cae ? 'CAE: ' + result.cae : 'Procesando facturación...'}` 
          : 'Venta completada correctamente',
        ventaId: result.id
      });
      
      clearCart();
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" 
      aria-modal="true" role="dialog" aria-labelledby="checkout-title">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all"
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#311716] text-white rounded-t-xl">
          <h2 id="checkout-title" className="text-xl font-bold">Procesar Pago</h2>
          <button 
            onClick={onClose}
            className="text-gray-100 hover:text-white p-1 rounded-full hover:bg-[#462625] transition-colors"
            aria-label="Cerrar"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {/* Pasos de la venta */}
          <div className="flex items-center mb-6">
            <div 
              className={`flex-1 flex flex-col items-center ${
                currentStep >= 1 ? 'text-[#311716]' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                ${currentStep >= 1 ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="text-xs font-medium">Pago</span>
            </div>
            
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-[#311716]' : 'bg-gray-300'}`}></div>
            
            <div 
              className={`flex-1 flex flex-col items-center ${
                currentStep >= 2 ? 'text-[#311716]' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                ${currentStep >= 2 ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="text-xs font-medium">Cliente</span>
            </div>
            
            <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-[#311716]' : 'bg-gray-300'}`}></div>
            
            <div 
              className={`flex-1 flex flex-col items-center ${
                currentStep >= 3 ? 'text-[#311716]' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                ${currentStep >= 3 ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="text-xs font-medium">Confirmar</span>
            </div>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto px-1 pb-4">
            {/* Paso 1: Método de pago */}
            {currentStep === 1 && (
              <>
                {/* Total y descuentos */}
                <div className="mb-5 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-700">Subtotal:</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                  
                  {/* Descuento por código */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Código de descuento"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          disabled={!!appliedDiscount || isApplyingDiscount}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                        />
                      </div>
                      <button
                        onClick={handleApplyDiscount}
                        disabled={!discountCode || !!appliedDiscount || isApplyingDiscount}
                        className="px-3 py-2 bg-[#9c7561] text-white rounded-lg text-sm hover:bg-[#8a6550] disabled:opacity-50 disabled:hover:bg-[#9c7561]"
                      >
                        {isApplyingDiscount ? (
                          <span className="flex items-center">
                            <Loader size={14} className="animate-spin mr-1" />
                            Verificando...
                          </span>
                        ) : (
                          'Aplicar'
                        )}
                      </button>
                    </div>
                    
                    {validationErrors.discount && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.discount}</p>
                    )}
                    
                    {appliedDiscount && (
                      <div className="flex items-center justify-between text-sm mb-2 text-green-600 bg-green-50 p-2 rounded">
                        <span className="flex items-center">
                          <Percent size={14} className="mr-1" />
                          Descuento aplicado: 
                          {appliedDiscount.type === 'porcentaje' 
                            ? ` ${appliedDiscount.value}%` 
                            : ` $${appliedDiscount.value}`}
                        </span>
                        <button 
                          onClick={() => setAppliedDiscount(null)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Descuento manual porcentual */}
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descuento manual (%):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={generalDiscount}
                      onChange={(e) => setGeneralDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                    />
                  </div>
                  
                  {/* Total final */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
                    <span className="text-lg">Total a pagar:</span>
                    <span className="text-lg text-[#311716]">${getTotalWithDiscount().toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Métodos de pago */}
                <div className="space-y-4 mb-4">
                  {payments.map((payment, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-medium text-gray-700">
                          {index === 0 ? 'Método de pago principal' : 'Método adicional'}
                        </div>
                        
                        {index > 0 && (
                          <button 
                            onClick={() => removePaymentMethod(index)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            aria-label="Eliminar método de pago"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => handlePaymentMethodChange(index, method.id)}
                            className={`p-2 rounded-lg border flex items-center gap-2 transition-colors ${
                              payment.method === method.id
                                ? 'border-[#9c7561] bg-[#eeb077]/10 text-[#311716]'
                                : 'border-gray-200 hover:bg-gray-50'
                            } ${payments.some((p, i) => i !== index && p.method === method.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={payments.some((p, i) => i !== index && p.method === method.id)}
                          >
                            {method.icon}
                            <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">{method.name}</span>
                          </button>
                        ))}
                      </div>
                      
                      {validationErrors.payment && (
                        <p className="text-xs text-red-500 mb-3">{validationErrors.payment}</p>
                      )}
                      
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
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
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
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561]"
                            />
                            
                            {validationErrors.tendered && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.tendered}</p>
                            )}
                            
                            {change > 0 && (
                              <div className="mt-2 p-2 bg-green-50 text-green-800 rounded-lg flex items-center justify-between">
                                <span className="font-medium">Cambio a devolver:</span>
                                <span className="text-lg font-bold">${change.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(['tarjeta_credito', 'tarjeta_debito', 'transferencia'].includes(payment.method)) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {payment.method.includes('tarjeta') ? 'Número de referencia:' : 'Número de transferencia:'}
                            </label>
                            <input
                              type="text"
                              value={payment.reference}
                              onChange={(e) => handleReferenceChange(index, e.target.value)}
                              placeholder="Número de operación"
                              className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] ${
                                validationErrors.reference && !payment.reference 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                            />
                            
                            {validationErrors.reference && !payment.reference && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.reference}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Botón para agregar método adicional */}
                {payments.length < 2 && remainingAmount > 0 && (
                  <button
                    onClick={addPaymentMethod}
                    className="w-full py-2 px-4 border border-[#9c7561] text-[#311716] rounded-lg flex items-center justify-center hover:bg-[#eeb077]/10 mb-4"
                  >
                    <Plus size={18} className="mr-2" />
                    Agregar método de pago adicional
                  </button>
                )}
                
                {/* Mensaje de error de total */}
                {validationErrors.total && (
                  <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-lg flex items-center">
                    <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                    <p className="text-sm">{validationErrors.total}</p>
                  </div>
                )}

                {/* Error de límite de factura */}
                {validationErrors.facturaLimite && (
                  <div className="mb-4 p-2 bg-amber-50 text-amber-700 rounded-lg flex items-center">
                    <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                    <p className="text-sm">{validationErrors.facturaLimite}</p>
                  </div>
                )}
                
                {/* 🆕 SECCIÓN DE FACTURACIÓN MEJORADA */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-3">
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
                        : 'Generar factura electrónica'
                      }
                    </label>
                  </div>
                  
                  {/* 🆕 SELECTOR DE TIPO DE FACTURA */}
                  {facturar && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de factura:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTipoFactura('A')}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            tipoFactura === 'A' 
                              ? 'border-[#311716] bg-[#311716] text-white' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="text-center">
                            <FileText className="h-6 w-6 mx-auto mb-1" />
                            <div className="font-bold">Factura A</div>
                            <div className="text-xs opacity-75">
                              {tipoFactura === 'A' ? 'IVA discriminado' : 'Responsable Inscripto'}
                            </div>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setTipoFactura('B')}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            tipoFactura === 'B' 
                              ? 'border-[#311716] bg-[#311716] text-white' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="text-center">
                            <Receipt className="h-6 w-6 mx-auto mb-1" />
                            <div className="font-bold">Factura B</div>
                            <div className="text-xs opacity-75">
                              {tipoFactura === 'B' ? 'IVA incluido' : 'Consumidor Final'}
                            </div>
                          </div>
                        </button>
                      </div>
                      
                      {/* 🆕 INFORMACIÓN SOBRE TIPOS DE FACTURA */}
                      <div className="mt-3 text-xs text-blue-700">
                        {tipoFactura === 'A' ? (
                          <div>
                            <strong>Factura A:</strong> Requiere CUIT del cliente. IVA discriminado. 
                            Para operaciones entre Responsables Inscriptos.
                          </div>
                        ) : (
                          <div>
                            <strong>Factura B:</strong> Para Consumidores Finales. IVA incluido en el precio. 
                            {getTotalWithDiscount() >= 15380 && ' ⚠️ Requiere identificación del cliente para montos ≥ $15.380.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {facturacionObligatoria && (
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      <span className="flex items-center">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        Los pagos con tarjeta y transferencias requieren factura electrónica
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Paso 2: Datos de cliente para facturación */}
            {currentStep === 2 && (
              <>
                {facturar ? (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2 text-[#311716]">
                      <Receipt className="h-5 w-5 mr-2" />
                      <h3 className="font-medium">
                        Datos para factura {tipoFactura}
                      </h3>
                    </div>
                    
                    {/* 🆕 INFORMACIÓN ESPECÍFICA SEGÚN TIPO */}
                    <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border-l-4 border-blue-400">
                      {tipoFactura === 'A' ? (
                        <>
                          <strong>Factura A - Responsable Inscripto:</strong><br />
                          • CUIT y Razón Social son obligatorios<br />
                        </>
                      ) : (
                        <>
                          <strong>Factura B - Consumidor Final:</strong><br />
                          • CUIT/DNI opcional (excepto para montos ≥ $15.380)<br />
                          • IVA incluido en el precio<br />
                        </>
                      )}
                    </div>
                    
                    {/* Campo Nombre/Razón Social */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tipoFactura === 'A' ? 'Razón Social: *' : 'Nombre (opcional):'}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                          className={`w-full p-2 pl-10 border rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] ${
                            validationErrors.clienteNombre ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder={tipoFactura === 'A' ? 'Razón social del cliente' : 'Nombre del cliente (opcional)'}
                        />
                      </div>
                      {validationErrors.clienteNombre && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.clienteNombre}</p>
                      )}
                    </div>
                    
                    {/* Campo CUIT/DNI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tipoFactura === 'A' ? 'CUIT: *' : 
                         (getTotalWithDiscount() >= 15380 ? 'CUIT/DNI: *' : 'CUIT/DNI (opcional):')}
                      </label>
                      <input
                        type="text"
                        value={clienteCuit}
                        onChange={(e) => setClienteCuit(e.target.value)}
                        className={`w-full p-2 border rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] ${
                          validationErrors.clienteCuit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={tipoFactura === 'A' ? '20-12345678-9' : 'CUIT/DNI sin guiones'}
                        maxLength={13}
                      />
                      {validationErrors.clienteCuit && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.clienteCuit}</p>
                      )}
                      
                      {/* Error de límite de factura B */}
                      {validationErrors.facturaLimite && (
                        <p className="text-xs text-amber-600 mt-1 bg-amber-50 p-2 rounded">
                          {validationErrors.facturaLimite}
                        </p>
                      )}
                    </div>
                    
                    {/* Información adicional según el tipo */}
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-sm mt-3">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500" />
                        <div>
                          {tipoFactura === 'A' ? (
                            <p>
                              <strong>Importante:</strong> Verifique que la razón social y CUIT sean correctos. 
                            </p>
                          ) : (
                            <p>
                              <strong>Factura B:</strong> Si no proporciona datos, se emitirá como "Consumidor Final". 
                              {getTotalWithDiscount() >= 15380 && ' Para este monto es obligatorio identificar al cliente.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-lg">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-lg font-medium text-gray-700 mb-2">No se requiere facturación</p>
                    <p className="text-gray-500">Continúe para finalizar la venta sin generar factura.</p>
                  </div>
                )}
              </>
            )}
            
            {/* Paso 3: Confirmación */}
            {currentStep === 3 && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-[#311716] mb-3 flex items-center">
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                    Resumen de la venta
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Productos:</span>
                      <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>${getTotal().toFixed(2)}</span>
                    </div>
                    
                    {(appliedDiscount || generalDiscount > 0) && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento:</span>
                        <span>-${(getTotal() - getTotalWithDiscount()).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {payments.map((payment, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {paymentMethods.find(m => m.id === payment.method)?.name || payment.method}:
                        </span>
                        <span>${payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    
                    {payments.some(p => p.method === 'efectivo') && change > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cambio:</span>
                        <span>${change.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {facturar && (
                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tipo de factura:</span>
                          <span className="font-medium">Factura {tipoFactura}</span>
                        </div>
                        
                        {clienteNombre && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {tipoFactura === 'A' ? 'Razón Social:' : 'Cliente:'}
                            </span>
                            <span className="text-right">{clienteNombre}</span>
                          </div>
                        )}
                        
                        {clienteCuit && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">CUIT/DNI:</span>
                            <span>{clienteCuit}</span>
                          </div>
                        )}
                        
                        {!clienteNombre && !clienteCuit && tipoFactura === 'B' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cliente:</span>
                            <span className="text-gray-500 italic">Consumidor Final</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-[#311716]">${getTotalWithDiscount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg flex items-start mb-4">
                  <AlertCircle className="text-blue-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 text-sm">
                      Al confirmar esta venta:
                    </p>
                    <ul className="text-blue-700 text-sm list-disc pl-5 mt-1 space-y-1">
                      <li>Se descontará el stock de los productos</li>
                      <li>Se registrará en el historial de ventas</li>
                      {facturar && (
                        <li>Se generará una factura electrónica tipo {tipoFactura}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Botones de navegación */}
          <div className="flex justify-between gap-3 mt-4 border-t border-gray-100 pt-4">
            {currentStep > 1 ? (
              <button
                onClick={goToPreviousStep}
                disabled={isProcessing}
                className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                Volver
              </button>
            ) : (
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                ref={initialFocusRef}
                onClick={goToNextStep}
                className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-70 transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="py-2 px-4 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-70 flex items-center transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader className="animate-spin mr-2" size={16} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2" size={16} />
                    Confirmar Venta
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}