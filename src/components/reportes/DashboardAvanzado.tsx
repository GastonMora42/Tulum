// src/components/reportes/DashboardAvanzado.tsx - COMPONENTES VISUALES COMPLETOS
'use client';

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign,
  Users, Package, ShoppingCart, Target, Activity, Clock, Minus
} from 'lucide-react';

// ============= INTERFACES =============
interface KPICardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icono: React.ElementType;
  color: string;
  bgColor: string;
  cambio?: number;
  comparacion?: string;
  loading?: boolean;
}

interface GraficoUniversalProps {
  data: any[];
  tipo: 'lineas' | 'barras' | 'area' | 'dona' | 'radar' | 'scatter' | 'compuesto';
  titulo: string;
  dataKey?: string;
  xKey?: string;
  yKey?: string;
  colores?: string[];
  altura?: number;
  configuracion?: any;
}

interface MapaCalorProps {
  data: any[];
  xKey: string;
  yKey: string;
  valueKey: string;
  titulo: string;
  colorScale?: [string, string];
}

interface AlertaMejoradaProps {
  tipo: 'success' | 'warning' | 'error' | 'info';
  titulo: string;
  mensaje: string;
  accion?: string;
  onAccion?: () => void;
  mostrarIcono?: boolean;
  cerrable?: boolean;
  onCerrar?: () => void;
}

interface MetricaCircularProps {
  valor: number;
  maximo: number;
  titulo: string;
  subtitulo?: string;
  color: string;
  tamano?: number;
  mostrarPorcentaje?: boolean;
}

