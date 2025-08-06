
// src/components/reportes/AlertasInteligentes.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, TrendingDown, TrendingUp, Target, 
  Clock, Users, Package, DollarSign, Bell, X, 
  Settings, Filter, Calendar, CheckCircle, AlertCircle
} from 'lucide-react';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlertaInteligente {
  id: string;
  tipo: 'critica' | 'advertencia' | 'info' | 'oportunidad';
  categoria: 'ventas' | 'stock' | 'performance' | 'financiero' | 'operativo';
  titulo: string;
  mensaje: string;
  valor?: number;
  valorReferencia?: number;
  tendencia?: 'up' | 'down' | 'stable';
  urgencia: 'alta' | 'media' | 'baja';
  fechaDeteccion: Date;
  fechaVencimiento?: Date;
  accionRecomendada?: string;
  enlaceAccion?: string;
  datosContexto?: any;
  vistaPor?: string[];
  resueltaPor?: string;
  fechaResolucion?: Date;
}

interface ConfiguracionAlerta {
  categoria: string;
  activa: boolean;
  umbralMinimo?: number;
  umbralMaximo?: number;
  porcentajeCambio?: number;
  frecuenciaRevision: 'tiempo_real' | 'horaria' | 'diaria' | 'semanal';
  notificarPor: ('email' | 'push' | 'sistema')[];
}

interface AlertasInteligentesProps {
  datos: any;
  configuracion?: ConfiguracionAlerta[];
  onAlertaClick?: (alerta: AlertaInteligente) => void;
  onConfiguracionChange?: (config: ConfiguracionAlerta[]) => void;
  usuarioId?: string;
}

