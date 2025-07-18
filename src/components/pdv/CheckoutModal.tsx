// src/components/pdv/CheckoutModal.tsx - VERSIÓN CORREGIDA COMPLETA
'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { 
  CreditCard, DollarSign, QrCode, Smartphone, X, Check, Loader, 
  Plus, Trash, ArrowLeft, Receipt, AlertCircle, Percent, User, FileText,
  Printer, Settings as SettingsIcon, CheckCircle, AlertTriangle, Wifi
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { usePrint } from '@/hooks/usePrint';

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
  onComplete: (result: { success: boolean; message?: string; ventaId?: string; facturaId?: string }) => void;
}

export function CheckoutModal({ isOpen, onClose, onComplete }: CheckoutModalProps) {
  const { items, getTotal, clearCart } = useCartStore();
  const [payments, setPayments] = useState<Payment[]>([{ method: 'efectivo', amount: 0, reference: '' }]);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para facturación mejorada
  const [facturar, setFacturar] = useState(false);
  const [tipoFactura, setTipoFactura] = useState<'A' | 'B'>('B');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  
  // 🆕 ESTADOS PARA SISTEMA DE IMPRESIÓN CORREGIDO
  const [printConfig, setPrintConfig] = useState({
    autoPrint: true,
    selectedPrinter: '',
    copies: 1,
    showPreview: false
  });
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  
  // 🆕 HOOK DE IMPRESIÓN ACTUALIZADO
  const { 
    isInitialized: printInitialized, 
    availablePrinters, 
    printFactura, 
    isLoading: printLoading,
    lastError: printError 
  } = usePrint();
  
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
    { id: 'tarjeta_debito', name: 'Tarjeta de Débito', icon: <CreditCard size={24} className="text-orange-600" /> },
    { id: 'qr', name: 'Pago con QR', icon: <QrCode size={24} className="text-indigo-600" /> },
  ];

  // 🆕 FUNCIÓN PARA VERIFICAR SI TODOS LOS PAGOS SON EN EFECTIVO
  const isAllPaymentsCash = () => {
    return payments.every(p => p.method === 'efectivo');
  };

  // 🆕 FUNCIÓN PARA MANEJAR LÓGICA DE FACTURACIÓN AUTOMÁTICA (CORREGIDA)
  const updateBillingLogic = (newPayments: Payment[]) => {
    const allPaymentsAreCash = newPayments.every(p => p.method === 'efectivo');
    const hasNonCashPayments = newPayments.some(p => p.method !== 'efectivo');
    
    // Si todos los pagos son en efectivo, destildar facturación automáticamente
    if (allPaymentsAreCash) {
      console.log('🎯 Todos los pagos son en efectivo - Destildando facturación automáticamente');
      setFacturacionObligatoria(false);
      setFacturar(false);
    } 
    // Si hay pagos no-efectivo, facturación obligatoria
    else if (hasNonCashPayments) {
      console.log('💳 Pagos electrónicos detectados - Facturación obligatoria');
      setFacturacionObligatoria(true);
      setFacturar(true);
      
      // ✅ CORRECCIÓN: Mantener factura B como default, sin cambio automático por monto
      setTipoFactura('B'); // Siempre default a B, usuario puede cambiar manualmente
    }
  };

  // 🆕 FUNCIÓN PARA DETERMINAR SI SALTAR EL PASO 2
  const shouldSkipStep2 = () => {
    const allPaymentsAreCash = payments.every(p => p.method === 'efectivo');
    return !facturar && !facturacionObligatoria && allPaymentsAreCash;
  };

  // 🆕 FUNCIÓN PARA OBTENER EL TOTAL DE PASOS (DINÁMICO)
  const getTotalSteps = () => {
    return shouldSkipStep2() ? 2 : 3;
  };

  // 🆕 FUNCIÓN PARA OBTENER EL NÚMERO DE PASO VISUAL
  const getVisualStep = (step: number) => {
    if (shouldSkipStep2() && step === 3) {
      return 2;
    }
    return step;
  };
  
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
      setFacturacionObligatoria(false);
      setTipoFactura('B'); // ✅ Default a B, no A por monto
      setClienteNombre('');
      setClienteCuit('');
      
      // 🆕 CONFIGURACIÓN INICIAL DE IMPRESIÓN ACTUALIZADA
      const defaultPrinter = availablePrinters.find(p => p.isDefault);
      setPrintConfig(prev => ({
        ...prev,
        autoPrint: printInitialized && availablePrinters.length > 0,
        selectedPrinter: defaultPrinter?.name || '',
        copies: 1
      }));
      
      // Inicializar el primer método de pago con el total
      const total = getTotal();
      const initialPayments = [{ method: 'efectivo', amount: total, reference: '' }];
      setPayments(initialPayments);
      setAmountTendered(total.toFixed(2));
      setRemainingAmount(0);
      
      updateBillingLogic(initialPayments);
      
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, getTotal, printInitialized, availablePrinters]);

  // Función para validar CUIT
  const validarCuit = (cuit: string): boolean => {
    const cuitLimpio = cuit.replace(/[-\s]/g, '');
    
    if (cuitLimpio.length !== 11 || !/^\d{11}$/.test(cuitLimpio)) {
      return false;
    }
    
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    
    for (let i = 0; i < 10; i++) {
      suma += parseInt(cuitLimpio[i]) * multiplicadores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    return parseInt(cuitLimpio[10]) === digitoVerificador;
  };

  // 🔧 FUNCIÓN MODIFICADA - Manejar cambio de método de pago
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
    
    updateBillingLogic(newPayments);
    
    console.log(`💰 Método de pago cambiado a: ${methodId}`);
  };

  // 🆕 FUNCIÓN PARA MANEJAR CAMBIO MANUAL DEL CHECKBOX DE FACTURACIÓN
  const handleFacturarChange = (checked: boolean) => {
    if (!facturacionObligatoria) {
      console.log(`🎯 Facturación cambiada manualmente a: ${checked}`);
      setFacturar(checked);
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

  // 🔧 FUNCIÓN MODIFICADA - Agregar método de pago adicional
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
        
        updateBillingLogic(newPayments);
      }
    }
  };

  // 🔧 FUNCIÓN MODIFICADA - Eliminar método de pago
  const removePaymentMethod = (index: number) => {
    if (payments.length > 1) {
      const removedPayment = payments[index];
      const newPayments = payments.filter((_, i) => i !== index);
      
      const newRemainingAmount = remainingAmount + removedPayment.amount;
      
      setPayments(newPayments);
      setRemainingAmount(newRemainingAmount);
      
      updateBillingLogic(newPayments);
      
      if (newPayments.length === 1 && newPayments[0].method === 'efectivo') {
        const totalAmount = getTotalWithDiscount();
        newPayments[0].amount = totalAmount;
        setAmountTendered(totalAmount.toFixed(2));
        setRemainingAmount(0);
      }
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
  
  // 🔧 FUNCIÓN MODIFICADA PARA SALTAR PASO 2
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

      
      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        return;
      }

      // 🆕 LÓGICA DE SALTO DE PASO
      if (shouldSkipStep2()) {
        console.log('🚀 Saltando paso 2 - Pago en efectivo sin factura');
        setCurrentStep(3);
        return;
      }
    }
    
    if (currentStep === 2 && facturar) {
      // ✅ VALIDACIONES CORREGIDAS según tipo de factura
      if (tipoFactura === 'A') {
        if (!clienteNombre || clienteNombre.trim() === '') {
          newErrors.clienteNombre = 'La razón social es obligatoria para facturas A';
        }
        
        if (!clienteCuit || clienteCuit.trim() === '') {
          newErrors.clienteCuit = 'El CUIT es obligatorio para facturas A';
        } else if (!validarCuit(clienteCuit)) {
          newErrors.clienteCuit = 'El CUIT ingresado no es válido';
        }
      } else if (tipoFactura === 'B') {
        // ✅ CORRECCIÓN: Facturas B sin restricción de monto
        // Solo validar CUIT si se proporciona
        if (clienteCuit && clienteCuit.trim() !== '' && !validarCuit(clienteCuit)) {
          newErrors.clienteCuit = 'El CUIT/DNI ingresado no es válido';
        }
        // ✅ Sin validación de monto - Facturas B pueden ser de cualquier valor
      }
      
      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        return;
      }
    }
    
    setValidationErrors({});
    setCurrentStep(currentStep + 1);
  };
  
  // 🔧 FUNCIÓN MODIFICADA PARA MANEJAR SALTO HACIA ATRÁS
  const goToPreviousStep = () => {
    if (currentStep === 3 && shouldSkipStep2()) {
      console.log('🔙 Volviendo del paso 3 al paso 1 (saltando paso 2)');
      setCurrentStep(1);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // 🆕 FUNCIÓN COMPLETAMENTE ACTUALIZADA - Procesar pago CON IMPRESIÓN AUTOMÁTICA CORREGIDA
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
        facturar: facturar,
        tipoFactura: facturar ? tipoFactura : null,
        clienteNombre: facturar ? (clienteNombre || null) : null,
        clienteCuit: facturar ? (clienteCuit || null) : null,
        pagos: payments.map(payment => ({
          medioPago: payment.method,
          monto: payment.amount,
          datosPago: payment.method === 'efectivo' 
            ? { entregado: parseFloat(amountTendered), cambio: change } 
            : {}
        }))
      };
      
      console.log('🚀 [CHECKOUT] Iniciando proceso de pago:', {
        facturar,
        tipoFactura,
        clienteNombre,
        clienteCuit,
        printConfig,
        printInitialized,
        availablePrintersCount: availablePrinters.length,
        total: getTotalWithDiscount()
      });
      
      console.log('🔄 Procesando venta...');
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
      console.log('✅ Venta creada:', result.id);
      
      let finalMessage = '';
      let printResult: { success: any; message: any; jobId?: string | undefined; } | null = null;
      
      // 🔧 LÓGICA DE IMPRESIÓN AUTOMÁTICA COMPLETAMENTE CORREGIDA
      if (facturar && result.facturaId && printConfig.autoPrint && printInitialized) {
        try {
          console.log('🖨️ [CHECKOUT] Iniciando impresión automática...');
          console.log('📋 [CHECKOUT] Datos de venta:', {
            ventaId: result.id,
            facturaId: result.facturaId,
            total: getTotalWithDiscount(),
            impresora: printConfig.selectedPrinter || 'Por defecto'
          });
          
          // 🔧 ESPERAR A QUE LA FACTURA ESTÉ COMPLETAMENTE PROCESADA
          console.log('⏳ [CHECKOUT] Esperando procesamiento de factura...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 🔧 VERIFICAR QUE LA FACTURA ESTÉ LISTA ANTES DE IMPRIMIR
          console.log('🔍 [CHECKOUT] Verificando estado de factura...');
          try {
            const facturaVerification = await authenticatedFetch(`/api/pdv/facturas/${result.facturaId}`);
            if (facturaVerification.ok) {
              const facturaData = await facturaVerification.json();
              console.log('📊 [CHECKOUT] Estado de factura:', {
                id: facturaData.id,
                estado: facturaData.estado,
                cae: facturaData.cae ? 'Presente' : 'Ausente',
                tieneVenta: !!facturaData.venta,
                itemsCount: facturaData.venta?.items?.length || 0
              });
              
              if (facturaData.estado === 'procesando') {
                console.log('⏳ [CHECKOUT] Factura aún procesando, esperando más...');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          } catch (verificationError) {
            console.warn('⚠️ [CHECKOUT] Error verificando factura:', verificationError);
          }
          
          // 🔧 PROCEDER CON LA IMPRESIÓN USANDO EL PRINTFACTURA CORREGIDO
          console.log('🖨️ [CHECKOUT] Enviando a impresora...');
          printResult = await printFactura(result.facturaId, {
            auto: true,
            printerName: printConfig.selectedPrinter || undefined,
            copies: printConfig.copies
          });
          
          if (printResult.success) {
            finalMessage = `✅ Venta completada y factura impresa correctamente`;
            console.log('✅ [CHECKOUT] Impresión automática exitosa');
            
            // 🔧 MOSTRAR NOTIFICACIÓN DE ÉXITO
            setTimeout(() => {
              const notification = document.createElement('div');
              notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 16px;
                font-weight: 600;
              `;
              notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Factura impresa correctamente
                </div>
              `;
              document.body.appendChild(notification);
              
              setTimeout(() => {
                if (notification.parentElement) {
                  notification.remove();
                }
              }, 5000);
            }, 1000);
            
          } else {
            finalMessage = `⚠️ Venta completada. Impresión falló: ${printResult.message}`;
            console.warn('⚠️ [CHECKOUT] Impresión automática falló:', printResult.message);
            
            // 🔧 MOSTRAR NOTIFICACIÓN DE ERROR CON OPCIÓN DE REIMPRESIÓN
            setTimeout(() => {
              const notification = document.createElement('div');
              notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 14px;
                max-width: 350px;
              `;
              notification.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    Error de impresión
                  </div>
                  <div style="font-size: 12px; opacity: 0.9;">
                    ${printResult?.message ?? 'Error desconocido'}
                  </div>
                </div>
                <button 
                  onclick="window.open('/api/pdv/facturas/${result.facturaId}/pdf', '_blank')"
                  style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                >
                  Descargar PDF
                </button>
              `;
              document.body.appendChild(notification);
              
              setTimeout(() => {
                if (notification.parentElement) {
                  notification.remove();
                }
              }, 10000);
            }, 1000);
          }
        } catch (printError) {
          console.error('❌ [CHECKOUT] Error en impresión automática:', printError);
          finalMessage = `⚠️ Venta completada. Error de impresión: ${printError instanceof Error ? printError.message : 'Error desconocido'}`;
          
          // 🔧 MOSTRAR NOTIFICACIÓN DE ERROR CRÍTICO
          setTimeout(() => {
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #dc2626;
              color: white;
              padding: 16px 24px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 10000;
              font-size: 14px;
              max-width: 350px;
            `;
            notification.innerHTML = `
              <div style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Error crítico de impresión
                </div>
                <div style="font-size: 12px; opacity: 0.9;">
                  La venta se completó pero no se pudo imprimir
                </div>
              </div>
              <button 
                onclick="window.open('/api/pdv/facturas/${result.facturaId}/pdf', '_blank')"
                style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
              >
                Descargar PDF
              </button>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              if (notification.parentElement) {
                notification.remove();
              }
            }, 15000);
          }, 1000);
        }
      } else {
        // 🔧 MEJORAR LOGGING CUANDO NO SE IMPRIME
        console.log('ℹ️ [CHECKOUT] No se imprimirá automáticamente:', {
          facturar,
          facturaId: result.facturaId,
          autoPrint: printConfig.autoPrint,
          printInitialized,
          razon: !facturar ? 'No se solicitó factura' :
                 !result.facturaId ? 'No se generó factura' :
                 !printConfig.autoPrint ? 'Impresión automática deshabilitada' :
                 !printInitialized ? 'Sistema de impresión no inicializado' :
                 'Motivo desconocido'
        });
        
        if (facturar) {
          finalMessage = `✅ Venta completada con factura ${tipoFactura}. ${result.cae ? 'CAE: ' + result.cae : 'Procesando facturación...'}`;
        } else {
          finalMessage = '✅ Venta completada correctamente';
        }
      }
      
      console.log(`✅ [CHECKOUT] Venta completada exitosamente:`, {
        ventaId: result.id,
        facturaId: result.facturaId,
        cae: result.cae,
        impresionExitosa: printResult?.success,
        mensajeFinal: finalMessage
      });
      
      onComplete({
        success: true,
        message: finalMessage,
        ventaId: result.id,
        facturaId: result.facturaId
      });
      
      clearCart();
      onClose();
      
    } catch (error) {
      console.error('❌ Error procesando pago:', error);
      onComplete({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error al procesar el pago' 
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 🆕 FUNCIÓN PARA DEBUGGING AL FINAL DEL ARCHIVO
  const debugPrintSystem = () => {
    console.log('🔍 [DEBUG] Estado del sistema de impresión:', {
      printInitialized,
      availablePrinters: availablePrinters.map(p => ({ id: p.id, name: p.name, isDefault: p.isDefault })),
      printConfig,
      printError,
      printLoading
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" 
      aria-modal="true" role="dialog" aria-labelledby="checkout-title">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl transform transition-all"
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
        
        {/* 🆕 INDICADOR DE ESTADO DE IMPRESIÓN */}
        {printInitialized && (
          <div className="px-6 py-2 bg-green-50 border-b border-green-200">
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">
                Sistema de impresión activo - {availablePrinters.length} impresora{availablePrinters.length !== 1 ? 's' : ''} disponible{availablePrinters.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
        
        {printError && (
          <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-700">
                Advertencia de impresión: {printError}
              </span>
            </div>
          </div>
        )}
        
        <div className="p-6">
          {/* Indicador de pasos dinámico */}
          <div className="flex items-center justify-center mb-6 max-w-lg mx-auto">
            <div 
              className={`flex-1 flex flex-col items-center ${
                getVisualStep(currentStep) >= 1 ? 'text-[#311716]' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                ${getVisualStep(currentStep) >= 1 ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="text-xs font-medium">Pago</span>
            </div>
            
            {!shouldSkipStep2() && (
              <>
                <div className={`w-12 h-0.5 ${getVisualStep(currentStep) >= 2 ? 'bg-[#311716]' : 'bg-gray-300'}`}></div>
                
                <div 
                  className={`flex-1 flex flex-col items-center ${
                    getVisualStep(currentStep) >= 2 ? 'text-[#311716]' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                    ${getVisualStep(currentStep) >= 2 ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">Cliente</span>
                </div>
              </>
            )}
            
            <div className={`w-12 h-0.5 ${getVisualStep(currentStep) >= getTotalSteps() ? 'bg-[#311716]' : 'bg-gray-300'}`}></div>
            
            <div 
              className={`flex-1 flex flex-col items-center ${
                getVisualStep(currentStep) >= getTotalSteps() ? 'text-[#311716]' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1
                ${getVisualStep(currentStep) >= getTotalSteps() ? 'border-[#311716] bg-[#311716] text-white' : 'border-gray-300'}`}>
                {getTotalSteps()}
              </div>
              <span className="text-xs font-medium">Confirmar</span>
            </div>
          </div>
          
          <div className="h-[70vh] overflow-y-auto">
            {/* Paso 1: Método de pago */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMNA IZQUIERDA: Total y descuentos */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Resumen de Venta</h3>
                    
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-700">Subtotal:</span>
                      <span className="font-bold">${getTotal().toFixed(2)}</span>
                    </div>
                    
                    {/* Descuento por código */}
                    <div className="mb-4">
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
                          className="px-3 py-2 bg-[#9c7561] text-white rounded-lg text-sm hover:bg-[#8a6550] disabled:opacity-50"
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
                    <div className="mb-4">
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
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between font-bold text-lg">
                      <span>Total a pagar:</span>
                      <span className="text-[#311716]">${getTotalWithDiscount().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* SECCIÓN DE FACTURACIÓN MEJORADA */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-3">
                      <input
                        id="facturar"
                        type="checkbox"
                        checked={facturar || facturacionObligatoria}
                        onChange={(e) => handleFacturarChange(e.target.checked)}
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

                    {/* 🆕 SECCIÓN DE CONFIGURACIÓN DE IMPRESIÓN ACTUALIZADA */}
                    {facturar && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-blue-900 flex items-center">
                            <Printer className="w-4 h-4 mr-2" />
                            Configuración de Impresión
                          </h4>
                          <button
                            onClick={() => setShowPrinterSettings(!showPrinterSettings)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <input
                              id="autoPrint"
                              type="checkbox"
                              checked={printConfig.autoPrint && printInitialized}
                              onChange={(e) => setPrintConfig(prev => ({ ...prev, autoPrint: e.target.checked }))}
                              disabled={!printInitialized || availablePrinters.length === 0}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="autoPrint" className="text-sm text-blue-800">
                              Imprimir automáticamente
                            </label>
                            
                            {!printInitialized && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Sistema no disponible
                              </span>
                            )}
                            
                            {printInitialized && availablePrinters.length === 0 && (
                              <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                                Sin impresoras
                              </span>
                            )}
                          </div>
                          
                          {showPrinterSettings && printInitialized && (
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200">
                              <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                  Impresora:
                                </label>
                                <select
                                  value={printConfig.selectedPrinter}
                                  onChange={(e) => setPrintConfig(prev => ({ ...prev, selectedPrinter: e.target.value }))}
                                  className="w-full p-2 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                  disabled={availablePrinters.length === 0}
                                >
                                  <option value="">Por defecto</option>
                                  {availablePrinters.map(printer => (
                                    <option key={printer.id} value={printer.name}>
                                      {printer.name} {printer.isDefault ? '(Predeterminada)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">
                                  Copias:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={printConfig.copies}
                                  onChange={(e) => setPrintConfig(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                                  className="w-full p-2 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Indicadores mejorados */}
                    {isAllPaymentsCash() && !facturar && (
                      <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-3 rounded flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>
                          Pago en efectivo - {shouldSkipStep2() && 'Se omitirá paso de datos del cliente.'}
                        </span>
                      </div>
                    )}

                    {/* ✅ NUEVO: Indicador para facturas B sin restricción */}
                    {facturar && tipoFactura === 'B' && (
                      <div className="mt-2 text-sm text-green-600 bg-green-50 p-3 rounded flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>
                          Factura B - Sin restricción de monto (IVA incluido)
                        </span>
                      </div>
                    )}

                    {/* Indicador para pagos electrónicos */}
                    {facturacionObligatoria && (
                      <div className="mt-2 text-sm text-orange-600 bg-orange-50 p-3 rounded flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>
                          Facturación obligatoria por pago electrónico
                        </span>
                      </div>
                    )}
                    
                    {/* Selector de tipo de factura */}
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
                      </div>
                    )}
                  </div>
                </div>
                
                {/* COLUMNA DERECHA: Métodos de pago */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 mb-4">Métodos de Pago</h3>
                  
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
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => handlePaymentMethodChange(index, method.id)}
                            className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                              payment.method === method.id
                                ? 'border-[#9c7561] bg-[#eeb077]/10 text-[#311716]'
                                : 'border-gray-200 hover:bg-gray-50'
                            } ${payments.some((p, i) => i !== index && p.method === method.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={payments.some((p, i) => i !== index && p.method === method.id)}
                          >
                            {method.icon}
                            <span className="font-medium text-sm">{method.name}</span>
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
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] text-lg font-bold"
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
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] text-lg font-bold"
                            />
                            
                            {validationErrors.tendered && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.tendered}</p>
                            )}
                            
                            {change > 0 && (
                              <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg flex items-center justify-between">
                                <span className="font-medium">Cambio a devolver:</span>
                                <span className="text-xl font-bold">${change.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Botón para agregar método adicional */}
                  {payments.length < 2 && remainingAmount > 0 && (
                    <button
                      onClick={addPaymentMethod}
                      className="w-full py-3 px-4 border border-[#9c7561] text-[#311716] rounded-lg flex items-center justify-center hover:bg-[#eeb077]/10"
                    >
                      <Plus size={18} className="mr-2" />
                      Agregar método de pago adicional
                    </button>
                  )}
                  
                  {/* Mensajes de error */}
                  {validationErrors.total && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center">
                      <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                      <p className="text-sm">{validationErrors.total}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Paso 2: Datos de cliente para facturación - SOLO SI NO SE SALTA */}
            {currentStep === 2 && !shouldSkipStep2() && (
              <div className="max-w-2xl mx-auto">
                {facturar ? (
                  <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center mb-4 text-[#311716]">
                      <Receipt className="h-6 w-6 mr-2" />
                      <h3 className="text-xl font-medium">
                        Datos para factura {tipoFactura}
                      </h3>
                    </div>
                    
                    {/* ✅ INFORMACIÓN ESPECÍFICA CORREGIDA según tipo */}
                    <div className="text-sm text-gray-600 bg-white p-4 rounded-lg border-l-4 border-blue-400">
                      {tipoFactura === 'A' ? (
                        <>
                          <strong>Factura A - Responsable Inscripto:</strong><br />
                          • CUIT y Razón Social son obligatorios<br />
                          • IVA discriminado<br />
                        </>
                      ) : (
                        <>
                          <strong>Factura B - Consumidor Final:</strong><br />
                          • CUIT/DNI opcional<br />
                          • IVA incluido en el precio<br />
                          • ✅ Sin restricción de monto<br />
                        </>
                      )}
                    </div>
                    
                    {/* Campo Nombre/Razón Social */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tipoFactura === 'A' ? 'Razón Social: *' : 'Nombre (opcional):'}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                          className={`w-full p-3 pl-12 border rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] text-lg ${
                            validationErrors.clienteNombre ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder={tipoFactura === 'A' ? 'Razón social del cliente' : 'Nombre del cliente (opcional)'}
                        />
                      </div>
                      {validationErrors.clienteNombre && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.clienteNombre}</p>
                      )}
                    </div>
                    
                    {/* Campo CUIT/DNI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tipoFactura === 'A' ? 'CUIT: *' : 'CUIT/DNI (opcional):'}
                      </label>
                      <input
                        type="text"
                        value={clienteCuit}
                        onChange={(e) => setClienteCuit(e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-1 focus:ring-[#9c7561] focus:border-[#9c7561] text-lg ${
                          validationErrors.clienteCuit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={tipoFactura === 'A' ? '20-12345678-9' : 'CUIT/DNI sin guiones (opcional)'}
                        maxLength={13}
                      />
                      {validationErrors.clienteCuit && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.clienteCuit}</p>
                      )}
                    </div>
                    
                    {/* ✅ INFORMACIÓN ADICIONAL CORREGIDA según el tipo */}
                    <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
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
                              Las facturas B pueden ser de cualquier monto.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-gray-50 rounded-lg">
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl font-medium text-gray-700 mb-2">No se requiere facturación</p>
                    <p className="text-gray-500">Continúe para finalizar la venta sin generar factura.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Paso 3: Confirmación */}
            {currentStep === 3 && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-medium text-[#311716] mb-4 flex items-center text-xl">
                    <Check className="h-6 w-6 mr-2 text-green-500" />
                    Resumen de la venta
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Detalles de productos y pagos */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Productos:</span>
                        <span className="font-medium">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${getTotal().toFixed(2)}</span>
                      </div>
                      
                      {(appliedDiscount || generalDiscount > 0) && (
                        <div className="flex justify-between text-green-600">
                          <span>Descuento:</span>
                          <span className="font-medium">-${(getTotal() - getTotalWithDiscount()).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {payments.map((payment, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-600">
                            {paymentMethods.find(m => m.id === payment.method)?.name || payment.method}:
                          </span>
                          <span className="font-medium">${payment.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      
                      {payments.some(p => p.method === 'efectivo') && change > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cambio:</span>
                          <span className="font-medium">${change.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-[#311716]">${getTotalWithDiscount().toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Información de facturación Y configuración de impresión */}
                    <div className="space-y-4">
                      {facturar ? (
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-3">Información de Facturación</h4>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tipo de factura:</span>
                              <span className="font-medium">Factura {tipoFactura}</span>
                            </div>
                            
                            {clienteNombre && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  {tipoFactura === 'A' ? 'Razón Social:' : 'Cliente:'}
                                </span>
                                <span className="text-right">{clienteNombre}</span>
                              </div>
                            )}
                            
                            {clienteCuit && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">CUIT/DNI:</span>
                                <span>{clienteCuit}</span>
                              </div>
                            )}
                            
                            {!clienteNombre && !clienteCuit && tipoFactura === 'B' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cliente:</span>
                                <span className="text-gray-500 italic">Consumidor Final</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-lg border text-center">
                          <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-2" />
                          <h4 className="font-medium text-gray-900 mb-1">Venta en efectivo</h4>
                          <p className="text-sm text-gray-600">Corroborar cambio y monto entregado</p>
                        </div>
                      )}
                      
                      {/* 🆕 RESUMEN DE CONFIGURACIÓN DE IMPRESIÓN */}
                      {facturar && printInitialized && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                            <Printer className="w-4 h-4 mr-2" />
                            Configuración de Impresión
                          </h4>
                          
                          <div className="space-y-1 text-sm text-blue-800">
                            <div className="flex justify-between">
                              <span>Impresión automática:</span>
                              <span className={printConfig.autoPrint ? 'text-green-600' : 'text-red-600'}>
                                {printConfig.autoPrint ? '✓ Habilitada' : '✗ Deshabilitada'}
                              </span>
                            </div>
                            
                            {printConfig.autoPrint && (
                              <>
                                <div className="flex justify-between">
                                  <span>Impresora:</span>
                                  <span>{printConfig.selectedPrinter || 'Por defecto'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Copias:</span>
                                  <span>{printConfig.copies}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
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
                      {facturar && printConfig.autoPrint && printInitialized && (
                        <li>Se imprimirá automáticamente la factura</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Botones de navegación */}
          <div className="flex justify-between gap-3 mt-6 border-t border-gray-100 pt-4">
            {currentStep > 1 ? (
              <button
                onClick={goToPreviousStep}
                disabled={isProcessing}
                className="py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                Volver
              </button>
            ) : (
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            
            {/* 🆕 BOTÓN DE DEBUG EN DESARROLLO */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={debugPrintSystem}
                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                Debug Print
              </button>
            )}
            
            {currentStep < getTotalSteps() ? (
              <button
                ref={initialFocusRef}
                onClick={goToNextStep}
                className="py-3 px-6 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-70 transition-colors font-medium"
              >
                {shouldSkipStep2() && currentStep === 1 ? 'Confirmar' : 'Siguiente'}
              </button>
            ) : (
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="py-3 px-6 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-70 flex items-center transition-colors font-medium"
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