
// src/components/reportes/AnalisisComparativo.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Calendar, BarChart3, 
  ArrowRight, Zap, AlertTriangle, CheckCircle, Info, 
  Target, Activity, DollarSign, Users
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalisisComparativoProps {
  datosActuales: any;
  datosAnteriores: any;
  periodoActual: { inicio: Date; fin: Date };
  periodoAnterior: { inicio: Date; fin: Date };
  metricas: Array<{
    key: string;
    label: string;
    formato: 'moneda' | 'numero' | 'porcentaje';
    icono: React.ElementType;
    color: string;
    objetivo?: number;
  }>;
  mostrarTendencia?: boolean;
  mostrarPredicciones?: boolean;
}

interface MetricaComparada {
  key: string;
  label: string;
  valorActual: number;
  valorAnterior: number;
  diferencia: number;
  porcentajeCambio: number;
  tendencia: 'up' | 'down' | 'stable';
  significancia: 'alta' | 'media' | 'baja';
  estado: 'excelente' | 'bueno' | 'regular' | 'malo';
}

export default function AnalisisComparativo({
  datosActuales,
  datosAnteriores,
  periodoActual,
  periodoAnterior,
  metricas,
  mostrarTendencia = true,
  mostrarPredicciones = false
}: AnalisisComparativoProps) {
  const [metricaSeleccionada, setMetricaSeleccionada] = useState<string>(metricas[0]?.key);
  const [vistaDetallada, setVistaDetallada] = useState(false);

  // Calcular métricas comparadas
  const metricasComparadas = useMemo((): MetricaComparada[] => {
    return metricas.map(metrica => {
      const valorActual = obtenerValorMetrica(datosActuales, metrica.key);
      const valorAnterior = obtenerValorMetrica(datosAnteriores, metrica.key);
      
      const diferencia = valorActual - valorAnterior;
      const porcentajeCambio = valorAnterior !== 0 ? (diferencia / valorAnterior) * 100 : 
                             valorActual > 0 ? 100 : 0;
      
      const tendencia: 'up' | 'down' | 'stable' = 
        Math.abs(porcentajeCambio) < 1 ? 'stable' :
        porcentajeCambio > 0 ? 'up' : 'down';
      
      const significancia: 'alta' | 'media' | 'baja' = 
        Math.abs(porcentajeCambio) > 20 ? 'alta' :
        Math.abs(porcentajeCambio) > 10 ? 'media' : 'baja';
      
      let estado: 'excelente' | 'bueno' | 'regular' | 'malo' = 'regular';
      if (metrica.objetivo) {
        const cumplimientoObjetivo = (valorActual / metrica.objetivo) * 100;
        estado = cumplimientoObjetivo >= 100 ? 'excelente' :
                cumplimientoObjetivo >= 80 ? 'bueno' :
                cumplimientoObjetivo >= 60 ? 'regular' : 'malo';
      } else {
        estado = porcentajeCambio > 10 ? 'excelente' :
                porcentajeCambio > 0 ? 'bueno' :
                porcentajeCambio > -10 ? 'regular' : 'malo';
      }
      
      return {
        key: metrica.key,
        label: metrica.label,
        valorActual,
        valorAnterior,
        diferencia,
        porcentajeCambio,
        tendencia,
        significancia,
        estado
      };
    });
  }, [datosActuales, datosAnteriores, metricas]);

  // Obtener valor de métrica de los datos
  const obtenerValorMetrica = (datos: any, key: string): number => {
    if (!datos) return 0;
    
    // Buscar en diferentes estructuras
    if (datos.resumen && datos.resumen[key] !== undefined) {
      return Number(datos.resumen[key]) || 0;
    }
    
    if (datos.estadisticas && datos.estadisticas[key] !== undefined) {
      return Number(datos.estadisticas[key]) || 0;
    }
    
    if (datos[key] !== undefined) {
      return Number(datos[key]) || 0;
    }
    
    return 0;
  };

  // Formatear valor según tipo
  const formatearValor = (valor: number, formato: string): string => {
    switch (formato) {
      case 'moneda':
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(valor);
      case 'porcentaje':
        return `${valor.toFixed(1)}%`;
      case 'numero':
      default:
        return valor.toLocaleString('es-AR');
    }
  };

  // Obtener color según tendencia
  const obtenerColorTendencia = (tendencia: string, significancia: string) => {
    const intensidad = significancia === 'alta' ? '600' : 
                     significancia === 'media' ? '500' : '400';
    
    switch (tendencia) {
      case 'up': return `text-green-${intensidad}`;
      case 'down': return `text-red-${intensidad}`;
      default: return `text-gray-${intensidad}`;
    }
  };

  // Obtener icono de tendencia
  const obtenerIconoTendencia = (tendencia: string) => {
    switch (tendencia) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  // Generar datos para gráfico de tendencia
  const datosTendencia = useMemo(() => {
    const metricaActual = metricas.find(m => m.key === metricaSeleccionada);
    if (!metricaActual || !mostrarTendencia) return [];

    // Simular datos diarios para ambos períodos
    const diasPeriodo = differenceInDays(periodoActual.fin, periodoActual.inicio);
    const datos = [];

    for (let i = 0; i <= diasPeriodo; i++) {
      const fechaActual = subDays(periodoActual.fin, diasPeriodo - i);
      const fechaAnterior = subDays(periodoAnterior.fin, diasPeriodo - i);
      
      // Valores simulados con variación
      const valorActual = obtenerValorMetrica(datosActuales, metricaActual.key);
      const valorAnterior = obtenerValorMetrica(datosAnteriores, metricaActual.key);
      
      datos.push({
        dia: i + 1,
        actual: valorActual * (0.8 + Math.random() * 0.4), // Variación ±20%
        anterior: valorAnterior * (0.8 + Math.random() * 0.4),
        fechaActual: format(fechaActual, 'dd/MM'),
        fechaAnterior: format(fechaAnterior, 'dd/MM')
      });
    }

    return datos;
  }, [metricaSeleccionada, datosActuales, datosAnteriores, periodoActual, periodoAnterior, metricas, mostrarTendencia]);

  const renderTarjetaMetrica = (metrica: MetricaComparada, configuracion: any) => {
    const IconoTendencia = obtenerIconoTendencia(metrica.tendencia);
    const IconoMetrica = configuracion.icono;
    
    return (
      <div 
        key={metrica.key}
        className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
          metricaSeleccionada === metrica.key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
        }`}
        onClick={() => setMetricaSeleccionada(metrica.key)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3`} style={{ backgroundColor: `${configuracion.color}20` }}>
              <IconoMetrica className="h-5 w-5" style={{ color: configuracion.color }} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{metrica.label}</h4>
              <div className="flex items-center mt-1">
                <IconoTendencia className={`h-4 w-4 mr-1 ${obtenerColorTendencia(metrica.tendencia, metrica.significancia)}`} />
                <span className={`text-sm font-medium ${obtenerColorTendencia(metrica.tendencia, metrica.significancia)}`}>
                  {Math.abs(metrica.porcentajeCambio).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Indicador de estado */}
          <div className={`w-3 h-3 rounded-full ${
            metrica.estado === 'excelente' ? 'bg-green-500' :
            metrica.estado === 'bueno' ? 'bg-blue-500' :
            metrica.estado === 'regular' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        </div>

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Período actual</span>
            <span className="font-semibold text-lg">
              {formatearValor(metrica.valorActual, configuracion.formato)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Período anterior</span>
            <span className="text-sm text-gray-500">
              {formatearValor(metrica.valorAnterior, configuracion.formato)}
            </span>
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Diferencia</span>
              <span className={`text-sm font-semibold ${obtenerColorTendencia(metrica.tendencia, metrica.significancia)}`}>
                {metrica.diferencia > 0 ? '+' : ''}{formatearValor(metrica.diferencia, configuracion.formato)}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de progreso si hay objetivo */}
        {configuracion.objetivo && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Objetivo: {formatearValor(configuracion.objetivo, configuracion.formato)}</span>
              <span>{((metrica.valorActual / configuracion.objetivo) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  metrica.valorActual >= configuracion.objetivo ? 'bg-green-500' : 
                  metrica.valorActual >= configuracion.objetivo * 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(100, (metrica.valorActual / configuracion.objetivo) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
            Análisis Comparativo
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {format(periodoActual.inicio, 'dd/MM/yyyy')} - {format(periodoActual.fin, 'dd/MM/yyyy')} vs{' '}
            {format(periodoAnterior.inicio, 'dd/MM/yyyy')} - {format(periodoAnterior.fin, 'dd/MM/yyyy')}
          </p>
        </div>
        
        <button
          onClick={() => setVistaDetallada(!vistaDetallada)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {vistaDetallada ? 'Vista Simple' : 'Vista Detallada'}
        </button>
      </div>

      {/* Resumen de impacto */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          Resumen de Impacto
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {metricasComparadas.filter(m => m.tendencia === 'up').length}
            </div>
            <div className="text-sm text-gray-600">Métricas en alza</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {metricasComparadas.filter(m => m.tendencia === 'down').length}
            </div>
            <div className="text-sm text-gray-600">Métricas en baja</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metricasComparadas.filter(m => m.significancia === 'alta').length}
            </div>
            <div className="text-sm text-gray-600">Cambios significativos</div>
          </div>
        </div>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metricasComparadas.map((metrica) => {
          const config = metricas.find(m => m.key === metrica.key)!;
          return renderTarjetaMetrica(metrica, config);
        })}
      </div>

      {/* Gráfico de tendencia */}
      {mostrarTendencia && datosTendencia.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Tendencia Comparativa: {metricas.find(m => m.key === metricaSeleccionada)?.label}
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosTendencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    formatearValor(value, metricas.find(m => m.key === metricaSeleccionada)?.formato || 'numero'),
                    name === 'actual' ? 'Período Actual' : 'Período Anterior'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="actual"
                />
                <Line 
                  type="monotone" 
                  dataKey="anterior" 
                  stroke="#9ca3af" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="anterior"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vista detallada */}
      {vistaDetallada && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Análisis Detallado</h4>
          
          <div className="space-y-4">
            {metricasComparadas.map((metrica) => {
              const config = metricas.find(m => m.key === metrica.key)!;
              
              return (
                <div key={metrica.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-gray-900">{metrica.label}</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metrica.estado === 'excelente' ? 'bg-green-100 text-green-800' :
                      metrica.estado === 'bueno' ? 'bg-blue-100 text-blue-800' :
                      metrica.estado === 'regular' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {metrica.estado.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <div className="font-semibold">{formatearValor(metrica.valorActual, config.formato)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Anterior:</span>
                      <div className="font-semibold">{formatearValor(metrica.valorAnterior, config.formato)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Diferencia:</span>
                      <div className={`font-semibold ${obtenerColorTendencia(metrica.tendencia, metrica.significancia)}`}>
                        {metrica.diferencia > 0 ? '+' : ''}{formatearValor(metrica.diferencia, config.formato)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Cambio %:</span>
                      <div className={`font-semibold ${obtenerColorTendencia(metrica.tendencia, metrica.significancia)}`}>
                        {metrica.porcentajeCambio > 0 ? '+' : ''}{metrica.porcentajeCambio.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Interpretación */}
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      <strong>Interpretación:</strong>{' '}
                      {metrica.significancia === 'alta' && metrica.tendencia === 'up' && 
                        'Excelente mejora significativa que indica un crecimiento sólido.'}
                      {metrica.significancia === 'alta' && metrica.tendencia === 'down' && 
                        'Descenso significativo que requiere atención inmediata.'}
                      {metrica.significancia === 'media' && 
                        'Cambio moderado dentro de rangos esperados.'}
                      {metrica.significancia === 'baja' && 
                        'Variación mínima, comportamiento estable.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
