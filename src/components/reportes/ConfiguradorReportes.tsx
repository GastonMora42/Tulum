// src/components/reportes/ConfiguradorReportes.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Save, Share, Download, Eye, Plus, Trash2, Edit3, 
  Copy, RotateCcw, Filter, BarChart3, PieChart, LineChart, 
  Grid, List, Calendar, Clock, Target, Users, Package, 
  DollarSign, AlertCircle, CheckCircle, X, ChevronDown,
  Palette, Layout, Sliders, Database, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos
interface ConfiguracionReporte {
  id: string;
  nombre: string;
  descripcion: string;
  tipoReporte: string;
  filtros: any;
  visualizaciones: ConfiguracionVisualizacion[];
  layout: 'grid' | 'list' | 'dashboard';
  colores: string[];
  fechaCreacion: Date;
  fechaModificacion: Date;
  esPublica: boolean;
  creadoPor: string;
}

interface ConfiguracionVisualizacion {
  id: string;
  tipo: 'kpi' | 'grafico' | 'tabla' | 'mapa_calor' | 'gauge' | 'alerta';
  posicion: { x: number; y: number; width: number; height: number };
  configuracion: any;
  visible: boolean;
}

interface Props {
  tipoReporte: string;
  filtrosActuales: any;
  datosReporte: any;
  onConfiguracionChange: (config: ConfiguracionReporte) => void;
  onGuardarConfiguracion: (config: ConfiguracionReporte) => Promise<void>;
  onCargarConfiguracion: (configId: string) => Promise<ConfiguracionReporte>;
  configuracionesGuardadas: ConfiguracionReporte[];
}

const TIPOS_GRAFICOS = [
  { id: 'lineas', nombre: 'Líneas', icono: LineChart, descripcion: 'Ideal para tendencias' },
  { id: 'barras', nombre: 'Barras', icono: BarChart3, descripcion: 'Comparaciones simples' },
  { id: 'area', nombre: 'Área', icono: BarChart3, descripcion: 'Tendencias con volumen' },
  { id: 'dona', nombre: 'Dona', icono: PieChart, descripcion: 'Distribuciones' },
  { id: 'radar', nombre: 'Radar', icono: Target, descripcion: 'Métricas múltiples' },
  { id: 'gauge', nombre: 'Medidor', icono: Target, descripcion: 'Progreso hacia meta' }
];