export default function AlertasInteligentes({
  datos,
  configuracion = [],
  onAlertaClick,
  onConfiguracionChange,
  usuarioId
}: AlertasInteligentesProps) {
  const [alertas, setAlertas] = useState<AlertaInteligente[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todas');
  const [mostrarResueltas, setMostrarResueltas] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Generar alertas inteligentes basadas en datos
  const generarAlertas = useMemo(() => {
    const alertasGeneradas: AlertaInteligente[] = [];
    
    if (!datos) return alertasGeneradas;
    
    // 1. Alertas de Ventas
    if (datos.resumen) {
      // Ventas muy bajas
      if (datos.resumen.ventasTotales < 5000) {
        alertasGeneradas.push({
          id: `ventas-bajas-${Date.now()}`,
          tipo: 'advertencia',
          categoria: 'ventas',
          titulo: 'Ventas por Debajo del Objetivo',
          mensaje: `Las ventas actuales ($${datos.resumen.ventasTotales?.toFixed(2)}) están significativamente por debajo del mínimo esperado.`,
          valor: datos.resumen.ventasTotales,
          valorReferencia: 5000,
          tendencia: 'down',
          urgencia: 'alta',
          fechaDeteccion: new Date(),
          accionRecomendada: 'Revisar estrategias de marketing y promociones',
          enlaceAccion: '/admin/reportes?tipo=ventas_generales'
        });
      }
      
      // Ticket promedio bajo
      if (datos.resumen.ticketPromedio < 500) {
        alertasGeneradas.push({
          id: `ticket-bajo-${Date.now()}`,
          tipo: 'info',
          categoria: 'ventas',
          titulo: 'Oportunidad de Upselling',
          mensaje: `El ticket promedio ($${datos.resumen.ticketPromedio?.toFixed(2)}) indica potencial para incrementar ventas por cliente.`,
          valor: datos.resumen.ticketPromedio,
          valorReferencia: 800,
          urgencia: 'media',
          fechaDeteccion: new Date(),
          accionRecomendada: 'Implementar estrategias de venta cruzada',
          enlaceAccion: '/admin/reportes?tipo=productos_rendimiento'
        });
      }
    }
    
    // 2. Alertas de Stock
    if (datos.estadisticas) {
      // Stock crítico
      if (datos.estadisticas.productosStockCritico > 5) {
        alertasGeneradas.push({
          id: `stock-critico-${Date.now()}`,
          tipo: 'critica',
          categoria: 'stock',
          titulo: 'Stock Crítico Múltiple',
          mensaje: `${datos.estadisticas.productosStockCritico} productos tienen stock crítico y requieren reposición urgente.`,
          valor: datos.estadisticas.productosStockCritico,
          valorReferencia: 3,
          urgencia: 'alta',
          fechaDeteccion: new Date(),
          fechaVencimiento: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          accionRecomendada: 'Generar órdenes de compra inmediatamente',
          enlaceAccion: '/admin/stock'
        });
      }
      
      // Productos sin stock
      if (datos.estadisticas.productosSinStock > 0) {
        alertasGeneradas.push({
          id: `sin-stock-${Date.now()}`,
          tipo: 'advertencia',
          categoria: 'stock',
          titulo: 'Productos Agotados',
          mensaje: `${datos.estadisticas.productosSinStock} productos están completamente agotados, perdiendo ventas potenciales.`,
          valor: datos.estadisticas.productosSinStock,
          urgencia: 'alta',
          fechaDeteccion: new Date(),
          accionRecomendada: 'Revisar productos agotados y reabastecer',
          enlaceAccion: '/admin/productos'
        });
      }
    }
    
    // 3. Alertas de Performance
    if (datos.performance) {
      // Vendedores con bajo rendimiento
      const vendedoresBajoRendimiento = datos.performance.filter((v: any) => 
        Number(v.porcentaje_facturacion) < 60
      );
      
      if (vendedoresBajoRendimiento.length > 0) {
        alertasGeneradas.push({
          id: `vendedores-bajo-${Date.now()}`,
          tipo: 'advertencia',
          categoria: 'performance',
          titulo: 'Bajo Rendimiento en Facturación',
          mensaje: `${vendedoresBajoRendimiento.length} vendedores tienen menos del 60% de facturación.`,
          valor: vendedoresBajoRendimiento.length,
          urgencia: 'media',
          fechaDeteccion: new Date(),
          accionRecomendada: 'Capacitación en proceso de facturación',
          datosContexto: vendedoresBajoRendimiento
        });
      }
    }
    
    // 4. Alertas Financieras
    if (datos.resumen?.porcentajeFacturacion < 70) {
      alertasGeneradas.push({
        id: `facturacion-baja-${Date.now()}`,
        tipo: 'critica',
        categoria: 'financiero',
        titulo: 'Facturación por Debajo del Mínimo',
        mensaje: `Solo el ${datos.resumen.porcentajeFacturacion?.toFixed(1)}% de las ventas están facturadas.`,
        valor: datos.resumen.porcentajeFacturacion,
        valorReferencia: 85,
        urgencia: 'alta',
        fechaDeteccion: new Date(),
        accionRecomendada: 'Revisar proceso de facturación electrónica',
        enlaceAccion: '/admin/facturas'
      });
    }
    
    // 5. Alertas de Oportunidades
    if (datos.topProductos && datos.topProductos.length > 0) {
      const productoEstrella = datos.topProductos[0];
      if (productoEstrella.cantidad_vendida > 100) {
        alertasGeneradas.push({
          id: `oportunidad-producto-${Date.now()}`,
          tipo: 'oportunidad',
          categoria: 'ventas',
          titulo: 'Producto con Alto Potencial',
          mensaje: `${productoEstrella.nombre} está teniendo excelente performance con ${productoEstrella.cantidad_vendida} unidades vendidas.`,
          valor: productoEstrella.cantidad_vendida,
          urgencia: 'baja',
          fechaDeteccion: new Date(),
          accionRecomendada: 'Considerar aumentar stock y promocionar más',
          datosContexto: productoEstrella
        });
      }
    }
    
    return alertasGeneradas;
  }, [datos]);
  
  // Actualizar alertas cuando cambian los datos
  useEffect(() => {
    setAlertas(generarAlertas);
  }, [generarAlertas]);
  
  // Filtrar alertas
  const alertasFiltradas = useMemo(() => {
    return alertas.filter(alerta => {
      const cumpleCategoria = filtroCategoria === 'todas' || alerta.categoria === filtroCategoria;
      const cumpleUrgencia = filtroUrgencia === 'todas' || alerta.urgencia === filtroUrgencia;
      const cumpleResolucion = mostrarResueltas || !alerta.fechaResolucion;
      
      return cumpleCategoria && cumpleUrgencia && cumpleResolucion;
    });
  }, [alertas, filtroCategoria, filtroUrgencia, mostrarResueltas]);
  
  // Estadísticas de alertas
  const estadisticasAlertas = useMemo(() => {
    return {
      total: alertas.length,
      criticas: alertas.filter(a => a.tipo === 'critica').length,
      advertencias: alertas.filter(a => a.tipo === 'advertencia').length,
      oportunidades: alertas.filter(a => a.tipo === 'oportunidad').length,
      urgentesVencidas: alertas.filter(a => 
        a.fechaVencimiento && isAfter(new Date(), a.fechaVencimiento)
      ).length,
      noVistas: alertas.filter(a => 
        !a.vistaPor || !a.vistaPor.includes(usuarioId || 'current-user')
      ).length
    };
  }, [alertas, usuarioId]);
  
  // Marcar alerta como vista
  const marcarComoVista = (alertaId: string) => {
    setAlertas(prev => prev.map(alerta => 
      alerta.id === alertaId 
        ? { 
            ...alerta, 
            vistaPor: [...(alerta.vistaPor || []), usuarioId || 'current-user']
          }
        : alerta
    ));
  };
  
  // Resolver alerta
  const resolverAlerta = (alertaId: string) => {
    setAlertas(prev => prev.map(alerta => 
      alerta.id === alertaId 
        ? { 
            ...alerta, 
            resueltaPor: usuarioId || 'current-user',
            fechaResolucion: new Date()
          }
        : alerta
    ));
  };
  
  // Obtener icono por tipo de alerta
  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'critica': return AlertTriangle;
      case 'advertencia': return AlertCircle;
      case 'oportunidad': return Target;
      default: return Bell;
    }
  };
  
  // Obtener color por tipo
  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'critica': return 'red';
      case 'advertencia': return 'yellow';
      case 'oportunidad': return 'green';
      default: return 'blue';
    }
  };
  
  // Obtener icono por categoría
  const obtenerIconoCategoria = (categoria: string) => {
    switch (categoria) {
      case 'ventas': return DollarSign;
      case 'stock': return Package;
      case 'performance': return Users;
      case 'financiero': return Target;
      default: return Bell;
    }
  };
  
  const renderAlerta = (alerta: AlertaInteligente) => {
    const IconoTipo = obtenerIconoTipo(alerta.tipo);
    const IconoCategoria = obtenerIconoCategoria(alerta.categoria);
    const color = obtenerColorTipo(alerta.tipo);
    const esVista = alerta.vistaPor?.includes(usuarioId || 'current-user');
    const esVencida = alerta.fechaVencimiento && isAfter(new Date(), alerta.fechaVencimiento);
    
    return (
      <div
        key={alerta.id}
        className={`bg-white rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          esVencida ? `border-l-red-600 bg-red-50` : `border-l-${color}-500`
        } ${!esVista ? 'ring-2 ring-blue-200' : ''}`}
        onClick={() => {
          marcarComoVista(alerta.id);
          onAlertaClick?.(alerta);
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <IconoTipo className={`h-5 w-5 text-${color}-600`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {alerta.titulo}
                </h4>
                <IconoCategoria className="h-4 w-4 text-gray-400" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  alerta.urgencia === 'alta' ? 'bg-red-100 text-red-800' :
                  alerta.urgencia === 'media' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alerta.urgencia.toUpperCase()}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">
                {alerta.mensaje}
              </p>
              
              {alerta.accionRecomendada && (
                <p className="text-xs text-blue-600 font-medium">
                  💡 {alerta.accionRecomendada}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{format(alerta.fechaDeteccion, 'dd/MM/yyyy HH:mm')}</span>
                {alerta.fechaVencimiento && (
                  <span className={esVencida ? 'text-red-600 font-medium' : ''}>
                    Vence: {format(alerta.fechaVencimiento, 'dd/MM HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!esVista && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                resolverAlerta(alerta.id);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Marcar como resuelto"
            >
              {alerta.fechaResolucion ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        
        {/* Datos de contexto */}
        {alerta.valor !== undefined && alerta.valorReferencia && (
          <div className="mt-3 bg-gray-50 rounded p-2">
            <div className="flex justify-between text-xs">
              <span>Actual: {alerta.valor}</span>
              <span>Referencia: {alerta.valorReferencia}</span>
            </div>
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
          <Bell className="h-6 w-6 text-orange-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alertas Inteligentes</h3>
            <p className="text-sm text-gray-600">
              {estadisticasAlertas.noVistas} sin ver • {estadisticasAlertas.urgentesVencidas} vencidas
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
      
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{estadisticasAlertas.total}</div>
          <div className="text-xs text-blue-800">Total</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{estadisticasAlertas.criticas}</div>
          <div className="text-xs text-red-800">Críticas</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{estadisticasAlertas.advertencias}</div>
          <div className="text-xs text-yellow-800">Advertencias</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{estadisticasAlertas.oportunidades}</div>
          <div className="text-xs text-green-800">Oportunidades</div>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>
        
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="todas">Todas las categorías</option>
          <option value="ventas">Ventas</option>
          <option value="stock">Stock</option>
          <option value="performance">Performance</option>
          <option value="financiero">Financiero</option>
          <option value="operativo">Operativo</option>
        </select>
        
        <select
          value={filtroUrgencia}
          onChange={(e) => setFiltroUrgencia(e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="todas">Todas las urgencias</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={mostrarResueltas}
            onChange={(e) => setMostrarResueltas(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Mostrar resueltas</span>
        </label>
      </div>
      
      {/* Lista de alertas */}
      <div className="space-y-4">
        {alertasFiltradas.length > 0 ? (
          alertasFiltradas.map(renderAlerta)
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">¡Todo en orden!</p>
            <p className="text-sm">No hay alertas que requieran tu atención.</p>
          </div>
        )}
      </div>
    </div>
  );
}