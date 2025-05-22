// src/components/admin/DiagnosticoFacturas.tsx
'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { AlertTriangle, CheckCircle, RefreshCw, Search, Wrench } from 'lucide-react';

export function DiagnosticoFacturas() {
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reparando, setReparando] = useState<string | null>(null);

  const ejecutarDiagnostico = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/admin/facturas/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'diagnosticar' })
      });

      if (response.ok) {
        const data = await response.json();
        setDiagnostico(data);
      }
    } catch (error) {
      console.error('Error en diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  const repararFactura = async (facturaId: string) => {
    try {
      setReparando(facturaId);
      const response = await authenticatedFetch('/api/admin/facturas/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reparar', facturaId })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        ejecutarDiagnostico(); // Recargar diagnóstico
      }
    } catch (error) {
      console.error('Error al reparar:', error);
    } finally {
      setReparando(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Diagnóstico de Facturas</h2>
        <button
          onClick={ejecutarDiagnostico}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
        >
          {loading ? (
            <RefreshCw className="animate-spin h-4 w-4 mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Diagnosticar
        </button>
      </div>

      {diagnostico && (
        <div>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-lg">
              <span className="font-semibold">Facturas problemáticas: </span>
              <span className={diagnostico.problematicas > 0 ? 'text-red-600' : 'text-green-600'}>
                {diagnostico.problematicas}
              </span>
            </p>
          </div>

          {diagnostico.problematicas > 0 && (
            <div className="space-y-2">
              {diagnostico.facturas.map((factura: any) => (
                <div key={factura.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="font-medium">Factura {factura.id.substring(0, 8)}...</span>
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        {factura.problema}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Venta: ${factura.total} | Sucursal: {factura.sucursal} | Estado: {factura.estado}
                      {factura.cae && <span> | CAE: {factura.cae}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => repararFactura(factura.id)}
                    disabled={reparando === factura.id}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm flex items-center"
                  >
                    {reparando === factura.id ? (
                      <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                    ) : (
                      <Wrench className="h-3 w-3 mr-1" />
                    )}
                    Reparar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}