import React, { useState, useEffect } from 'react';
import { 
  Printer, Monitor, Settings, Zap, BarChart3, AlertTriangle,
  CheckCircle, RefreshCw, Plus, Eye, Edit, Trash2, Play,
  Download, Calendar, TrendingUp, Activity, Clock, Award,
  Wifi, WifiOff, Users, Building
} from 'lucide-react';
import { PrintMonitoringDashboard } from '@/components/PrintMonitoringDashboard';
import { AutoPrinterSetupWizard } from '@/components/AutoPrinterSetupWizard';
import { usePrint } from '@/hooks/usePrint';
import { advancedPrintService } from '@/services/print/advancedPrintService';

interface PrintAdminPageProps {
  sucursalId?: string;
}

export function PrintAdminPage({ sucursalId }: PrintAdminPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'printers' | 'jobs' | 'reports' | 'settings'>('overview');
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [printers, setPrinters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para estadísticas
  const [stats, setStats] = useState({
    totalPrinters: 0,
    onlinePrinters: 0,
    totalJobsToday: 0,
    successRate: 0,
    avgResponseTime: 0
  });

  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const { availablePrinters, refreshPrinters, isInitialized } = usePrint();

  useEffect(() => {
    loadPrintSystemData();
    
    // Actualizar datos cada 30 segundos
    const interval = setInterval(loadPrintSystemData, 30000);
    return () => clearInterval(interval);
  }, [sucursalId]);

  const loadPrintSystemData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar impresoras configuradas
      await refreshPrinters();
      
      // Cargar estadísticas del sistema
      const queueStats = advancedPrintService.getQueueStats();
      
      // Simular datos para el dashboard (en implementación real vendrían de APIs)
      setStats({
        totalPrinters: availablePrinters.length,
        onlinePrinters: availablePrinters.filter(p => p.settings?.isOnline !== false).length,
        totalJobsToday: queueStats.total,
        successRate: queueStats.total > 0 ? (queueStats.completed / queueStats.total) * 100 : 100,
        avgResponseTime: queueStats.avgProcessingTime
      });

      // Simular trabajos recientes
      setRecentJobs([
        {
          id: 'job_1',
          type: 'factura',
          printer: 'Fukun POS80-CC',
          status: 'completed',
          time: new Date(Date.now() - 300000),
          duration: 2.1
        },
        {
          id: 'job_2',
          type: 'batch',
          printer: 'Fukun POS80-CC',
          status: 'completed',
          time: new Date(Date.now() - 600000),
          duration: 8.3
        },
        {
          id: 'job_3',
          type: 'ticket',
          printer: 'XPrinter 58mm',
          status: 'failed',
          time: new Date(Date.now() - 900000),
          error: 'Papel agotado'
        }
      ]);

      // Simular alertas
      setAlerts([
        {
          id: 'alert_1',
          type: 'warning',
          message: 'Papel bajo en impresora principal',
          time: new Date(Date.now() - 1800000)
        }
      ]);

      setError(null);
    } catch (err) {
      console.error('Error cargando datos del sistema de impresión:', err);
      setError('Error al cargar datos del sistema');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = (count: number) => {
    loadPrintSystemData();
    setStats(prev => ({ ...prev, totalPrinters: prev.totalPrinters + count }));
  };

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const tabs = [
    { key: 'overview', label: 'Resumen', icon: BarChart3 },
    { key: 'printers', label: 'Impresoras', icon: Printer },
    { key: 'jobs', label: 'Trabajos', icon: Activity },
    { key: 'reports', label: 'Reportes', icon: Calendar },
    { key: 'settings', label: 'Configuración', icon: Settings }
  ];

  if (isLoading && availablePrinters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Sistema de Impresión</h2>
          <p className="text-gray-600">Inicializando componentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Administración de Impresión</h1>
                <p className="text-sm text-gray-600">Sistema centralizado de gestión de impresoras</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isInitialized ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isInitialized ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span>{isInitialized ? 'Sistema activo' : 'Sistema inactivo'}</span>
              </div>

              <button
                onClick={() => setShowMonitoring(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Monitor className="w-4 h-4" />
                <span>Monitor</span>
              </button>

              <button
                onClick={() => setShowSetupWizard(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Auto-Config</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Resumen */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Estadísticas Principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Printer className="w-6 h-6 text-white" />
                      </div>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-blue-900">{stats.totalPrinters}</h3>
                    <p className="text-blue-700 text-sm">Impresoras configuradas</p>
                    <div className="mt-2 text-xs text-blue-600">
                      {stats.onlinePrinters} en línea
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-900">{stats.successRate.toFixed(1)}%</h3>
                    <p className="text-green-700 text-sm">Tasa de éxito</p>
                    <div className="mt-2 text-xs text-green-600">
                      Últimas 24h
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-purple-900">{stats.totalJobsToday}</h3>
                    <p className="text-purple-700 text-sm">Trabajos hoy</p>
                    <div className="mt-2 text-xs text-purple-600">
                      +12% vs ayer
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-orange-900">
                      {formatDuration(stats.avgResponseTime / 1000)}
                    </h3>
                    <p className="text-orange-700 text-sm">Tiempo promedio</p>
                    <div className="mt-2 text-xs text-orange-600">
                      -0.3s vs ayer
                    </div>
                  </div>
                </div>

                {/* Alertas y Actividad Reciente */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Alertas */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Alertas del Sistema</h3>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{alerts.length} activas</span>
                      </div>
                    </div>

                    {alerts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                        <p>No hay alertas activas</p>
                        <p className="text-sm">El sistema funciona correctamente</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div key={alert.id} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-orange-800">{alert.message}</p>
                              <p className="text-xs text-orange-600 mt-1">
                                {alert.time.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actividad Reciente */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Ver todo
                      </button>
                    </div>

                    <div className="space-y-3">
                      {recentJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(job.status)}`}>
                              {job.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                               job.status === 'failed' ? <AlertTriangle className="w-4 h-4" /> :
                               <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {job.type} en {job.printer}
                              </p>
                              <p className="text-xs text-gray-600">
                                {job.time.toLocaleTimeString()}
                                {job.duration && ` • ${formatDuration(job.duration)}`}
                                {job.error && ` • ${job.error}`}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Impresoras */}
            {activeTab === 'printers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Impresoras Configuradas ({availablePrinters.length})
                  </h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={refreshPrinters}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Actualizar</span>
                    </button>
                    <button
                      onClick={() => setShowSetupWizard(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>

                {availablePrinters.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <Printer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay impresoras configuradas</h3>
                    <p className="text-gray-600 mb-6">Comienza agregando tu primera impresora</p>
                    <button
                      onClick={() => setShowSetupWizard(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Configurar Impresoras
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availablePrinters.map((printer) => (
                      <div key={printer.id} className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Printer className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{printer.name}</h4>
                              <p className="text-sm text-gray-600 capitalize">{printer.type}</p>
                            </div>
                          </div>
                          
                          {printer.isDefault && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                              Por defecto
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Papel:</span>
                            <span className="text-gray-900">{printer.settings?.paperWidth || 80}mm</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Corte automático:</span>
                            <span className="text-gray-900">
                              {printer.settings?.autocut ? 'Sí' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Estado:</span>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-green-600 text-sm">En línea</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                            <Play className="w-3 h-3" />
                            <span>Test</span>
                          </button>
                          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                            <Edit className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Otros tabs pueden implementarse de manera similar */}
            {activeTab !== 'overview' && activeTab !== 'printers' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sección {tabs.find(t => t.key === activeTab)?.label}
                </h3>
                <p className="text-gray-600">Esta funcionalidad estará disponible próximamente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      <PrintMonitoringDashboard 
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
      />

      <AutoPrinterSetupWizard 
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onComplete={handleSetupComplete}
      />
    </div>
  );
}