// ============= KPI CARD COMPONENT =============
export const KPICard: React.FC<KPICardProps> = ({
  titulo,
  valor,
  subtitulo,
  icono: Icono,
  color,
  bgColor,
  cambio,
  comparacion,
  loading = false
}) => {
  const formatearValor = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  const getCambioColor = (cambio: number) => {
    if (cambio > 0) return 'text-green-600';
    if (cambio < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getCambioIcono = (cambio: number) => {
    if (cambio > 0) return TrendingUp;
    if (cambio < 0) return TrendingDown;
    return Minus;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icono className={`h-6 w-6 ${color}`} />
        </div>
        <span className="text-sm text-gray-500">{titulo}</span>
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-gray-800">
          {formatearValor(valor)}
        </p>
        
        {subtitulo && (
          <p className="text-sm text-gray-500">{subtitulo}</p>
        )}
        
        {cambio !== undefined && (
          <div className="flex items-center space-x-1">
            {(() => {
              const CambioIcono = getCambioIcono(cambio);
              return <CambioIcono className={`h-4 w-4 ${getCambioColor(cambio)}`} />;
            })()}
            <span className={`text-sm font-medium ${getCambioColor(cambio)}`}>
              {Math.abs(cambio)}%
            </span>
            {comparacion && (
              <span className="text-xs text-gray-400">{comparacion}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============= GRAFICO UNIVERSAL COMPONENT =============
export const GraficoUniversal: React.FC<GraficoUniversalProps> = ({
  data,
  tipo,
  titulo,
  dataKey = 'value',
  xKey = 'name',
  yKey = 'value',
  colores = ['#311716', '#9c7561', '#eeb077', '#462625', '#8a6550', '#d4a574'],
  altura = 300,
  configuracion = {}
}) => {
  const renderGrafico = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (tipo) {
      case 'lineas':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colores[0]} 
              strokeWidth={3}
              dot={{ fill: colores[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'barras':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKey} fill={colores[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colores[0]} 
              fill={colores[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'dona':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey={dataKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xKey} />
            <PolarRadiusAxis />
            <Radar
              name="Valores"
              dataKey={dataKey}
              stroke={colores[0]}
              fill={colores[0]}
              fillOpacity={0.3}
            />
            <Tooltip />
          </RadarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Datos" data={data} fill={colores[0]} />
          </ScatterChart>
        );

      case 'compuesto':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKey} fill={colores[0]} />
            <Line type="monotone" dataKey={dataKey} stroke={colores[1]} />
          </ComposedChart>
        );

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Tipo de gráfico no soportado</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{titulo}</h3>
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderGrafico()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============= MAPA DE CALOR COMPONENT =============
export const MapaCalor: React.FC<MapaCalorProps> = ({
  data,
  xKey,
  yKey,
  valueKey,
  titulo,
  colorScale = ['#f3f4f6', '#311716']
}) => {
  const { maxValue, minValue, normalizedData } = useMemo(() => {
    const values = data.map(d => d[valueKey]).filter(v => v != null);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const normalized = data.map(item => ({
      ...item,
      intensity: (item[valueKey] - min) / (max - min)
    }));
    
    return { maxValue: max, minValue: min, normalizedData: normalized };
  }, [data, valueKey]);

  const getColor = (intensity: number) => {
    const r1 = parseInt(colorScale[0].substring(1, 3), 16);
    const g1 = parseInt(colorScale[0].substring(3, 5), 16);
    const b1 = parseInt(colorScale[0].substring(5, 7), 16);
    
    const r2 = parseInt(colorScale[1].substring(1, 3), 16);
    const g2 = parseInt(colorScale[1].substring(3, 5), 16);
    const b2 = parseInt(colorScale[1].substring(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * intensity);
    const g = Math.round(g1 + (g2 - g1) * intensity);
    const b = Math.round(b1 + (b2 - b1) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const uniqueX = Array.from(new Set(data.map(d => d[xKey])));
  const uniqueY = Array.from(new Set(data.map(d => d[yKey])));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{titulo}</h3>
      
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ 
          gridTemplateColumns: `repeat(${uniqueX.length}, 1fr)`,
          minWidth: '600px'
        }}>
          {uniqueY.map(y => (
            uniqueX.map(x => {
              const item = normalizedData.find(d => d[xKey] === x && d[yKey] === y);
              const intensity = item?.intensity || 0;
              const value = item?.[valueKey] || 0;
              
              return (
                <div
                  key={`${x}-${y}`}
                  className="relative aspect-square rounded text-xs font-medium flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                  style={{ backgroundColor: getColor(intensity) }}
                  title={`${x} - ${y}: ${value}`}
                >
                  <span className={intensity > 0.5 ? 'text-white' : 'text-gray-800'}>
                    {value}
                  </span>
                </div>
              );
            })
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <span>Min: {minValue}</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale[0] }}></div>
          <span>→</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale[1] }}></div>
        </div>
        <span>Max: {maxValue}</span>
      </div>
    </div>
  );
};

// ============= ALERTA MEJORADA COMPONENT =============
export const AlertaMejorada: React.FC<AlertaMejoradaProps> = ({
  tipo,
  titulo,
  mensaje,
  accion,
  onAccion,
  mostrarIcono = true,
  cerrable = false,
  onCerrar
}) => {
  const getEstilos = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icono: CheckCircle,
          colorIcono: 'text-green-400',
          boton: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icono: AlertTriangle,
          colorIcono: 'text-yellow-400',
          boton: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icono: AlertTriangle,
          colorIcono: 'text-red-400',
          boton: 'bg-red-600 hover:bg-red-700 text-white'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icono: Activity,
          colorIcono: 'text-blue-400',
          boton: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const estilos = getEstilos(tipo);
  const Icono = estilos.icono;

  return (
    <div className={`rounded-md border p-4 ${estilos.container}`}>
      <div className="flex">
        {mostrarIcono && (
          <div className="flex-shrink-0">
            <Icono className={`h-5 w-5 ${estilos.colorIcono}`} aria-hidden="true" />
          </div>
        )}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{titulo}</h3>
          <p className="mt-1 text-sm">{mensaje}</p>
          {accion && onAccion && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onAccion}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${estilos.boton}`}
              >
                {accion}
              </button>
            </div>
          )}
        </div>
        {cerrable && onCerrar && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onCerrar}
                className="inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= METRICA CIRCULAR COMPONENT =============
export const MetricaCircular: React.FC<MetricaCircularProps> = ({
  valor,
  maximo,
  titulo,
  subtitulo,
  color,
  tamano = 120,
  mostrarPorcentaje = true
}) => {
  const porcentaje = (valor / maximo) * 100;
  const radio = (tamano - 20) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{titulo}</h3>
      
      <div className="relative inline-flex items-center justify-center">
        <svg width={tamano} height={tamano} className="transform -rotate-90">
          {/* Círculo de fondo */}
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke="#f3f4f6"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Círculo de progreso */}
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {/* Texto central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {mostrarPorcentaje ? `${porcentaje.toFixed(0)}%` : valor.toLocaleString()}
          </span>
          {subtitulo && (
            <span className="text-sm text-gray-500 mt-1">{subtitulo}</span>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        {valor.toLocaleString()} / {maximo.toLocaleString()}
      </div>
    </div>
  );
};

// ============= TABLA AVANZADA COMPONENT =============
interface TablaAvanzadaProps {
  titulo: string;
  columnas: Array<{
    key: string;
    titulo: string;
    render?: (valor: any, fila: any) => React.ReactNode;
    sortable?: boolean;
    width?: string;
  }>;
  datos: any[];
  paginacion?: boolean;
  itemsPorPagina?: number;
  onFilaClick?: (fila: any) => void;
  loading?: boolean;
}

export const TablaAvanzada: React.FC<TablaAvanzadaProps> = ({
  titulo,
  columnas,
  datos,
  paginacion = false,
  itemsPorPagina = 10,
  onFilaClick,
  loading = false
}) => {
  const [paginaActual, setPaginaActual] = React.useState(1);
  const [ordenPor, setOrdenPor] = React.useState<string | null>(null);
  const [ordenDireccion, setOrdenDireccion] = React.useState<'asc' | 'desc'>('asc');

  const datosOrdenados = React.useMemo(() => {
    if (!ordenPor) return datos;
    
    return [...datos].sort((a, b) => {
      const valorA = a[ordenPor];
      const valorB = b[ordenPor];
      
      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1;
      return 0;
    });
  }, [datos, ordenPor, ordenDireccion]);

  const datosPaginados = React.useMemo(() => {
    if (!paginacion) return datosOrdenados;
    
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return datosOrdenados.slice(inicio, fin);
  }, [datosOrdenados, paginaActual, itemsPorPagina, paginacion]);

  const totalPaginas = Math.ceil(datos.length / itemsPorPagina);

  const manejarOrden = (columna: string) => {
    if (ordenPor === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenPor(columna);
      setOrdenDireccion('asc');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">{titulo}</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">{titulo}</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnas.map((columna) => (
                <th
                  key={columna.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    columna.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: columna.width }}
                  onClick={columna.sortable ? () => manejarOrden(columna.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{columna.titulo}</span>
                    {columna.sortable && ordenPor === columna.key && (
                      <span className="text-gray-400">
                        {ordenDireccion === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {datosPaginados.map((fila, index) => (
              <tr
                key={index}
                className={`hover:bg-gray-50 ${onFilaClick ? 'cursor-pointer' : ''}`}
                onClick={() => onFilaClick?.(fila)}
              >
                {columnas.map((columna) => (
                  <td key={columna.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {columna.render ? columna.render(fila[columna.key], fila) : fila[columna.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginacion && totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} a {Math.min(paginaActual * itemsPorPagina, datos.length)} de {datos.length} resultados
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};