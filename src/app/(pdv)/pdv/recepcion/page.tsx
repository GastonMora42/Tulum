// src/app/(pdv)/pdv/recepcion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { RecepcionEnvios } from '@/components/pdv/RecepcionEnvios';
import { AlertTriangle, RefreshCw, Truck } from 'lucide-react';

export default function RecepcionPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#311716]">Recepción de Envíos</h1>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <Truck className="h-5 w-5 text-[#9c7561] mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Envíos Pendientes de Recepción
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Verifica y registra los envíos recibidos de fábrica
          </p>
        </div>
        
        <div className="p-0">
          <RecepcionEnvios key={refreshKey} onSuccess={handleRefresh} />
        </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong className="font-medium text-yellow-800">Importante:</strong> Si detectas diferencias en las cantidades, se creará automáticamente una contingencia para su revisión por administración.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}