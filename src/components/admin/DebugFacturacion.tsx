// src/components/admin/DebugFacturacion.tsx
'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';

export function DebugFacturacion() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [facturaId, setFacturaId] = useState('');

  const ejecutarDiagnostico = async (accion: string) => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/facturas/diagnostico-avanzado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, facturaId })
      });

      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setResultado({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const procesarColgadas = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/facturas/procesar-colgadas', {
        method: 'POST'
      });

      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setResultado({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const debugAfip = async (accion: string, params: any = {}) => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/facturas/debug-afip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...params })
      });
  
      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setResultado({ error: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">🔧 Debug Facturación AFIP</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">ID de Factura (opcional)</label>
          <input
            type="text"
            value={facturaId}
            onChange={(e) => setFacturaId(e.target.value)}
            placeholder="Ingresa ID de factura específica"
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => ejecutarDiagnostico('test-conectividad')}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            🌐 Test Conectividad AFIP
          </button>

          <button
            onClick={() => ejecutarDiagnostico('facturas-problemáticas')}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            ⚠️ Buscar Facturas Problemáticas
          </button>

          {facturaId && (
            <button
              onClick={() => ejecutarDiagnostico('verificar-factura')}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              🔍 Verificar Factura Específica
            </button>
          )}

          <button
            onClick={procesarColgadas}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            🔄 Procesar Facturas Colgadas
          </button>

          <button
  onClick={() => debugAfip('test-conectividad-completa')}
  disabled={loading}
  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
>
  🔍 Test Completo AFIP
</button>

<button
  onClick={() => debugAfip('verificar-configuracion')}
  disabled={loading}
  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
>
  ⚙️ Verificar Configuración
</button>

{facturaId && (
  <button
    onClick={() => debugAfip('debug-factura', { facturaId })}
    disabled={loading}
    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
  >
    🐛 Debug Factura Específica
  </button>
)}

<button
  onClick={() => {
    setLoading(true);
    authenticatedFetch('/api/admin/facturas/debug-raw-afip', {
      method: 'POST'
    })
    .then(r => r.json())
    .then(setResultado)
    .catch(e => setResultado({ 
      error: e.message,
      details: 'Error en petición al endpoint debug-raw-afip'
    }))
    .finally(() => setLoading(false));
  }}
  disabled={loading}
  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
>
  🔍 Captura RAW AFIP
</button>

<button
  onClick={() => {
    setLoading(true);
    authenticatedFetch('/api/admin/facturas/test-wsfe-alternatives', {
      method: 'POST'
    })
    .then(r => r.json())
    .then(setResultado)
    .catch(e => setResultado({ error: e.message }))
    .finally(() => setLoading(false));
  }}
  disabled={loading}
  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
>
  🔄 Probar URLs Alternativas WSFE
</button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Ejecutando diagnóstico...</p>
        </div>
      )}

      {resultado && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Resultado:</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            <pre className="text-xs">{JSON.stringify(resultado, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}