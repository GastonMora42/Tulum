
// src/components/reportes/FiltrosAvanzados.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, X, Search, ChevronDown, Clock, 
  MapPin, User, Package, Tag, CreditCard, RefreshCw,
  Save, Settings, Eye, AlertCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface FiltrosAvanzadosProps {
  filtros: any;
  onFiltrosChange: (filtros: any) => void;
  configuracionReporte: any;
  opciones: {
    ubicaciones: any[];
    vendedores: any[];
    productos: any[];
    categorias: any[];
    mediosPago?: string[];
  };
  onGuardarPreset?: (preset: any) => void;
  presetsGuardados?: any[];
}

const PRESETS_FECHAS = [
  { 
    label: 'Hoy', 
    value: () => ({ inicio: new Date(), fin: new Date() }) 
  },
  { 
    label: 'Ayer', 
    value: () => ({ inicio: subDays(new Date(), 1), fin: subDays(new Date(), 1) }) 
  },
  { 
    label: 'Últimos 7 días', 
    value: () => ({ inicio: subDays(new Date(), 6), fin: new Date() }) 
  },
  { 
    label: 'Últimos 30 días', 
    value: () => ({ inicio: subDays(new Date(), 29), fin: new Date() }) 
  },
  { 
    label: 'Este mes', 
    value: () => ({ inicio: startOfMonth(new Date()), fin: new Date() }) 
  },
  { 
    label: 'Mes pasado', 
    value: () => {
      const inicio = startOfMonth(subDays(startOfMonth(new Date()), 1));
      const fin = endOfMonth(inicio);
      return { inicio, fin };
    }
  }
];

const MEDIOS_PAGO_DISPONIBLES = [
  'efectivo', 'tarjeta_credito', 'tarjeta_debito', 
  'transferencia', 'qr', 'cheque', 'otros'
];

