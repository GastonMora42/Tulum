import React, { useState, useEffect } from 'react';
import { 
  Monitor, Printer, AlertTriangle, CheckCircle, Clock, 
  BarChart3, RefreshCw, Play, Pause, X, Eye, Download,
  TrendingUp, Activity, Zap
} from 'lucide-react';
import { advancedPrintService } from '@/services/print/advancedPrintService';

interface PrintMonitoringProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrintMonitoringDashboard({ isOpen, onClose }: PrintMonitoringProps) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    printing: 0,
    completed: 0,
    failed: 0,
    avgProcessingTime: 0
  });

  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      updateStats();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAutoRefresh && isOpen) {
      interval = setInterval(() => {
        updateStats();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh, isOpen]);

  const updateStats = () => {
    const currentStats = advancedPrintService.getQueueStats();
    setStats(currentStats);
    
    // Simular trabajos recientes (en implementación real vendría del servicio)
    const mockRecentJobs = [
      {
        id: 'job_001',
        type: 'factura',
        status: 'completed',
        createdAt: new Date(Date.now() - 30000),
        completedAt: new Date(Date.now() - 5000),
        printerName: 'Fukun POS80-CC',
        data: { facturaId: 'fact_001' }
      },
      {
        id: 'job_002',
        type: 'batch',
        status: 'printing',
        createdAt: new Date(Date.now() - 60000),
        startedAt: new Date(Date.now() - 10000),
        printerName: 'Fukun POS80-CC',
        data: { facturaIds: ['fact_002', 'fact_003', 'fact_004'] }
      },
      {
        id: 'job_003',
        type: 'ticket',
        status: 'failed',
        createdAt: new Date(Date.now() - 120000),
        error: 'Impresora no disponible',
        retryCount: 2,
        data: { ventaId: 'venta_001' }
      }
    ];
    
    setRecentJobs(mockRecentJobs);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'printing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-amber-600 bg-amber-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'printing': return <Activity className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatJobType = (type: string) => {
    switch (type) {
      case 'factura': return 'Factura';
      case 'ticket': return 'Ticket';
      case 'batch': return 'Lote';
      case 'resumen_diario': return 'Resumen';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#311716] to-[#462625] text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Monitor de Impresión</h2>
              <p className="text-white/80">Estado en tiempo real del sistema de impresión</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isAutoRefresh 
                  ? 'bg-green-500/20 text-green-100' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {isAutoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-sm">Auto-refresh</span>
            </button>
            
            <button
              onClick={updateStats}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Estadísticas Principales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">Total</span>
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-600">Pendientes</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-600">Imprimiendo</span>
                <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.printing}</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-600">Completados</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
            </div>

            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-600">Fallidos</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
            </div>
          </div>

          {/* Métricas de Rendimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rendimiento</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Tiempo promedio</span>
                    <span className="font-medium">{formatDuration(stats.avgProcessingTime)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((stats.avgProcessingTime / 10000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Tasa de éxito</span>
                    <span className="font-medium">
                      {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Estado de Cola</h3>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En cola</span>
                  <span className="text-lg font-bold text-amber-600">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Procesando</span>
                  <span className="text-lg font-bold text-blue-600">{stats.printing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    stats.printing > 0 ? 'bg-blue-100 text-blue-700' : 
                    stats.pending > 0 ? 'bg-amber-100 text-amber-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {stats.printing > 0 ? 'Activo' : 
                     stats.pending > 0 ? 'En cola' : 
                     'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Trabajos Recientes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Trabajos Recientes</h3>
              <div className="text-sm text-gray-500">{recentJobs.length} trabajos</div>
            </div>

            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Printer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay trabajos de impresión recientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {formatJobType(job.type)} #{job.id.slice(-6)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {job.printerName && `${job.printerName} • `}
                          {new Date(job.createdAt).toLocaleTimeString()}
                          {job.error && ` • ${job.error}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {job.status === 'failed' && (
                        <button
                          onClick={() => advancedPrintService.retryJob(job.id)}
                          className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Reintentar
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Detalles del Trabajo */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Trabajo #{selectedJob.id.slice(-6)}
                </h3>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <p className="text-gray-900">{formatJobType(selectedJob.type)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${getStatusColor(selectedJob.status)}`}>
                      {getStatusIcon(selectedJob.status)}
                      <span className="ml-1">{selectedJob.status}</span>
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Impresora</label>
                    <p className="text-gray-900">{selectedJob.printerName || 'No especificada'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Creado</label>
                    <p className="text-gray-900">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedJob.startedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Iniciado</label>
                      <p className="text-gray-900">{new Date(selectedJob.startedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedJob.completedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Completado</label>
                      <p className="text-gray-900">{new Date(selectedJob.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedJob.error && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Error</label>
                      <p className="text-red-600 bg-red-50 p-2 rounded-lg">{selectedJob.error}</p>
                    </div>
                  )}
                </div>
                
                {selectedJob.data && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-600">Datos del Trabajo</label>
                    <pre className="text-sm bg-gray-100 p-3 rounded-lg overflow-auto">
                      {JSON.stringify(selectedJob.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}