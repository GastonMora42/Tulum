// src/app/(pdv)/pdv/insumos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Minus, Send } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCSelect, HCTextarea } from '@/components/ui/HighContrastComponents';

interface StockInsumo {
  id: string;
  cantidad: number;
  insumoPdv: {
    id: string;
    nombre: string;
    unidadMedida: string;
    stockMinimo: number;
  };
}

interface EgresoItem {
  insumoPdvId: string;
  cantidad: number;
  motivo: string;
  observaciones?: string;
}

export default function InsumosPdvPage() {
  const { user } = useAuthStore();
  const [stocks, setStocks] = useState<StockInsumo[]>([]);
  const [stocksBajos, setStocksBajos] = useState<StockInsumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<StockInsumo | null>(null);
  const [egresoForm, setEgresoForm] = useState<EgresoItem>({
    insumoPdvId: '',
    cantidad: 1,
    motivo: 'uso_normal',
    observaciones: ''
  });

  useEffect(() => {
    if (user?.sucursalId) {
      fetchStock();
    }
  }, [user]);

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      
      const [stockResponse, stockBajoResponse] = await Promise.all([
        authenticatedFetch(`/api/stock-insumos-pdv?ubicacionId=${user?.sucursalId}`),
        authenticatedFetch(`/api/stock-insumos-pdv?ubicacionId=${user?.sucursalId}&stockBajo=true`)
      ]);

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();
        setStocks(stockData);
      }

      if (stockBajoResponse.ok) {
        const stockBajoData = await stockBajoResponse.json();
        setStocksBajos(stockBajoData);
      }
    } catch (error) {
      console.error('Error al cargar stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEgreso = async (insumo: StockInsumo) => {
    setSelectedInsumo(insumo);
    setEgresoForm({
      insumoPdvId: insumo.insumoPdv.id,
      cantidad: 1,
      motivo: 'uso_normal',
      observaciones: ''
    });
    setShowEgresoModal(true);
  };

  const submitEgreso = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/egresos-insumos-pdv', {
        method: 'POST',
        body: JSON.stringify(egresoForm)
      });

      if (response.ok) {
        setShowEgresoModal(false);
        fetchStock();
        alert('Egreso registrado correctamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al registrar egreso');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar egreso');
    }
  };

  const crearSolicitud = async () => {
    try {
      const items = stocksBajos.map(stock => ({
        insumoPdvId: stock.insumoPdv.id,
        cantidad: Math.max(stock.insumoPdv.stockMinimo - stock.cantidad, 1),
        observaciones: `Stock actual: ${stock.cantidad}, mínimo: ${stock.insumoPdv.stockMinimo}`
      }));

      const response = await authenticatedFetch('/api/admin/solicitudes-insumos-pdv', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId: user?.sucursalId,
          items,
          observaciones: 'Solicitud automática por stock bajo'
        })
      });

      if (response.ok) {
        alert('Solicitud creada correctamente');
        fetchStock();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear solicitud');
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Insumos PDV</h1>
              <p className="text-white/80">Control de papel térmico, bolsas y otros insumos</p>
            </div>
            <div className="flex space-x-3">
              {stocksBajos.length > 0 && (
                <button
                  onClick={crearSolicitud}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Solicitar Reposición
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alertas de stock bajo */}
        {stocksBajos.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Stock bajo detectado
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {stocksBajos.length} insumo(s) están por debajo del stock mínimo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stock actual */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-black">
              Stock de Insumos
            </h3>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">
                      Insumo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">
                      Stock Mínimo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stocks.map((stock) => {
                    const esStockBajo = stock.cantidad <= stock.insumoPdv.stockMinimo;
                    
                    return (
                      <tr key={stock.id} className={esStockBajo ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-black">
                              {stock.insumoPdv.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${esStockBajo ? 'text-red-600 font-bold' : 'text-black'}`}>
                            {stock.cantidad} {stock.insumoPdv.unidadMedida}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {stock.insumoPdv.stockMinimo} {stock.insumoPdv.unidadMedida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {esStockBajo ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEgreso(stock)}
                            disabled={stock.cantidad <= 0}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm rounded-md text-black bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Registrar Egreso
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de egreso */}
        {showEgresoModal && selectedInsumo && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-black mb-4">
                Registrar Egreso: {selectedInsumo.insumoPdv.nombre}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Cantidad (disponible: {selectedInsumo.cantidad})
                  </label>
                  <HCInput
                    type="number"
                    min="1"
                    max={selectedInsumo.cantidad}
                    value={egresoForm.cantidad}
                    onChange={(e) => setEgresoForm({
                      ...egresoForm,
                      cantidad: parseInt(e.target.value) || 1
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Motivo
                  </label>
                  <HCSelect
                    value={egresoForm.motivo}
                    onChange={(e) => setEgresoForm({
                      ...egresoForm,
                      motivo: e.target.value
                    })}
                  >
                    <option value="uso_normal">Uso normal</option>
                    <option value="perdida">Pérdida</option>
                    <option value="daño">Daño</option>
                    <option value="vencimiento">Vencimiento</option>
                    <option value="otros">Otros</option>
                  </HCSelect>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Observaciones
                  </label>
                  <HCTextarea
                    rows={3}
                    value={egresoForm.observaciones}
                    onChange={(e) => setEgresoForm({
                      ...egresoForm,
                      observaciones: e.target.value
                    })}
                    placeholder="Detalles adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEgresoModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitEgreso}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Registrar Egreso
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}