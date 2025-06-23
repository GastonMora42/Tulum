// src/components/pdv/CierreCaja.tsx - VERSIÓN CON INPUTS CORREGIDOS

'use client';

import { useState, useEffect, useCallback, JSX, useMemo, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertCircle, CheckCircle, X, Calculator, DollarSign, Clock, 
  TrendingUp, AlertTriangle, FileText, 
  ChevronRight, RefreshCw, Zap, Target, PiggyBank,
  CreditCard, Banknote, Smartphone, Activity, Coins,
  ArrowDownLeft, ArrowUpRight, Info, ExternalLink, Check,
  XCircle, Settings, Loader, Shield, Wrench, Package,
  Minus, Plus, AlertOctagon
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

interface EgresoInfo {
  id: string;
  monto: number;
  motivo: string;
  fecha: string;
  usuario: {
    id: string;
    name: string;
  } | string;
  detalles?: string;
}

interface MedioPagoValidation {
  isValid: boolean;
  difference: number;
  status: 'empty' | 'correct' | 'incorrect' | 'forced';
}

// 🔧 CORRECCIÓN: Componente memoizado fuera del componente principal
const MedioElectronicoInput = memo(({ 
  tipo, 
  nombre, 
  icono, 
  valor, 
  onChange, 
  colorScheme,
  validation,
  forcedMethods,
  onForceCorrection,
  MARGEN_TOLERANCIA
}: {
  tipo: string;
  nombre: string;
  icono: JSX.Element;
  valor: string;
  onChange: (value: string) => void;
  colorScheme: string;
  validation: MedioPagoValidation;
  forcedMethods: Set<string>;
  onForceCorrection: (nombre: string) => void;
  MARGEN_TOLERANCIA: number;
}) => {
  const isForcedCorrect = forcedMethods.has(nombre);
  
  return (
    <div className={`bg-${colorScheme}-50 rounded-xl p-4 border-2 ${
      validation.status === 'empty' ? `border-${colorScheme}-200` :
      validation.isValid || isForcedCorrect ? 'border-green-500 bg-green-50' :
      'border-red-500 bg-red-50'
    } transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-6 h-6 text-${colorScheme}-600 mr-2`}>
            {icono}
          </div>
          <span className={`font-semibold text-${colorScheme}-800`}>{nombre}</span>
        </div>
        
        {/* Indicador visual */}
        <div className="flex items-center space-x-2">
          {validation.status === 'empty' && (
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
          )}
          {validation.status === 'correct' && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Correcto</span>
            </div>
          )}
          {validation.status === 'incorrect' && !isForcedCorrect && (
            <div className="flex items-center text-red-600">
              <XCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Diferencia</span>
            </div>
          )}
          {isForcedCorrect && (
            <div className="flex items-center text-amber-600">
              <Wrench className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Forzado</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 text-lg font-bold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            validation.status === 'empty' ? 'border-gray-300' :
            validation.isValid || isForcedCorrect ? 'border-green-300 bg-white' :
            'border-red-300 bg-white'
          }`}
          placeholder="Ingrese monto contado..."
          autoComplete="off"
        />
      </div>
      
      {/* Botón para forzar corrección */}
      {validation.status === 'incorrect' && !isForcedCorrect && Math.abs(validation.difference) >= MARGEN_TOLERANCIA && (
        <button
          onClick={() => onForceCorrection(nombre)}
          className="mt-2 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
        >
          Forzar Corrección
        </button>
      )}
    </div>
  );
});

MedioElectronicoInput.displayName = 'MedioElectronicoInput';

export function CierreCaja({ id, onSuccess }: CierreCajaUXMejoradoProps) {
  // Estados principales
  const [cierreCaja, setCierreCaja] = useState<any>(null);
  const [ventasResumen, setVentasResumen] = useState<any>(null);
  const [egresos, setEgresos] = useState<EgresoInfo[]>([]);
  const [configuracionCierre, setConfiguracionCierre] = useState<ConfiguracionCierre | null>(null);
  
  // Estados de conteos manuales
  const [efectivoContado, setEfectivoContado] = useState<number>(0);
  const [conteoTarjetaCredito, setConteoTarjetaCredito] = useState<string>('');
  const [conteoTarjetaDebito, setConteoTarjetaDebito] = useState<string>('');
  const [conteoQR, setConteoQR] = useState<string>('');
  const [recuperoFondo, setRecuperoFondo] = useState<string>('');
  
  // Estados de validación (separados del recupero)
  const [efectivoValidation, setEfectivoValidation] = useState<MedioPagoValidation>({
    isValid: false,
    difference: 0,
    status: 'empty'
  });
  
  // Estados para diferencias y resolución
  const [forcedMethods, setForcedMethods] = useState<Set<string>>(new Set());
  const [observaciones, setObservaciones] = useState<string>('');
  
  // 🆕 NUEVO ESTADO PARA CIERRE FORZADO
  const [showForceCloseOptions, setShowForceCloseOptions] = useState<boolean>(false);
  const [forceCloseReason, setForceCloseReason] = useState<string>('');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<any>(null);
  const [efectivoConteoCompleto, setEfectivoConteoCompleto] = useState(false);
  
  // 🔧 CONSTANTE: MARGEN ÚNICO DE TOLERANCIA DE $200
  const MARGEN_TOLERANCIA = 200;
  
  const router = useRouter();
  
  // Función helper para obtener nombre de usuario
  const getUserName = (usuario: EgresoInfo['usuario']): string => {
    if (typeof usuario === 'string') {
      return usuario;
    }
    if (typeof usuario === 'object' && usuario?.name) {
      return usuario.name;
    }
    return 'Usuario desconocido';
  };
  
  // 🆕 FUNCIÓN MEMOIZADA para manejar forzar corrección
  const handleForceCorrection = useCallback((nombre: string) => {
    setForcedMethods(prev => new Set([...prev, nombre]));
    setNotification({
      type: 'info',
      message: `${nombre} marcado como forzado`,
      details: 'Esto generará una contingencia para revisión'
    });
  }, []);
  
  // 🎯 FUNCIÓN DE VALIDACIÓN DEL EFECTIVO - MARGEN ÚNICO DE $200
  const calcularValidacionEfectivo = useCallback(() => {
    if (!ventasResumen || !cierreCaja || efectivoContado <= 0) {
      return {
        isValid: false,
        difference: 0,
        status: 'empty' as const
      };
    }
    
    const totalEgresos = ventasResumen.totalEgresos || 0;
    const ventasEfectivo = ventasResumen.totalesPorMedioPago?.efectivo?.monto || 0;
    const montoInicial = cierreCaja.montoInicial || 0;
    
    // El efectivo esperado NUNCA incluye recupero
    const efectivoEsperado = montoInicial + ventasEfectivo - totalEgresos;
    const diferencia = efectivoContado - efectivoEsperado;
    
    // 🔧 CAMBIO: MARGEN ÚNICO DE $200 SIEMPRE
    const isValid = Math.abs(diferencia) <= MARGEN_TOLERANCIA;
    
    return {
      isValid,
      difference: diferencia,
      status: isValid ? 'correct' as const : 'incorrect' as const
    };
  }, [ventasResumen, cierreCaja, efectivoContado]);
  
  // Efecto para validar efectivo
  useEffect(() => {
    const validacion = calcularValidacionEfectivo();
    setEfectivoValidation(validacion);
  }, [calcularValidacionEfectivo]);
  
  // 🔧 FUNCIÓN MEJORADA PARA VALIDAR MEDIOS ELECTRÓNICOS
  const validateMedioElectronico = useCallback((tipo: string, contado: string): MedioPagoValidation => {
    if (!ventasResumen) {
      return {
        isValid: false,
        difference: 0,
        status: 'empty'
      };
    }
    
    // 🔧 CORRECCIÓN: Si el campo está vacío, verificar si hay ventas
    const contadoNum = parseFloat(contado) || 0;
    let esperado = 0;
    
    switch (tipo) {
      case 'tarjeta_credito':
        esperado = ventasResumen.totalesPorMedioPago?.tarjeta_credito?.monto || 0;
        break;
      case 'tarjeta_debito':
        esperado = ventasResumen.totalesPorMedioPago?.tarjeta_debito?.monto || 0;
        break;
      case 'qr':
        esperado = ventasResumen.totalesPorMedioPago?.qr?.monto || 0;
        break;
    }
    
    // 🔧 NUEVA LÓGICA: Si no hay ventas esperadas y el campo está vacío, es válido
    if (esperado === 0 && contadoNum === 0) {
      return {
        isValid: true,
        difference: 0,
        status: 'correct'
      };
    }
    
    // Si hay ventas esperadas pero el campo está vacío, es inválido
    if (esperado > 0 && contado.trim() === '') {
      return {
        isValid: false,
        difference: -esperado,
        status: 'empty'
      };
    }
    
    const diferencia = contadoNum - esperado;
    const isValid = Math.abs(diferencia) < 0.01;
    
    return {
      isValid,
      difference: diferencia,
      status: isValid ? 'correct' : 'incorrect'
    };
  }, [ventasResumen]);
  
  // CARGAR CONFIGURACIÓN Y DATOS DE CIERRE
  const loadCierreCaja = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotification(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      const [responseCierre, responseConfig] = await Promise.all([
        authenticatedFetch(`/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`),
        authenticatedFetch(`/api/pdv/configuracion-cierre?sucursalId=${encodeURIComponent(sucursalId)}`) // 🔧 CAMBIO AQUÍ
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
      
      // Reiniciar estados
      setEfectivoContado(0);
      setConteoTarjetaCredito('');
      setConteoTarjetaDebito('');
      setConteoQR('');
      setRecuperoFondo('');
      setForcedMethods(new Set());
      setShowForceCloseOptions(false);
      
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
  
  // Calcular recupero recomendado
  const calcularRecuperoRecomendado = useCallback(() => {
    if (!ventasResumen || !configuracionCierre || !cierreCaja) return 0;
    
    const montoFijo = configuracionCierre.montoFijo;
    const montoInicial = cierreCaja.montoInicial;
    const ventasEfectivo = ventasResumen.totalesPorMedioPago?.efectivo?.monto || 0;
    
    if (montoInicial < montoFijo && ventasEfectivo > 0) {
      const diferenciaMonto = montoFijo - montoInicial;
      const recuperoMaximo = Math.min(diferenciaMonto, ventasEfectivo);
      
      const totalEgresos = ventasResumen.totalEgresos || 0;
      const efectivoSimulado = montoInicial + ventasEfectivo - totalEgresos;
      const efectivoConRecupero = efectivoSimulado - recuperoMaximo;
      
      if (efectivoConRecupero >= montoFijo * 0.8) {
        return recuperoMaximo;
      }
    }
    
    return 0;
  }, [ventasResumen, configuracionCierre, cierreCaja]);
  
  const calcularCuentasAutomaticas = useCallback(() => {
    if (efectivoContado <= 0) return null;
    
    const totalEgresos = ventasResumen?.totalEgresos || 0;
    const recuperoNum = parseFloat(recuperoFondo) || 0;
    const montoInicialCaja = cierreCaja?.montoInicial || 0;
    
    // ✅ CORRECTO: Solo restar recupero y monto inicial
    const efectivoParaSobreCalculado = efectivoContado - recuperoNum - montoInicialCaja;
    const esNegativo = efectivoParaSobreCalculado < 0;
    
    return {
      efectivoContado,
      // ✅ Mostrar egresos como informativos, no como resta
      egresosInformativos: totalEgresos,
      menosRecupero: recuperoNum,
      menosMontoInicial: montoInicialCaja,
      efectivoParaSobre: esNegativo ? 0 : efectivoParaSobreCalculado, // 🆕 Mostrar 0 cuando es negativo
      efectivoProximoTurno: montoInicialCaja,
      esNegativo,
      recuperoProximoTurno: esNegativo ? Math.abs(efectivoParaSobreCalculado) : 0 // 🆕 Monto para recupero
    };
  }, [efectivoContado, ventasResumen, recuperoFondo, cierreCaja]);
  
  // Función para manejar cambio del contador de billetes
  const handleBillCounterChange = (total: number) => {
    setEfectivoContado(total);
    setEfectivoConteoCompleto(total > 0);
  };
  
  // 🆕 FUNCIÓN PARA OBTENER TODOS LOS MEDIOS CON VALIDACIÓN
  const getMediosConValidacion = useCallback(() => {
    const medios = [
      { tipo: 'tarjeta_credito', nombre: 'Tarjeta de Crédito', valor: conteoTarjetaCredito },
      { tipo: 'tarjeta_debito', nombre: 'Tarjeta de Débito', valor: conteoTarjetaDebito },
      { tipo: 'qr', nombre: 'QR / Digital', valor: conteoQR }
    ];
    
    return medios.map(medio => ({
      ...medio,
      validation: validateMedioElectronico(medio.tipo, medio.valor),
      esperado: ventasResumen?.totalesPorMedioPago?.[medio.tipo]?.monto || 0,
      isForzado: forcedMethods.has(medio.nombre)
    }));
  }, [conteoTarjetaCredito, conteoTarjetaDebito, conteoQR, validateMedioElectronico, ventasResumen, forcedMethods]);
  
  // 🆕 NUEVA LÓGICA DE CIERRE MEJORADA CON OPCIÓN FORZADA
  const handleCerrarCaja = async (forzar: boolean = false) => {
    try {
      setIsSaving(true);
      
      if (!cierreCaja || !configuracionCierre) {
        throw new Error('No hay datos suficientes para cerrar la caja');
      }
      
      if (efectivoContado <= 0) {
        throw new Error('Debe contar el efectivo antes de cerrar la caja');
      }
      
      if (!forzar) {
        // Validar medios electrónicos solo si no es forzado
        const mediosConValidacion = getMediosConValidacion();
        const mediosIncorrectos = mediosConValidacion.filter(medio => 
          medio.esperado > 0 && !medio.validation.isValid && !medio.isForzado
        );
        
        if (mediosIncorrectos.length > 0) {
          setNotification({
            type: 'error',
            message: 'Hay diferencias sin resolver en medios electrónicos',
            details: `Verifique: ${mediosIncorrectos.map(m => `${m.nombre} (esperado: $${m.esperado.toFixed(2)}, diferencia: ${m.validation.difference > 0 ? '+' : ''}$${m.validation.difference.toFixed(2)})`).join(', ')}`,
            action: 'Puede marcar como "Forzado" los medios con diferencias o usar "Cerrar Forzadamente"'
          });
          setShowForceCloseOptions(true);
          return;
        }
        
        // 🔧 VALIDACIÓN DE EFECTIVO CON MARGEN ÚNICO
        if (!efectivoValidation.isValid) {
          setNotification({
            type: 'error',
            message: `Hay una diferencia en el efectivo mayor a $${MARGEN_TOLERANCIA.toFixed(0)} (diferencia: ${efectivoValidation.difference > 0 ? '+' : ''}$${efectivoValidation.difference.toFixed(2)})`,
            details: 'Para cerrar correctamente, la diferencia debe ser menor a $200. Use "Cerrar Forzadamente" para generar una contingencia automática',
            action: 'Verifique el conteo o use cierre forzado'
          });
          setShowForceCloseOptions(true);
          return;
        }
      }
      
      // Preparar observaciones
      let observacionesFinal = observaciones;
      
      if (forzar) {
        observacionesFinal += `\n\n🚨 CIERRE FORZADO\n`;
        if (forceCloseReason) {
          observacionesFinal += `Motivo: ${forceCloseReason}\n`;
        }
        
        const mediosConValidacion = getMediosConValidacion();
        const problemasEncontrados = [];
        
        // Agregar problemas de efectivo
        if (!efectivoValidation.isValid) {
          problemasEncontrados.push(`Efectivo: diferencia de ${efectivoValidation.difference > 0 ? '+' : ''}$${efectivoValidation.difference.toFixed(2)} (tolerancia: $${MARGEN_TOLERANCIA})`);
        }
        
        // Agregar problemas de medios electrónicos
        mediosConValidacion.forEach(medio => {
          if (medio.esperado > 0 && !medio.validation.isValid && !medio.isForzado) {
            problemasEncontrados.push(`${medio.nombre}: esperado $${medio.esperado.toFixed(2)}, contado $${parseFloat(medio.valor) || 0}, diferencia ${medio.validation.difference > 0 ? '+' : ''}$${medio.validation.difference.toFixed(2)}`);
          }
        });
        
        if (problemasEncontrados.length > 0) {
          observacionesFinal += `\nProblemas detectados:\n${problemasEncontrados.map(p => `• ${p}`).join('\n')}`;
        }
        
        // Agregar métodos forzados
        if (forcedMethods.size > 0) {
          observacionesFinal += `\nMedios marcados como forzados: ${Array.from(forcedMethods).join(', ')}`;
        }
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cierreCaja.id,
          observaciones: observacionesFinal,
          conteoEfectivo: efectivoContado,
          conteoTarjetaCredito: parseFloat(conteoTarjetaCredito) || 0,
          conteoTarjetaDebito: parseFloat(conteoTarjetaDebito) || 0,
          conteoQR: parseFloat(conteoQR) || 0,
          conteoOtros: 0,
          recuperoFondo: parseFloat(recuperoFondo) || 0,
          forzarContingencia: forzar || forcedMethods.size > 0 || !efectivoValidation.isValid,
          resolverDiferenciasAutomaticamente: forzar || forcedMethods.size > 0
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cerrar la caja');
      }
      
      const data = await response.json();
      const cuentas = calcularCuentasAutomaticas();
      
      setNotification({
        type: 'success',
        message: forzar ? '🎉 Caja cerrada forzadamente con contingencia' : '🎉 Caja cerrada correctamente',
        details: `Efectivo para sobre: $${cuentas?.efectivoParaSobre.toFixed(2) || '0.00'}. Próximo turno: $${configuracionCierre.montoFijo.toFixed(2)}`,
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
  
  // Renderizado principal
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
  const ventasEfectivo = ventasResumen?.totalesPorMedioPago?.efectivo?.monto || 0;
  const mediosConValidacion = getMediosConValidacion();
  const canClose = efectivoConteoCompleto && efectivoValidation.isValid;
  const hasUnresolvedIssues = !canClose || mediosConValidacion.some(m => m.esperado > 0 && !m.validation.isValid && !m.isForzado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header reducido */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-gray-900">Cierre de Caja</h1>
                <p className="text-xs text-gray-600">
                  {cierreCaja?.fechaApertura 
                    ? format(new Date(cierreCaja.fechaApertura), 'dd/MM/yyyy HH:mm') 
                    : 'Fecha no disponible'
                  } • Monto Fijo: ${configuracionCierre?.montoFijo?.toFixed(2) || '0.00'} • Tolerancia: $200
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`mb-4 p-4 rounded-2xl border transition-all ${
            notification.type === 'success' ? 'bg-green-50 border-green-200' :
            notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {notification.type === 'success' ? 
                  <CheckCircle className="w-5 h-5 text-green-600" /> :
                  notification.type === 'info' ?
                  <Info className="w-5 h-5 text-blue-600" /> :
                  <AlertCircle className="w-5 h-5 text-red-600" />
                }
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-sm mb-1 ${
                  notification.type === 'success' ? 'text-green-800' : 
                  notification.type === 'info' ? 'text-blue-800' :
                  'text-red-800'
                }`}>
                  {notification.message}
                </h3>
                {notification.details && (
                  <p className={`text-xs mb-2 ${
                    notification.type === 'success' ? 'text-green-700' : 
                    notification.type === 'info' ? 'text-blue-700' :
                    'text-red-700'
                  }`}>
                    {notification.details}
                  </p>
                )}
                {notification.action && (
                  <p className={`text-xs font-medium ${
                    notification.type === 'success' ? 'text-green-800' : 
                    notification.type === 'info' ? 'text-blue-800' :
                    'text-red-800'
                  }`}>
                    💡 {notification.action}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Panel izquierdo - Información del turno */}
          <div className="xl:col-span-1">
            {/* Resumen del turno */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                Resumen del Turno
              </h3>
              
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-600 mb-1">Monto Inicial</p>
                  <p className="text-xl font-bold text-blue-700">
                    ${cierreCaja?.montoInicial?.toFixed(2)}
                  </p>
                  {configuracionCierre && cierreCaja?.montoInicial < configuracionCierre.montoFijo && (
                    <p className="text-xs text-orange-600 mt-1">
                      Menor al monto fijo (${configuracionCierre.montoFijo.toFixed(2)})
                    </p>
                  )}
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-green-600 mb-1">Total de Ventas</p>
                  <p className="text-xl font-bold text-green-700">
                    ${ventasResumen?.total?.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{ventasResumen?.cantidadVentas} operaciones</p>
                </div>
                
                {/* 🔧 INFORMACIÓN SOBRE TOLERANCIA */}
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">📏 Tolerancia de Diferencias</p>
                  <p className="text-lg font-bold text-gray-800">±$200.00</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Para cerrar correctamente
                  </p>
                </div>
                
                {recuperoRecomendado > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                    <p className="text-sm text-yellow-600 mb-1">Recupero Recomendado</p>
                    <p className="text-xl font-bold text-yellow-700">
                      ${recuperoRecomendado.toFixed(2)}
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

            {/* Egresos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
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
          
          {/* Panel principal */}
          <div className="xl:col-span-2 space-y-4">
            {/* Contador de billetes con indicadores visuales */}
            <div className="relative">
              <BillCounter
                onTotalChange={handleBillCounterChange}
                className="shadow-sm"
              />
              
              {/* Indicador visual para efectivo */}
              {efectivoConteoCompleto && (
                <div className={`absolute top-4 right-4 flex items-center px-3 py-2 rounded-lg font-medium ${
                  efectivoValidation.isValid
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {efectivoValidation.isValid ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>Dentro de tolerancia</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      <span>Diferencia &gt; $200</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
{/* 🆕 CUENTAS AUTOMÁTICAS MEJORADAS */}
{efectivoConteoCompleto && cuentasAutomaticas && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
      <Calculator className="w-5 h-5 text-green-600 mr-2" />
      Cuentas Automáticas
    </h3>
    
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 font-medium">Efectivo total contado:</span>
          <span className="text-xl font-bold text-green-600">
            +${cuentasAutomaticas.efectivoContado.toFixed(2)}
          </span>
        </div>
        
        {cuentasAutomaticas.egresosInformativos > 0 && (
  <div className="flex justify-between items-center py-2 bg-gray-100 rounded-lg">
    <span className="text-gray-700 font-medium">ℹ️ Egresos del turno:</span>
    <span className="text-lg font-bold text-gray-600">
      ${cuentasAutomaticas.egresosInformativos.toFixed(2)}
    </span>
  </div>
)}
        
        {cuentasAutomaticas.menosRecupero > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700 font-medium">Menos recupero de fondo:</span>
            <span className="text-xl font-bold text-yellow-600">
              -${cuentasAutomaticas.menosRecupero.toFixed(2)}
            </span>
          </div>
        )}
        
        {/* 🔧 CAMBIO: Mostrar monto inicial en lugar de monto fijo */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 font-medium">Menos monto inicial (próximo turno):</span>
          <span className="text-xl font-bold text-blue-600">
            -${cuentasAutomaticas.menosMontoInicial.toFixed(2)}
          </span>
        </div>
        
        <hr className="border-gray-300" />
        
        {/* Efectivo para sobre */}
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
        
        {/* 🔧 CAMBIO: Mostrar que el próximo turno abrirá con el mismo monto inicial */}
        <div className="bg-blue-100 border border-blue-300 rounded-lg py-3 px-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg text-blue-800">
              🏪 Efectivo próximo turno:
            </span>
            <span className="text-2xl font-black text-blue-800">
              ${cuentasAutomaticas.efectivoProximoTurno.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Próximo turno abrirá con el mismo monto inicial de hoy
          </p>
          {/* 🆕 MOSTRAR INFORMACIÓN SOBRE MONTO FIJO CONFIGURADO */}
          {configuracionCierre && configuracionCierre.montoFijo !== cuentasAutomaticas.efectivoProximoTurno && (
            <p className="text-xs text-amber-700 mt-1 bg-amber-50 p-2 rounded border border-amber-200">
              💡 Monto fijo configurado: ${configuracionCierre.montoFijo.toFixed(2)}. 
              Use recupero de fondo para ajustar durante el turno si es necesario.
            </p>
          )}
        </div>
      </div>
    </div>
    
    {/* Campo de recupero - sin cambios */}
    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Recupero de Fondo (opcional):
      </label>
      <p className="text-xs text-gray-500 mb-2">
        💡 El recupero se descuenta del efectivo para sobre, no afecta la validación del conteo
      </p>
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
          💡 Sugerencia: ${recuperoRecomendado.toFixed(2)}
        </p>
      )}
    </div>
  </div>
)}
            
            {/* Medios electrónicos con componentes corregidos */}
            {efectivoConteoCompleto && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                  <Target className="w-5 h-5 text-orange-600 mr-2" />
                  Conciliación Manual - Medios Electrónicos
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  Ingresa los montos contados manualmente. Tolerancia: $200 para todas las diferencias.
                </p>
                
                <div className="space-y-4">
                  {/* Solo mostrar medios que tuvieron ventas o fueron ingresados */}
                  {(ventasResumen?.totalesPorMedioPago?.tarjeta_credito?.monto > 0 || conteoTarjetaCredito) && (
                    <MedioElectronicoInput
                      tipo="tarjeta_credito"
                      nombre="Tarjeta de Crédito"
                      icono={<CreditCard />}
                      valor={conteoTarjetaCredito}
                      onChange={setConteoTarjetaCredito}
                      colorScheme="blue"
                      validation={validateMedioElectronico('tarjeta_credito', conteoTarjetaCredito)}
                      forcedMethods={forcedMethods}
                      onForceCorrection={handleForceCorrection}
                      MARGEN_TOLERANCIA={MARGEN_TOLERANCIA}
                    />
                  )}
                  
                  {(ventasResumen?.totalesPorMedioPago?.tarjeta_debito?.monto > 0 || conteoTarjetaDebito) && (
                    <MedioElectronicoInput
                      tipo="tarjeta_debito"
                      nombre="Tarjeta de Débito"
                      icono={<CreditCard />}
                      valor={conteoTarjetaDebito}
                      onChange={setConteoTarjetaDebito}
                      colorScheme="purple"
                      validation={validateMedioElectronico('tarjeta_debito', conteoTarjetaDebito)}
                      forcedMethods={forcedMethods}
                      onForceCorrection={handleForceCorrection}
                      MARGEN_TOLERANCIA={MARGEN_TOLERANCIA}
                    />
                  )}
                  
                  {(ventasResumen?.totalesPorMedioPago?.qr?.monto > 0 || conteoQR) && (
                    <MedioElectronicoInput
                      tipo="qr"
                      nombre="QR / Digital"
                      icono={<Smartphone />}
                      valor={conteoQR}
                      onChange={setConteoQR}
                      colorScheme="orange"
                      validation={validateMedioElectronico('qr', conteoQR)}
                      forcedMethods={forcedMethods}
                      onForceCorrection={handleForceCorrection}
                      MARGEN_TOLERANCIA={MARGEN_TOLERANCIA}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 🆕 PANEL DE OPCIONES DE CIERRE FORZADO */}
            {showForceCloseOptions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center mb-4">
                  <AlertOctagon className="w-6 h-6 text-amber-600 mr-3" />
                  <h3 className="text-lg font-bold text-amber-800">Opciones de Cierre Forzado</h3>
                </div>
                
                <p className="text-sm text-amber-700 mb-4">
                  Se detectaron diferencias mayores a $200 que impiden el cierre normal. Puede cerrar forzadamente para generar una contingencia automática con todos los detalles.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    Motivo del cierre forzado (opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={forceCloseReason}
                    onChange={(e) => setForceCloseReason(e.target.value)}
                    className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="Ej: No se pudieron conciliar las diferencias en el tiempo disponible..."
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowForceCloseOptions(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={() => handleCerrarCaja(true)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                        Cerrando...
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="h-4 w-4 mr-2" />
                        Cerrar Forzadamente
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Footer con observaciones y finalizar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Cualquier observación sobre el cierre..."
                  />
                </div>
                
                <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-4">
                  <button
                    onClick={() => router.push('/pdv')}
                    disabled={isSaving}
                    className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  
                  {/* 🆕 BOTÓN DE CIERRE FORZADO SIEMPRE DISPONIBLE */}
                  {hasUnresolvedIssues && (
                    <button
                      onClick={() => setShowForceCloseOptions(true)}
                      disabled={isSaving || !efectivoConteoCompleto}
                      className="w-full md:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
                    >
                      <AlertOctagon className="h-4 w-4 mr-2" />
                      Cerrar Forzadamente
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleCerrarCaja(false)}
                    disabled={isSaving || !canClose}
                    className={`w-full md:w-auto px-6 py-2 rounded-lg text-white font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 ${
                      canClose
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="animate-spin h-4 w-4" />
                        <span>Procesando...</span>
                      </>
                    ) : !efectivoConteoCompleto ? (
                      <>
                        <Calculator className="h-4 w-4" />
                        <span>Contar Efectivo Primero</span>
                      </>
                    ) : !canClose ? (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        <span>Diferencia &gt; $200</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>Cerrar Caja</span>
                      </>
                    )}
                  </button>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}