const PALETAS_COLORES = [
  { nombre: 'Tulum Clásica', colores: ['#311716', '#9c7561', '#eeb077', '#462625', '#8a6550'] },
  { nombre: 'Azul Corporativo', colores: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'] },
  { nombre: 'Verde Natural', colores: ['#166534', '#16a34a', '#22c55e', '#4ade80', '#bbf7d0'] },
  { nombre: 'Púrpura Elegante', colores: ['#581c87', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'] },
  { nombre: 'Naranja Vibrante', colores: ['#c2410c', '#ea580c', '#fb923c', '#fdba74', '#fed7aa'] },
  { nombre: 'Escala de Grises', colores: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] }
];

export default function ConfiguradorReportes({
  tipoReporte,
  filtrosActuales,
  datosReporte,
  onConfiguracionChange,
  onGuardarConfiguracion,
  onCargarConfiguracion,
  configuracionesGuardadas
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'visualizaciones' | 'filtros' | 'colores' | 'guardadas'>('layout');
  const [configuracionActual, setConfiguracionActual] = useState<ConfiguracionReporte | null>(null);
  const [isGuardando, setIsGuardando] = useState(false);
  const [nombreNuevaConfig, setNombreNuevaConfig] = useState('');
  const [descripcionNuevaConfig, setDescripcionNuevaConfig] = useState('');
  const [showGuardarDialog, setShowGuardarDialog] = useState(false);

  // Inicializar configuración por defecto
  useEffect(() => {
    if (!configuracionActual) {
      const configDefault: ConfiguracionReporte = {
        id: 'default',
        nombre: 'Configuración por Defecto',
        descripcion: 'Configuración automática basada en el tipo de reporte',
        tipoReporte,
        filtros: filtrosActuales,
        visualizaciones: generarVisualizacionesDefault(),
        layout: 'dashboard',
        colores: PALETAS_COLORES[0].colores,
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        esPublica: false,
        creadoPor: 'current-user'
      };
      setConfiguracionActual(configDefault);
    }
  }, [tipoReporte, filtrosActuales]);

  const generarVisualizacionesDefault = (): ConfiguracionVisualizacion[] => {
    const visualizaciones: ConfiguracionVisualizacion[] = [];
    
    switch (tipoReporte) {
      case 'ventas_generales':
        visualizaciones.push(
          {
            id: 'kpi-ventas-totales',
            tipo: 'kpi',
            posicion: { x: 0, y: 0, width: 3, height: 1 },
            configuracion: { metrica: 'ventasTotales', titulo: 'Ventas Totales' },
            visible: true
          },
          {
            id: 'grafico-tendencia',
            tipo: 'grafico',
            posicion: { x: 0, y: 1, width: 6, height: 3 },
            configuracion: { tipo: 'lineas', dataKey: 'tendencia' },
            visible: true
          },
          {
            id: 'grafico-medios-pago',
            tipo: 'grafico',
            posicion: { x: 6, y: 1, width: 6, height: 3 },
            configuracion: { tipo: 'dona', dataKey: 'mediosPago' },
            visible: true
          }
        );
        break;
      case 'vendedores_performance':
        visualizaciones.push(
          {
            id: 'tabla-vendedores',
            tipo: 'tabla',
            posicion: { x: 0, y: 0, width: 6, height: 4 },
            configuracion: { dataKey: 'performance', columnas: ['nombre', 'ventas', 'facturacion'] },
            visible: true
          },
          {
            id: 'radar-performance',
            tipo: 'grafico',
            posicion: { x: 6, y: 0, width: 6, height: 4 },
            configuracion: { tipo: 'radar', dataKey: 'performance' },
            visible: true
          }
        );
        break;
      default:
        visualizaciones.push(
          {
            id: 'default-chart',
            tipo: 'grafico',
            posicion: { x: 0, y: 0, width: 12, height: 4 },
            configuracion: { tipo: 'barras' },
            visible: true
          }
        );
    }
    
    return visualizaciones;
  };

  const handleGuardarConfiguracion = async () => {
    if (!configuracionActual || !nombreNuevaConfig) return;

    setIsGuardando(true);
    try {
      const nuevaConfiguracion: ConfiguracionReporte = {
        ...configuracionActual,
        id: `config-${Date.now()}`,
        nombre: nombreNuevaConfig,
        descripcion: descripcionNuevaConfig,
        fechaCreacion: new Date(),
        fechaModificacion: new Date()
      };

      await onGuardarConfiguracion(nuevaConfiguracion);
      setShowGuardarDialog(false);
      setNombreNuevaConfig('');
      setDescripcionNuevaConfig('');
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setIsGuardando(false);
    }
  };

  const handleCargarConfiguracion = async (configId: string) => {
    try {
      const config = await onCargarConfiguracion(configId);
      setConfiguracionActual(config);
      onConfiguracionChange(config);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const actualizarVisualizacion = (visualizacionId: string, cambios: Partial<ConfiguracionVisualizacion>) => {
    if (!configuracionActual) return;

    const nuevasVisualizaciones = configuracionActual.visualizaciones.map(viz =>
      viz.id === visualizacionId ? { ...viz, ...cambios } : viz
    );

    const nuevaConfiguracion = {
      ...configuracionActual,
      visualizaciones: nuevasVisualizaciones,
      fechaModificacion: new Date()
    };

    setConfiguracionActual(nuevaConfiguracion);
    onConfiguracionChange(nuevaConfiguracion);
  };

  const agregarVisualizacion = (tipo: ConfiguracionVisualizacion['tipo']) => {
    if (!configuracionActual) return;

    const nuevaVisualizacion: ConfiguracionVisualizacion = {
      id: `viz-${Date.now()}`,
      tipo,
      posicion: { x: 0, y: 0, width: 4, height: 3 },
      configuracion: { tipo: tipo === 'grafico' ? 'barras' : {} },
      visible: true
    };

    const nuevaConfiguracion = {
      ...configuracionActual,
      visualizaciones: [...configuracionActual.visualizaciones, nuevaVisualizacion],
      fechaModificacion: new Date()
    };

    setConfiguracionActual(nuevaConfiguracion);
    onConfiguracionChange(nuevaConfiguracion);
  };

  const eliminarVisualizacion = (visualizacionId: string) => {
    if (!configuracionActual) return;

    const nuevasVisualizaciones = configuracionActual.visualizaciones.filter(
      viz => viz.id !== visualizacionId
    );

    const nuevaConfiguracion = {
      ...configuracionActual,
      visualizaciones: nuevasVisualizaciones,
      fechaModificacion: new Date()
    };

    setConfiguracionActual(nuevaConfiguracion);
    onConfiguracionChange(nuevaConfiguracion);
  };

  const cambiarPaletaColores = (nuevaPaleta: string[]) => {
    if (!configuracionActual) return;

    const nuevaConfiguracion = {
      ...configuracionActual,
      colores: nuevaPaleta,
      fechaModificacion: new Date()
    };

    setConfiguracionActual(nuevaConfiguracion);
    onConfiguracionChange(nuevaConfiguracion);
  };

  const renderTabLayout = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Layout
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dashboard', nombre: 'Dashboard', icono: Grid, desc: 'Vista completa con widgets' },
            { id: 'list', nombre: 'Lista', icono: List, desc: 'Vista de lista detallada' },
            { id: 'grid', nombre: 'Grilla', icono: Grid, desc: 'Vista en grilla organizada' }
          ].map(layout => (
            <button
              key={layout.id}
              onClick={() => {
                if (!configuracionActual) return;
                const nuevaConfiguracion = { ...configuracionActual, layout: layout.id as any };
                setConfiguracionActual(nuevaConfiguracion);
                onConfiguracionChange(nuevaConfiguracion);
              }}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                configuracionActual?.layout === layout.id
                  ? 'border-[#9c7561] bg-[#9c7561]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <layout.icono className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">{layout.nombre}</p>
              <p className="text-xs text-gray-500">{layout.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabVisualizaciones = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Componentes del Reporte</h4>
        <div className="relative">
          <select
            onChange={(e) => agregarVisualizacion(e.target.value as any)}
            value=""
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">+ Agregar Componente</option>
            <option value="kpi">KPI / Métrica</option>
            <option value="grafico">Gráfico</option>
            <option value="tabla">Tabla</option>
            <option value="mapa_calor">Mapa de Calor</option>
            <option value="gauge">Medidor</option>
            <option value="alerta">Alerta</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {configuracionActual?.visualizaciones.map((viz, index) => (
          <div key={viz.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={viz.visible}
                  onChange={(e) => actualizarVisualizacion(viz.id, { visible: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="font-medium capitalize">{viz.tipo}</span>
                <span className="text-sm text-gray-500">#{index + 1}</span>
              </div>
              <button
                onClick={() => eliminarVisualizacion(viz.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ancho
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={viz.posicion.width}
                  onChange={(e) => actualizarVisualizacion(viz.id, {
                    posicion: { ...viz.posicion, width: parseInt(e.target.value) }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alto
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={viz.posicion.height}
                  onChange={(e) => actualizarVisualizacion(viz.id, {
                    posicion: { ...viz.posicion, height: parseInt(e.target.value) }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>

            {viz.tipo === 'grafico' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo de Gráfico
                </label>
                <select
                  value={viz.configuracion.tipo || 'barras'}
                  onChange={(e) => actualizarVisualizacion(viz.id, {
                    configuracion: { ...viz.configuracion, tipo: e.target.value }
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  {TIPOS_GRAFICOS.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre} - {tipo.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabColores = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-3">Paletas de Colores</h4>
        <div className="grid grid-cols-1 gap-3">
          {PALETAS_COLORES.map((paleta, index) => (
            <button
              key={index}
              onClick={() => cambiarPaletaColores(paleta.colores)}
              className={`p-4 border-2 rounded-lg transition-all ${
                JSON.stringify(configuracionActual?.colores) === JSON.stringify(paleta.colores)
                  ? 'border-[#9c7561] bg-[#9c7561]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{paleta.nombre}</span>
                <div className="flex space-x-1">
                  {paleta.colores.map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabGuardadas = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Configuraciones Guardadas</h4>
        <button
          onClick={() => setShowGuardarDialog(true)}
          className="px-3 py-2 bg-[#9c7561] text-white rounded-lg text-sm hover:bg-[#8a6550] transition-colors"
        >
          <Save className="h-4 w-4 inline mr-1" />
          Guardar Actual
        </button>
      </div>

      <div className="space-y-3">
        {configuracionesGuardadas.map(config => (
          <div key={config.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h5 className="font-medium">{config.nombre}</h5>
                <p className="text-sm text-gray-600">{config.descripcion}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Modificado: {format(config.fechaModificacion, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCargarConfiguracion(config.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  Aplicar
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#9c7561] text-white p-4 rounded-full shadow-lg hover:bg-[#8a6550] transition-all z-50"
      >
        <Settings className="h-6 w-6" />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)}></div>

      {/* Panel Lateral */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Configurador de Reportes</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'layout', label: 'Layout', icono: Layout },
            { id: 'visualizaciones', label: 'Componentes', icono: Sliders },
            { id: 'colores', label: 'Colores', icono: Palette },
            { id: 'guardadas', label: 'Guardadas', icono: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#9c7561] text-[#9c7561]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icono className="h-4 w-4 mx-auto mb-1" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'layout' && renderTabLayout()}
          {activeTab === 'visualizaciones' && renderTabVisualizaciones()}
          {activeTab === 'colores' && renderTabColores()}
          {activeTab === 'guardadas' && renderTabGuardadas()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Restablecer a Default
          </button>
          <button className="w-full px-4 py-2 bg-[#9c7561] text-white rounded-lg hover:bg-[#8a6550] transition-colors">
            <Share className="h-4 w-4 inline mr-2" />
            Compartir Configuración
          </button>
        </div>
      </div>

      {/* Dialog Guardar Configuración */}
      {showGuardarDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">Guardar Configuración</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombreNuevaConfig}
                  onChange={(e) => setNombreNuevaConfig(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
                  placeholder="Mi configuración personalizada"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={descripcionNuevaConfig}
                  onChange={(e) => setDescripcionNuevaConfig(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
                  rows={3}
                  placeholder="Breve descripción de esta configuración..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGuardarDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarConfiguracion}
                disabled={!nombreNuevaConfig || isGuardando}
                className="px-4 py-2 bg-[#9c7561] text-white rounded-lg hover:bg-[#8a6550] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGuardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}