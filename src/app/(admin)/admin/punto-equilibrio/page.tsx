// src/app/(admin)/admin/punto-equilibrio/page.tsx
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
  Calendar
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface SucursalData {
  id: string;
  nombre: string;
  ventasMes: number;
  ventasAnterior: number;
  costosFijos: number;
  costosVariables: number;
  metaMensual: number;
  puntoEquilibrio: number;
  margenContribucion: number;
  progreso: number;
  estado: 'por_debajo' | 'en_meta' | 'superando';
}

interface MetaConfig {
  sucursalId: string;
  costosFijos: number;
  costosVariables: number;
  metaMensual: number;
  mes: string;
  año: number;
}

export default function PuntoEquilibrioPage() {
  const [sucursales, setSucursales] = useState<SucursalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().substring(0, 7));
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configuraciones, setConfiguraciones] = useState<Record<string, MetaConfig>>({});

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
      setConfiguraciones(data.configuraciones);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (sucursalId: string, config: MetaConfig) => {
    try {
      const response = await authenticatedFetch('/api/admin/punto-equilibrio/configuracion', {
        method: 'POST',
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
      case 'superando': return 'text-green-600 bg-green-100';
      case 'en_meta': return 'text-blue-600 bg-blue-100';
      case 'por_debajo': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'superando': return TrendingUp;
      case 'en_meta': return Target;
      case 'por_debajo': return TrendingDown;
      default: return AlertCircle;
    }
  };

  const totalVentas = sucursales.reduce((sum, s) => sum + s.ventasMes, 0);
  const totalMetas = sucursales.reduce((sum, s) => sum + s.metaMensual, 0);
  const progresoGeneral = totalMetas > 0 ? (totalVentas / totalMetas) * 100 : 0;

  return (
    <ContrastEnhancer>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Punto de Equilibrio por Sucursal</h1>
              <p className="text-white/80">Análisis financiero y metas de ventas por ubicación</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-white/80">Progreso General</p>
                <p className="text-2xl font-bold">{progresoGeneral.toFixed(1)}%</p>
              </div>
              <input
                type="month"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-md focus:bg-white/20"
              />
            </div>
          </div>
        </div>

        {/* Métricas Globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900">${totalVentas.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900">${totalMetas.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Progreso</p>
                <p className="text-2xl font-bold text-gray-900">{progresoGeneral.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calculator className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sucursales</p>
                <p className="text-2xl font-bold text-gray-900">{sucursales.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Sucursales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sucursales.map((sucursal) => {
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(sucursal.estado)}`}>
                        <IconoEstado className="inline h-3 w-3 mr-1" />
                        {sucursal.estado === 'superando' ? 'Superando meta' :
                         sucursal.estado === 'en_meta' ? 'En meta' : 'Por debajo'}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingConfig(isEditing ? null : sucursal.id)}
                      className="text-[#9c7561] hover:text-[#311716] p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Métricas principales */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${sucursal.ventasMes.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Ventas del mes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#311716]">${sucursal.metaMensual.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Meta mensual</p>
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
                          sucursal.progreso >= 80 ? 'bg-blue-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(sucursal.progreso, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Configuración o Vista */}
                  {isEditing && config ? (
                    <ConfigEditor 
                      config={config}
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
                      <div className={`p-3 rounded-lg ${getEstadoColor(sucursal.estado)} bg-opacity-10`}>
                        <div className="flex items-center">
                          <IconoEstado className="h-5 w-5 mr-2" />
                          <div>
                            <p className="font-medium">
                              {sucursal.estado === 'superando' ? 'Excelente desempeño' :
                               sucursal.estado === 'en_meta' ? 'Cumpliendo objetivos' : 'Requiere atención'}
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
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ContrastEnhancer>
  );
}

// Componente Editor de Configuración
interface ConfigEditorProps {
  config: MetaConfig;
  onSave: (config: MetaConfig) => void;
  onCancel: () => void;
}

function ConfigEditor({ config, onSave, onCancel }: ConfigEditorProps) {
  const [formData, setFormData] = useState(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Costos Fijos Mensuales ($)
        </label>
        <input
          type="number"
          value={formData.costosFijos}
          onChange={(e) => setFormData({...formData, costosFijos: Number(e.target.value)})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#9c7561] focus:border-[#9c7561]"
          required
        />
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#9c7561] focus:border-[#9c7561]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meta Mensual de Ventas ($)
        </label>
        <input
          type="number"
          value={formData.metaMensual}
          onChange={(e) => setFormData({...formData, metaMensual: Number(e.target.value)})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#9c7561] focus:border-[#9c7561]"
          required
        />
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