export default function FiltrosAvanzados({
  filtros,
  onFiltrosChange,
  configuracionReporte,
  opciones,
  onGuardarPreset,
  presetsGuardados = []
}: FiltrosAvanzadosProps) {
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>('fechas');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [showGuardarPreset, setShowGuardarPreset] = useState(false);
  const [nombrePreset, setNombrePreset] = useState('');
  const [validacionFiltros, setValidacionFiltros] = useState<any>({});

  // Validación de filtros
  useEffect(() => {
    const validacion: any = {};
    
    if (filtros.fechaInicio > filtros.fechaFin) {
      validacion.fechas = 'La fecha de inicio debe ser menor a la fecha fin';
    }
    
    const diasDiferencia = Math.abs(
      new Date(filtros.fechaFin).getTime() - new Date(filtros.fechaInicio).getTime()
    ) / (1000 * 60 * 60 * 24);
    
    if (diasDiferencia > 365) {
      validacion.fechas = 'El período no puede ser mayor a 1 año';
    }
    
    setValidacionFiltros(validacion);
  }, [filtros.fechaInicio, filtros.fechaFin]);

  const aplicarPreset = (preset: any) => {
    const { inicio, fin } = preset.value();
    onFiltrosChange({
      ...filtros,
      fechaInicio: format(inicio, 'yyyy-MM-dd'),
      fechaFin: format(fin, 'yyyy-MM-dd')
    });
  };

  const limpiarFiltros = () => {
    onFiltrosChange({
      ...filtros,
      sucursalId: '',
      vendedorId: '',
      productoId: '',
      categoriaId: '',
      tipoFactura: [],
      mediosPago: []
    });
  };

  const guardarPreset = () => {
    if (!nombrePreset.trim()) return;
    
    const preset = {
      id: `preset-${Date.now()}`,
      nombre: nombrePreset,
      filtros: { ...filtros },
      fechaCreacion: new Date()
    };
    
    onGuardarPreset?.(preset);
    setShowGuardarPreset(false);
    setNombrePreset('');
  };

  const productosFiltered = opciones.productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const renderSeccion = (
    id: string,
    titulo: string,
    icono: React.ElementType,
    children: React.ReactNode,
    disponible: boolean = true
  ) => {
    if (!disponible) return null;

    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setSeccionExpandida(seccionExpandida === id ? null : id)}
          className={`w-full p-4 text-left flex items-center justify-between transition-colors ${
            seccionExpandida === id ? 'bg-gray-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            {React.createElement(icono, { className: "h-5 w-5 text-gray-600 mr-3" })}
            <span className="font-medium text-gray-900">{titulo}</span>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform ${
              seccionExpandida === id ? 'rotate-180' : ''
            }`}
          />
        </button>
        
        {seccionExpandida === id && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Filter className="h-6 w-6 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros Avanzados</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {onGuardarPreset && (
            <button
              onClick={() => setShowGuardarPreset(true)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Save className="h-4 w-4 inline mr-1" />
              Guardar Preset
            </button>
          )}
          
          <button
            onClick={limpiarFiltros}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <X className="h-4 w-4 inline mr-1" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Validación */}
      {Object.keys(validacionFiltros).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">Errores de validación:</span>
          </div>
          <ul className="mt-1 text-sm text-red-700">
            {Object.values(validacionFiltros).map((error, index) => (
              <li key={index}>• {error as string}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {/* Sección: Fechas */}
        {renderSeccion('fechas', 'Período de Tiempo', Calendar, (
          <div className="space-y-4">
            {/* Presets de fecha */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Períodos Rápidos
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS_FECHAS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => aplicarPreset(preset)}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Fechas personalizadas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => onFiltrosChange({ ...filtros, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => onFiltrosChange({ ...filtros, fechaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Agrupación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agrupar por
              </label>
              <select
                value={filtros.agruparPor}
                onChange={(e) => onFiltrosChange({ ...filtros, agruparPor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hora">Por Hora</option>
                <option value="dia">Por Día</option>
                <option value="semana">Por Semana</option>
                <option value="mes">Por Mes</option>
              </select>
            </div>
          </div>
        ))}

        {/* Sección: Ubicación */}
        {renderSeccion('ubicacion', 'Ubicación y Sucursales', MapPin, (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal
            </label>
            <select
              value={filtros.sucursalId}
              onChange={(e) => onFiltrosChange({ ...filtros, sucursalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las sucursales</option>
              {opciones.ubicaciones.map(ub => (
                <option key={ub.id} value={ub.id}>
                  {ub.nombre} {ub.direccion && `- ${ub.direccion}`}
                </option>
              ))}
            </select>
          </div>
        ), configuracionReporte.filtrosDisponibles.includes('sucursal'))}

        {/* Sección: Vendedores */}
        {renderSeccion('vendedores', 'Vendedores y Personal', User, (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendedor
            </label>
            <select
              value={filtros.vendedorId}
              onChange={(e) => onFiltrosChange({ ...filtros, vendedorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los vendedores</option>
              {opciones.vendedores.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.email && `(${v.email})`}
                </option>
              ))}
            </select>
          </div>
        ), configuracionReporte.filtrosDisponibles.includes('vendedor'))}

        {/* Sección: Productos */}
        {renderSeccion('productos', 'Productos y Categorías', Package, (
          <div className="space-y-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filtros.categoriaId}
                onChange={(e) => onFiltrosChange({ ...filtros, categoriaId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {opciones.categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            
            {/* Producto específico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto Específico
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {busquedaProducto && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {productosFiltered.slice(0, 10).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onFiltrosChange({ ...filtros, productoId: p.id });
                        setBusquedaProducto('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ), configuracionReporte.filtrosDisponibles.includes('productos'))}

        {/* Sección: Facturación */}
        {renderSeccion('facturacion', 'Facturación y Tipos', Tag, (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Factura
              </label>
              <div className="space-y-2">
                {['A', 'B', 'C'].map(tipo => (
                  <label key={tipo} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filtros.tipoFactura.includes(tipo)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFiltrosChange({
                            ...filtros,
                            tipoFactura: [...filtros.tipoFactura, tipo]
                          });
                        } else {
                          onFiltrosChange({
                            ...filtros,
                            tipoFactura: filtros.tipoFactura.filter((t: string) => t !== tipo)
                          });
                        }
                      }}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Factura {tipo}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirFacturadas}
                  onChange={(e) => onFiltrosChange({ ...filtros, incluirFacturadas: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Incluir facturadas</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtros.incluirNoFacturadas}
                  onChange={(e) => onFiltrosChange({ ...filtros, incluirNoFacturadas: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Incluir no facturadas</span>
              </label>
            </div>
          </div>
        ), configuracionReporte.filtrosDisponibles.includes('facturacion'))}

        {/* Sección: Medios de Pago */}
        {renderSeccion('pagos', 'Medios de Pago', CreditCard, (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medios de Pago
            </label>
            <div className="space-y-2">
              {MEDIOS_PAGO_DISPONIBLES.map(medio => (
                <label key={medio} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filtros.mediosPago.includes(medio)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFiltrosChange({
                          ...filtros,
                          mediosPago: [...filtros.mediosPago, medio]
                        });
                      } else {
                        onFiltrosChange({
                          ...filtros,
                          mediosPago: filtros.mediosPago.filter((m: string) => m !== medio)
                        });
                      }
                    }}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {medio.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ), configuracionReporte.filtrosDisponibles.includes('mediosPago'))}
      </div>

      {/* Presets Guardados */}
      {presetsGuardados.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Presets Guardados</h4>
          <div className="space-y-2">
            {presetsGuardados.map(preset => (
              <button
                key={preset.id}
                onClick={() => onFiltrosChange(preset.filtros)}
                className="w-full text-left p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{preset.nombre}</span>
                  <span className="text-xs text-gray-500">
                    {format(preset.fechaCreacion, 'dd/MM/yyyy')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal Guardar Preset */}
      {showGuardarPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Guardar Preset de Filtros</h3>
            <input
              type="text"
              placeholder="Nombre del preset..."
              value={nombrePreset}
              onChange={(e) => setNombrePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGuardarPreset(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPreset}
                disabled={!nombrePreset.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}