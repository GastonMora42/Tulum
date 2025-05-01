// src/components/pdv/CheckoutModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { CreditCard, DollarSign, QrCode, Smartphone, X } from 'lucide-react';

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
  const { items, getTotal, clearCart, checkout } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facturar, setFacturar] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteCuit, setClienteCuit] = useState('');
  const [referencia, setReferencia] = useState('');
  
  // Métodos de pago disponibles
  const paymentMethods: PaymentMethod[] = [
    { id: 'efectivo', name: 'Efectivo', icon: <DollarSign size={24} /> },
    { id: 'tarjeta_credito', name: 'Tarjeta de Crédito', icon: <CreditCard size={24} /> },
    { id: 'tarjeta_debito', name: 'Tarjeta de Débito', icon: <CreditCard size={24} /> },
    { id: 'qr', name: 'Pago con QR', icon: <QrCode size={24} /> },
    { id: 'transferencia', name: 'Transferencia', icon: <Smartphone size={24} /> }
  ];
  
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
      
      // Procesar checkout
      const result = await checkout({
        facturar,
        metodoPago: selectedMethod,
        datosAdicionales: {
          clienteNombre: facturar ? clienteNombre : undefined,
          clienteCuit: facturar ? clienteCuit : undefined,
          pagos
        }
      });
      
      // Informar resultado
      onComplete(result);
      
      // Si fue exitoso, cerrar modal
      if (result.success) {
        clearCart();
        onClose();
      }
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Procesar Pago</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="font-medium text-gray-700 mb-2">Total a pagar:</div>
            <div className="text-3xl font-bold text-indigo-700">${amount.toFixed(2)}</div>
          </div>
          
          <div className="mb-6">
            <div className="font-medium text-gray-700 mb-2">Seleccione método de pago:</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                    selectedMethod === method.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {method.icon}
                  <span>{method.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {selectedMethod && (
            <>
              {selectedMethod === 'efectivo' && (
                <div className="mb-6">
                  <div className="font-medium text-gray-700 mb-2">Monto entregado:</div>
                  <input
                    type="text"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  
                  {change > 0 && (
                    <div className="mt-2 text-green-600 font-medium">
                      Cambio a devolver: ${change.toFixed(2)}
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <input
                    id="facturar"
                    type="checkbox"
                    checked={facturar}
                    onChange={(e) => setFacturar(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="facturar" className="ml-2 block text-gray-700">
                    Generar factura
                  </label>
                </div>
                
                {facturar && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-1">Nombre/Razón Social:</label>
                      <input
                        type="text"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">CUIT/DNI:</label>
                      <input
                        type="text"
                        value={clienteCuit}
                        onChange={(e) => setClienteCuit(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            
            <button
              onClick={handleProcessPayment}
              disabled={!selectedMethod || isProcessing}
              className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}