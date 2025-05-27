// src/app/(admin)/admin/punto-equilibrio/page.tsx - VERSIÓN MEJORADA
'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertCircle,
  Save,
  Edit,
  BarChart3,
  PieChart,
  Calculator,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface SucursalData {
  id: string;
  nombre: string;
  direccion: string;
  ventasMes: number;
  ventasAnterior: number;
  cantidadVentas: number;
  costosFijos: number;
  costosVariables: number;
  metaMensual: number;
  puntoEquilibrio: number;
  margenContribucion: number;
  progreso: number;
  estado: 'critico' | 'por_debajo' | 'en_meta' | 'superando';
  crecimientoMensual: number;
  proyeccionMes: number;
  ventasPorDia: Array<{ fecha: string; total: number; cantidad: number }>;
  configurado: boolean;
  ultimaActualizacion?: string;
}

interface MetaConfig {
  sucursalId: string;
  costosFijos: number;
  costosVariables: number;
  metaMensual: number;
  mes: string;
  año: number;
}

interface ResumenGeneral {
  totalVentas: number;
  totalMetas: number;
  promedioProgreso: number;
  sucursalesConfiguradas: number;
  sucursalesEnMeta: number;
}

export default function PuntoEquilibrioPage() {
  const [sucursales, setSucursales] = useState<SucursalData[]>([]);
  const [resumen, setResumen] = useState<ResumenGeneral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().substring(0, 7));
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configuraciones, setConfiguraciones] = useState<Record<string, MetaConfig>>({});
  const [showOnlyNeedConfig, setShowOnlyNeedConfig] = useState(false);

  useEffect(() => {
    fetchPuntoEquilibrio();
  }, [mesSeleccionado]);

  const fetchPuntoEquilibrio = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch(`/api/admin/punto-equilibrio?mes=${mesSeleccionado}`);
      
      if (!response.ok) throw new Error('Error al cargar datos');
      
      const data = await response.json();
      setSucursales(data.sucursales);
      setResumen(data.resumen);
      setConfiguraciones(data.configuraciones);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (sucursalId: string, config: MetaConfig) => {
    try {
      const response = await authenticatedFetch(`/api/admin/punto-equilibrio/configuracion/${sucursalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        await fetchPuntoEquilibrio();
        setEditingConfig(null);
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'superando': return 'text-green-600 bg-green-100 border-green-200';
      case 'en_meta': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'por_debajo': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critico': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'superando': return TrendingUp;
      case 'en_meta': return Target;
      case 'por_debajo': return TrendingDown;
      case 'critico': return XCircle;
      default: return AlertCircle;
    }
  };

  const sucursalesFiltradas = showOnlyNeedConfig 
    ? sucursales.filter(s => !s.configurado)
    : sucursales;

  return (
    <ContrastEnhancer>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Punto de Equilibrio por Sucursal</h1>
              <p className="text-white/80">Análisis financiero y metas de ventas personalizables</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-white/80">Mes</p>
                <input
                  type="month"
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-md focus:bg-white/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Globales Mejoradas */}
        {resumen && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                  <p className="text-2xl font-bold text-gray-900">${resumen.totalVentas.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Meta Total</p>
                  <p className="text-2xl font-bold text-gray-900">${resumen.totalMetas.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Progreso Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.promedioProgreso.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Configuradas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {resumen.sucursalesConfiguradas}/{sucursales.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
              <div className="flex items-center">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Meta</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.sucursalesEnMeta}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow border border-[#eeb077]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Configuraciones</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyNeedConfig}
                  onChange={(e) => setShowOnlyNeedConfig(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Solo mostrar sin configurar</span>
              </label>
            </div>
          </div>
        </div>

        {/* Lista de Sucursales Mejorada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sucursalesFiltradas.map((sucursal) => {
            const IconoEstado = getEstadoIcon(sucursal.estado);
            const config = configuraciones[sucursal.id];
            const isEditing = editingConfig === sucursal.id;
            
            return (
              <div key={sucursal.id} className="bg-white rounded-lg shadow border border-[#eeb077] overflow-hidden">
                {/* Header de Sucursal */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-[#311716]">{sucursal.nombre}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(sucursal.estado)}`}>
                        <IconoEstado className="inline h-3 w-3 mr-1" />
                        {sucursal.estado === 'superando' ? 'Superando meta' :
                         sucursal.estado === 'en_meta' ? 'En meta' :
                         sucursal.estado === 'por_debajo' ? 'Por debajo' : 'Crítico'}
                      </span>
                      {!sucursal.configurado && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Configuración pendiente
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingConfig(isEditing ? null : sucursal.id)}
                      className="text-[#9c7561] hover:text-[#311716] p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                  {sucursal.direccion && (
                    <p className="text-sm text-gray-600 mt-1">{sucursal.direccion}</p>
                  )}
                </div>

                <div className="p-6">
                  {/* Métricas principales */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${sucursal.ventasMes.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Ventas del mes</p>
                      <div className="flex items-center justify-center mt-1">
                        {sucursal.crecimientoMensual >= 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={`text-xs ${sucursal.crecimientoMensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(sucursal.crecimientoMensual).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#311716]">${sucursal.metaMensual.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Meta mensual</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {sucursal.cantidadVentas} ventas
                      </p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progreso hacia la meta</span>
                      <span>{sucursal.progreso.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          sucursal.progreso >= 100 ? 'bg-green-500' :
                          sucursal.progreso >= 80 ? 'bg-blue-500' :
                          sucursal.progreso >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(sucursal.progreso, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Proyección */}
                  <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Proyección fin de mes</h4>
                    <p className="text-lg font-bold text-blue-900">${sucursal.proyeccionMes.toLocaleString()}</p>
                    <p className="text-xs text-blue-700">
                      {sucursal.proyeccionMes >= sucursal.metaMensual ? 'Superará la meta' : 'Por debajo de la meta'}
                    </p>
                  </div>

                  {/* Configuración o Vista */}
                  {isEditing ? (
                    <ConfigEditor 
                      sucursalId={sucursal.id}
                      mesSeleccionado={mesSeleccionado}
                      initialConfig={config}
                      onSave={(newConfig) => saveConfiguration(sucursal.id, newConfig)}
                      onCancel={() => setEditingConfig(null)}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Análisis financiero */}
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Punto de equilibrio:</span>
                          <span className="font-medium">${sucursal.puntoEquilibrio.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Margen de contribución:</span>
                          <span className="font-medium">{sucursal.margenContribucion.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Costos fijos:</span>
                          <span className="font-medium">${sucursal.costosFijos.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Costos variables:</span>
                          <span className="font-medium">{sucursal.costosVariables.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Estado actual */}
                      <div className={`p-3 rounded-lg border ${getEstadoColor(sucursal.estado)} bg-opacity-10`}>
                        <div className="flex items-center">
                          <IconoEstado className="h-5 w-5 mr-2" />
                          <div>
                            <p className="font-medium">
                              {sucursal.estado === 'superando' ? 'Excelente desempeño' :
                               sucursal.estado === 'en_meta' ? 'Cumpliendo objetivos' :
                               sucursal.estado === 'por_debajo' ? 'Necesita mejorar' : 'Requiere atención urgente'}
                            </p>
                            <p className="text-sm opacity-80">
                              {sucursal.progreso >= 100 
                                ? `Superaste la meta por $${(sucursal.ventasMes - sucursal.metaMensual).toLocaleString()}`
                                : `Faltan $${(sucursal.metaMensual - sucursal.ventasMes).toLocaleString()} para la meta`
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {sucursal.ultimaActualizacion && (
                        <p className="text-xs text-gray-500 text-center">
                          Última actualización: {new Date(sucursal.ultimaActualizacion).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sucursalesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showOnlyNeedConfig ? 'Todas las sucursales están configuradas' : 'No hay sucursales disponibles'}
            </h3>
            <p className="text-gray-600">
              {showOnlyNeedConfig 
                ? 'Todas las sucursales tienen configuración para este mes.'
                : 'No se encontraron sucursales activas en el sistema.'
              }
            </p>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}

// Componente Editor de Configuración Mejorado
interface ConfigEditorProps {
  sucursalId: string;
  mesSeleccionado: string;
  initialConfig?: any;
  onSave: (config: MetaConfig) => void;
  onCancel: () => void;
}

function ConfigEditor({ sucursalId, mesSeleccionado, initialConfig, onSave, onCancel }: ConfigEditorProps) {
  const [año, mes] = mesSeleccionado.split('-');
  const [formData, setFormData] = useState({
    costosFijos: initialConfig?.costosFijos || 50000,
    costosVariables: initialConfig?.costosVariables || 30,
    metaMensual: initialConfig?.metaMensual || 200000
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.costosFijos <= 0) {
      newErrors.costosFijos = 'Los costos fijos deben ser mayor a 0';
    }
    
    if (formData.costosVariables < 0 || formData.costosVariables > 100) {
      newErrors.costosVariables = 'Los costos variables deben estar entre 0 y 100%';
    }
    
    if (formData.metaMensual <= 0) {
      newErrors.metaMensual = 'La meta mensual debe ser mayor a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    onSave({
      sucursalId,
      ...formData,
      mes,
      año: parseInt(año)
    });
  };

  // Cálculos en tiempo real
  const margenContribucion = 100 - formData.costosVariables;
  const puntoEquilibrio = formData.costosFijos / (margenContribucion / 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-800 mb-1">Configuración para {mes}/{año}</h4>
        <p className="text-xs text-yellow-700">
          Esta configuración se aplicará específicamente para este mes.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Costos Fijos Mensuales ($)
        </label>
        <input
          type="number"
          value={formData.costosFijos}
          onChange={(e) => setFormData({...formData, costosFijos: Number(e.target.value)})}
          className={`w-full px-3 py-2 border rounded-md focus:ring-[#9c7561] focus:border-[#9c7561] ${
            errors.costosFijos ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ej: 50000"
        />
        {errors.costosFijos && (
          <p className="text-xs text-red-600 mt-1">{errors.costosFijos}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Costos Variables (% de ventas)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={formData.costosVariables}
          onChange={(e) => setFormData({...formData, costosVariables: Number(e.target.value)})}
          className={`w-full px-3 py-2 border rounded-md focus:ring-[#9c7561] focus:border-[#9c7561] ${
            errors.costosVariables ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ej: 30"
        />
        {errors.costosVariables && (
          <p className="text-xs text-red-600 mt-1">{errors.costosVariables}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meta Mensual de Ventas ($)
        </label>
        <input
          type="number"
          value={formData.metaMensual}
          onChange={(e) => setFormData({...formData, metaMensual: Number(e.target.value)})}
          className={`w-full px-3 py-2 border rounded-md focus:ring-[#9c7561] focus:border-[#9c7561] ${
            errors.metaMensual ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ej: 200000"
        />
        {errors.metaMensual && (
          <p className="text-xs text-red-600 mt-1">{errors.metaMensual}</p>
        )}
      </div>

      {/* Cálculos en tiempo real */}
      <div className="bg-blue-50 p-3 rounded-md">
        <h5 className="text-sm font-medium text-blue-800 mb-2">Cálculos automáticos:</h5>
        <div className="space-y-1 text-xs text-blue-700">
          <div className="flex justify-between">
            <span>Margen de contribución:</span>
            <span className="font-medium">{margenContribucion.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Punto de equilibrio:</span>
            <span className="font-medium">${puntoEquilibrio.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          type="submit"
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#311716] hover:bg-[#462625]"
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}