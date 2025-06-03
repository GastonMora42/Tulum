// src/components/pdv/BillCounter.tsx - CONTADOR DE BILLETES PARA CIERRE DE CAJA
'use client';

import { useState, useEffect } from 'react';
import { Banknote, Plus, Minus, Calculator, Trash2 } from 'lucide-react';

interface BillCounterProps {
  expectedAmount: number;
  onTotalChange: (total: number) => void;
  className?: string;
}

interface BillCount {
  denomination: number;
  quantity: number;
  total: number;
}

// Billetes disponibles en Argentina
const BILL_DENOMINATIONS = [
  { value: 20000, color: 'bg-purple-100 border-purple-300 text-purple-800', label: '$20.000' },
  { value: 10000, color: 'bg-blue-100 border-blue-300 text-blue-800', label: '$10.000' },
  { value: 2000, color: 'bg-green-100 border-green-300 text-green-800', label: '$2.000' },
  { value: 1000, color: 'bg-yellow-100 border-yellow-300 text-yellow-800', label: '$1.000' },
  { value: 500, color: 'bg-orange-100 border-orange-300 text-orange-800', label: '$500' },
  { value: 200, color: 'bg-red-100 border-red-300 text-red-800', label: '$200' },
  { value: 100, color: 'bg-gray-100 border-gray-300 text-gray-800', label: '$100' }
];

export function BillCounter({ expectedAmount, onTotalChange, className = '' }: BillCounterProps) {
  const [billCounts, setBillCounts] = useState<BillCount[]>(
    BILL_DENOMINATIONS.map(bill => ({
      denomination: bill.value,
      quantity: 0,
      total: 0
    }))
  );

  const [totalCounted, setTotalCounted] = useState(0);

  // Actualizar total cuando cambian las cantidades
  useEffect(() => {
    const newTotal = billCounts.reduce((sum, bill) => sum + bill.total, 0);
    setTotalCounted(newTotal);
    onTotalChange(newTotal);
  }, [billCounts, onTotalChange]);

  // Manejar cambio en cantidad de billetes
  const handleQuantityChange = (denomination: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setBillCounts(prev => prev.map(bill => 
      bill.denomination === denomination 
        ? { 
            ...bill, 
            quantity: newQuantity, 
            total: newQuantity * denomination 
          }
        : bill
    ));
  };

  // Incrementar cantidad
  const incrementQuantity = (denomination: number) => {
    const currentBill = billCounts.find(b => b.denomination === denomination);
    if (currentBill) {
      handleQuantityChange(denomination, currentBill.quantity + 1);
    }
  };

  // Decrementar cantidad
  const decrementQuantity = (denomination: number) => {
    const currentBill = billCounts.find(b => b.denomination === denomination);
    if (currentBill && currentBill.quantity > 0) {
      handleQuantityChange(denomination, currentBill.quantity - 1);
    }
  };

  // Limpiar contador
  const clearAll = () => {
    setBillCounts(prev => prev.map(bill => ({
      ...bill,
      quantity: 0,
      total: 0
    })));
  };

  // Verificar si coincide con el monto esperado
  const isCorrect = Math.abs(totalCounted - expectedAmount) < 0.01;
  const difference = totalCounted - expectedAmount;

  return (
    <div className={`bill-counter bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Contador de Billetes</h3>
              <p className="text-sm text-gray-600">Cuenta los billetes físicamente recibidos</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Esperado:</div>
            <div className="text-lg font-bold text-gray-900">${expectedAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Contadores de billetes */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {BILL_DENOMINATIONS.map((bill) => {
            const billData = billCounts.find(b => b.denomination === bill.value);
            const quantity = billData?.quantity || 0;
            const total = billData?.total || 0;

            return (
              <div
                key={bill.value}
                className={`p-4 rounded-lg border-2 ${bill.color} transition-all hover:shadow-md`}
              >
                <div className="text-center mb-3">
                  <div className="text-lg font-bold">{bill.label}</div>
                  <div className="text-xs opacity-75">Billete</div>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center justify-center mb-3">
                  <button
                    onClick={() => decrementQuantity(bill.value)}
                    disabled={quantity === 0}
                    className="p-2 rounded-lg bg-white/50 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className="mx-4 min-w-[3rem] text-center">
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(bill.value, parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xl font-bold bg-transparent border-none focus:outline-none"
                    />
                    <div className="text-xs opacity-75">cantidad</div>
                  </div>
                  
                  <button
                    onClick={() => incrementQuantity(bill.value)}
                    className="p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total por denominación */}
                <div className="text-center">
                  <div className="text-lg font-bold">
                    ${total.toLocaleString()}
                  </div>
                  <div className="text-xs opacity-75">
                    {quantity} × ${bill.value.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen total */}
        <div className={`p-6 rounded-xl border-2 transition-all ${
          isCorrect 
            ? 'border-green-500 bg-green-50' 
            : Math.abs(difference) > 0 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-gray-900">Total Contado</h4>
              <p className="text-sm text-gray-600">Suma de todos los billetes</p>
            </div>
            
            <button
              onClick={clearAll}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Limpiar todo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Esperado</div>
              <div className="text-xl font-bold text-gray-900">
                ${expectedAmount.toFixed(2)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600">Contado</div>
              <div className={`text-2xl font-bold ${
                isCorrect ? 'text-green-600' : 'text-red-600'
              }`}>
                ${totalCounted.toFixed(2)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600">Diferencia</div>
              <div className={`text-xl font-bold ${
                isCorrect ? 'text-green-600' : difference > 0 ? 'text-red-600' : 'text-orange-600'
              }`}>
                {difference === 0 ? '✓ Exacto' : 
                 difference > 0 ? `+$${difference.toFixed(2)}` : 
                 `$${difference.toFixed(2)}`}
              </div>
            </div>
          </div>

          {/* Mensaje de estado */}
          <div className={`mt-4 p-3 rounded-lg text-center ${
            isCorrect 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {isCorrect ? (
              <div className="flex items-center justify-center">
                <span className="text-green-600 mr-2">✓</span>
                <span className="font-medium">¡Conteo correcto! Los montos coinciden.</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-red-600 mr-2">✗</span>
                <span className="font-medium">
                  Diferencia de ${Math.abs(difference).toFixed(2)} 
                  {difference > 0 ? ' (sobra)' : ' (falta)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Desglose detallado */}
        {totalCounted > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3">Desglose del conteo:</h5>
            <div className="space-y-1 text-sm">
              {billCounts
                .filter(bill => bill.quantity > 0)
                .map(bill => (
                  <div key={bill.denomination} className="flex justify-between">
                    <span className="text-gray-600">
                      {bill.quantity} × ${bill.denomination.toLocaleString()}
                    </span>
                    <span className="font-medium">
                      ${bill.total.toLocaleString()}
                    </span>
                  </div>
                ))}
              
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${totalCounted.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}