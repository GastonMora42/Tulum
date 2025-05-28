// src/components/admin/DebugFacturacion.tsx
'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  Shield, 
  FileText, 
  Settings,
  Zap,
  Database,
  Clock,
  Wifi
} from 'lucide-react';

interface TestResult {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

export function DebugFacturacion() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [facturaId, setFacturaId] = useState('');
  const [cuit, setCuit] = useState('');
  const [activeTab, setActiveTab] = useState<'urls' | 'auth' | 'cert' | 'config' | 'repair'>('urls');

  // ✅ TEST DE URLs CORREGIDAS
  const testURLsAFIP = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Iniciando test de URLs AFIP...');
      
      const response = await authenticatedFetch('/api/admin/facturas/test-wsfe-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      await handleResponse(response, 'Test de URLs AFIP');
    } catch (error) {
      handleError(error, 'Test de URLs');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEST DE CONECTIVIDAD COMPLETA
  const testConectividadCompleta = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Iniciando test de conectividad completa...');
      
      const response = await authenticatedFetch('/api/admin/facturas/debug-afip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'test-conectividad-completa',
          cuit: cuit || undefined
        })
      });

      await handleResponse(response, 'Test de Conectividad Completa');
    } catch (error) {
      handleError(error, 'Test de conectividad');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEST DE AUTENTICACIÓN
  const testAutenticacion = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Iniciando test de autenticación...');
      
      const response = await authenticatedFetch('/api/admin/facturas/debug-afip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'test-autenticacion',
          cuit: cuit || undefined
        })
      });

      await handleResponse(response, 'Test de Autenticación');
    } catch (error) {
      handleError(error, 'Test de autenticación');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEST DE CERTIFICADOS
  const testCertificados = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Iniciando test de certificados...');
      
      const response = await authenticatedFetch('/api/admin/facturas/test-cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      await handleResponse(response, 'Test de Certificados');
    } catch (error) {
      handleError(error, 'Test de certificados');
    } finally {
      setLoading(false);
    }
  };

  // ✅ VERIFICAR CONFIGURACIÓN
  const verificarConfiguracion = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Verificando configuración...');
      
      const response = await authenticatedFetch('/api/admin/facturas/debug-afip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'verificar-configuracion'
        })
      });

      await handleResponse(response, 'Verificación de Configuración');
    } catch (error) {
      handleError(error, 'Verificación de configuración');
    } finally {
      setLoading(false);
    }
  };

  // ✅ DEBUG FACTURA ESPECÍFICA
  const debugFacturaEspecifica = async () => {
    if (!facturaId.trim()) {
      setResultado({
        error: 'Debe ingresar un ID de factura válido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[DEBUG] Debugeando factura específica...');
      
      const response = await authenticatedFetch('/api/admin/facturas/diagnostico-avanzado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'verificar-factura',
          facturaId: facturaId.trim()
        })
      });

      await handleResponse(response, 'Debug de Factura Específica');
    } catch (error) {
      handleError(error, 'Debug de factura');
    } finally {
      setLoading(false);
    }
  };

  // ✅ PROCESAR FACTURAS COLGADAS
  const procesarFacturasColgadas = async () => {
    if (!confirm('¿Está seguro de procesar las facturas colgadas? Esta operación puede tomar varios minutos.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('[DEBUG] Procesando facturas colgadas...');
      
      const response = await authenticatedFetch('/api/admin/facturas/procesar-colgadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      await handleResponse(response, 'Procesamiento de Facturas Colgadas');
    } catch (error) {
      handleError(error, 'Procesamiento de facturas');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEST RAW DE AFIP (nuevo)
  const testRawAFIP = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Iniciando test raw de AFIP...');
      
      const response = await authenticatedFetch('/api/admin/facturas/debug-raw-afip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      await handleResponse(response, 'Test Raw AFIP');
    } catch (error) {
      handleError(error, 'Test raw AFIP');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANEJO MEJORADO DE RESPUESTAS
  const handleResponse = async (response: Response, operacion: string) => {
    let data;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = {
          error: `Respuesta no es JSON (${operacion})`,
          contentType,
          status: response.status,
          statusText: response.statusText,
          responseText: text.substring(0, 1000),
          isHTML: text.includes('<html'),
          isXML: text.includes('<?xml')
        };
      }
      
      // Agregar metadatos de respuesta
      data._metadata = {
        operacion,
        timestamp: new Date().toISOString(),
        status: response.status,
        contentType,
        ok: response.ok
      };
      
      setResultado(data);
      console.log(`[DEBUG] ${operacion} completado:`, data);
    } catch (parseError) {
      console.error(`[DEBUG] Error parseando respuesta de ${operacion}:`, parseError);
      setResultado({
        error: `Error parseando respuesta de ${operacion}`,
        parseError: parseError instanceof Error ? parseError.message : 'Error desconocido',
        status: response.status,
        contentType,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Nuevo test específico para RG 5616
const testCondicionIvaReceptor = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/facturas/test-condicion-iva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit: cuit || undefined })
      });
      
      await handleResponse(response, 'Test Condición IVA Receptor (RG 5616)');
    } catch (error) {
      handleError(error, 'Test Condición IVA');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANEJO MEJORADO DE ERRORES
  const handleError = (error: any, operacion: string) => {
    console.error(`[DEBUG] Error en ${operacion}:`, error);
    
    let errorMessage = 'Error desconocido';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Error de conectividad - No se pudo conectar al servidor';
      }
      errorDetails = {
        name: error.name,
        stack: error.stack?.substring(0, 500)
      };
    }
    
    setResultado({
      error: `Error en ${operacion}`,
      message: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      operacion
    });
  };

  // ✅ LIMPIAR RESULTADOS
  const limpiarResultados = () => {
    setResultado(null);
  };

  // ✅ RENDERIZAR RESULTADO CON FORMATO MEJORADO
  const renderResultado = () => {
    if (!resultado) return null;

    const hasError = resultado.error || !resultado.success;
    const bgColor = hasError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
    const textColor = hasError ? 'text-red-800' : 'text-green-800';

    return (
      <div className={`mt-6 border rounded-lg p-4 ${bgColor}`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className={`text-lg font-semibold ${textColor} flex items-center`}>
            {hasError ? (
              <AlertTriangle className="w-5 h-5 mr-2" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Resultado del Test
          </h3>
          <button
            onClick={limpiarResultados}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Limpiar
          </button>
        </div>
        
        {/* Metadatos */}
        {resultado._metadata && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
            <strong>Operación:</strong> {resultado._metadata.operacion} | 
            <strong> Status:</strong> {resultado._metadata.status} | 
            <strong> Timestamp:</strong> {new Date(resultado._metadata.timestamp).toLocaleString()}
          </div>
        )}
        
        {/* Resumen si existe */}
        {resultado.resumen && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <h4 className="font-medium mb-2">📊 Resumen:</h4>
            <p>✅ Exitosos: {resultado.resumen.exitosos}/{resultado.resumen.total} ({resultado.resumen.porcentajeExito}%)</p>
          </div>
        )}
        
        {/* Resultado principal */}
        <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-blue-600" />
          🔧 Debug Facturación AFIP
        </h2>
        <div className="text-sm text-gray-500">
          Ambiente: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {process.env.NEXT_PUBLIC_AFIP_ENV || 'testing'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'urls', label: 'URLs & Conectividad', icon: Globe },
            { id: 'auth', label: 'Autenticación', icon: Shield },
            { id: 'cert', label: 'Certificados', icon: FileText },
            { id: 'config', label: 'Configuración', icon: Settings },
            { id: 'repair', label: 'Reparación', icon: RefreshCw }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Inputs comunes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CUIT (opcional - usa config por defecto si está vacío)
          </label>
          <input
            type="text"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="30718236564"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {(activeTab === 'repair' || activeTab === 'config') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID de Factura (para debug específico)
            </label>
            <input
              type="text"
              value={facturaId}
              onChange={(e) => setFacturaId(e.target.value)}
              placeholder="uuid-de-factura"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Contenido por Tab */}
      <div className="space-y-4">
        {activeTab === 'urls' && (
          <>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Tests de Conectividad y URLs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testURLsAFIP}
                disabled={loading}
                className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Wifi className="mr-2" />}
                Test URLs AFIP (.gob.ar)
              </button>
              
              <button
                onClick={testConectividadCompleta}
                disabled={loading}
                className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Database className="mr-2" />}
                Test Conectividad Completa
              </button>
              
              <button
                onClick={testRawAFIP}
                disabled={loading}
                className="p-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                Test Raw AFIP
              </button>
            </div>
          </>
        )}

        {activeTab === 'auth' && (
          <>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Tests de Autenticación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={testAutenticacion}
                disabled={loading}
                className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Shield className="mr-2" />}
                Test Autenticación Manual
              </button>
              
              <button
                onClick={() => {
                  // Test último comprobante
                  setLoading(true);
                  authenticatedFetch('/api/admin/facturas/debug-afip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      accion: 'test-ultimo-comprobante',
                      cuit: cuit || undefined,
                      puntoVenta: 1
                    })
                  })
                  .then(response => handleResponse(response, 'Test Último Comprobante'))
                  .catch(error => handleError(error, 'Test último comprobante'))
                  .finally(() => setLoading(false));
                }}
                disabled={loading}
                className="p-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                Test Último Comprobante
              </button>
            </div>
          </>
        )}

        {activeTab === 'cert' && (
          <>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Tests de Certificados
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={testCertificados}
                disabled={loading}
                className="p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                Verificar Certificados AFIP
              </button>
            </div>
          </>
        )}

        {activeTab === 'config' && (
          <>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuración y Debug Específico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={verificarConfiguracion}
                disabled={loading}
                className="p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Settings className="mr-2" />}
                Verificar Configuración
              </button>
              
              <button
                onClick={debugFacturaEspecifica}
                disabled={loading || !facturaId.trim()}
                className="p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <AlertTriangle className="mr-2" />}
                Debug Factura Específica
              </button>
            </div>
          </>
        )}

        {activeTab === 'repair' && (
          <>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Herramientas de Reparación
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={procesarFacturasColgadas}
                disabled={loading}
                className="p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : <Clock className="mr-2" />}
                Procesar Facturas Colgadas
              </button>
            </div>
          </>
        )}

<button
  onClick={async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/facturas/test-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await handleResponse(response, 'Test Factura Completo');
    } catch (error) {
      handleError(error, 'Test factura');
    } finally {
      setLoading(false);
    }
  }}
  disabled={loading}
  className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
>
  {loading ? <RefreshCw className="animate-spin mr-2" /> : <Zap className="mr-2" />}
  Test Factura Completo (Crear y Facturar)
</button>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="mt-6 flex justify-center items-center p-4 bg-blue-50 rounded-lg">
          <RefreshCw className="animate-spin h-5 w-5 text-blue-600 mr-2" />
          <span className="text-blue-800">Ejecutando diagnóstico...</span>
        </div>
      )}

      {/* Resultado */}
      {renderResultado()}
    </div>
  );
}