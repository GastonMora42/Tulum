// src/components/admin/AlertasStock.tsx - TIPOS CORREGIDOS
import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, TrendingDown, Package2, Eye, 
  X, Filter, RefreshCw, CheckCircle, Clock, Store
} from 'lucide-react';
import { useStockSucursales } from '@/hooks/useStockSucursal';

// ✅ INTERFACES CORREGIDAS
interface AlertaStock {
  id: string;
  productoId: string;
  sucursalId: string;
  tipoAlerta: 'critico' | 'bajo' | 'exceso' | 'reposicion';
  mensaje: string;
  stockActual: number;
  stockReferencia: number;
  activa: boolean;
  vistaPor?: string;
  fechaVista?: Date;
  createdAt: Date;
  producto: {
    nombre: string;
  };
  sucursal: {
    nombre: string;
  };
}

interface AlertasStockProps {
  className?: string;
  sucursalId?: string;
}

const AlertasStock: React.FC<AlertasStockProps> = ({ className = '', sucursalId = '' }) => {
  const {
    alertas,
    loading,
    loadAlertas,
    marcarAlertaVista,
    verificarAlertas,
    getAlertasActivas,
    getAlertasCriticas
  } = useStockSucursales();

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [mostrarSoloNoVistas, setMostrarSoloNoVistas] = useState(false);
  // ✅ TIPO CORREGIDO - AlertaStock | null en lugar de solo null
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<AlertaStock | null>(null);

  useEffect(() => {
    loadAlertas({ 
      sucursalId: sucursalId || undefined,
      activa: true 
    });
  }, [sucursalId, loadAlertas]);

  const handleMarcarVista = async (alertaId: string) => {
    try {
      await marcarAlertaVista(alertaId);
    } catch (error) {
      console.error('Error al marcar alerta como vista:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      if (sucursalId) {
        await verificarAlertas('sucursal', { sucursalId });
      }
      await loadAlertas({ 
        sucursalId: sucursalId || undefined,
        activa: true 
      });
    } catch (error) {
      console.error('Error al actualizar alertas:', error);
    }
  };

  const getIconoAlerta = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'bajo':
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
      case 'exceso':
        return <Package2 className="w-5 h-5 text-purple-600" />;
      case 'reposicion':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getColorAlerta = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return 'border-red-200 bg-red-50';
      case 'bajo':
        return 'border-orange-200 bg-orange-50';
      case 'exceso':
        return 'border-purple-200 bg-purple-50';
      case 'reposicion':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const alertasFiltradas = alertas.filter((alerta: AlertaStock) => {
    if (filtroTipo !== 'todos' && alerta.tipoAlerta !== filtroTipo) {
      return false;
    }
    if (mostrarSoloNoVistas && alerta.vistaPor) {
      return false;
    }
    return true;
  });

  const alertasActivas = getAlertasActivas();
  const alertasCriticas = getAlertasCriticas();

  if (loading && alertas.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-700" />
              {alertasCriticas.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {alertasCriticas.length}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Alertas de Stock</h3>
              <p className="text-sm text-gray-500">
                {alertasActivas.length} alertas activas • {alertasCriticas.length} críticas
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="todos">Todos los tipos</option>
              <option value="critico">Críticos</option>
              <option value="bajo">Stock bajo</option>
              <option value="exceso">Exceso</option>
              <option value="reposicion">Reposición</option>
            </select>
          </div>
          
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={mostrarSoloNoVistas}
              onChange={(e) => setMostrarSoloNoVistas(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700">Solo no vistas</span>
          </label>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="max-h-96 overflow-y-auto">
        {alertasFiltradas.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-1">¡Todo en orden!</h4>
            <p className="text-gray-500">No hay alertas que requieran atención</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {alertasFiltradas.map((alerta: AlertaStock) => (
              <div
                key={alerta.id}
                className={`rounded-lg border-l-4 p-4 cursor-pointer transition-all hover:shadow-md ${getColorAlerta(alerta.tipoAlerta)} ${
                  alerta.vistaPor ? 'opacity-70' : ''
                }`}
                onClick={() => setAlertaSeleccionada(alerta)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIconoAlerta(alerta.tipoAlerta)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          alerta.tipoAlerta === 'critico' ? 'bg-red-100 text-red-800' :
                          alerta.tipoAlerta === 'bajo' ? 'bg-orange-100 text-orange-800' :
                          alerta.tipoAlerta === 'exceso' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alerta.tipoAlerta.toUpperCase()}
                        </span>
                        
                        {!alerta.vistaPor && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            NUEVO
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {alerta.producto.nombre}
                      </p>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alerta.mensaje}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Store className="w-3 h-3" />
                          <span>{alerta.sucursal.nombre}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(alerta.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div>
                          Stock: {alerta.stockActual} / {alerta.stockReferencia}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!alerta.vistaPor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarcarVista(alerta.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Marcar como vista"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle de alerta */}
      {alertaSeleccionada && (
        <AlertaDetailModal
          alerta={alertaSeleccionada}
          onClose={() => setAlertaSeleccionada(null)}
          onMarcarVista={handleMarcarVista}
        />
      )}
    </div>
  );
};

// ✅ MODAL CORREGIDO CON TIPOS
interface AlertaDetailModalProps {
  alerta: AlertaStock;
  onClose: () => void;
  onMarcarVista: (alertaId: string) => void;
}

const AlertaDetailModal: React.FC<AlertaDetailModalProps> = ({ alerta, onClose, onMarcarVista }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Detalle de Alerta</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="px-6 py-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <p className="text-sm text-gray-900">{alerta.producto.nombre}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
            <p className="text-sm text-gray-900">{alerta.sucursal.nombre}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Alerta</label>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              alerta.tipoAlerta === 'critico' ? 'bg-red-100 text-red-800' :
              alerta.tipoAlerta === 'bajo' ? 'bg-orange-100 text-orange-800' :
              alerta.tipoAlerta === 'exceso' ? 'bg-purple-100 text-purple-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {alerta.tipoAlerta.toUpperCase()}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <p className="text-sm text-gray-900">{alerta.mensaje}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
              <p className="text-lg font-bold text-gray-900">{alerta.stockActual}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Referencia</label>
              <p className="text-lg font-bold text-gray-900">{alerta.stockReferencia}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Creación</label>
            <p className="text-sm text-gray-900">
              {new Date(alerta.createdAt).toLocaleString()}
            </p>
          </div>
          
          {alerta.vistaPor && alerta.fechaVista && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vista por</label>
              <p className="text-sm text-gray-900">
                {new Date(alerta.fechaVista).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
          
          {!alerta.vistaPor && (
            <button
              onClick={() => {
                onMarcarVista(alerta.id);
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Marcar como Vista
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default AlertasStock;