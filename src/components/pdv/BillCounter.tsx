// src/components/pdv/BillCounter.tsx - VERSIÓN MEJORADA CON DISEÑO VISUAL
'use client';

import { useState, useEffect } from 'react';
import { Banknote, Trash2, Calculator } from 'lucide-react';

interface BillCounterProps {
  onTotalChange: (total: number) => void;
  className?: string;
}

interface BillCount {
  denomination: number;
  quantity: number;
  total: number;
}

// Billetes argentinos con colores reales y diseño visual
const BILL_DENOMINATIONS = [
  { 
    value: 20000, 
    gradient: 'bg-gradient-to-br from-cyan-400 to-white',
    border: 'border-cyan-500',
    text: 'text-cyan-900',
    shadow: 'shadow-cyan-200',
    label: '$20.000'
  },
  { 
    value: 10000, 
    gradient: 'bg-gradient-to-br from-red-900 to-gray-600',
    border: 'border-red-800',
    text: 'text-white',
    shadow: 'shadow-red-300',
    label: '$10.000'
  },
  { 
    value: 2000, 
    gradient: 'bg-gradient-to-br from-pink-400 to-pink-600',
    border: 'border-pink-500',
    text: 'text-white',
    shadow: 'shadow-pink-200',
    label: '$2.000'
  },
  { 
    value: 1000, 
    gradient: 'bg-gradient-to-br from-orange-500 to-orange-700',
    border: 'border-orange-600',
    text: 'text-white',
    shadow: 'shadow-orange-200',
    label: '$1.000'
  },
  { 
    value: 500, 
    gradient: 'bg-gradient-to-br from-green-500 to-green-700',
    border: 'border-green-600',
    text: 'text-white',
    shadow: 'shadow-green-200',
    label: '$500'
  },
  { 
    value: 200, 
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    border: 'border-blue-600',
    text: 'text-white',
    shadow: 'shadow-blue-200',
    label: '$200'
  },
  { 
    value: 100, 
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    border: 'border-purple-600',
    text: 'text-white',
    shadow: 'shadow-purple-200',
    label: '$100'
  }
];

export function BillCounter({ onTotalChange, className = '' }: BillCounterProps) {
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

  // Agregar billete (1 click = +1 billete)
  const addBill = (denomination: number) => {
    setBillCounts(prev => prev.map(bill => 
      bill.denomination === denomination 
        ? { 
            ...bill, 
            quantity: bill.quantity + 1, 
            total: (bill.quantity + 1) * denomination 
          }
        : bill
    ));
  };

  // Quitar billete
  const removeBill = (denomination: number) => {
    setBillCounts(prev => prev.map(bill => 
      bill.denomination === denomination && bill.quantity > 0
        ? { 
            ...bill, 
            quantity: bill.quantity - 1, 
            total: (bill.quantity - 1) * denomination 
          }
        : bill
    ));
  };

  // Limpiar contador
  const clearAll = () => {
    setBillCounts(prev => prev.map(bill => ({
      ...bill,
      quantity: 0,
      total: 0
    })));
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-lg ${className}`}>
      {/* Header simplificado */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Contar Efectivo</h3>
              <p className="text-sm text-gray-600">Presiona los billetes para agregarlos</p>
            </div>
          </div>
          
          <button
            onClick={clearAll}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Limpiar todo"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Grid de billetes visuales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {BILL_DENOMINATIONS.map((bill) => {
            const billData = billCounts.find(b => b.denomination === bill.value);
            const quantity = billData?.quantity || 0;

            return (
              <div key={bill.value} className="text-center">
                {/* Billete visual clickeable */}
                <button
                  onClick={() => addBill(bill.value)}
                  className={`w-full h-24 ${bill.gradient} ${bill.border} border-2 rounded-xl ${bill.shadow} shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden group`}
                >
                  {/* Decoración del billete */}
                  <div className="absolute inset-2 border border-white/30 rounded-lg"></div>
                  <div className="absolute top-2 left-2">
                    <div className={`text-xs font-bold ${bill.text} opacity-70`}>ARG</div>
                  </div>
                  
                  {/* Valor principal */}
                  <div className="flex items-center justify-center h-full">
                    <div className={`text-xl font-black ${bill.text}`}>
                      {bill.label}
                    </div>
                  </div>
                  
                  {/* Efecto hover */}
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                
                {/* Contador de cantidad */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => removeBill(bill.value)}
                      disabled={quantity === 0}
                      className="w-8 h-8 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 text-red-600 rounded-full flex items-center justify-center transition-colors text-lg font-bold"
                    >
                      −
                    </button>
                    
                    <div className="w-12 text-center">
                      <div className="text-2xl font-bold text-gray-900">{quantity}</div>
                      <div className="text-xs text-gray-500">unidades</div>
                    </div>
                    
                    <button
                      onClick={() => addBill(bill.value)}
                      className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center transition-colors text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Total por denominación */}
                  {quantity > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        ${(quantity * bill.value).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen total */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">Total Contado</h4>
                <p className="text-sm text-gray-600">Efectivo físicamente contado</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-black text-green-700">
                ${totalCounted.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {billCounts.reduce((sum, bill) => sum + bill.quantity, 0)} billetes
              </div>
            </div>
          </div>

          {/* Desglose cuando hay billetes */}
          {totalCounted > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {billCounts
                  .filter(bill => bill.quantity > 0)
                  .map(bill => (
                    <div key={bill.denomination} className="flex justify-between bg-white/60 rounded px-2 py-1">
                      <span className="text-gray-700">
                        {bill.quantity}×${bill.denomination.toLocaleString()}
                      </span>
                      <span className="font-semibold text-gray-900">
                        ${bill.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}