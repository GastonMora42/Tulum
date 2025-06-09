// src/components/pdv/CierreCaja.tsx - CORRECCIÓN DEL ERROR DE RENDERIZADO
'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertCircle, CheckCircle, X, Calculator, DollarSign, Clock, 
  TrendingUp, AlertTriangle, FileText, 
  ChevronRight, RefreshCw, Zap, Target, PiggyBank,
  CreditCard, Banknote, Smartphone, Activity, Coins,
  ArrowDownLeft, ArrowUpRight, Info, ExternalLink, Check,
  XCircle, Settings, Loader, Shield, Wrench, Package,
  Minus, Plus
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { BillCounter } from './BillCounter';

interface CierreCajaUXMejoradoProps {
  id: string;
  onSuccess?: () => void;
}

interface ConfiguracionCierre {
  montoFijo: number;
  sucursalId: string;
}

// 🔧 CORRECCIÓN: Actualizar interface para reflejar la estructura real de la API
interface EgresoInfo {
  id: string;
  monto: number;
  motivo: string;
  fecha: string;
  usuario: {
    id: string;
    name: string;
  } | string; // Puede ser objeto o string dependiendo de la API
  detalles?: string;
}

export function CierreCaja({ id, onSuccess }: CierreCajaUXMejoradoProps) {
  // Estados principales
  const [cierreCaja, setCierreCaja] = useState<any>(null);
  const [ventasResumen, setVentasResumen] = useState<any>(null);
  const [egresos, setEgresos] = useState<EgresoInfo[]>([]);
  const [configuracionCierre, setConfiguracionCierre] = useState<ConfiguracionCierre | null>(null);
  
  // Estados de conteos manuales - SOLO CAMPOS VACÍOS PARA OTROS MEDIOS
  const [efectivoContado, setEfectivoContado] = useState<number>(0);
  const [conteoTarjetaCredito, setConteoTarjetaCredito] = useState<string>('');
  const [conteoTarjetaDebito, setConteoTarjetaDebito] = useState<string>('');
  const [conteoQR, setConteoQR] = useState<string>('');
  const [recuperoFondo, setRecuperoFondo] = useState<string>('');
  
  // Estados para diferencias y resolución
  const [forcedMethods, setForcedMethods] = useState<Set<string>>(new Set());
  const [observaciones, setObservaciones] = useState<string>('');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<any>(null);
  const [efectivoConteoCompleto, setEfectivoConteoCompleto] = useState(false);
  
  const router = useRouter();
  
  // 🔧 FUNCIÓN HELPER PARA OBTENER NOMBRE DE USUARIO
  const getUserName = (usuario: EgresoInfo['usuario']): string => {
    if (typeof usuario === 'string') {
      return usuario;
    }
    if (typeof usuario === 'object' && usuario?.name) {
      return usuario.name;
    }
    return 'Usuario desconocido';
  };
  
  // CARGAR CONFIGURACIÓN Y DATOS DE CIERRE
  const loadCierreCaja = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotification(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      // Cargar datos del cierre
      const [responseCierre, responseConfig] = await Promise.all([
        authenticatedFetch(`/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`),
        authenticatedFetch(`/api/admin/configuracion-cierres?sucursalId=${encodeURIComponent(sucursalId)}`)
      ]);
      
      if (!responseCierre.ok) {
        const errorData = await responseCierre.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al obtener datos del cierre de caja');
      }
      
      if (!responseConfig.ok) {
        const errorData = await responseConfig.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al obtener configuración de cierre');
      }
      
      const dataCierre = await responseCierre.json();
      const dataConfig = await responseConfig.json();
      
      setCierreCaja(dataCierre.cierreCaja);
      setVentasResumen(dataCierre.ventasResumen);
      setEgresos(dataCierre.egresos || []);
      setConfiguracionCierre(dataConfig);
      
      // 🆕 NO PRE-LLENAR NADA - Empezar desde cero
      setEfectivoContado(0);
      setConteoTarjetaCredito('');
      setConteoTarjetaDebito('');
      setConteoQR('');
      setRecuperoFondo('');
      
    } catch (error) {
      console.error('Error al cargar cierre de caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar cierre de caja',
        details: 'Intenta recargar la página o contacta al administrador'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (id) {
      loadCierreCaja();
    }
  }, [id, loadCierreCaja]);
  
  // 🆕 CALCULAR RECUPERO RECOMENDADO
  const calcularRecuperoRecomendado = useCallback(() => {
    if (!ventasResumen || !configuracionCierre || !cierreCaja) return 0;
    
    const montoFijo = configuracionCierre.montoFijo;
    const montoInicial = cierreCaja.montoInicial;
    const ventasEfectivo = ventasResumen.totalesPorMedioPago?.efectivo?.monto || 0;
    const totalEgresos = ventasResumen.totalEgresos || 0;
    
    // Solo recomendar recupero si:
    // 1. Abrió con menos del monto fijo
    // 2. Hubo ventas en efectivo
    if (montoInicial < montoFijo && ventasEfectivo > 0) {
      const diferenciaMonto = montoFijo - montoInicial;
      const recuperoMaximo = Math.min(diferenciaMonto, ventasEfectivo);
      
      // Simular qué pasaría si aplicamos el recupero
      const efectivoSimulado = montoInicial + ventasEfectivo - totalEgresos;
      const efectivoConRecupero = efectivoSimulado - recuperoMaximo;
      
      // Si con el recupero quedamos más cerca del monto fijo, recomendarlo
      if (efectivoConRecupero >= montoFijo * 0.8) { // Al menos 80% del monto fijo
        return recuperoMaximo;
      }
    }
    
    return 0;
  }, [ventasResumen, configuracionCierre, cierreCaja]);
  
  // 🆕 CALCULAR CUENTAS AUTOMÁTICAS UNA VEZ CONTADO EL EFECTIVO
  const calcularCuentasAutomaticas = useCallback(() => {
    if (efectivoContado <= 0) return null;
    
    const totalEgresos = ventasResumen?.totalEgresos || 0;
    const recuperoNum = parseFloat(recuperoFondo) || 0;
    
    const efectivoParaSobre = efectivoContado - totalEgresos - recuperoNum;
    
    return {
      efectivoContado,
      menosEgresos: totalEgresos,
      menosRecupero: recuperoNum,
      efectivoParaSobre,
      esNegativo: efectivoParaSobre < 0
    };
  }, [efectivoContado, ventasResumen, recuperoFondo]);
  
  // 🆕 VERIFICAR DIFERENCIAS EN OTROS MEDIOS DE PAGO
  const verificarDiferenciasOtrosMedios = useCallback(() => {
    if (!ventasResumen) return [];
    
    const totales = ventasResumen.totalesPorMedioPago || {};
    const diferencias: Array<{
      medioPago: string;
      esperado: number;
      contado: number;
      diferencia: number;
      significativa: boolean;
    }> = [];
    
    // Verificar tarjetas de crédito
    const ventasTarjetaCredito = totales.tarjeta_credito?.monto || 0;
    const conteoTarjetaCreditoNum = parseFloat(conteoTarjetaCredito) || 0;
    if (ventasTarjetaCredito > 0 || conteoTarjetaCreditoNum > 0) {
      const diff = conteoTarjetaCreditoNum - ventasTarjetaCredito;
      if (Math.abs(diff) > 0.01) {
        diferencias.push({
          medioPago: 'Tarjeta de Crédito',
          esperado: ventasTarjetaCredito,
          contado: conteoTarjetaCreditoNum,
          diferencia: diff,
          significativa: Math.abs(diff) >= 200
        });
      }
    }
    
    // Verificar tarjetas de débito
    const ventasTarjetaDebito = totales.tarjeta_debito?.monto || 0;
    const conteoTarjetaDebitoNum = parseFloat(conteoTarjetaDebito) || 0;
    if (ventasTarjetaDebito > 0 || conteoTarjetaDebitoNum > 0) {
      const diff = conteoTarjetaDebitoNum - ventasTarjetaDebito;
      if (Math.abs(diff) > 0.01) {
        diferencias.push({
          medioPago: 'Tarjeta de Débito',
          esperado: ventasTarjetaDebito,
          contado: conteoTarjetaDebitoNum,
          diferencia: diff,
          significativa: Math.abs(diff) >= 200
        });
      }
    }
    
    // Verificar QR
    const ventasQR = totales.qr?.monto || 0;
    const conteoQRNum = parseFloat(conteoQR) || 0;
    if (ventasQR > 0 || conteoQRNum > 0) {
      const diff = conteoQRNum - ventasQR;
      if (Math.abs(diff) > 0.01) {
        diferencias.push({
          medioPago: 'QR / Digital',
          esperado: ventasQR,
          contado: conteoQRNum,
          diferencia: diff,
          significativa: Math.abs(diff) >= 200
        });
      }
    }
    
    return diferencias.map(d => ({
      ...d,
      isCorrect: Math.abs(d.diferencia) < 200 || forcedMethods.has(d.medioPago)
    }));
  }, [ventasResumen, conteoTarjetaCredito, conteoTarjetaDebito, conteoQR, forcedMethods]);
  
  // Función para resolver todas las diferencias automáticamente
  const resolverTodasLasDiferencias = () => {
    const diferenciasOtrosMedios = verificarDiferenciasOtrosMedios();
    const nuevosMetodosForzados = new Set(forcedMethods);
    
    diferenciasOtrosMedios.forEach(medio => {
      if (!medio.isCorrect && medio.significativa) {
        nuevosMetodosForzados.add(medio.medioPago);
      }
    });
    
    setForcedMethods(nuevosMetodosForzados);
    
    setNotification({
      type: 'info',
      message: '🔧 Diferencias resueltas automáticamente',
      details: 'Se habilitó el cierre forzado. Esto generará contingencias para revisión administrativa.'
    });
  };
  
  // Función para manejar cambio del contador de billetes
  const handleBillCounterChange = (total: number) => {
    setEfectivoContado(total);
    setEfectivoConteoCompleto(total > 0);
  };
  
  // CERRAR CAJA CON NUEVA LÓGICA
  const handleCerrarCaja = async () => {
    try {
      setIsSaving(true);
      
      if (!cierreCaja || !configuracionCierre) {
        throw new Error('No hay datos suficientes para cerrar la caja');
      }
      
      if (efectivoContado <= 0) {
        throw new Error('Debe contar el efectivo antes de cerrar la caja');
      }
      
      const diferenciasOtrosMedios = verificarDiferenciasOtrosMedios();
      const mediosIncorrectos = diferenciasOtrosMedios.filter(medio => !medio.isCorrect);
      const mediosForzados = mediosIncorrectos.filter(medio => forcedMethods.has(medio.medioPago));
      const mediosSinResolver = mediosIncorrectos.filter(medio => !forcedMethods.has(medio.medioPago));
      
      // Si hay medios sin resolver, mostrar error
      if (mediosSinResolver.length > 0) {
        setNotification({
          type: 'error',
          message: 'Hay diferencias sin resolver',
          details: `Los siguientes medios tienen diferencias: ${mediosSinResolver.map(m => m.medioPago).join(', ')}. Usa "Resolver Diferencias" para forzar el cierre.`
        });
        return;
      }
      
      const cuentas = calcularCuentasAutomaticas();
      if (!cuentas) {
        throw new Error('Error al calcular las cuentas automáticas');
      }
      
      // Verificar si hay diferencias mayores
      const diferenciasMayores = diferenciasOtrosMedios.filter(medio => medio.significativa && !forcedMethods.has(medio.medioPago));
      const hayDiferenciasForzadas = mediosForzados.length > 0;
      const generarContingencia = diferenciasMayores.length > 0 || hayDiferenciasForzadas;
      
      if (generarContingencia) {
        const tipoProblema = diferenciasMayores.length > 0 ? 'diferencias mayores a $200' : 'cierre forzado';
        const confirmacion = confirm(
          `Se detectaron ${tipoProblema}. Esto generará una contingencia para revisión administrativa. ¿Deseas continuar?`
        );
        if (!confirmacion) {
          setIsSaving(false);
          return;
        }
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          observaciones: observaciones + (hayDiferenciasForzadas ? `\n\nMedios forzados: ${mediosForzados.map(m => m.medioPago).join(', ')}` : ''),
          conteoEfectivo: efectivoContado,
          conteoTarjetaCredito: parseFloat(conteoTarjetaCredito) || 0,
          conteoTarjetaDebito: parseFloat(conteoTarjetaDebito) || 0,
          conteoQR: parseFloat(conteoQR) || 0,
          conteoOtros: 0,
          recuperoFondo: parseFloat(recuperoFondo) || 0,
          forzarContingencia: hayDiferenciasForzadas,
          resolverDiferenciasAutomaticamente: hayDiferenciasForzadas
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cerrar la caja');
      }
      
      const data = await response.json();
      
      setNotification({
        type: 'success',
        message: '🎉 Caja cerrada correctamente',
        details: `Efectivo para sobre: $${cuentas.efectivoParaSobre.toFixed(2)}`,
        data: data
      });
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
      
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cerrar caja'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // RENDERIZADO
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <PiggyBank className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-2">Preparando Cierre de Caja</h2>
          <p className="text-gray-600">Cargando información de ventas y configuración...</p>
        </div>
      </div>
    );
  }
  
  const recuperoRecomendado = calcularRecuperoRecomendado();
  const cuentasAutomaticas = calcularCuentasAutomaticas();
  const diferenciasOtrosMedios = verificarDiferenciasOtrosMedios();
  const hasIncorrectOtherMethods = diferenciasOtrosMedios.some(medio => !medio.isCorrect);
  const canClose = !hasIncorrectOtherMethods || diferenciasOtrosMedios.filter(m => !m.isCorrect).every(m => forcedMethods.has(m.medioPago));
  const diferenciasMayores = diferenciasOtrosMedios.filter(medio => medio.significativa && !forcedMethods.has(medio.medioPago));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">Cierre de Caja</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {cierreCaja?.fechaApertura 
                    ? format(new Date(cierreCaja.fechaApertura), 'dd/MM/yyyy HH:mm') 
                    : 'Fecha no disponible'
                  } • Monto Fijo: ${configuracionCierre?.montoFijo?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICACIONES */}
        {notification && (
          <div className={`mb-4 md:mb-6 p-4 md:p-6 rounded-2xl border transition-all ${
            notification.type === 'success' ? 'bg-green-50 border-green-200' :
            notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 md:mr-4">
                {notification.type === 'success' ? 
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" /> :
                  notification.type === 'info' ?
                  <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-600" /> :
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                }
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-sm md:text-base mb-1 ${
                  notification.type === 'success' ? 'text-green-800' : 
                  notification.type === 'info' ? 'text-blue-800' :
                  'text-red-800'
                }`}>
                  {notification.message}
                </h3>
                {notification.details && (
                  <p className={`text-xs md:text-sm ${
                    notification.type === 'success' ? 'text-green-700' : 
                    notification.type === 'info' ? 'text-blue-700' :
                    'text-red-700'
                  }`}>
                    {notification.details}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 md:ml-4 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* PANEL IZQUIERDO - INFORMACIÓN DEL TURNO */}
          <div className="xl:col-span-1">
            {/* Resumen del turno */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center mb-4 md:mb-6">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mr-2" />
                Resumen del Turno
              </h3>
              
              <div className="space-y-3 md:space-y-4">
                <div className="bg-blue-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Monto Inicial</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700">
                    ${cierreCaja?.montoInicial?.toFixed(2)}
                  </p>
                  {configuracionCierre && cierreCaja?.montoInicial < configuracionCierre.montoFijo && (
                    <p className="text-xs text-orange-600 mt-1">
                      Menor al monto fijo (${configuracionCierre.montoFijo.toFixed(2)})
                    </p>
                  )}
                </div>
                
                {/* 🆕 MOSTRAR TOTAL DE VENTAS */}
                <div className="bg-green-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Total de Ventas</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700">
                    ${ventasResumen?.total?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{ventasResumen?.cantidadVentas} operaciones</p>
                </div>
                
                {/* 🆕 RECUPERO RECOMENDADO */}
                {recuperoRecomendado > 0 && (
                  <div className="bg-yellow-50 rounded-lg md:rounded-xl p-3 md:p-4 text-center border border-yellow-200">
                    <p className="text-sm text-yellow-600 mb-1">Recupero Recomendado</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-700">
                      ${recuperoRecomendado.toFixed(2)}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Para acercarse al monto fijo
                    </p>
                    <button
                      onClick={() => setRecuperoFondo(recuperoRecomendado.toFixed(2))}
                      className="mt-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-xs hover:bg-yellow-300 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 🔧 EGRESOS CORREGIDOS - RENDERIZAR NOMBRE DE USUARIO CORRECTAMENTE */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                <ArrowDownLeft className="w-5 h-5 text-red-600 mr-2" />
                Egresos del Turno
              </h3>
              
              {egresos.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay egresos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {egresos.map((egreso) => (
                    <div key={egreso.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{egreso.motivo}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(egreso.fecha).toLocaleTimeString()} - {getUserName(egreso.usuario)}
                        </p>
                        {egreso.detalles && <p className="text-xs text-gray-500 truncate">{egreso.detalles}</p>}
                      </div>
                      <p className="text-lg font-bold text-red-600 ml-2">
                        -${egreso.monto.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  {/* Total de egresos */}
                  <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg border-2 border-red-200 mt-3">
                    <span className="font-semibold text-red-800">Total Egresos:</span>
                    <span className="text-xl font-bold text-red-800">
                      -${(ventasResumen?.totalEgresos || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* PANEL PRINCIPAL */}
          <div className="xl:col-span-2 space-y-4 md:space-y-6">
            {/* 🆕 CONTADOR DE BILLETES SIN VALORES PRECARGADOS */}
            <BillCounter
              onTotalChange={handleBillCounterChange}
              className="shadow-sm md:shadow-lg"
            />
            
            {/* 🆕 CUENTAS AUTOMÁTICAS - SOLO CUANDO HAY EFECTIVO CONTADO */}
            {efectivoConteoCompleto && cuentasAutomaticas && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center mb-4">
                  <Calculator className="w-5 h-5 md:w-6 md:h-6 text-green-600 mr-2" />
                  Cuentas Automáticas
                </h3>
                
                <div className="bg-gray-50 rounded-xl p-4 md:p-6">
                  <div className="space-y-4">
                    {/* Efectivo contado */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-700 font-medium">Efectivo total contado:</span>
                      <span className="text-xl font-bold text-green-600">
                        +${cuentasAutomaticas.efectivoContado.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Egresos */}
                    {cuentasAutomaticas.menosEgresos > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700 font-medium">Menos egresos:</span>
                        <span className="text-xl font-bold text-red-600">
                          -${cuentasAutomaticas.menosEgresos.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* Recupero */}
                    {cuentasAutomaticas.menosRecupero > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700 font-medium">Menos recupero de fondo:</span>
                        <span className="text-xl font-bold text-yellow-600">
                          -${cuentasAutomaticas.menosRecupero.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <hr className="border-gray-300" />
                    
                    {/* Resultado final */}
                    <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${
                      cuentasAutomaticas.esNegativo ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'
                    }`}>
                      <span className={`font-bold text-lg ${cuentasAutomaticas.esNegativo ? 'text-red-800' : 'text-green-800'}`}>
                        💰 Efectivo para sobre:
                      </span>
                      <span className={`text-2xl font-black ${cuentasAutomaticas.esNegativo ? 'text-red-800' : 'text-green-800'}`}>
                        ${cuentasAutomaticas.efectivoParaSobre.toFixed(2)}
                      </span>
                    </div>
                    
                    {cuentasAutomaticas.esNegativo && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">
                          ⚠️ <strong>Atención:</strong> El resultado es negativo. Verifica el conteo de efectivo, egresos y recupero.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Campo de recupero */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recupero de Fondo (opcional):
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      value={recuperoFondo}
                      onChange={(e) => setRecuperoFondo(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="0.00"
                    />
                  </div>
                  {recuperoRecomendado > 0 && parseFloat(recuperoFondo) !== recuperoRecomendado && (
                    <p className="text-sm text-yellow-600 mt-1">
                      💡 Sugerencia: $${recuperoRecomendado.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* 🆕 CONCILIACIÓN MANUAL DE OTROS MEDIOS DE PAGO */}
            {efectivoConteoCompleto && (
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
                    <Target className="w-5 h-5 md:w-6 md:h-6 text-orange-600 mr-2" />
                    Conciliación Manual - Otros Medios
                  </h3>
                  
                  {/* Botón resolver diferencias */}
                  {diferenciasMayores.length > 0 && (
                    <button
                      onClick={resolverTodasLasDiferencias}
                      className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm md:text-base flex items-center space-x-2 transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Resolver Diferencias</span>
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Ingresa manualmente los montos de otros medios de pago para conciliar:
                </p>
                
                <div className="space-y-4">
                  {/* Tarjeta de Crédito */}
                  {(ventasResumen?.totalesPorMedioPago?.tarjeta_credito?.monto > 0 || conteoTarjetaCredito) && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="font-semibold text-blue-800">Tarjeta de Crédito</span>
                        </div>
                        <span className="text-sm text-blue-600">
                          Sistema: ${(ventasResumen?.totalesPorMedioPago?.tarjeta_credito?.monto || 0).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={conteoTarjetaCredito}
                        onChange={(e) => setConteoTarjetaCredito(e.target.value)}
                        className="w-full p-3 text-lg font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ingrese monto manual..."
                      />
                    </div>
                  )}
                  
                  {/* Tarjeta de Débito */}
                  {(ventasResumen?.totalesPorMedioPago?.tarjeta_debito?.monto > 0 || conteoTarjetaDebito) && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <CreditCard className="w-5 h-5 text-purple-600 mr-2" />
                          <span className="font-semibold text-purple-800">Tarjeta de Débito</span>
                        </div>
                        <span className="text-sm text-purple-600">
                          Sistema: ${(ventasResumen?.totalesPorMedioPago?.tarjeta_debito?.monto || 0).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={conteoTarjetaDebito}
                        onChange={(e) => setConteoTarjetaDebito(e.target.value)}
                        className="w-full p-3 text-lg font-bold border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Ingrese monto manual..."
                      />
                    </div>
                  )}
                  
                  {/* QR / Digital */}
                  {(ventasResumen?.totalesPorMedioPago?.qr?.monto > 0 || conteoQR) && (
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Smartphone className="w-5 h-5 text-orange-600 mr-2" />
                          <span className="font-semibold text-orange-800">QR / Digital</span>
                        </div>
                        <span className="text-sm text-orange-600">
                          Sistema: ${(ventasResumen?.totalesPorMedioPago?.qr?.monto || 0).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={conteoQR}
                        onChange={(e) => setConteoQR(e.target.value)}
                        className="w-full p-3 text-lg font-bold border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Ingrese monto manual..."
                      />
                    </div>
                  )}
                </div>
                
                {/* Mostrar diferencias si las hay */}
                {diferenciasOtrosMedios.length > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Diferencias Detectadas:</h4>
                    <div className="space-y-2 text-sm">
                      {diferenciasOtrosMedios.map((diff, idx) => (
                        <div key={idx} className={`flex justify-between ${diff.significativa ? 'text-red-700' : 'text-yellow-700'}`}>
                          <span>{diff.medioPago}:</span>
                          <span className="font-bold">
                            {diff.diferencia > 0 ? '+' : ''}${diff.diferencia.toFixed(2)}
                            {diff.significativa && ' 🚨'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer con observaciones y finalizar */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    placeholder="Cualquier observación sobre el cierre, diferencias encontradas, o situaciones especiales..."
                  />
                </div>
                
                <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-4">
                  <button
                    onClick={() => router.push('/pdv')}
                    disabled={isSaving}
                    className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleCerrarCaja}
                    disabled={isSaving || !canClose || !efectivoConteoCompleto}
                    className={`w-full md:w-auto px-6 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-white font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 ${
                      canClose && efectivoConteoCompleto
                        ? hasIncorrectOtherMethods
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="animate-spin h-4 md:h-5 md:w-5" />
                        <span>Procesando...</span>
                      </>
                    ) : !efectivoConteoCompleto ? (
                      <>
                        <Calculator className="h-4 md:h-5 md:w-5" />
                        <span>Contar Efectivo Primero</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 md:h-5 md:w-5" />
                        <span>
                          {hasIncorrectOtherMethods && canClose ? 'Cerrar con Diferencias' : 'Cerrar Caja'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Estado del cierre */}
                {hasIncorrectOtherMethods && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 mr-2" />
                      <p className="font-medium text-amber-800 text-sm md:text-base">Estado del cierre</p>
                    </div>
                    <div className="text-xs md:text-sm text-amber-700 space-y-1">
                      {canClose ? (
                        <>
                          <p>✅ Puedes cerrar la caja.</p>
                          {diferenciasMayores.length > 0 && (
                            <p>⚠️ Las diferencias ≥ $200 generarán contingencias automáticamente.</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p>⚠️ Hay {diferenciasMayores.length} diferencia(s) mayor(es) a $200 sin resolver.</p>
                          <p>💡 Usa el botón "Resolver Diferencias" para forzar el cierre y generar contingencias.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}